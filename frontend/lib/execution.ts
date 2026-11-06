import type { VolcanoAuth } from '@volcano.dev/sdk';
import { volcanoEnv } from '@/lib/volcano';

// Shape of an execution as the platform returns it.
// https://docs.volcano.dev/platform/functions/durable-functions.md#wait-for-the-result
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'stopped'
  | 'unknown';

export type Execution = {
  id: string;
  function_id?: string;
  name: string;
  status: ExecutionStatus;
  region?: string;
  result?: unknown;
  result_expired?: boolean;
  error?: { type?: string; message?: string };
  created_at?: string;
  completed_at?: string;
};

// What send-outbound returns. See volcano/functions/send-outbound/index.js.
export type SendOutboundResult = {
  sent: boolean;
  reason?: string;
  by?: string | null;
  comment?: string | null;
  messageId?: string;
};

export type ExecutionReadError = Error & {
  status?: number | null;
  code?: string;
  retryAfter?: number;
};

export type ExecutionRead = {
  data: Execution | null;
  status: number | null;
  error: ExecutionReadError | null;
};

type GetFromApplication = (
  functionName: string,
  executionId: string,
  options: { clientToken?: string },
) => Promise<ExecutionRead>;

// Read one execution with the credential that started it.
//
// The SDK docs describe volcano.durable.getFromApplication(name, id, { clientToken })
// (https://docs.volcano.dev/sdk/js/durable-functions.md#reading-and-stopping-from-the-application),
// but @volcano.dev/sdk 2.2.0, the newest release, does not ship it. When the
// installed SDK has the method it is used. Otherwise this sends the exact
// request the platform docs give for the same read, and maps a throttled
// answer's Retry-After header to error.retryAfter the way the SDK docs say
// the method does. Remove the fallback once the SDK ships the method.
export async function readExecution(
  volcano: VolcanoAuth,
  functionName: string,
  executionId: string,
  clientToken: string | undefined,
): Promise<ExecutionRead> {
  const durable = volcano.durable as unknown as { getFromApplication?: GetFromApplication };
  if (typeof durable.getFromApplication === 'function') {
    return durable.getFromApplication(functionName, executionId, { clientToken });
  }
  return readExecutionOverHttp(volcano, functionName, executionId, clientToken);
}

async function readExecutionOverHttp(
  volcano: VolcanoAuth,
  functionName: string,
  executionId: string,
  clientToken: string | undefined,
): Promise<ExecutionRead> {
  const { apiUrl, anonKey } = volcanoEnv();
  const {
    data: { session },
  } = await volcano.auth.getSession();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.access_token ?? anonKey}`,
  };
  if (clientToken) headers['X-Volcano-Client-Token'] = clientToken;

  const url = `${apiUrl.replace(/\/$/, '')}/durable-functions/${encodeURIComponent(
    functionName,
  )}/executions/${encodeURIComponent(executionId)}`;

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: 'no-store' });
  } catch (cause) {
    const error: ExecutionReadError = new Error(
      cause instanceof Error ? cause.message : 'Network error while reading the execution',
    );
    error.status = null;
    return { data: null, status: null, error };
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Execution read failed with HTTP ${response.status}`;
    const error: ExecutionReadError = new Error(message);
    error.status = response.status;
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter;
    return { data: null, status: response.status, error };
  }

  if (!body || typeof body !== 'object' || typeof (body as Execution).id !== 'string') {
    const error: ExecutionReadError = new Error('Execution read returned an unexpected body');
    error.status = response.status;
    return { data: null, status: response.status, error };
  }

  return { data: body as Execution, status: response.status, error: null };
}
