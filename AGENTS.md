<!-- volcano:connect:start -->
## Volcano

This directory is linked to a Volcano cloud project in .volcano/project.json
(gitignored). Volcano CLI commands run here use that project. If the file is
missing, run `volcano connect .` here.

- Before writing code for this project, read the volcano-platform and
  volcano-sdk skills. If they are missing, run `volcano setup`.
- volcano/cloud.env holds the project's API URL and anon key. It is gitignored.
- Run locally: `volcano start`, then `volcano deploy --with-migrations`.
- Deploy to the cloud project: `volcano cloud deploy --env-file volcano/cloud.env`.
- Dashboard: https://volcano.dev/dashboard
<!-- volcano:connect:end -->
