import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  demoConfig,
  loadConfig as loadLabConfig,
  runCrashLab,
  SCENARIOS,
  toJson,
  type CrashLabConfig,
  type CrashLabResult,
  type ScenarioId,
} from 'webhook-crash-lab';

export type { CrashLabResult, ScenarioId };

/** Fix security first, then duplicates, then ordering: later fixes depend on earlier ones. */
const PRIORITY: ScenarioId[] = [
  'missing-signature',
  'invalid-signature',
  'stale-timestamp',
  'malformed-json',
  'single-valid',
  'duplicate-sequential',
  'duplicate-concurrent',
  'out-of-order',
];
export const SCENARIO_IDS = SCENARIOS.map((s) => s.id) as ScenarioId[];

export interface Failure {
  id: ScenarioId;
  title: string;
  why: string;
  fix: string;
  failedChecks: { name: string; detail: string }[];
  responses: number[];
}

export interface Summary {
  name: string;
  ok: boolean;
  summary: { pass: number; fail: number; notTested: number };
  /** Failing scenarios, most important first. */
  failures: Failure[];
  notTested: ScenarioId[];
  scenarios: { id: ScenarioId; status: string }[];
  nextSteps: string[];
  reportPath?: string;
}

export function summarize(result: CrashLabResult, reportPath?: string): Summary {
  const rank = (id: ScenarioId) => PRIORITY.indexOf(id);
  const failures = result.scenarios
    .filter((s) => s.status === 'fail')
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map<Failure>((s) => ({
      id: s.id,
      title: s.title,
      why: s.why,
      fix: s.fix,
      failedChecks: s.checks
        .filter((c) => c.status === 'fail')
        .map(({ name, detail }) => ({ name, detail })),
      responses: s.responses,
    }));
  const notTested = result.scenarios.filter((s) => s.status === 'not-tested').map((s) => s.id);

  const nextSteps: string[] = [];
  if (failures.length) {
    nextSteps.push(
      `Fix in this order: ${failures.map((f) => f.id).join(' → ')}. Each failure has a "fix" hint.`,
      'Change the webhook handler (not the test config), then re-run the same tool with the same arguments. Stop when ok is true.',
      'Static checks for the same bugs: eslint-plugin-webhook-safety and eslint-plugin-bullmq.',
    );
  } else if (notTested.length) {
    nextSteps.push(
      'No failures among the tested scenarios, but coverage is incomplete. Enable the untested scenarios below before relying on this result.',
    );
  } else {
    nextSteps.push(
      'All scenarios pass. Keep `npx webhook-crash-lab run` in CI so this stays true.',
    );
  }
  if (notTested.length) {
    nextSteps.push(
      `${notTested.length} scenario(s) not tested (${notTested.join(', ')}): duplicate checks need an \`adapter\` + \`expect.once\`; out-of-order needs \`sequence\` in the config.`,
    );
  }
  return {
    name: result.name,
    ok: result.ok,
    summary: result.summary,
    failures,
    notTested,
    scenarios: result.scenarios.map((s) => ({ id: s.id, status: s.status })),
    nextSteps,
    ...(reportPath ? { reportPath } : {}),
  };
}

function writeReport(result: CrashLabResult, reportPath: string): void {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, toJson(result));
}

export interface RunOptions {
  configPath: string;
  /** Directory relative paths resolve against. Defaults to process.cwd(). */
  cwd?: string;
  scenarios?: ScenarioId[];
  /** If set, the JSON report is written here too. */
  reportPath?: string;
}

/**
 * Load a crash-lab config (.mjs/.js/.cjs, or .ts/.mts/.cts via jiti or Node type stripping).
 * Delegates to webhook-crash-lab so the CLI and the MCP server accept exactly the same files,
 * and re-reads the file each call so an agent re-running after edits gets the new config.
 */
export async function loadConfig(configPath: string, cwd = process.cwd()): Promise<CrashLabConfig> {
  return loadLabConfig(configPath, cwd);
}

export async function runFromConfig(opts: RunOptions): Promise<Summary> {
  for (const id of opts.scenarios ?? []) {
    if (!SCENARIO_IDS.includes(id)) {
      throw new Error(`Unknown scenario "${id}". Known: ${SCENARIO_IDS.join(', ')}`);
    }
  }
  const config = await loadConfig(opts.configPath, opts.cwd);
  const result = await runCrashLab(
    opts.scenarios?.length ? { ...config, scenarios: opts.scenarios } : config,
  );
  const reportPath = opts.reportPath && resolve(opts.cwd ?? process.cwd(), opts.reportPath);
  if (reportPath) writeReport(result, reportPath);
  return summarize(result, reportPath);
}

export async function runDemo(mode: 'broken' | 'fixed'): Promise<Summary> {
  return summarize(await runCrashLab(demoConfig(mode)));
}

function isReport(x: unknown): x is CrashLabResult {
  const r = x as CrashLabResult;
  return (
    !!r &&
    typeof r === 'object' &&
    typeof r.ok === 'boolean' &&
    Array.isArray(r.scenarios) &&
    !!r.summary
  );
}

export function explainReport(input: {
  reportPath?: string;
  report?: unknown;
  cwd?: string;
}): Summary {
  let report: unknown = input.report;
  if (input.reportPath) {
    const path = resolve(input.cwd ?? process.cwd(), input.reportPath);
    if (!existsSync(path)) throw new Error(`Report not found: ${path}`);
    report = readFileSync(path, 'utf8');
  }
  if (report === undefined)
    throw new Error('Pass reportPath or report (the JSON from `webhook-crash-lab run --json`).');
  if (typeof report === 'string') {
    try {
      report = JSON.parse(report);
    } catch {
      throw new Error('Report is not valid JSON.');
    }
  }
  if (!isReport(report))
    throw new Error(
      'This is not a webhook-crash-lab JSON report (expected ok, summary, scenarios).',
    );
  return summarize(report, input.reportPath);
}

export function listScenarios() {
  return SCENARIOS.map(({ id, title, what, why, fix }) => ({ id, title, what, why, fix }));
}

/** Short human/agent-readable rendering of a summary. */
export function renderSummary(s: Summary): string {
  const lines = [
    `${s.ok ? 'PASS' : 'FAIL'} ${s.name}: ${s.summary.pass} pass, ${s.summary.fail} fail, ${s.summary.notTested} not tested`,
  ];
  for (const f of s.failures) {
    lines.push('', `✗ ${f.id}: ${f.title}`);
    for (const c of f.failedChecks) lines.push(`  ${c.name}: ${c.detail}`);
    lines.push(`  why: ${f.why}`, `  fix: ${f.fix}`);
  }
  lines.push('', 'Next steps:', ...s.nextSteps.map((n) => `- ${n}`));
  if (s.reportPath) lines.push(`Report written to ${s.reportPath}`);
  return lines.join('\n');
}
