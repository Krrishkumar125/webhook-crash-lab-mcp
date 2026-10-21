import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { explainReport, listScenarios, runDemo, runFromConfig, summarize } from '../src/index.js';

const fixtures = resolve(import.meta.dirname, 'fixtures');

describe('runDemo', () => {
  it('broken demo returns structured failures with fix hints', async () => {
    const s = await runDemo('broken');
    expect(s.ok).toBe(false);
    expect(s.summary.fail).toBeGreaterThan(0);
    const dup = s.failures.find((f) => f.id === 'duplicate-concurrent');
    expect(dup?.fix).toMatch(/event id|event\.id|unique/i);
    expect(dup?.failedChecks.length).toBeGreaterThan(0);
    expect(s.nextSteps.join('\n')).toMatch(/re-run/i);
  });

  it('fixed demo passes', async () => {
    const s = await runDemo('fixed');
    expect(s.ok).toBe(true);
    expect(s.failures).toEqual([]);
    expect(s.nextSteps[0]).toMatch(/All scenarios pass/);
  });
});

describe('runFromConfig', () => {
  it('runs a config file relative to cwd and writes the JSON report', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wcl-mcp-'));
    const reportPath = join(dir, 'report.json');
    const s = await runFromConfig({ configPath: 'broken.config.mjs', cwd: fixtures, reportPath });
    expect(s.name).toBe('fixture broken app');
    expect(s.ok).toBe(false);
    expect(s.reportPath).toBe(reportPath);
    const saved = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(saved.summary.fail).toBe(s.summary.fail);
  });

  it('can restrict scenarios', async () => {
    const s = await runFromConfig({
      configPath: join(fixtures, 'broken.config.mjs'),
      scenarios: ['invalid-signature', 'single-valid'],
    });
    expect(s.scenarios.map((x) => x.id).sort()).toEqual(['invalid-signature', 'single-valid']);
  });

  it('rejects unknown scenarios, missing and invalid configs with clear errors', async () => {
    await expect(
      runFromConfig({
        configPath: join(fixtures, 'fixed.config.mjs'),
        scenarios: ['nope' as never],
      }),
    ).rejects.toThrow(/Unknown scenario "nope"/);
    await expect(runFromConfig({ configPath: 'missing.mjs', cwd: fixtures })).rejects.toThrow(
      /Config not found/,
    );
    await expect(
      runFromConfig({ configPath: 'invalid.config.mjs', cwd: fixtures }),
    ).rejects.toThrow(/must export default \{ target, secret, event \}/);
  });

  it('loads TypeScript configs like the webhook-crash-lab CLI does', async () => {
    const summary = await runFromConfig({ configPath: 'fixed.config.ts', cwd: fixtures });
    expect(summary.ok).toBe(true);
  });
});

describe('explainReport', () => {
  it('explains a report file or an inline object', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wcl-mcp-'));
    const reportPath = join(dir, 'r.json');
    await runFromConfig({ configPath: join(fixtures, 'broken.config.mjs'), reportPath });
    const fromFile = explainReport({ reportPath });
    expect(fromFile.ok).toBe(false);
    const fromObj = explainReport({ report: JSON.parse(readFileSync(reportPath, 'utf8')) });
    expect(fromObj.failures).toEqual(fromFile.failures);
    expect(explainReport({ report: readFileSync(reportPath, 'utf8') }).summary).toEqual(
      fromFile.summary,
    );
  });

  it('rejects things that are not crash-lab reports', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wcl-mcp-'));
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, '{"hello":1}');
    expect(() => explainReport({ reportPath: bad })).toThrow(/not a webhook-crash-lab JSON report/);
    expect(() => explainReport({ report: 'not json' })).toThrow(/not valid JSON/);
    expect(() => explainReport({})).toThrow(/reportPath or report/);
    expect(() => explainReport({ reportPath: join(dir, 'nope.json') })).toThrow(/Report not found/);
  });
});

describe('summarize / listScenarios', () => {
  it('lists every scenario with what/why/fix', () => {
    const all = listScenarios();
    expect(all.length).toBeGreaterThanOrEqual(8);
    for (const s of all) expect(s.fix.length).toBeGreaterThan(10);
  });

  it('marks not-tested scenarios and explains why', () => {
    const s = summarize({
      name: 'x',
      startedAt: new Date(0).toISOString(),
      ok: true,
      summary: { pass: 0, fail: 0, notTested: 1 },
      scenarios: [
        {
          id: 'out-of-order',
          title: 't',
          what: 'w',
          why: 'y',
          fix: 'f',
          status: 'not-tested',
          checks: [],
          responses: [],
          durationMs: 1,
        },
      ],
    });
    expect(s.notTested).toEqual(['out-of-order']);
    expect(s.nextSteps.join(' ')).toMatch(/adapter|sequence/);
  });
});

describe('packaging', () => {
  it('Claude Code and Codex skills are identical', () => {
    const root = resolve(import.meta.dirname, '..');
    expect(readFileSync(join(root, '.agents/skills/webhook-crash-lab/SKILL.md'), 'utf8')).toBe(
      readFileSync(join(root, 'skills/webhook-crash-lab/SKILL.md'), 'utf8'),
    );
  });
});
