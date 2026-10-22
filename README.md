# webhook-crash-lab-mcp

[![CI](https://github.com/Krrishkumar125/webhook-crash-lab-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Krrishkumar125/webhook-crash-lab-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/webhook-crash-lab-mcp)](https://www.npmjs.com/package/webhook-crash-lab-mcp)
[![downloads](https://img.shields.io/npm/dm/webhook-crash-lab-mcp)](https://www.npmjs.com/package/webhook-crash-lab-mcp)

Coding agents write webhook handlers that work for one test event and break in production on
retries, duplicates and forged signatures. This package gives them a loop: **run
[webhook-crash-lab](https://github.com/Krrishkumar125/webhook-crash-lab) → read structured failures with fix hints → fix → re-run**.

It ships three things:

|                         | What                                                                  | Where                                       |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| MCP server              | `webhook-crash-lab-mcp` (stdio, official MCP TypeScript SDK)          | `src/`                                      |
| Claude Code plugin      | skill + MCP server config                                             | `.claude-plugin/`, `skills/`, `.mcp.json`   |
| Codex / any-agent skill | same skill in the open Agent Skills format, plus an AGENTS.md snippet | `.agents/skills/`, `docs/AGENTS-snippet.md` |

## Tools

| Tool             | Input                                                               | Returns                                                                                             |
| ---------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `run_crash_lab`  | `configPath`, `cwd?`, `scenarios?`, `reportPath?`                   | `ok`, counts, `failures[]` (id, failed checks, why, fix) in fix order, `notTested[]`, `nextSteps[]` |
| `run_demo`       | `mode: "broken" \| "fixed"`                                         | same shape, against the built-in demo app (no config needed)                                        |
| `explain_report` | `reportPath` or `report` (JSON from `webhook-crash-lab run --json`) | same shape, e.g. for a CI report                                                                    |
| `list_scenarios` | –                                                                   | every scenario with what / why / fix                                                                |

Every result comes back as text for the model and `structuredContent` (with an `outputSchema`) for clients.
Errors such as a missing or invalid config come back as `isError` results, not crashes.

## 60-second start

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_MCP_server-0098FF?logo=visualstudiocode)](https://insiders.vscode.dev/redirect/mcp/install?name=webhook-crash-lab&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22webhook-crash-lab-mcp%22%5D%7D)
[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=webhook-crash-lab&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIndlYmhvb2stY3Jhc2gtbGFiLW1jcCJdfQ==)

**Claude Code**

```sh
claude mcp add webhook-crash-lab -- npx -y webhook-crash-lab-mcp
# or the full plugin (MCP server + skill):
#   /plugin marketplace add Krrishkumar125/webhook-crash-lab-mcp
#   /plugin install webhook-crash-lab@webhook-crash-lab
```

**Codex**

```sh
codex mcp add webhook-crash-lab -- npx -y webhook-crash-lab-mcp
mkdir -p .agents/skills && cp -r node_modules/webhook-crash-lab-mcp/.agents/skills/webhook-crash-lab .agents/skills/
```

**Cursor / other MCP clients**

```json
{
  "mcpServers": {
    "webhook-crash-lab": { "command": "npx", "args": ["-y", "webhook-crash-lab-mcp"] }
  }
}
```

Then ask: _"Run the webhook crash lab demo"_, or _"Make my Stripe webhook pass webhook-crash-lab"_.
Paste [`docs/AGENTS-snippet.md`](docs/AGENTS-snippet.md) into `AGENTS.md` / `CLAUDE.md` to make it a standing rule.

## Safety

`run_crash_lab` imports your crash-lab config (`.mjs`/`.js`/`.cjs`, or `.ts`/`.mts`/`.cts` via the bundled jiti) (it is code, like any config file) and sends requests to
its `target`. Point configs at a local server and a **test** database and secret only. The skill tells
agents never to use production URLs or live secrets.

## Related

- [webhook-crash-lab](https://github.com/Krrishkumar125/webhook-crash-lab): the CLI/library this wraps
- [eslint-plugin-webhook-safety](https://github.com/Krrishkumar125/eslint-plugin-webhook-safety) and
  [eslint-plugin-bullmq](https://github.com/Krrishkumar125/eslint-plugin-bullmq): the same bugs, caught statically

## Sibling packages

Other tools by the same author:

- [secret-blast-radius](https://www.npmjs.com/package/secret-blast-radius): what a malicious npm install could steal, plus a rotation plan
- [zod-india](https://www.npmjs.com/package/zod-india): Zod schemas for GSTIN, PAN, IFSC, UPI and Aadhaar
- [create-bullmq-app](https://www.npmjs.com/package/create-bullmq-app): scaffold a production BullMQ + TypeScript service
- [webhook-crash-lab](https://www.npmjs.com/package/webhook-crash-lab): crash-test webhook handlers against duplicates and races
- [eslint-plugin-bullmq](https://www.npmjs.com/package/eslint-plugin-bullmq): lint rules for BullMQ production pitfalls
- [eslint-plugin-webhook-safety](https://www.npmjs.com/package/eslint-plugin-webhook-safety): lint rules for unsafe Stripe webhook handlers

## License

MIT © Krrish Kumar
