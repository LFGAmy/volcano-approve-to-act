# Agent inbox

One page. An agent drafts an outbound email with a dollar amount, asks to send it, and the
`send-outbound` durable function waits for a person to approve before anything goes out.

The page uses `@volcano.dev/sdk` in the browser with two public values:
`NEXT_PUBLIC_VOLCANO_API_URL` and `NEXT_PUBLIC_VOLCANO_ANON_KEY`. No service key, no database,
no approvals list (listing needs an owner token, which does not belong in a browser).

## Run against the local Volcano server

```sh
# from the repo root, with `volcano start` running
volcano deploy                       # applies volcano-config.yaml (anonymous sign-in on) and builds this frontend
cd frontend
npm install
grep '^NEXT_PUBLIC_' ../volcano/volcano.env > .env.local
npm run dev                          # http://localhost:3000
```

## Deploy to the cloud project

```sh
# from the repo root
volcano cloud deploy --env-file volcano/cloud.env
```

Approve or deny the request with `volcano cloud durable approvals list` and
`volcano cloud durable approvals approve <id> --yes` (drop `cloud` for the local server).
