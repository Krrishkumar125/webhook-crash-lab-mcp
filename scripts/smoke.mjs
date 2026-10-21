// Packs the package, installs the tarball in a throwaway project, starts the installed
// `webhook-crash-lab-mcp` bin over stdio with the official MCP client and calls the tools.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const work = mkdtempSync(join(tmpdir(), 'wcl-mcp-smoke-'));
execFileSync('npm', ['pack', '--pack-destination', work], { cwd: root, stdio: 'inherit' });
const tgz = readdirSync(work).find((f) => f.endsWith('.tgz'));
writeFileSync(
  join(work, 'package.json'),
  JSON.stringify({ name: 'smoke', private: true, type: 'module' }),
);
execFileSync('npm', ['i', '--no-audit', '--no-fund', '-s', `./${tgz}`], {
  cwd: work,
  stdio: 'inherit',
});

const pkg = join(work, 'node_modules/webhook-crash-lab-mcp');
for (const f of [
  '.claude-plugin/plugin.json',
  '.mcp.json',
  'skills/webhook-crash-lab/SKILL.md',
  '.agents/skills/webhook-crash-lab/SKILL.md',
]) {
  if (!existsSync(join(pkg, f))) throw new Error(`packed package is missing ${f}`);
}

const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(
  new StdioClientTransport({
    command: join(work, 'node_modules/.bin/webhook-crash-lab-mcp'),
    cwd: work,
    stderr: 'ignore',
  }),
);
const { tools } = await client.listTools();
const names = tools
  .map((t) => t.name)
  .sort()
  .join(',');
if (names !== 'explain_report,list_scenarios,run_crash_lab,run_demo')
  throw new Error(`unexpected tools: ${names}`);
const broken = await client.callTool({ name: 'run_demo', arguments: { mode: 'broken' } });
const fixed = await client.callTool({ name: 'run_demo', arguments: { mode: 'fixed' } });
await client.close();
if (broken.structuredContent?.ok !== false || fixed.structuredContent?.ok !== true) {
  throw new Error('demo results unexpected');
}
console.log(
  `smoke ok: tools=${names}; broken failures=${broken.structuredContent.failures.length}; fixed ok`,
);
