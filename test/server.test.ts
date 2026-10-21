import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

const fixtures = resolve(import.meta.dirname, 'fixtures');
const client = new Client({ name: 'test', version: '0.0.0' });

beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([createServer().connect(a), client.connect(b)]);
});
afterAll(() => client.close());

type ToolResult = {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  content: { type: string; text: string }[];
};
const call = (name: string, args: Record<string, unknown>) =>
  client.callTool({ name, arguments: args }) as Promise<ToolResult>;

describe('MCP server', () => {
  it('lists the tools with descriptions', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'explain_report',
      'list_scenarios',
      'run_crash_lab',
      'run_demo',
    ]);
    for (const t of tools) expect(t.description?.length).toBeGreaterThan(40);
  });

  it('run_demo returns structured content and readable text', async () => {
    const r = await call('run_demo', { mode: 'broken' });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent?.ok).toBe(false);
    expect(r.content[0]?.text).toMatch(/FAIL/);
  });

  it('run_crash_lab runs a config file', async () => {
    const r = await call('run_crash_lab', { configPath: 'fixed.config.mjs', cwd: fixtures });
    expect(r.structuredContent?.ok).toBe(true);
    expect(r.content[0]?.text).toMatch(/All scenarios pass/);
  });

  it('returns isError for a bad config instead of crashing', async () => {
    const r = await call('run_crash_lab', { configPath: 'missing.mjs', cwd: fixtures });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/Config not found/);
  });

  it('explain_report and list_scenarios', async () => {
    const demo = await call('run_demo', { mode: 'fixed' });
    expect(demo.structuredContent?.ok).toBe(true);
    const bad = await call('explain_report', { report: '{}' });
    expect(bad.isError).toBe(true);
    const list = await call('list_scenarios', {});
    expect((list.structuredContent?.scenarios as unknown[]).length).toBeGreaterThanOrEqual(8);
  });
});
