# Volcano cookbook recipe: Approve to act

One-day work sample for the Volcano (Kong) Developer Advocate application (applied Nov 4 2026). A durable function that waits for a human, built with Claude Code on Volcano, written up as a cookbook recipe. Nov 6 2026.

The bigger docs-to-course build is parked in FUTURE_docs-to-course-spec.md. Propose it as a 30-day plan if Volcano engages.

## Scenario (decided Nov 6)
An AI agent drafts an outbound email that contains a dollar amount. Policy says a person must approve before it sends. The durable function `send-outbound` saves the draft in a step, calls `ctx.waitForApproval`, and sends on yes. Not the orders example (Volcano's own local guide already uses orders).

## Look (decided Nov 6)
LFGAmy kit as the base so it reads as Amy's: Cream #FFFCF2 paper, Fox Orange #FF8C42 lead accent, Soft Pink #F8A0C2 secondary, Ink #1F1F1F. Fredoka SemiBold headlines, Inter body, JetBrains Mono for every command and label, Caveat for the one "Built with love." closer. Boots small in the footer with 143 · 323 · 367 and www.LFGAmy.com. Volcano appears in names, commands and one "built on volcano" chip. No Volcano logo or colors. Mock approved: claude.ai artifact "Approve to Act".

## RECIPE.md must match Volcano's cookbook format exactly
Their cookbooks (e.g. docs.volcano.dev/cookbooks/realtime-chat.md) use this structure, verbatim headings, direct and imperative tone, no marketing language, reads like a test report:
1. Title + two-sentence intro
2. "What it does" (short, then two screenshots)
3. "What you need" (two bullets)
4. "Build it with your coding agent" (one plain-text prompt block: paste into Claude Code in an empty folder; hyphenated requirements; ends with acceptance tests the agent must run. Then a note on how the prompt was tested: versions, timings, pass/fail.)
5. "Build it yourself" (CLI steps, scaffold layout)
6. One section per piece: the durable function, the approval wait, the frontend page
7. "Configure and deploy" (volcano-config.yaml, env, deploy command)
8. "Check that it works" (manual checks + scripted test + sample output)
9. "Why it's built this way" (five bullets: tradeoffs and limits). Ends there, no CTA.
Gotchas go inline in the step where they happen, not in a separate section. The goal: a page the Volcano team could drop into docs.volcano.dev/cookbooks without editing.

## What ships (one day)
- Public repo `LFGAmy/volcano-approve-to-act` (MIT), deployable with the Volcano CLI in one step.
- Live demo on Volcano: a durable function `send-outbound` that calls `ctx.waitForApproval`, plus a small Next.js page on Volcano frontends (the agent inbox) that shows the draft, its pending approval, and the result after someone decides.
- `RECIPE.md`: the cookbook write-up. What we built, why each piece is on Volcano, the decisions, the gotchas. The deliverable.
- `FEEDBACK.md`: every rough edge in the docs, CLI and SDK, logged the moment it happens with the command, what was expected, what happened. Customer zero.
- A 3-minute screen recording: the agent requests to send, the function suspends, approve it from the CLI, watch it resume and send.
- One short LinkedIn post when it ships (build in public).

## The recipe
Scenario: orders over a limit need a person to say yes before they ship.
1. `volcano/functions/ship-order/index.js`, wrapped with `durable` from `@volcano.dev/sdk/durable`.
   - `ctx.step('reserve', ...)` reserves inventory (fake).
   - `ctx.waitForApproval('ship-order', { title, description, details: { order_id, total }, timeout: '48h' })`.
   - Branch on `decision.approved`; `status` is 'approved' | 'denied' | 'expired'. Denials and expiries are results, not errors.
   - `ctx.step('ship', ...)` on approval; return `{ shipped, by: decision.decidedBy?.email }`.
2. `volcano-config.yaml`: `kind: durable`, runtime nodejs24.x.
3. Local run: `volcano start`, `volcano durable deploy --all`, `volcano durable start ship-order --input '{"order_id":"ord_42","total":900}'`, `volcano durable approvals list`, `volcano durable approvals approve <id> --comment "ok" --yes`, `volcano durable executions get ship-order <id>`.
4. Deploy: `volcano cloud durable deploy --all`, then the frontend with `volcano cloud deploy`.
5. Frontend: one page. Button "Place order," list of pending approvals (via the SDK owner client), result once decided. Volcano auth anonymous sign-in only if the frontend needs a token to call the API; otherwise skip auth.

Source pages (the recipe only says what these say):
- https://docs.volcano.dev/platform/functions/durable-functions.md
- https://docs.volcano.dev/platform/functions/durable-approvals.md
- https://docs.volcano.dev/platform/guides/durable-functions-locally.md
- https://docs.volcano.dev/sdk/js/durable-functions.md
- https://docs.volcano.dev/cli/durable-functions.md
- https://docs.volcano.dev/platform/frontends/deploy.md

## Gotchas to look for (and write up)
- Approval timeouts run in real time even locally; other waits resolve instantly unless LOCAL_DURABLE_REAL_TIME=true.
- Only a person (dashboard session or pk- platform token) can approve. Project access tokens get 403.
- Functions deployed before approvals existed must be redeployed (VOLCANO_PLATFORM_API_URL).
- Each approval counts as three durable operations. Limit 100 pending per execution.
- Code between operations must be deterministic; put decisions inside steps.

## Day plan
Morning: `volcano login`, create project, hello-page frontend deploy (hosting first). Function running locally, approve from CLI, confirm the result.
Afternoon: deploy to cloud, the one-page frontend, RECIPE.md, FEEDBACK.md cleanup, screen recording.
Evening: engineering/security review pass and a cold read by someone who has never seen Volcano, repo public, note to the hiring manager, LinkedIn post.

## Rules
- Never invent an API name, flag or limit. If it is not in the source pages it does not go in the recipe.
- No em dashes anywhere in copy.
- Plain English in RECIPE.md. Say what broke.
- Footer / README: made by Amy Mayernik, not affiliated with Kong or Volcano.
- Commit messages are Amy's. No attribution trailers.
