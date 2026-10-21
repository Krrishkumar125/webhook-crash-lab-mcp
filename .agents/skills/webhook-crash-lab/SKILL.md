---
name: webhook-crash-lab
description: Test and fix webhook handlers (Stripe, GitHub) so they survive duplicate, concurrent and out-of-order deliveries and reject forged, missing or stale signatures. Use when writing, reviewing or debugging a webhook endpoint, after generating webhook code, or when a user reports double credits, double emails, "No signatures found matching the expected signature", or webhooks failing in production.
---

# webhook-crash-lab

Webhook providers deliver events **at least once**: retries, duplicates, parallel copies, wrong order.
webhook-crash-lab replays those deliveries against the real handler and checks both HTTP status and
business state (for example "credits granted exactly once").

## Loop

1. **Find the handler** (`/webhook` route, `app/api/webhooks/*/route.ts`, `constructEvent` call).
2. **Config.** If no `crash-lab.config.{mjs,js,ts}` exists, run `npx webhook-crash-lab init` and fill it in:
   - `target`: the local dev URL of the webhook route, or an in-process `(req: Request) => Response` handler.
   - `secret`: a **test** signing secret the handler verifies with (set it in the handler's env too).
   - `event`: a realistic event (for example `checkout.session.completed`).
   - `adapter` (`reset` / `snapshot`) + `expect.once`: needed for the duplicate scenarios. Point it at a
     **test database only**, because `reset()` wipes state before every scenario.
   - `sequence`: real event order, for the out-of-order scenario.
3. **Run.** Call the `run_crash_lab` MCP tool with `{ configPath, cwd }`. Without the MCP server, use
   `npx webhook-crash-lab run crash-lab.config.mjs --json crash-lab-report.json`, then
   `explain_report` or read the JSON. Exit codes: 0 pass, 1 failures, 2 config error.
4. **Fix the handler**, one failure at a time, in the order returned (signature → body → duplicates → ordering).
   Use each failure's `fix` hint. Typical fixes:
   - raw body for signature checks (`express.raw()`, `await req.text()`), never `express.json()` first;
   - a unique insert on `event.id` (processed-events table) **before** side effects, in the same transaction;
   - BullMQ `queue.add(name, data, { jobId: event.id })`;
   - ignore events older than the latest one already applied for that object.
5. **Re-run** the same tool with the same arguments. Repeat until `ok` is `true`. Do not weaken the config
   or remove scenarios to make it pass.
6. Suggest adding `npx webhook-crash-lab run` to CI, and the ESLint plugins
   `eslint-plugin-webhook-safety` / `eslint-plugin-bullmq` for the static versions of these checks.

## Rules

- Never point crash-lab at production URLs, production databases or live secrets.
- `not-tested` means the config lacks what that scenario needs (adapter / expect.once / sequence). Say so; do not report it as passing.
- `run_demo` (no config needed) shows a broken vs fixed app if the user wants to see what is checked.
