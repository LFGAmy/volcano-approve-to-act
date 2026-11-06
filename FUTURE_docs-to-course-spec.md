# Volcano cookbook recipe: turn your docs into a course

Work sample for the Volcano (Kong) Developer Advocate application (applied Nov 4 2026). One cookbook recipe, built on Volcano, written up with the code, the decisions and the gotchas. Not a product. Started Nov 6 2026.

## What ships
- Public repo `LFGAmy/volcano-docs-to-course` (MIT).
- `RECIPE.md`: the cookbook write-up. What we built, why each piece is on Volcano, the decisions, the gotchas. This is the deliverable.
- Live demo on Volcano frontend hosting: one track, five lessons on durable functions and approvals, each with concept, pattern, runnable JS SDK example, expected output, 3-question quiz, source citations. "Volcano Durable Functions" badge issued as an Open Badges 3.0 credential with a public verify page.
- `FEEDBACK.md`: everything confusing, missing or wrong in the docs, CLI and SDK while building. Written as reports an engineer can act on.
- A 3 to 5 minute screen recording walking the pipeline and the gate.
- One build-in-public thread (LinkedIn) when it ships.

## Why this recipe (maps to the posting)
- "Own the Volcano Cookbook": this is a recipe with code, decisions and gotchas, and the pipeline drafts more.
- "Templates people can deploy in one step": the app is a Next.js + durable function + Postgres + auth template. Swap the docs URL.
- "Tooling that lets a small team publish more without the quality slipping": the verify gate.
- "Be customer zero": FEEDBACK.md.
- "Built in public in the last year": repo, thread, video.

## Source material (only these pages; do not pull llms-full.txt)
https://docs.volcano.dev/llms.txt lists every page with a `.md` URL. Fetch:
- platform/functions/durable-functions.md
- platform/functions/durable-approvals.md
- platform/functions/durable-callbacks.md
- platform/functions/durable-messages.md
- platform/guides/durable-functions-locally.md
- sdk/js/durable-functions.md
- cli/durable-functions.md
- platform/functions/overview.md, creating-functions.md, invoking-functions.md (context for lesson 1)
- platform/frontends/deploy.md (for hosting the site itself)

## Lesson outline (generator may refine but must stay inside the source pages)
1. Your first durable function: checkpointing, `durable` wrapper from `@volcano.dev/sdk/durable`, `kind: durable` in volcano-config.yaml, run with `volcano start` + `volcano durable deploy --all` + `volcano durable start`, read the result with `volcano durable executions get`.
2. Steps and replay: `ctx.step`, `ctx.wait` (not sleep), why code between operations must be deterministic, what the operations trace shows, local waits resolve instantly unless LOCAL_DURABLE_REAL_TIME=true.
3. Waiting on a human: `ctx.waitForApproval(name, { title, description, details, timeout })`, branch on `approved` / `status` ('approved' | 'denied' | 'expired'), decide via dashboard or `volcano cloud durable approvals approve <id>`, who can decide (person or pk- token only; project tokens get 403).
4. Waiting on another system: durable callbacks vs durable messages. When to use which.
5. Fan-out and deploy: `ctx.parallel`, `ctx.map`, `ctx.child`, several approvals at once, limits (3,000 operations per execution, 100 pending approvals, 600 approval requests/hour), then `volcano cloud durable deploy --all` unchanged from local.

## Pipeline (scripts/, run once, commit the JSON output)
1. `fetch.ts`: download the source pages to `sources/*.md`, URL in frontmatter.
2. `outline.ts`: Claude Sonnet 5.5, structured output, `content/outline.json`.
3. `lessons.ts`: Sonnet 5.5, one call per lesson, `content/lessons/NN.json`. Schema: title, objective, concept, pattern, example (JS, runnable), expectedOutput, tryIt (steps in the learner's own free Volcano project), citations (source URL + quoted sentence per claim).
4. `quizzes.ts`: Haiku 5.5, 3 questions per lesson, each with the source sentence that makes the correct answer correct.
5. `verify.ts`: the gate, two layers.
   - Code: API names, CLI commands, flags and numeric limits are exact string matches against the cited source chunk. No model involved. Numbers never go to a model.
   - Judge: each prose claim is sent with its source chunk as a bounded question ("supported by this text?") and gets a yes/no plus confidence. Day one: Haiku. Day two: TypeSafe Jev through the same adapter (Jev returns typed decisions with calibrated confidence, cannot write text, $0.042/M input, output free, early access via console.typesafe.ai). Thresholds: auto-pass >= 0.9, auto-fail < 0.5, the middle goes to Amy. Record what each judge caught and missed; that comparison goes in RECIPE.md.
   Failures go to `content/verify-report.md` and mark the lesson `draft`. Nothing ships marked draft. Amy reads the report before publish.
6. `lib/model.ts`: one adapter for all model calls (Anthropic for writing, Anthropic or TypeSafe for the judge). Swappable by env var.

## App (Next.js App Router, hosted on Volcano frontends)
- Routes: `/` track, `/lessons/[n]`, `/quiz/[n]`, `/badge/[id]` (public verify), `/claim`.
- Volcano auth (anonymous signup) so progress and scores persist in Volcano Postgres.
- Badge: on passing all five quizzes, a Volcano function issues an Open Badges 3.0 JSON credential, stores it, verify page renders it with an "Add to LinkedIn" link. Signing is a later step.
- Look: plain and readable. No gradients. LFGAmy credit in the footer, "not affiliated with Kong or Volcano."

## Three-day plan (each day ends shippable on its own)
Day 1: `volcano login`, create project, hello-page frontend deploy (hosting first). Pipeline steps 1 to 5 with the Haiku judge. Read verify-report.md, fix or cut. Deploy the five lessons as static pages, no accounts. End of day 1 = a readable course at a URL.
Day 2: Volcano auth (anonymous), progress in Postgres, quizzes, badge-issuing durable function, verify page. Swap the judge to Jev, rerun the gate, record the comparison. If auth or durable functions fight back, log it in FEEDBACK.md and ship day 1's site; if Jev is flaky, keep Haiku.
Day 3: engineering/security review pass, cold consumer read (a developer who has never seen Volcano), RECIPE.md, FEEDBACK.md cleanup, screen recording, repo public, note to the hiring manager, LinkedIn thread.

## Keep it small
- "Add to LinkedIn" is a link to LinkedIn's add-certification URL with the fields prefilled. Build nothing for it.
- No WebContainers or sandboxes. The learner runs examples in their own free Volcano project.
- No credential signing in v1. The public verify page is the proof.

## Rules
- Never invent an API name, flag or limit. If it is not in the source pages it does not go in a lesson.
- No em dashes anywhere in copy.
- Cite every lesson back to the doc page it came from, visibly, at the bottom.
- Log every rough edge in FEEDBACK.md the moment it happens, with the command, what was expected, what happened.
- Commit messages are Amy's. No attribution trailers.
