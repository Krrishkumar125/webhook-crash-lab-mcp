import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  explainReport,
  listScenarios,
  renderSummary,
  runDemo,
  runFromConfig,
  SCENARIO_IDS,
  type Summary,
} from './core.js';

export const VERSION = '0.2.1';

const summaryShape = {
  name: z.string(),
  ok: z.boolean(),
  summary: z.object({ pass: z.number(), fail: z.number(), notTested: z.number() }),
  failures: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      why: z.string(),
      fix: z.string(),
      failedChecks: z.array(z.object({ name: z.string(), detail: z.string() })),
      responses: z.array(z.number()),
    }),
  ),
  notTested: z.array(z.string()),
  scenarios: z.array(z.object({ id: z.string(), status: z.string() })),
  nextSteps: z.array(z.string()),
  reportPath: z.string().optional(),
};

async function respond(work: () => Promise<Summary> | Summary) {
  try {
    const s = await work();
    return {
      content: [{ type: 'text' as const, text: renderSummary(s) }],
      structuredContent: s as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return { isError: true, content: [{ type: 'text' as const, text: (err as Error).message }] };
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'webhook-crash-lab', version: VERSION });

  server.registerTool(
    'run_crash_lab',
    {
      title: 'Run webhook-crash-lab',
      description:
        'Replay hostile webhook deliveries (duplicates, concurrent duplicates, out-of-order events, forged/missing/stale signatures, malformed JSON) against the handler described by a crash-lab config file, and return structured failures with fix hints. Use a TEST database and test secret only. Create a config with `npx webhook-crash-lab init` if none exists.',
      inputSchema: {
        configPath: z
          .string()
          .describe(
            'Path to a crash-lab config (.mjs, .js, .cjs, .ts, .mts or .cts), relative to cwd',
          ),
        cwd: z
          .string()
          .optional()
          .describe('Project directory; defaults to the server working directory'),
        scenarios: z
          .array(z.enum(SCENARIO_IDS as [string, ...string[]]))
          .optional()
          .describe('Run only these scenarios'),
        reportPath: z.string().optional().describe('Also write the full JSON report here'),
      },
      outputSchema: summaryShape,
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    (args) => respond(() => runFromConfig(args as Parameters<typeof runFromConfig>[0])),
  );

  server.registerTool(
    'run_demo',
    {
      title: 'Run the built-in demo',
      description:
        'Run crash-lab against its built-in demo credits app. "broken" shows the typical AI-generated Stripe handler failing; "fixed" shows the same app done right. Needs no config. Use it to show what crash-lab checks before setting up a real config.',
      inputSchema: { mode: z.enum(['broken', 'fixed']).default('broken') },
      outputSchema: summaryShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ mode }) => respond(() => runDemo(mode)),
  );

  server.registerTool(
    'explain_report',
    {
      title: 'Explain a crash-lab report',
      description:
        'Read a JSON report produced by `webhook-crash-lab run --json <file>` (e.g. from CI) and return the failures in fix order, with why/fix hints and next steps.',
      inputSchema: {
        reportPath: z.string().optional(),
        report: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe('Report JSON, as text or object'),
        cwd: z.string().optional(),
      },
      outputSchema: summaryShape,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) => respond(() => explainReport(args)),
  );

  server.registerTool(
    'list_scenarios',
    {
      title: 'List crash-lab scenarios',
      description:
        'List every scenario crash-lab can run, with what it sends, why it matters in production, and how to fix a failure.',
      inputSchema: {},
      outputSchema: {
        scenarios: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            what: z.string(),
            why: z.string(),
            fix: z.string(),
          }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => {
      const scenarios = listScenarios();
      return {
        content: [
          {
            type: 'text',
            text: scenarios.map((s) => `${s.id}: ${s.what}\n  fix: ${s.fix}`).join('\n'),
          },
        ],
        structuredContent: { scenarios },
      };
    },
  );

  return server;
}
