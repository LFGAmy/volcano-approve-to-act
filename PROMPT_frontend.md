Read AGENTS.md, then the volcano-platform and volcano-sdk skills, before writing anything.

Build a one-page Next.js app for this repo called "Agent inbox". It is the frontend for the durable function `send-outbound` in volcano/functions/send-outbound/index.js (read it first). The function is deployed with visibility: authenticated.

Requirements:
- Create the app under frontend/ (App Router, TypeScript, no UI library, plain CSS). Add .volcano/source-layout.json at the repo root: { "version": 1, "frontends": [{ "name": "agent-inbox", "workspace": "frontend", "app_root": "" }] }.
- Use @volcano.dev/sdk in the browser with NEXT_PUBLIC_VOLCANO_API_URL and NEXT_PUBLIC_VOLCANO_ANON_KEY (these names already exist in volcano/volcano.env.example). Never use the service key anywhere in the frontend.
- On load, sign the visitor in anonymously with the SDK's anonymous sign-in. Show "signed in as <user id>" in small text.
- Show one hard-coded draft: to jordan@example.com, amount 8000, body "Hi Jordan, following up on the hackathon sponsorship. We can hold the Gold tier through Friday at $8,000. Want me to send the agreement?" and the policy line "External email with a dollar amount needs a human yes."
- A button "Agent: request to send" calls volcano.durable.start('send-outbound', { to, amount, body }, { executionName: 'draft-' + Date.now() }). Keep data.id and data.client_token in state.
- Poll volcano.durable.getFromApplication('send-outbound', id, { clientToken }) every 3 seconds. Show status: running = "Waiting for a person to approve. Approve it in the Volcano dashboard or with: volcano cloud durable approvals list / approve <id> --yes". succeeded = show data.result as a readable summary (sent true/false, reason, by, comment) plus the raw JSON. failed/timed_out/stopped = show data.error.type and message.
- Handle error.retryAfter on reads by waiting that long.
- No auth UI, no database, no approvals list in the page (listing needs an owner token and must not be in a browser).
- Footer: "Built on Volcano by Amy Mayernik. Not affiliated with Kong or Volcano."
- Plain look: system font, near-white background, one accent color, no gradients.

Do not invent SDK methods. If a method or option is not in the volcano-sdk skill or docs.volcano.dev/llms.txt, stop and tell me instead of guessing.

When done, tell me the exact commands to run it against the local Volcano server (volcano start is already running) and against the cloud, and what I should see at each step. Do not run deploy commands yourself; I run them.
