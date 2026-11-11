# Changelog

## 0.2.5 (2026-11-11)

- The server now reports its real version to MCP clients. It was stuck at 0.2.2 since that release. The Claude plugin manifest version is fixed too, and a test keeps both equal to the package version.
- Updates @modelcontextprotocol/sdk to 1.32.2 and webhook-crash-lab to 0.3.3 in the lockfile. This also pulls body-parser 2.4.0, which fixes GHSA-27r3-jxmh-p828 (DoS through trailing bytes after a compressed body).
- README, install links, `.mcp.json` and `server.json` point at 0.2.5.

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
