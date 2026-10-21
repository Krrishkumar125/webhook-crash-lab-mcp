# webhook-crash-lab-mcp

[![CI](https://github.com/Krrishkumar125/webhook-crash-lab-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Krrishkumar125/webhook-crash-lab-mcp/actions/workflows/ci.yml)

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

## License

MIT © Krrish Kumar
