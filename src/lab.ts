import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import {
  AutonomyLevel,
  DroidMessageType,
  ReasoningEffort,
  ToolConfirmationOutcome,
  createSession,
  type DroidResultMessage,
} from '@factory/droid-sdk/node';

import { readBudget, reserveSessions } from './budget';
import { ROOT, modelos, timeoutMs } from './config';
import { MARKETPLACES, scrapeCompetitors } from './marketplaces';
import { applyDiff, readDiff, readPlaybook } from './memory';
import { makePlan } from './plan';
import { buildProductIntel } from './productIntel';
import { outputsOf, runSpecs } from './round';
import type { VariantSpec } from './schemas';

// Usage: npx tsx src/lab.ts --job <jobId>   (spawned by the app: app/src/app/api/lab/*)
// The live judge demo. Reads runs/jobs/<jobId>/job.json and appends every step to
// runs/jobs/<jobId>/events.jsonl, which the app streams over SSE (contract: claude/LIVE_CONTRACT.md).
// - kind "round": Apify scrape -> intel -> plan -> N listing-producer droids in parallel -> validation,
//   for a live campaign in runs/campaigns/<id>/<round>/.
// - kind "learn": the performance-analyst droid on the DNT store's real data (runs/r2/stats.json),
//   dry-run: the diff is validated and applied to a copy of the playbook, never committed.

export interface Campaign {
  id: string;
  createdAt: string;
  product: { name: string; description: string; price: number; currency: string; sku: string; category: string };
  marketplace: keyof typeof MARKETPLACES;
  angles: string[];
  photo: string;
}

interface Job {
  id: string;
  kind: 'round' | 'learn';
  campaignId?: string;
  round?: string;
  n?: number;
  // Stops after the plan: no paid session (tests the pipeline and the app for free).
  dry?: boolean;
  status?: 'running' | 'done' | 'error';
  pid?: number;
}

const CAPAS = ['solo', 'modelo', 'uso'];
const AQUISICAO = ['organico', 'ads', 'afiliado'];
const CHANNEL: Record<string, string> = { shopee_br: 'shopee' };
const LEARN_TIMEOUT_MS = 300_000;

const rel = (p: string) => relative(ROOT, p);
export const campaignDir = (id: string) => join(ROOT, 'runs', 'campaigns', id);
export const jobDir = (id: string) => join(ROOT, 'runs', 'jobs', id);

let eventsFile = '';
const start = Date.now();
function emit(event: Record<string, unknown>) {
  appendFileSync(eventsFile, JSON.stringify({ t: Date.now() - start, ...event }) + '\n');
}

// Worker output arrives as "[v01] [tool] Task listing-producer" lines (src/round.ts); each becomes an event.
function captureConsole() {
  const forward = (text: string) => {
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const m = line.match(/^\[(v\d{2,3}|analyst)\] (?:\[(\w+)\] )?(.*)$/);
      if (m?.[2] === 'tool') {
        const [name, ...rest] = m[3].split(' ');
        emit({ type: 'tool', source: m[1], name, detail: rest.join(' ') });
      } else if (m) emit({ type: 'log', source: m[1], text: m[2] && m[2] !== 'say' ? `[${m[2]}] ${m[3]}` : m[3] });
      else emit({ type: 'log', source: 'system', text: line.slice(0, 400) });
    }
  };
  for (const k of ['log', 'warn', 'error'] as const) {
    const orig = console[k].bind(console);
    console[k] = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      orig(text);
      forward(text);
    };
  }
}

function setStatus(job: Job, status: Job['status']) {
  writeFileSync(join(jobDir(job.id), 'job.json'), JSON.stringify({ ...job, status, pid: process.pid }, null, 2) + '\n');
}

async function runRound(job: Job) {
  const c: Campaign = JSON.parse(readFileSync(join(campaignDir(job.campaignId!), 'campaign.json'), 'utf8'));
  const round = job.round!;
  const n = Math.min(Math.max(job.n ?? 2, 1), 4);
  const mp = MARKETPLACES[c.marketplace];
  const dir = join(campaignDir(c.id), round);
  mkdirSync(join(dir, 'variants'), { recursive: true });
  mkdirSync(join(dir, 'covers'), { recursive: true });
  emit({ type: 'log', source: 'system', text: `campaign ${c.id} · ${round} · ${c.product.name} on ${mp.label} · ${n} variants` });

  // 1. Apify: real competitors for this product on this marketplace.
  const query = c.product.name;
  emit({ type: 'stage', stage: 'apify', status: 'start', detail: `${mp.label}: "${query}"` });
  let items: Awaited<ReturnType<typeof scrapeCompetitors>>['items'] = [];
  let actor = '';
  // Marketplace actors are occasionally empty for a query that worked minutes before: retry once,
  // then fall back to this campaign's latest earlier scrape (labelled as cached).
  for (let attempt = 1; attempt <= 2 && !items.length; attempt++) {
    try {
      const scraped = await scrapeCompetitors(c.marketplace, query, 20);
      items = scraped.items;
      actor = scraped.actor;
      writeFileSync(join(dir, 'competitors.json'), JSON.stringify(scraped, null, 2) + '\n');
      emit({ type: 'stage', stage: 'apify', status: 'ok', detail: `${items.length} competitors in ${scraped.secs.toFixed(0)}s via ${actor}` });
    } catch (err) {
      emit({ type: 'log', source: 'apify', text: `attempt ${attempt}: ${(err as Error).message}` });
    }
  }
  if (!items.length) {
    const prev = Number(round.slice(1)) - 1;
    const cached = Array.from({ length: prev }, (_, i) => join(campaignDir(c.id), `r${prev - i}`, 'competitors.json')).find(existsSync);
    if (cached) {
      const scraped = JSON.parse(readFileSync(cached, 'utf8'));
      items = scraped.items;
      actor = scraped.actor;
      emit({ type: 'stage', stage: 'apify', status: 'ok', detail: `live scrape empty; using ${items.length} competitors cached from ${rel(cached)}` });
    } else emit({ type: 'stage', stage: 'apify', status: 'error', detail: 'no usable competitors — continuing without competitor intel' });
  }

  // 2. Intel: the math lives in code; the producer turns it into copy and must cite real ids.
  emit({ type: 'stage', stage: 'intel', status: 'start' });
  const intelFile = join(dir, 'intel.json');
  if (items.length) {
    const intel = buildProductIntel({ marketplaceId: c.marketplace, query, price: c.product.price, items, angles: c.angles }) as Record<string, unknown>;
    writeFileSync(intelFile, JSON.stringify({ ...intel, round, itemIds: items.map((i) => String(i.itemId)) }, null, 2) + '\n');
    emit({ type: 'intel', n: items.length, query, actor, headlines: (intel.headlines as string[]) ?? [] });
    emit({ type: 'stage', stage: 'intel', status: 'ok', detail: rel(intelFile) });
  } else {
    rmSync(intelFile, { force: true });
    emit({ type: 'stage', stage: 'intel', status: 'skip', detail: 'no competitor data' });
  }

  // 3. Plan: Thompson sampling over the campaign's axes; playbook rules only inside their scope.
  emit({ type: 'stage', stage: 'plan', status: 'start' });
  const photoRel = rel(join(campaignDir(c.id), c.photo));
  const plan = makePlan(round, undefined, Date.now() % 100_000, {
    n,
    eixos: { angulo: c.angles, capa: CAPAS, aquisicao: AQUISICAO, oferta: ['single'] },
    scope: { category: c.product.category, channel: CHANNEL[c.marketplace] ?? c.marketplace },
    hooks: [],
    produto: {
      sku: c.product.sku,
      nome: c.product.name,
      descricao: c.product.description,
      fotoReferencia: photoRel,
      preco: c.product.price,
      moeda: c.product.currency,
      marketplace: mp.label,
      idioma: mp.language,
      tituloMax: mp.titleMax,
      descricaoMax: mp.descMax,
    },
    paths: (vid) => ({
      json: rel(join(dir, 'variants', `${vid}.json`)),
      png: rel(join(dir, 'covers', `${vid}.png`)),
      intel: rel(intelFile),
    }),
  });
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
  emit({ type: 'plan', variants: plan.variants });
  emit({ type: 'stage', stage: 'plan', status: 'ok', detail: `${plan.variants.length} variants, playbook v${plan.playbookVersion}` });

  if (job.dry) {
    emit({ type: 'stage', stage: 'producer', status: 'skip', detail: 'dry run: no droid session opened' });
    return true;
  }

  // 4. Fan-out: one listing-producer droid per variant, in parallel.
  reserveSessions(plan.variants.length, `${c.id}/${round}`, `lab round ${plan.variants.map((v) => v.variantId).join(',')}`);
  emit({ type: 'stage', stage: 'producer', status: 'start', detail: `${plan.variants.length} × listing-producer (${modelos.producer}) via conductor (${modelos.conductor})` });
  // The subagent works in a clean context the conductor cannot stream, so the lab watches its
  // output files and says every 15s that it is still working (no invented progress).
  const seenCovers = new Set<string>();
  const seenJson = new Set<string>();
  const finished = new Set<string>();
  const producerStart = Date.now();
  let lastBeat = Date.now();
  const watcher = setInterval(() => {
    for (const s of plan.variants) {
      const out = outputsOf(s);
      if (!seenCovers.has(s.variantId) && existsSync(out.png)) {
        seenCovers.add(s.variantId);
        emit({ type: 'cover', variantId: s.variantId });
        emit({ type: 'log', source: s.variantId, text: `[file] cover written: ${rel(out.png)}` });
      }
      if (!seenJson.has(s.variantId) && existsSync(out.json)) {
        seenJson.add(s.variantId);
        emit({ type: 'log', source: s.variantId, text: `[file] listing written: ${rel(out.json)} (validating with Zod)` });
      }
    }
    if (Date.now() - lastBeat >= 15_000) {
      lastBeat = Date.now();
      const secs = Math.round((Date.now() - producerStart) / 1000);
      for (const s of plan.variants) {
        if (!finished.has(s.variantId) && !seenJson.has(s.variantId))
          emit({ type: 'log', source: s.variantId, text: `[wait] listing-producer still working (${secs}s)` });
      }
    }
  }, 1000);
  const results = await runSpecs(plan.variants as VariantSpec[], ({ outcome }) => {
    finished.add(outcome.variantId);
    emit({ type: 'variant', variantId: outcome.variantId, ok: outcome.ok, why: outcome.why || undefined, secs: outcome.secs });
  });
  clearInterval(watcher);
  const ok = results.filter((r) => r.outcome.ok).length;
  emit({ type: 'stage', stage: 'producer', status: ok ? 'ok' : 'error', detail: `${ok}/${results.length} variants` });

  // 5. Validation already ran per variant (Zod + axes + competitor ids); record the round.
  emit({ type: 'stage', stage: 'validate', status: ok === results.length ? 'ok' : 'error', detail: `Zod schema, fixed axes, cited competitor ids: ${ok}/${results.length} passed` });
  writeFileSync(
    join(dir, 'summary.json'),
    JSON.stringify(
      {
        round,
        updatedAt: new Date().toISOString(),
        lastRunSecs: (Date.now() - start) / 1000,
        ok,
        total: results.length,
        titleWarnings: [],
        variants: results.map((r) => r.outcome),
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(join(dir, 'usage.json'), JSON.stringify({ round, runs: results.map((r) => r.usage) }, null, 2) + '\n');
  return ok > 0;
}

async function runLearn(job: Job) {
  const round = `jobs/${job.id}`;
  const dir = jobDir(job.id);
  copyFileSync(join(ROOT, 'runs', 'r2', 'stats.json'), join(dir, 'stats.json'));
  const diffFile = join(dir, 'memory-diff.json');
  rmSync(diffFile, { force: true });
  const current = readPlaybook();
  emit({ type: 'log', source: 'system', text: `analyst input: runs/r2/stats.json (14 real DNT listings) + memory/playbook.json v${current.version}` });

  reserveSessions(1, round, 'lab learn analyst');
  emit({ type: 'stage', stage: 'analyst', status: 'start', detail: `performance-analyst (claude-opus-5-5) via conductor (${modelos.conductor})` });
  const prompt = [
    `Use the subagent performance-analyst for round ${round} and WAIT until it finishes (do not run it in background).`,
    `It must read runs/${round}/stats.json and memory/playbook.json and write ONLY runs/${round}/memory-diff.json.`,
    'Tell the subagent this run is shown live to English-speaking reviewers: write `effect`, `reason`, `note` and `summary` in English (override the Portuguese instruction).',
    '',
    'When the subagent has finished, reply DONE.',
  ].join('\n');
  const began = Date.now();
  let result: DroidResultMessage | undefined;
  try {
    result = await analystSession(prompt);
  } catch (err) {
    // A session that dies in its first seconds ("Connection error.") did no work: try once more.
    if (Date.now() - began > 15_000) throw err;
    console.log(`[analyst] [retry] session failed fast (${(err as Error).message}), reconnecting once`);
    result = await analystSession(prompt);
  }
  if (!result?.success) throw new Error(result?.error?.message ?? 'analyst session failed');
  if (!existsSync(diffFile)) throw new Error('analyst did not write memory-diff.json');
  const diff = readDiff(diffFile);
  emit({ type: 'stage', stage: 'analyst', status: 'ok', detail: `${diff.add.length} added, ${diff.update.length} updated, ${diff.retire.length} retired, ${diff.inconclusive.length} inconclusive` });
  emit({ type: 'diff', diff });

  emit({ type: 'stage', stage: 'memory', status: 'start' });
  const next = applyDiff(current, diff);
  writeFileSync(join(dir, 'playbook-next.json'), JSON.stringify(next, null, 2) + '\n');
  emit({ type: 'stage', stage: 'memory', status: 'ok', detail: `dry-run: playbook v${current.version} -> v${next.version} (${next.rules.length} rules), validated by Zod, not committed` });
  return true;
}

async function analystSession(prompt: string): Promise<DroidResultMessage | undefined> {
  const session = await createSession({
    cwd: ROOT,
    modelId: modelos.conductor,
    reasoningEffort: ReasoningEffort.Low,
    autonomyLevel: AutonomyLevel.High,
    permissionHandler: ({ options }) =>
      options.some((o) => o.value === ToolConfirmationOutcome.ProceedOnce) ? ToolConfirmationOutcome.ProceedOnce : ToolConfirmationOutcome.Cancel,
  });
  console.log(`[analyst] [session] ${session.id}`);
  let result: DroidResultMessage | undefined;
  try {
    for await (const msg of session.stream(prompt, { abortSignal: AbortSignal.timeout(LEARN_TIMEOUT_MS) })) {
      if (msg.type === DroidMessageType.ToolCall) {
        const i = (msg.input ?? {}) as Record<string, unknown>;
        const d = i.subagent_type ?? i.subagentType ?? i.file_path ?? i.filePath ?? i.description ?? '';
        console.log(`[analyst] [tool] ${msg.name} ${String(d).replace(ROOT + '/', '').slice(0, 140)}`);
      } else if (msg.type === DroidMessageType.Assistant && msg.text.trim()) console.log(`[analyst] ${msg.text.trim().replace(/\s+/g, ' ').slice(0, 200)}`);
      else if (msg.type === DroidMessageType.Result) result = msg;
    }
  } finally {
    await session.close();
  }
  return result;
}

async function main() {
  if (!process.env.FACTORY_API_KEY) process.loadEnvFile(join(ROOT, '.env'));
  const { values } = parseArgs({ options: { job: { type: 'string' } } });
  if (!values.job) throw new Error('--job is required');
  const job: Job = JSON.parse(readFileSync(join(jobDir(values.job), 'job.json'), 'utf8'));
  eventsFile = join(jobDir(job.id), 'events.jsonl');
  captureConsole();
  setStatus(job, 'running');
  // Watchdog: the job always ends with a `done` event, even if a model call ignores its abort signal.
  // Rounds run at most 2 waves of workers (n <= 4, concurrency 3), each cut at timeoutMs + 15s.
  const capMs = job.kind === 'learn' ? 2 * LEARN_TIMEOUT_MS + 30_000 : 2 * (timeoutMs + 20_000) + 200_000;
  setTimeout(() => {
    emit({ type: 'log', source: 'system', text: `watchdog: job exceeded ${Math.round(capMs / 1000)}s, stopping` });
    emit({ type: 'done', ok: false, secs: (Date.now() - start) / 1000, campaignId: job.campaignId, round: job.round });
    setStatus(job, 'error');
    process.exit(1);
  }, capMs).unref();
  let ok = false;
  try {
    ok = job.kind === 'learn' ? await runLearn(job) : await runRound(job);
  } catch (err) {
    emit({ type: 'log', source: 'system', text: `error: ${(err as Error).message}` });
  }
  const b = readBudget();
  emit({ type: 'log', source: 'system', text: `budget ${b.used}/${b.cap} sessions` });
  emit({ type: 'done', ok, secs: (Date.now() - start) / 1000, campaignId: job.campaignId, round: job.round });
  setStatus(job, ok ? 'done' : 'error');
  process.exit(0);
}

if (require.main === module) main();
