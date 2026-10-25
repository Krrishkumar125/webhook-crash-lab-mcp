# Changelog

## 0.2.4 (2026-10-25)

- README, VS Code/Cursor install links and `.mcp.json` pin `npx` to an exact version; README explains how to update. A test keeps the pins equal to the package version.

## 0.2.3 (2026-10-23)

- npm metadata: shorter description, focused keywords, homepage/bugs links; README links sibling packages.
- Adds `mcpName` and `server.json` for the official MCP Registry.

## 0.2.0 (2026-10-22)

- `run_crash_lab` accepts TypeScript configs (`.ts`/`.mts`/`.cts`) by delegating config loading to
  webhook-crash-lab 0.3.0; jiti is bundled so this works on Node 20 too.

## 0.1.0 (2026-10-22)

- MCP server with `run_crash_lab`, `run_demo`, `explain_report`, `list_scenarios`.
- Claude Code plugin (manifest, marketplace, skill, `.mcp.json`) and Codex skill + AGENTS.md snippet.
