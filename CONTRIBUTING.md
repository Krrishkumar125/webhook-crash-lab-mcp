# Contributing

```sh
npm ci
npm test                 # core + in-memory MCP client tests
npm run lint && npm run typecheck
npm run smoke            # packs, installs the tarball, talks to the installed bin over stdio
npx -y @anthropic-ai/claude-code plugin validate .
```

`skills/webhook-crash-lab/SKILL.md` (Claude Code) and `.agents/skills/webhook-crash-lab/SKILL.md` (Codex) must stay
identical; a test enforces it. Edit one and copy it over.
