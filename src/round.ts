import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
import pLimit from 'p-limit';

import { readBudget, remaining, reserveSessions } from './budget';
import { ROOT, concorrencia, modelos, produto, retry, runDir, timeoutMs } from './config';
import { buildIntel } from './intel';
import { makePlan, printPlan, writePlan } from './plan';
import { Listing, Plan, type VariantSpec } from './schemas';

// Usage: npx tsx src/round.ts --round r1 [--only v01,v02,...]
// One run() per variant = one paid session. A bad output is redone within config.retry limits;
// timeouts and SDK errors are never redone automatically.

function promptFor(spec: VariantSpec, previousProblem?: string): string {
  return [
    ...(previousProblem
      ? [`A previous attempt for this variant was rejected by validation: ${previousProblem}. Tell the subagent to fix exactly that.`, '']
      : []),
    'Use the subagent listing-producer with this variant spec and WAIT until it finishes (do not run it in background).',
    'Pass the spec to the subagent exactly as given. The axes are fixed.',
    'The attached image is the product reference photo (data/product/photo.jpg). Tell the subagent it is attached to this',
    'conversation as a user image, so it must pass it to the image generator as the reference image.',
    '',
    JSON.stringify(spec, null, 2),
    '',
    'When the subagent has finished, reply DONE.',
  ].join('\n');
}

function permissionHandlerFor(id: string): ClientPermissionHandler {
  return ({ toolUses, options }) => {
    for (const t of toolUses) {
      const d = t.details as { type: string; command?: string; filePath?: string };
      console.log(`[${id}] [permission] ${t.toolUse.name} (${d.type}) ${d.command ?? d.filePath ?? ''}`);
    }
    const ok = options.some((o) => o.value === ToolConfirmationOutcome.ProceedOnce);
    if (!ok) console.log(`[${id}] [permission] ProceedOnce not offered -> Cancel`);
    return ok ? ToolConfirmationOutcome.ProceedOnce : ToolConfirmationOutcome.Cancel;
  };
}

const outputsOf = (spec: VariantSpec) => ({
  json: join(runDir(spec.round), 'variants', `${spec.variantId}.json`),
  png: join(runDir(spec.round), 'covers', `${spec.variantId}.png`),
});

// Checks the files once, after the run returned. No waiting.
function checkOutputs(spec: VariantSpec): string | null {
  const { json, png } = outputsOf(spec);
  if (!existsSync(json)) return 'missing json';
  if (!existsSync(png)) return 'missing png';
  let listing: Listing;
  try {
    listing = Listing.parse(JSON.parse(readFileSync(json, 'utf8')));
  } catch (err) {
    return `invalid json: ${(err as Error).message.replace(/\s+/g, ' ').slice(0, 300)}`;
  }
  if (listing.variantId !== spec.variantId) return `json variantId=${listing.variantId}`;
  if (JSON.stringify(listing.axes) !== JSON.stringify(spec.axes)) return `axes changed: ${JSON.stringify(listing.axes)}`;
  if (listing.mode !== spec.mode) return `mode changed: ${listing.mode}`;
  return null;
}

interface Outcome {
  variantId: string;
  ok: boolean;
  why: string;
  secs: number;
  attempts: number;
}

interface Attempt {
  sessionId: string | null;
  success: boolean;
  durationMs: number | null;
  tokenUsage: unknown;
  why: string;
}

interface Usage {
  variantId: string;
  attempts: Attempt[];
}

// The image generator only accepts user-attached or session-generated images as reference,
// so the photo goes in as a run() attachment instead of a path the droid reads.
const referenceImage = () => ({
  type: 'base64' as const,
  data: readFileSync(join(ROOT, produto.fotoReferencia)).toString('base64'),
  mediaType: 'image/jpeg' as const,
});

// `badOutput` marks the failures worth one more paid attempt (the agent ran but its files are wrong).
async function runAttempt(spec: VariantSpec, previousProblem?: string): Promise<Attempt & { badOutput: boolean }> {
  const id = spec.variantId;
  const { json, png } = outputsOf(spec);
  rmSync(json, { force: true });
  rmSync(png, { force: true });
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const result = await run(promptFor(spec, previousProblem), {
      cwd: ROOT,
      modelId: modelos.conductor,
      reasoningEffort: ReasoningEffort.Low,
      images: [referenceImage()],
      autonomyLevel: AutonomyLevel.High,
      permissionHandler: permissionHandlerFor(id),
      abortSignal: signal,
    });
    const tools = result.messages
      .filter((m) => m.type === DroidMessageType.ToolCall)
      .map((m) => (m as { name: string }).name);
    console.log(`[${id}] tools: ${tools.join(', ') || '(none)'}`);
    const problem = result.success ? checkOutputs(spec) : (result.error?.message ?? result.subtype);
    return {
      sessionId: result.sessionId,
      success: result.success,
      durationMs: result.durationMs,
      tokenUsage: result.tokenUsage,
      why: problem ?? '',
      badOutput: result.success && problem !== null,
    };
  } catch (err) {
    const why = signal.aborted ? `aborted after ${timeoutMs / 1000}s` : (err as Error).message;
    return { sessionId: null, success: false, durationMs: null, tokenUsage: null, why, badOutput: false };
  }
}

// Shared by the concurrent variants of one execution (JS is single-threaded, so no race).
let retriesLeft: number = retry.maxRetriesPerRun;

async function runVariant(spec: VariantSpec): Promise<{ outcome: Outcome; usage: Usage }> {
  const id = spec.variantId;
  const start = Date.now();
  const attempts: Attempt[] = [];
  let last = await runAttempt(spec);
  attempts.push(last);
  if (last.badOutput) {
    if (retriesLeft > 0 && remaining() - 1 >= retry.minBudgetLeftForRetry) {
      retriesLeft--;
      reserveSessions(1, spec.round, `retry ${id}`);
      console.log(`[${id}] bad output (${last.why}), redoing once`);
      last = await runAttempt(spec, last.why);
      attempts.push(last);
    } else {
      console.log(`[${id}] bad output, no retry left (retries ${retriesLeft}, budget left ${remaining()})`);
    }
  }
  const strip = ({ badOutput: _, ...a }: Attempt & { badOutput?: boolean }) => a;
  return {
    outcome: { variantId: id, ok: last.why === '', why: last.why, secs: (Date.now() - start) / 1000, attempts: attempts.length },
    usage: { variantId: id, attempts: attempts.map(strip) },
  };
}

// --only reruns update their rows and keep the rest of the round's record.
function mergeById<T extends { variantId: string }>(file: string, key: string, rows: T[]): T[] {
  const old: T[] = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8'))[key] ?? []) : [];
  const byId = new Map(old.map((r) => [r.variantId, r]));
  for (const r of rows) byId.set(r.variantId, r);
  return [...byId.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
}

function warnProducerModel() {
  const md = readFileSync(join(ROOT, '.factory', 'droids', 'listing-producer.md'), 'utf8');
  const model = md.match(/^model:\s*(\S+)/m)?.[1];
  if (model !== modelos.producer) {
    console.warn(`[round] listing-producer.md uses model ${model}, config.modelos.producer is ${modelos.producer}`);
  }
}

async function main() {
  // FACTORY_API_KEY lives in .env; the SDK only reads process.env.
  if (!process.env.FACTORY_API_KEY) process.loadEnvFile(join(ROOT, '.env'));

  const { values } = parseArgs({ options: { round: { type: 'string' }, only: { type: 'string' } } });
  const round = values.round;
  if (!round) throw new Error('--round is required');
  const dir = runDir(round);

  const planFile = join(dir, 'plan.json');
  if (!existsSync(planFile)) {
    console.log(`[round] ${planFile} not found, generating with seed 42`);
    writePlan(makePlan(round, round, 42));
  }
  const plan = Plan.parse(JSON.parse(readFileSync(planFile, 'utf8')));
  const only = values.only?.split(',').map((s) => s.trim());
  const specs = only ? plan.variants.filter((v) => only.includes(v.variantId)) : plan.variants;
  if (specs.length === 0) throw new Error(`no variants match --only ${values.only}`);
  printPlan({ ...plan, variants: specs });
  warnProducerModel();

  const intel = buildIntel(round);
  console.log(intel ? `[round] competitor intel -> ${intel}` : '[round] no data/competitors: running without intel');

  reserveSessions(specs.length, round, `round ${specs.map((s) => s.variantId).join(',')}`);
  // Each attempt deletes its variant's old outputs first, so stale files never pass the check.
  mkdirSync(join(dir, 'variants'), { recursive: true });
  mkdirSync(join(dir, 'covers'), { recursive: true });

  const limit = pLimit(concorrencia);
  const start = Date.now();
  const results = await Promise.all(specs.map((s) => limit(() => runVariant(s))));
  const total = (Date.now() - start) / 1000;

  const summaryFile = join(dir, 'summary.json');
  const usageFile = join(dir, 'usage.json');
  const outcomes = mergeById(summaryFile, 'variants', results.map((r) => r.outcome));
  const usages = mergeById(usageFile, 'runs', results.map((r) => r.usage));
  const okCount = outcomes.filter((o) => o.ok).length;
  writeFileSync(
    summaryFile,
    JSON.stringify({ round, updatedAt: new Date().toISOString(), lastRunSecs: total, ok: okCount, total: outcomes.length, variants: outcomes }, null, 2) + '\n',
  );
  writeFileSync(usageFile, JSON.stringify({ round, runs: usages }, null, 2) + '\n');

  console.table(results.map(({ outcome: o }) => ({ ...o, secs: o.secs.toFixed(1) })));
  console.log(`this run: ${results.filter((r) => r.outcome.ok).length}/${results.length} ok, total ${total.toFixed(1)}s`);
  const budget = readBudget();
  console.log(`round ${round}: ${okCount}/${outcomes.length} ok | budget ${budget.used}/${budget.cap} sessions`);
  process.exitCode = results.every((r) => r.outcome.ok) ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
