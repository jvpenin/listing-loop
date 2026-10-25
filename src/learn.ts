import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  AutonomyLevel,
  DroidMessageType,
  ReasoningEffort,
  ToolConfirmationOutcome,
  run,
  type ClientPermissionHandler,
} from '@factory/droid-sdk/node';

import { reserveSessions } from './budget';
import { ROOT, modelos, runDir } from './config';
import { commitLearning, readDiff } from './memory';

// Usage: npx tsx src/learn.ts --round r1
// stats.ts -> performance-analyst (ONE paid session) -> memory.ts (validate, apply, commit). No retries.

const TIMEOUT_MS = 240_000;

function promptFor(round: string): string {
  return [
    `Use the subagent performance-analyst for round ${round} and WAIT until it finishes (do not run it in background).`,
    `It must read runs/${round}/stats.json and memory/playbook.json and write ONLY runs/${round}/memory-diff.json.`,
    '',
    'When the subagent has finished, reply DONE.',
  ].join('\n');
}

const permissionHandler: ClientPermissionHandler = ({ toolUses, options }) => {
  for (const t of toolUses) {
    const d = t.details as { type: string; command?: string; filePath?: string };
    console.log(`[learn] [permission] ${t.toolUse.name} (${d.type}) ${d.command ?? d.filePath ?? ''}`);
  }
  const ok = options.some((o) => o.value === ToolConfirmationOutcome.ProceedOnce);
  if (!ok) console.log('[learn] [permission] ProceedOnce not offered -> Cancel');
  return ok ? ToolConfirmationOutcome.ProceedOnce : ToolConfirmationOutcome.Cancel;
};

function recordUsage(round: string, entry: unknown) {
  const file = join(runDir(round), 'usage.json');
  const usage = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { round, runs: [] };
  usage.learn = [...(usage.learn ?? []), entry];
  writeFileSync(file, JSON.stringify(usage, null, 2) + '\n');
}

async function main() {
  // FACTORY_API_KEY lives in .env; the SDK only reads process.env.
  if (!process.env.FACTORY_API_KEY) process.loadEnvFile(join(ROOT, '.env'));

  const { values } = parseArgs({ options: { round: { type: 'string' } } });
  const round = values.round;
  if (!round) throw new Error('--round is required');

  // stats.ts writes runs/<round>/stats.json.
  execFileSync('npx', ['tsx', 'src/stats.ts', round], { cwd: ROOT, stdio: 'inherit' });

  const diffFile = join(runDir(round), 'memory-diff.json');
  rmSync(diffFile, { force: true });

  const budget = reserveSessions(1, round, 'learn analyst');
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const start = Date.now();
  let ok = false;
  try {
    const result = await run(promptFor(round), {
      cwd: ROOT,
      modelId: modelos.conductor,
      reasoningEffort: ReasoningEffort.Low,
      autonomyLevel: AutonomyLevel.High,
      permissionHandler,
      abortSignal: signal,
    });
    const tools = result.messages
      .filter((m) => m.type === DroidMessageType.ToolCall)
      .map((m) => (m as { name: string }).name);
    console.log(`[learn] tools: ${tools.join(', ') || '(none)'}`);
    recordUsage(round, {
      sessionId: result.sessionId,
      success: result.success,
      durationMs: result.durationMs,
      tokenUsage: result.tokenUsage,
    });
    if (!result.success) throw new Error(result.error?.message ?? result.subtype);
    if (!existsSync(diffFile)) throw new Error(`analyst did not write ${diffFile}`);

    const diff = readDiff(diffFile);
    commitLearning(round, diff, diffFile);
    console.log(`[learn] ${diff.summary}`);
    ok = true;
  } catch (err) {
    if (signal.aborted) console.error(`[learn] aborted after ${TIMEOUT_MS / 1000}s`);
    console.error(`[learn] failed: ${(err as Error).message}`);
  }
  console.log(`[learn] ${((Date.now() - start) / 1000).toFixed(1)}s | budget ${budget.used}/${budget.cap} sessions`);
  if (ok) console.log(`next: npx tsx src/plan.ts --round r2 --from ${round} --seed 42`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
