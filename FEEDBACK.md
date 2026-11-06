# FEEDBACK

One entry per rough edge: what I ran, what I expected, what happened, time lost, what would have fixed it.

## 2026-11-06 · Install and first run

**Ran:** `npm install -g @volcano.dev/cli` then `volcano --version`
**Got:** `volcano v0.71.0 (commit 76bc877, built 2026-11-05T23:01:49Z)`, installed in 3s, no errors.
**Observation (not a rough edge):** First run prints a clear telemetry notice: what is collected, that it is tied to a machine ID and the account when logged in, the opt-out (`volcano telemetry disable`), and that coding agents can send problem reports with `volcano feedback`. Good first impression. The notice is long for a `--version` call; a one-line pointer to `volcano telemetry --help` would read better there.
**Note:** CLI was built the day before this test. Anything below may be hours old.

## 2026-11-06 · Signup: two onboarding paths

**Ran:** `volcano signup` (from the docs quickstart). It prefilled my email from git config, printed a device code, opened the browser. Good.
**Expected:** after signup, the terminal finishes and I run `volcano projects create` + `volcano use`, as the docs quickstart says.
**Got:** the website's post-signup page says something else: "Paste this into your coding agent" with a prompt that runs `npm install -g @volcano.dev/cli` and `volcano connect --device-code <code>`, and "your project opens here when your agent creates it." No mention of `projects create`.
**Why it matters:** a first-timer following the docs and the site at the same time gets two different second steps (`projects create` vs `connect --device-code`) and does not know if they are the same thing. The site path is agent-first (matches the product story); the docs path is hand-first. Pick one as canonical and have the other point to it.
**Time lost:** ~5 min deciding which to follow. Followed the site path, ran the `connect` command by hand.
**Would have fixed it:** one line on the docs quickstart: "If you signed up on the site, your project is created by `volcano connect`; skip `projects create`." (Or the reverse.)

## 2026-11-06 · `volcano signup` never completes after browser signup

**Ran:** `volcano signup` → browser opened with device code 2TKV-ZU6W → signed up with GitHub in the browser.
**Expected:** the browser confirms the device code and the terminal prints "logged in."
**Got:** the browser landed on "Create your first project" with a different flow (`volcano connect --device-code <new code>`). The terminal kept printing "Waiting for authentication" dots for several minutes with no timeout and no hint. Had to Ctrl+C.
**Why it matters:** the two flows do not hand off to each other. A first-timer thinks the install is broken. Nothing tells them the browser step is already done and the terminal step is dead.
**Time lost:** ~5 min watching dots.
**Would have fixed it:** either complete the CLI's device code when the site signup finishes, or have the CLI time out after ~2 min with "Signup finished in the browser? Run `volcano connect --device-code <code>` from the project page." 

**Resolution:** `volcano projects list` showed a project (`villarrica-coral-43`, HOBBY, created 13 min earlier). The site signup had created it and logged the CLI in. The terminal "Waiting for authentication" never learned this. So: signup worked; the CLI feedback did not.

## 2026-11-06 · Site setup prompt copies as a formatted block

**Ran:** "Copy setup prompt" on the post-signup page, pasted into zsh.
**Got:** the paste carried prose lines after the command ("Signing in…" etc.), and the command itself landed wrapped in backticks. zsh ran `volcano connect` via command substitution, then tried to execute its output as a command: `zsh: command not found: Signing`.
**Why it matters:** the prompt is written for a coding agent, which is fine, but the page gives no plain "run this yourself" variant, so a person who pastes it into a terminal gets a shell error that looks like a Volcano error.
**Time lost:** ~5 min.
**Would have fixed it:** a second copy button, "Copy command," that copies only `volcano connect --device-code <code>` as plain text. Also: the device code is hidden behind dots on the page, so you cannot read it to type it by hand.

**Observation:** the project was auto-named (`villarrica-coral-43`). Fine for a first project, but the docs quickstart implies you name it (`volcano projects create my-first-project`). Say on the site page what name was chosen and how to rename it.

## 2026-11-06 · `use`, `doctor`, `setup --dry-run`

**Good:** `volcano use` confirms the project and says where it saved config. `volcano doctor` found Docker CLI 29.5.3 and Compose 5.1.4, flagged the engine not running, and said exactly what to do ("open Docker Desktop or OrbStack, or run 'colima start'"). This is the best error message so far. Local dev needs Docker; the quickstart should say so before `volcano start`, not only in `doctor`.
**Odd:** `volcano setup --dry-run` prints `[planned] claude-code up to date` and then "Would install Volcano for 1 harness(es)." Up to date and would install contradict each other. Probably means "would install; nothing newer available," but say that.

## 2026-11-06 · Docker running, plugin setup

**Good:** `volcano doctor` all green once Docker Desktop was open. Clear next step printed.
**Observation:** `volcano setup --agent claude-code` printed `[current] claude-code already at 0.2.49` on the first time I ever ran setup. Something earlier (`signup` or `connect`) installed the plugin without saying so. Fine outcome, but say it at the time ("Installed Volcano plugin 0.2.49 into Claude Code, restart to apply"), because a user who never ran setup will not restart their agent and the plugin will not load.
**Nice touch:** the "You're set, try asking your agent to build…" box with a concrete example prompt.

## 2026-11-06 · `volcano-config.yaml` format differs between two docs pages

**Ran:** `volcano durable deploy --all` with the config copied from the guide "Developing durable functions locally" (functions as a map keyed by name: `functions:\n  orders:\n    kind: durable`).
**Got:** `invalid manifest: yaml: unmarshal errors: line 2: cannot unmarshal !!map into []projectconfig.FunctionManifest`.
**Cause:** the CLI (v0.71.0) expects a list (`functions:\n  - name: orders\n    kind: durable`), which is the form on the "Durable functions" reference page. The local guide shows the map form. Two pages, two shapes, one is wrong.
**Also:** `volcano init` creates no `volcano-config.yaml` at all, and the guide puts the file at the repo root while the scaffold README puts it at `volcano/volcano-config.yaml`. Three places to be confused.
**Time lost:** ~3 min (error message is precise enough to fix fast once you know Go unmarshal errors; a first-timer would not).
**Would have fixed it:** have `volcano init` write an example `volcano/volcano-config.yaml` with one commented-out function in the correct shape, and fix the guide to the list form.

**Follow-up:** with the list form, the CLI then rejected `runtime`, `handler` and `durable:` as unknown fields (`field runtime not found in type projectconfig.FunctionManifest`). So the local guide's whole config block is wrong for v0.71.0, not just its shape. Trimmed to `- name: orders` + `kind: durable` (what the reference page shows; runtime inferred from the file extension). Where do `execution_timeout_seconds` and `retention_days` go now? Not documented anywhere I can find.

**Follow-up 2:** next error: `unsupported manifest version 0 (expected 1)`. The manifest needs a top-level `version: 1`. Neither the local guide nor the durable functions reference shows it. Three edits to get a two-line config file accepted. `volcano config pull` would have shown the real shape; the error messages should say "run `volcano config pull` to see a valid manifest."

## 2026-11-06 · First durable deploy and start (local)

**Good:** `volcano durable deploy --all` with the four-line manifest worked: runtime inferred (nodejs24.x), archive 467B, active. The post-deploy note about visibility is excellent: it says new durable functions are private, who can start them, and the two exact ways to open them up (`visibility: authenticated` in the manifest + `volcano config deploy`, or `--visibility` on redeploy). This is the message quality every error above should have.
**Good:** `volcano durable start` prints the exact follow-up command with the ID filled in.
**Small:** `start` prints `ID:` and `Name:` and both are UUIDs. The follow command uses ID, not Name. A first-timer will copy the wrong one. Make Name something readable by default (the docs say `X-Volcano-Execution-Name` is an idempotency key, so a readable default like `orders-2026-11-05-194853` would also show what it is for).

## 2026-11-06 · First execution fails: SDK not installed, error hides it

**Ran:** `volcano durable start orders …` then `executions get`.
**Got:** `Status: failed · Error Type: MalformedHandlerResponse · Error: durable handler reported unknown status ""` in 0s.
**Real cause (from `volcano durable logs orders --type runtime`):** `Runtime.ImportModuleError: Cannot find module '@volcano.dev/sdk/durable'`. The deploy archive was 467B, i.e. only index.js. Nothing in `volcano init`, the local guide, or the deploy output installs or mentions `@volcano.dev/sdk` for functions. The Install page says "Install the Volcano CLI and the JavaScript SDK" but the guide's steps never do it.
**Why it matters:** the surfaced error ("unknown status") is two layers away from the cause. A first-timer who does not know to run `durable logs --type runtime` is stuck.
**Time lost:** ~6 min.
**Would have fixed it:** (1) `executions get` should print the runtime error when the failure is an import error, or at least "run `volcano durable logs <fn> --type runtime`"; (2) the local guide needs `npm init -y && npm install @volcano.dev/sdk` inside the function directory, with a note that the archive only packs the function folder; (3) `volcano init` could scaffold one function with a package.json already in place.

**Resolution:** with `package.json` + `@volcano.dev/sdk` in the function folder, redeploy archived 2.7KB (package.json only, no node_modules) and the execution succeeded in 1s: `{"charged":"ch_1"}`. So the local build installs from package.json. Worth one sentence in the guide: "the archive packs your function folder; dependencies are installed from its package.json at build time."

## 2026-11-06 · Milestone: first durable function succeeded locally
Charge step, 24h wait (instant locally), receipt step, result returned. Time from `volcano start` to green: ~25 min including four config/dependency fixes that the docs could have prevented.

## 2026-11-06 · `volcano connect` created a nested project folder

**Ran:** `volcano connect --device-code …` from the repo root (the website's setup prompt), then later `volcano init` at the root.
**Got:** `connect` created a subfolder named after the auto-named project (`villarrica-coral-43/`) holding `.volcano/project.json` (the project link), `AGENTS.md`, and `volcano/cloud.env` with the cloud keys. `init` at the root made a second scaffold. I only noticed when `git commit` listed 16 files including the nested ones.
**Why it matters:** the project link and the cloud keys live one folder down from where I am working, so cloud commands from the root would not be linked, and a first-timer has two `volcano/` folders and no idea which is real. `connect` printed its output inside a backtick-mangled line (see above), so I never saw where it put things.
**Good:** `AGENTS.md` is a nice touch: tells coding agents to read the volcano-platform and volcano-sdk skills and where the keys live. The nested `.gitignore` correctly ignores the project link and `*.env`.
**Time lost:** ~5 min.
**Would have fixed it:** `connect` run inside an existing directory should ask "link this directory or create a subfolder?" (the help text says "link a directory"), and print the resulting path on its own line. Moved `.volcano/`, `AGENTS.md` and `volcano/cloud.env` to the root; deleted the subfolder.

## 2026-11-06 · Milestone: approval wait works end to end (local)

`send-outbound` started 19:53:18, suspended on `waitForApproval`, showed in `volcano durable approvals list` as pending with a 24h expiry, approved from the CLI with a comment at 19:54:27, resumed and returned `{ sent: true, by, comment, messageId }` at 19:54:28. 1m10s total, ~1m09s of it waiting.
**Good:** `approvals approve` echoes the full request (title, description, details JSON, decider, time, comment) and says "the workflow resumes with the decision." Best output in the CLI so far.
**Small:** locally the decider is a placeholder identity (`clearwater@volcano.dev`). Fine, but the guide should say so, or a first-timer wonders who that is.
**Small:** `approvals list` shows the Execution as the Name UUID, while `executions get` wants the ID UUID. Same ID/Name confusion as before, now in two commands.

## 2026-11-06 · Deny path (local)
Second execution denied from the CLI with a comment. Execution finished `succeeded` with `{ sent: false, reason: "denied", comment }`. Denial is a result, not an error, exactly as the approvals page says. 4m15s, all of it waiting. Acceptance tests 1 to 4 of the recipe now pass by hand.

## 2026-11-06 · Expiry path (local)
Set `timeout: '10s'`, started one, did nothing. Finished `succeeded` after 11s with `{ sent: false, reason: "expired", comment: null }`. Confirms approval timeouts run in real time locally (the docs say so; good to see). Set back to 24h. All three decision outcomes verified: approved, denied, expired.

## Time check
From `npm install -g @volcano.dev/cli` to all three outcomes verified locally: about 1h 15m, of which roughly 35 min was spent on things the docs or CLI could have prevented (signup handoff, config format, missing SDK install, nested connect folder).

## 2026-11-06 · Cloud deploy

**Good:** `volcano cloud durable deploy --all` worked first try with the same files as local. Provisioning took ~2.5 min, then active in 8 regions. Execution started in us-west-2 (nearest). Defaults: 366-day execution timeout, 30-day retention, so the guide's `execution_timeout_seconds` / `retention_days` fields are not needed for a first function.
**Small:** `approvals list --status pending` run ~5s after `start` returned "No pending approvals"; ~2 min later the approval showed with "Requested 2m ago". So the approval existed, it just was not listable yet. A note ("approvals may take a few seconds to appear") or a retry hint would stop a first-timer from thinking the wait was skipped.

## 2026-11-06 · Dashboard, Approvals page

**Good:** "1 approval waiting" badge in the header on every page; Approvals page shows request/pending/approved/denied/expired/cancelled counts, approval rate, median time to decision, a pending table with title, workflow, execution, requested, expires, decided by. Everything a reviewer needs on one screen. This is the screenshot for the recipe.
**Bug:** "Outcomes per day (UTC)" y-axis ticks read `.05, 0.7, .35, 0` for a count of 1. Ticks are not evenly spaced and are fractional for an integer count. Should be 0, 1 (or 0, 1, 2) for small counts.
**Small:** the Execution column links the Name UUID (orange), consistent with the CLI's `approvals list`, but still the "wrong" one for `executions get`. Pick one identifier to show humans everywhere.

## 2026-11-06 · Milestone: approved in the cloud with real identity
Cloud execution started 20:10:07, approval pending, approved from the CLI at 20:14:33 as collab@lfgamy.com, execution succeeded 20:14:34 with `{ sent: true, by: "collab@lfgamy.com", comment, messageId }`. 4m27s, ~4m26s waiting.
**Small:** timestamps around the approval disagree by a few seconds: execution Started 20:10:07, approval Requested 20:10:16, Expires 20:10:14 next day (2s before Requested + 24h). Probably different clocks or rounding; harmless, but a reviewer comparing them will notice.

## Time check 2
Install to cloud-approved: ~2h 05m wall clock, including dashboard screenshots and this log. Pure build time without the four docs/CLI detours: ~1h 15m.


## 2026-11-06 · Frontend: `durable.getFromApplication` is in the docs, not in the SDK

**Ran:** built the Agent inbox page from docs.volcano.dev/sdk/js/durable-functions.md ("Reading and stopping from the application"), which shows `volcano.durable.getFromApplication(name, id, { clientToken })` and `error.retryAfter` for throttled reads.
**Expected:** the method exists in `@volcano.dev/sdk@2.2.0`, the newest release on npm (published 2026-10-28).
**Got:** `typeof volcano.durable.getFromApplication` is `undefined`. Not in the typings, not in the compiled JS, not in the `nightly` tag either (which is older than 2.2.0, built 2026-06-03). The 2.2.0 OpenAPI types still describe the application path as POST-only: "Reading a result or stopping an execution requires the project owner's token." The `volcano-durable` skill (plugin 0.2.49) sides with the SDK, not the docs: reads are owner-scoped, "poll from your own backend or with the CLI."
**Verified:** the REST read the platform docs describe does work on the local server (CLI 0.71.0): `GET /durable-functions/send-outbound/executions/<id>` with `Authorization: Bearer <user access token>` and `X-Volcano-Client-Token` answered 200 with the execution. The server shipped before the SDK did.
**Why it matters:** docs, SDK, and skills disagree three ways on the one call a browser needs, reading the execution it started. Following the docs produces `is not a function` in the browser.
**Workaround:** the page feature-detects `getFromApplication` and otherwise sends the documented REST read with the same headers, mapping `Retry-After` to `error.retryAfter`. The fallback goes when the SDK ships the method.
**Time lost:** ~25 min confirming it was the SDK and not me.
**Would have fixed it:** a "since SDK x.y" marker next to `getFromApplication` in the docs, and the skill and SDK release matching the docs page.

## 2026-11-06 · Anonymous sign-in is off by default and the durable docs do not say where to turn it on

**Ran:** `volcano.auth.signInAnonymously()` against the local server.
**Got:** `403 anonymous signins are disabled for this project`. Same on the cloud project: `volcano cloud config pull` shows `auth.signup.enable_anonymous_signins: false`.
**Fix:** `auth.signup.enable_anonymous_signins: true` in `volcano/volcano-config.yaml`, applied by `volcano deploy` and `volcano cloud deploy`. Found the key by pulling the config. The anonymous-users page only shows the raw `PUT /auth/config` JSON.
**Small:** the SDK docs call the method `signInAnonymously` and mark `signUpAnonymous` as a compatibility alias (the typings say deprecated). The `volcano-auth` skill still teaches `signUpAnonymous`.
**Would have fixed it:** the anonymous-users page showing the manifest key next to the JSON, and the durable docs' "signed-in users include anonymous sign-ins" sentence linking to it.

## 2026-11-06 · Local server reads an execution with no credential

**Ran:** during the smoke test above, the same `GET /durable-functions/send-outbound/executions/<id>` with no `Authorization` header, against `localhost:8000`.
**Got:** 200 with the execution. With the anon key alone: 403 "anon keys can only reach executions of public durable functions", as documented.
**Why it matters:** probably the local server's "everything is the local user" convenience, but it means a local run cannot prove the browser's token is accepted. Worth one line in the local guide, and worth confirming the cloud API answers 401 there.
