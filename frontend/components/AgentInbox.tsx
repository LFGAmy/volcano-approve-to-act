'use client';

import { useCallback, useEffect, useState } from 'react';
import { getVolcano } from '@/lib/volcano';
import { readExecution, type Execution, type SendOutboundResult } from '@/lib/execution';

const FUNCTION_NAME = 'send-outbound';
const POLL_MS = 3000;
const TERMINAL = new Set<Execution['status']>(['succeeded', 'failed', 'timed_out', 'stopped', 'unknown']);

const DRAFT = {
  to: 'jordan@example.com',
  amount: 8000,
  body:
    'Hi Jordan, following up on the hackathon sponsorship. We can hold the Gold tier through Friday at $8,000. Want me to send the agreement?',
  policy: 'External email with a dollar amount needs a human yes.',
};

type Started = { id: string; name: string; clientToken?: string };

export default function AgentInbox() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [started, setStarted] = useState<Started | null>(null);

  const [execution, setExecution] = useState<Execution | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);

  // On load: restore a session if one exists, otherwise sign in anonymously.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const volcano = getVolcano();
      const restored = await volcano.initialize();
      if (cancelled) return;
      if (restored.user) {
        setUserId(restored.user.id);
        return;
      }
      const { user, error } = await volcano.auth.signInAnonymously();
      if (cancelled) return;
      if (error || !user) {
        setAuthError(error?.message ?? 'Anonymous sign-in returned no user.');
        return;
      }
      setUserId(user.id);
    })().catch((cause: unknown) => {
      if (!cancelled) setAuthError(cause instanceof Error ? cause.message : String(cause));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the execution every 3 seconds until it reaches a terminal status.
  // A throttled read sets error.retryAfter (seconds); wait that long instead.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const read = await readExecution(getVolcano(), FUNCTION_NAME, started.id, started.clientToken);
      if (cancelled) return;
      if (read.error || !read.data) {
        const seconds =
          read.error?.retryAfter && read.error.retryAfter > 0 ? read.error.retryAfter : POLL_MS / 1000;
        setReadNote(`${read.error?.message ?? 'The read returned nothing'}. Retrying in ${seconds}s.`);
        timer = setTimeout(tick, seconds * 1000);
        return;
      }
      setReadNote(null);
      setExecution(read.data);
      if (!TERMINAL.has(read.data.status)) timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [started]);

  const requestSend = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    setExecution(null);
    setReadNote(null);
    const { data, status, error } = await getVolcano().durable.start(
      FUNCTION_NAME,
      { to: DRAFT.to, amount: DRAFT.amount, body: DRAFT.body },
      { executionName: 'draft-' + Date.now() },
    );
    setStarting(false);
    if (error || !data) {
      setStartError(error?.message ?? `The start was refused with HTTP ${status ?? 'none'}.`);
      return;
    }
    setStarted({ id: data.id, name: data.name, clientToken: data.client_token });
  }, [starting]);

  const inFlight = starting || (started !== null && (execution === null || !TERMINAL.has(execution.status)));
  const canRequest = userId !== null && !inFlight;

  return (
    <main className="page">
      <header className="header">
        <h1>Agent inbox</h1>
        <p className="small" role="status">
          {userId ? `signed in as ${userId}` : authError ? 'not signed in' : 'signing in…'}
        </p>
        {authError && (
          <p className="small alert" role="alert">
            Sign-in failed: {authError}
            {authError.includes('anonymous signins are disabled') && (
              <>
                {' '}
                Set <code>auth.signup.enable_anonymous_signins: true</code> in <code>volcano/volcano-config.yaml</code>{' '}
                and deploy the project again.
              </>
            )}
          </p>
        )}
      </header>

      <section className="card" aria-labelledby="draft-heading">
        <h2 id="draft-heading">Draft</h2>
        <dl className="field">
          <dt>To</dt>
          <dd>{DRAFT.to}</dd>
          <dt>Amount</dt>
          <dd>${DRAFT.amount.toLocaleString('en-US')}</dd>
          <dt>Body</dt>
          <dd className="body-text">{DRAFT.body}</dd>
        </dl>
        <p className="policy">
          <strong>Policy:</strong> {DRAFT.policy}
        </p>
      </section>

      <div className="actions">
        <button type="button" onClick={requestSend} disabled={!canRequest} aria-busy={starting}>
          {starting ? 'Requesting…' : 'Agent: request to send'}
        </button>
        {startError && (
          <span className="small alert" role="alert">
            {startError}
          </span>
        )}
      </div>

      <section className="card status" aria-labelledby="status-heading" aria-live="polite">
        <h2 id="status-heading">Status</h2>
        <StatusView started={started} execution={execution} readNote={readNote} />
      </section>

      <footer className="small">Built on Volcano by Amy Mayernik. Not affiliated with Kong or Volcano.</footer>
    </main>
  );
}

function StatusView({
  started,
  execution,
  readNote,
}: {
  started: Started | null;
  execution: Execution | null;
  readNote: string | null;
}) {
  if (!started) {
    return <p className="small">No request yet. Nothing sends until a person says yes.</p>;
  }

  if (!execution) {
    return (
      <>
        <p>Request accepted. Reading the execution…</p>
        {readNote && <p className="small">{readNote}</p>}
        <ExecutionId id={started.id} />
      </>
    );
  }

  switch (execution.status) {
    case 'pending':
    case 'running':
      return (
        <>
          <p>
            <span className="tag">running</span>
            Waiting for a person to approve. Approve it in the Volcano dashboard or with: volcano cloud durable
            approvals list / approve &lt;id&gt; --yes
          </p>
          <pre>
            {'volcano cloud durable approvals list\nvolcano cloud durable approvals approve <id> --yes'}
          </pre>
          {readNote && <p className="small">{readNote}</p>}
          <ExecutionId id={execution.id} />
        </>
      );

    case 'succeeded':
      return <SucceededView execution={execution} />;

    case 'failed':
    case 'timed_out':
    case 'stopped':
      return (
        <>
          <p>
            <span className="tag bad">{execution.status}</span>
            {execution.error?.type ?? 'No error type'}: {execution.error?.message ?? 'no message'}
          </p>
          <ExecutionId id={execution.id} />
        </>
      );

    default:
      return (
        <>
          <p>
            <span className="tag bad">{execution.status}</span>
            The platform could not establish how this execution ended.
          </p>
          <ExecutionId id={execution.id} />
        </>
      );
  }
}

function SucceededView({ execution }: { execution: Execution }) {
  const result = (execution.result ?? null) as SendOutboundResult | null;
  if (!result) {
    return (
      <>
        <p>
          <span className="tag ok">succeeded</span>
          {execution.result_expired ? 'The result is no longer retained.' : 'The function returned nothing.'}
        </p>
        <ExecutionId id={execution.id} />
      </>
    );
  }
  return (
    <>
      <p>
        <span className={result.sent ? 'tag ok' : 'tag bad'}>{result.sent ? 'sent' : 'not sent'}</span>
        {result.sent ? 'The email went out.' : 'The email was not sent.'}
      </p>
      <dl className="field">
        <dt>sent</dt>
        <dd>{String(result.sent)}</dd>
        <dt>reason</dt>
        <dd>{result.reason ?? (result.sent ? 'approved' : 'not given')}</dd>
        <dt>by</dt>
        <dd>{result.by ?? 'not recorded'}</dd>
        <dt>comment</dt>
        <dd>{result.comment ?? 'none'}</dd>
      </dl>
      <pre aria-label="Raw result">{JSON.stringify(execution.result, null, 2)}</pre>
      <ExecutionId id={execution.id} />
    </>
  );
}

function ExecutionId({ id }: { id: string }) {
  return (
    <p className="small">
      Execution <code>{id}</code>
    </p>
  );
}
