import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  AutonomyLevel,
  DroidMessageType,
  ReasoningEffort,
  ToolConfirmationOutcome,
  createSession,
  type ClientPermissionHandler,
  type DroidResultMessage,
} from '@factory/droid-sdk/node';
import pLimit from 'p-limit';

import { readBudget, remaining, reserveSessions } from './budget';
import { ROOT, concorrencia, modelos, retry, runDir, shopee, timeoutMs } from './config';
import { buildIntel, competitorIds } from './intel';
import { makePlan, printPlan, writePlan } from './plan';
import { Listing, Plan, type VariantSpec } from './schemas';

// Usage: npx tsx src/round.ts --round r1 [--only v01,v02,...]
// Live campaigns (src/lab.ts) reuse runSpecs() with specs that carry their own `paths`.
// One run() per variant = one paid session. A bad output is redone within config.retry limits;
// timeouts and SDK errors are never redone automatically.

function promptFor(spec: VariantSpec, previousProblem?: string): string {
  return [
    ...(previousProblem
      ? [`A previous attempt for this variant was rejected by validation: ${previousProblem}. Tell the subagent to fix exactly that.`, '']
      : []),
    'Use the subagent listing-producer with this variant spec and WAIT until it finishes (do not run it in background).',
    'Pass the spec to the subagent exactly as given. The axes are fixed.',
    ...(spec.paths
      ? [`The subagent must write exactly ${spec.paths.json} and ${spec.paths.png}, and read competitor intel from ${spec.paths.intel}.`]
      : []),
    `The attached image is the product reference photo (${spec.produto.fotoReferencia}). Tell the subagent it is attached to this`,
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

export const outputsOf = (spec: VariantSpec) =>
  spec.paths
    ? { json: join(ROOT, spec.paths.json), png: join(ROOT, spec.paths.png) }
    : {
        json: join(runDir(spec.round), 'variants', `${spec.variantId}.json`),
        png: join(runDir(spec.round), 'covers', `${spec.variantId}.png`),
      };

// The plan sits next to variants/ and covers/: runs/<round>/plan.json or runs/campaigns/<id>/<round>/plan.json.
const planFileOf = (spec: VariantSpec) => join(dirname(dirname(outputsOf(spec).json)), 'plan.json');

// Competitor ids the producer may cite: the Apify items behind this angle's intel.
function knownCompetitors(spec: VariantSpec): Set<string> | null {
  if (!spec.paths) return competitorIds(spec.round, spec.axes.angulo);
  const file = join(ROOT, spec.paths.intel);
  if (!existsSync(file)) return null;
  const intel = JSON.parse(readFileSync(file, 'utf8'));
  const ids: string[] = intel.itemIds ?? (intel.angles?.[spec.axes.angulo]?.topCompetitors ?? []).map((c: { itemId: string }) => c.itemId);
  return ids.length >= 2 ? new Set(ids.map(String)) : null;
}

// Checks the files once, after the run returned. No waiting.
export function checkOutputs(spec: VariantSpec): string | null {
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
  const titleMax = spec.produto.tituloMax ?? shopee.tituloMax;
  if (listing.title.length > titleMax) return `title has ${listing.title.length} chars, limit ${titleMax}`;
  const descMax = spec.produto.descricaoMax ?? shopee.descricaoMax;
  if (listing.description.length > descMax) return `description has ${listing.description.length} chars, limit ${descMax}`;
  const known = knownCompetitors(spec);
  if (known) {
    const refs = listing.benchmark.referenceItemIds;
    if (refs.length < 2) return 'benchmark cites fewer than 2 competitors';
    const unknown = refs.filter((id) => !known.has(id));
    if (unknown.length) return `benchmark cites competitors not in the Apify data: ${unknown.join(', ')}`;
  }
  return null;
}

export interface Outcome {
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

export interface Usage {
  variantId: string;
  attempts: Attempt[];
}

// The image generator only accepts user-attached or session-generated images as reference,
// so the photo goes in as a run() attachment instead of a path the droid reads.
const referenceImage = (spec: VariantSpec) => ({
  type: 'base64' as const,
  data: readFileSync(join(ROOT, spec.produto.fotoReferencia)).toString('base64'),
  mediaType: extname(spec.produto.fotoReferencia).toLowerCase() === '.png' ? ('image/png' as const) : ('image/jpeg' as const),
});

// One line per tool call, so the live lab can show what the conductor and its subagent are doing.
function describeTool(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  const pick = i.subagent_type ?? i.subagentType ?? i.file_path ?? i.filePath ?? i.path ?? i.command ?? i.description;
  return typeof pick === 'string' ? pick.replace(ROOT + '/', '').slice(0, 140) : '';
}

type AttemptResult = Attempt & { badOutput: boolean };

// Runs inside a worker process (see spawnAttempt). `badOutput` marks the failures worth one more
// paid attempt (the agent ran but its files are wrong).
async function runAttempt(spec: VariantSpec, previousProblem?: string): Promise<AttemptResult> {
  const id = spec.variantId;
  const signal = AbortSignal.timeout(timeoutMs);
  const began = Date.now();
  const failed = (err: unknown): AttemptResult => {
    const why = signal.aborted ? `aborted after ${timeoutMs / 1000}s` : (err as Error).message;
    return { sessionId: null, success: false, durationMs: null, tokenUsage: null, why, badOutput: false };
  };
  try {
    return await attemptOnce(spec, signal, previousProblem);
  } catch (err) {
    // A session that dies in its first seconds ("Connection error.") did no work: try once more.
    if (signal.aborted || Date.now() - began > 15_000) return failed(err);
    console.log(`[${id}] [retry] session failed fast (${(err as Error).message}), reconnecting once`);
    try {
      return await attemptOnce(spec, signal, previousProblem);
    } catch (err2) {
      return failed(err2);
    }
  }
}

// Throws on SDK/connection errors; runAttempt turns them into a failed attempt.
async function attemptOnce(spec: VariantSpec, signal: AbortSignal, previousProblem?: string): Promise<AttemptResult> {
  const id = spec.variantId;
  {
    // Same as the SDK's run(), but streamed so every tool call is logged as it happens.
    const session = await createSession({
      cwd: ROOT,
      modelId: modelos.conductor,
      reasoningEffort: ReasoningEffort.Low,
      autonomyLevel: AutonomyLevel.High,
      permissionHandler: permissionHandlerFor(id),
    });
    console.log(`[${id}] [session] ${session.id} conductor=${modelos.conductor}`);
    let result: DroidResultMessage | undefined;
    try {
      for await (const msg of session.stream(promptFor(spec, previousProblem), { images: [referenceImage(spec)], abortSignal: signal })) {
        if (msg.type === DroidMessageType.ToolCall) console.log(`[${id}] [tool] ${msg.name} ${describeTool(msg.name, msg.input)}`);
        else if (msg.type === DroidMessageType.ToolResult) console.log(`[${id}] [result] ${msg.toolName} ${msg.isError ? 'error' : 'ok'}`);
        else if (msg.type === DroidMessageType.Assistant && msg.text.trim()) console.log(`[${id}] [say] ${msg.text.trim().replace(/\s+/g, ' ').slice(0, 200)}`);
        else if (msg.type === DroidMessageType.Result) result = msg;
      }
    } finally {
      await session.close();
    }
    if (!result) throw new Error('stream ended without a result message');
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
  }
}

const RESULT_TAG = '__ATTEMPT_RESULT__';

// The SDK's abortSignal does not interrupt a model call in flight (r1 stage c: conductors hung 15 min
// after a timeout and held the pool). Each attempt runs in its own process group, killed on timeout.
// Outputs are checked even after a kill or an error: if the files are valid, the work is done.
function spawnAttempt(spec: VariantSpec, previousProblem?: string): Promise<AttemptResult> {
  const id = spec.variantId;
  const { json, png } = outputsOf(spec);
  rmSync(json, { force: true });
  rmSync(png, { force: true });
  const args = ['tsx', __filename, '--plan', planFileOf(spec), '--worker', id, ...(previousProblem ? ['--problem', previousProblem] : [])];
  const child = spawn('npx', args, { cwd: ROOT, detached: true, stdio: ['ignore', 'pipe', 'inherit'] });
  let out = '';
  child.stdout.on('data', (d: Buffer) => {
    const text = d.toString();
    out += text;
    for (const line of text.split('\n')) if (line && !line.startsWith(RESULT_TAG)) console.log(line);
  });
  return new Promise((resolve) => {
    let killed = false;
    let settled = false;
    const timer = setTimeout(() => {
      killed = true;
      try {
        process.kill(-child.pid!, 'SIGKILL');
      } catch {}
      // droid's own child processes can keep the stdout pipe open for minutes after the kill
      // (r2 live: 'close' came 11 min late), so the attempt ends now instead of waiting for it.
      setTimeout(finish, 2_000);
    }, timeoutMs + 15_000);
    child.on('close', finish);
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.destroy();
      const line = out.split('\n').find((l) => l.startsWith(RESULT_TAG));
      const result: AttemptResult = line
        ? JSON.parse(line.slice(RESULT_TAG.length))
        : { sessionId: null, success: false, durationMs: null, tokenUsage: null, why: killed ? `killed after ${timeoutMs / 1000}s` : 'worker exited without result', badOutput: false };
      if (result.why && checkOutputs(spec) === null) {
        console.log(`[${id}] outputs valid despite: ${result.why}`);
        result.why = '';
        result.badOutput = false;
      }
      resolve(result);
    }
  });
}

// Shared by the concurrent variants of one execution (JS is single-threaded, so no race).
let retriesLeft: number = retry.maxRetriesPerRun;

export async function runVariant(spec: VariantSpec): Promise<{ outcome: Outcome; usage: Usage }> {
  const id = spec.variantId;
  const start = Date.now();
  const attempts: Attempt[] = [];
  let last = await spawnAttempt(spec);
  attempts.push(last);
  if (last.badOutput) {
    if (retriesLeft > 0 && remaining() - 1 >= retry.minBudgetLeftForRetry) {
      retriesLeft--;
      reserveSessions(1, spec.round, `retry ${id}`);
      console.log(`[${id}] bad output (${last.why}), redoing once`);
      last = await spawnAttempt(spec, last.why);
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

const titleWords = (t: string) => new Set(t.toLowerCase().match(/[a-zà-ú0-9]+/g) ?? []);

// Near-duplicate titles inside one angle (Jaccard >= 0.8 on words) are a spam risk on Shopee.
function similarTitles(plan: Plan): string[] {
  const listings = plan.variants.flatMap((v) => {
    const file = outputsOf(v).json;
    if (!existsSync(file)) return [];
    try {
      return [{ id: v.variantId, angulo: v.axes.angulo, words: titleWords(Listing.parse(JSON.parse(readFileSync(file, 'utf8'))).title) }];
    } catch {
      return [];
    }
  });
  const warnings: string[] = [];
  for (const [i, a] of listings.entries()) {
    for (const b of listings.slice(i + 1)) {
      if (a.angulo !== b.angulo) continue;
      const inter = [...a.words].filter((w) => b.words.has(w)).length;
      const jaccard = inter / (a.words.size + b.words.size - inter);
      if (jaccard >= 0.8) warnings.push(`${a.id}~${b.id} (${a.angulo}) títulos ${Math.round(jaccard * 100)}% iguais`);
    }
  }
  return warnings;
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

  const { values } = parseArgs({
    options: {
      round: { type: 'string' },
      only: { type: 'string' },
      worker: { type: 'string' },
      problem: { type: 'string' },
      plan: { type: 'string' },
    },
  });

  if (values.worker) {
    const planFile = values.plan ?? join(runDir(values.round ?? ''), 'plan.json');
    const plan = Plan.parse(JSON.parse(readFileSync(planFile, 'utf8')));
    const spec = plan.variants.find((v) => v.variantId === values.worker);
    if (!spec) throw new Error(`no variant ${values.worker}`);
    const result = await runAttempt(spec, values.problem);
    process.stdout.write(`${RESULT_TAG}${JSON.stringify(result)}\n`);
    process.exit(0);
  }

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

  const start = Date.now();
  const results = await runSpecs(specs);
  const total = (Date.now() - start) / 1000;

  const summaryFile = join(dir, 'summary.json');
  const usageFile = join(dir, 'usage.json');
  const outcomes = mergeById(summaryFile, 'variants', results.map((r) => r.outcome));
  const usages = mergeById(usageFile, 'runs', results.map((r) => r.usage));
  const okCount = outcomes.filter((o) => o.ok).length;
  const titleWarnings = similarTitles(plan);
  writeFileSync(
    summaryFile,
    JSON.stringify(
      { round, updatedAt: new Date().toISOString(), lastRunSecs: total, ok: okCount, total: outcomes.length, titleWarnings, variants: outcomes },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(usageFile, JSON.stringify({ round, runs: usages }, null, 2) + '\n');

  console.table(results.map(({ outcome: o }) => ({ ...o, secs: o.secs.toFixed(1) })));
  console.log(`this run: ${results.filter((r) => r.outcome.ok).length}/${results.length} ok, total ${total.toFixed(1)}s`);
  for (const w of titleWarnings) console.warn(`[round] títulos parecidos: ${w}`);
  const budget = readBudget();
  console.log(`round ${round}: ${okCount}/${outcomes.length} ok | budget ${budget.used}/${budget.cap} sessions`);
  process.exitCode = results.every((r) => r.outcome.ok) ? 0 : 1;
}

// Fan-out: one killable worker process (one paid session) per variant, at most `concorrencia` at once.
export function runSpecs(specs: VariantSpec[], onDone?: (r: { outcome: Outcome; usage: Usage }) => void) {
  const limit = pLimit(concorrencia);
  return Promise.all(
    specs.map((s) =>
      limit(async () => {
        const r = await runVariant(s);
        onDone?.(r);
        return r;
      }),
    ),
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
