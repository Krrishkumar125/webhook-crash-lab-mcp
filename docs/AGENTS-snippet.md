<!-- Paste into AGENTS.md (Codex, Cursor, others) or CLAUDE.md. -->

## Webhooks

- Any change to a webhook handler must pass webhook-crash-lab before it is done:
  `npx webhook-crash-lab run crash-lab.config.mjs --json crash-lab-report.json` (exit 0 = pass).
  If the `webhook-crash-lab` MCP server is available, use its `run_crash_lab` tool instead.
- On failure: fix the handler using each failure's `fix` hint, then re-run. Never edit the config or drop scenarios to make it pass.
- Signature checks need the raw body (`express.raw()` / `await req.text()`). Dedupe on `event.id` before side effects. BullMQ jobs from webhooks use `jobId: event.id`.
- Crash-lab configs must use a test database and test secrets only.
