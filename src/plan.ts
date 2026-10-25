import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT, eixos, produto, runDir, variantesPorRodada } from './config';
import { Plan, Playbook, type Axes, type MemoryRule, type VariantSpec } from './schemas';

// Usage: npx tsx src/plan.ts --round r1 --from r1 --seed 42
// No paid call: reads runs/<from>/stats.json (if any) and writes runs/<round>/plan.json.

type ScoredAxis = 'angulo' | 'capa' | 'aquisicao';
const SCORED: ScoredAxis[] = ['angulo', 'capa', 'aquisicao'];

interface ValueStat {
  n?: number;
  mean: number;
  ci90: [number, number];
  pBetter?: number;
}

type Stats = Partial<Record<ScoredAxis, Record<string, ValueStat>>> & { overallMean?: number; dataQuality?: string };

// Reads src/stats.ts output: axes.<axis>.<value>.metrics.profitPer1kImpr = { mean, ci90, pBetter }.
// Values that are not in config.eixos (e.g. angulo "neutro") are ignored.
function loadStats(file: string): Stats {
  if (!existsSync(file)) return {};
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const out: Stats = {};
  for (const axis of SCORED) {
    out[axis] = {};
    for (const [value, v] of Object.entries<any>(raw.axes?.[axis] ?? {})) {
      if (!(eixos[axis] as readonly string[]).includes(value)) continue;
      const m = v?.metrics?.profitPer1kImpr;
      if (typeof m?.mean !== 'number' || !Array.isArray(m?.ci90)) continue;
      out[axis]![value] = { n: v.n, mean: m.mean, ci90: m.ci90, pBetter: m.pBetter };
    }
  }
  const perListing: { profitPer1kImpr: number }[] = raw.perListing ?? [];
  if (perListing.length) out.overallMean = perListing.reduce((s, l) => s + l.profitPer1kImpr, 0) / perListing.length;
  const dq = raw.dataQuality;
  if (dq) out.dataQuality = dq.real ? dq.note : `base de demonstração: ${dq.realPartial} reais + ${dq.simulated} simulados`;
  return out;
}

// Seeded PRNG (mulberry32) + Box-Muller, so --seed reproduces the plan.
function rng(seed: number) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (mean: number, sd: number) => {
    const u = 1 - uniform();
    const v = uniform();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

// Same-angle variants share the angle keyword at the start of the title; a distinct hook right
// after it keeps their titles apart (Shopee flags near-duplicate listings as spam).
const TITLE_HOOKS = ['Kit 4 Cores', 'Preço por Peça', 'Cós Largo', 'Sem Bojo Microfibra'];

const sdOf = (s: ValueStat) => Math.max((s.ci90[1] - s.ci90[0]) / 3.29, 1e-6);
const fmt = (x: number) => x.toFixed(2);

interface Prior {
  mean: number;
  sd: number;
  stat?: ValueStat;
}

function buildPriors(stats: Stats) {
  const all = SCORED.flatMap((a) => Object.values(stats[a] ?? {}));
  const maxSd = all.length ? Math.max(...all.map(sdOf)) : 1;
  const overall = stats.overallMean ?? (all.length ? all.reduce((s, v) => s + v.mean, 0) / all.length : 0);
  const priors = {} as Record<ScoredAxis, Record<string, Prior>>;
  const best = {} as Record<ScoredAxis, string | undefined>;
  for (const axis of SCORED) {
    priors[axis] = {};
    for (const value of eixos[axis]) {
      const stat = stats[axis]?.[value];
      priors[axis][value] = stat ? { mean: stat.mean, sd: sdOf(stat), stat } : { mean: overall, sd: 2 * maxSd };
    }
    best[axis] = Object.entries(stats[axis] ?? {}).sort((x, y) => y[1].mean - x[1].mean)[0]?.[0];
  }
  return { priors, best, overall };
}

function loadPlaybook(): Playbook {
  const file = join(ROOT, 'memory', 'playbook.json');
  return existsSync(file) ? Playbook.parse(JSON.parse(readFileSync(file, 'utf8'))) : { version: 0, rules: [] };
}

// A rule with pBetter >= 0.5 backs its value; below that it is an "evitar" rule.
const isPositive = (r: MemoryRule) => r.evidence.pBetter >= 0.5;

export function makePlan(round: string, from: string | undefined, seed: number): Plan {
  const statsFile = from ? join(runDir(from), 'stats.json') : '';
  const stats = from ? loadStats(statsFile) : {};
  const { priors, best } = buildPriors(stats);
  const normal = rng(seed);

  // The playbook (memory written by the performance-analyst) shapes the next round:
  // - a backed value gets a narrower, higher belief (sd / 2, mean + sd / 2 of the original);
  // - an "evitar" value has its mean pushed down 2 sd and is capped at AVOID_CAP variants
  //   (one stays, so the system keeps exploring it instead of freezing a possibly lucky loser).
  const playbook = loadPlaybook();
  const rulesFor = (a: ScoredAxis, value: string) => playbook.rules.filter((r) => r.axis === a && r.value === value);
  const avoided = new Set<string>();
  for (const a of SCORED) {
    for (const [value, p] of Object.entries(priors[a])) {
      const rules = rulesFor(a, value);
      if (rules.some(isPositive)) {
        p.mean += p.sd / 2;
        p.sd /= 2;
      }
      if (rules.some((r) => !isPositive(r))) {
        p.mean -= 2 * p.sd;
        avoided.add(`${a}=${value}`);
      }
    }
  }
  const AVOID_CAP = 1;
  const avoidCount = new Map<string, number>();
  const overCap = (c: Axes) => SCORED.some((a) => avoided.has(`${a}=${c[a]}`) && (avoidCount.get(`${a}=${c[a]}`) ?? 0) >= AVOID_CAP);
  const count = (c: Axes) => {
    for (const a of SCORED) if (avoided.has(`${a}=${c[a]}`)) avoidCount.set(`${a}=${c[a]}`, (avoidCount.get(`${a}=${c[a]}`) ?? 0) + 1);
  };

  const combos: Axes[] = [];
  for (const angulo of eixos.angulo)
    for (const capa of eixos.capa)
      for (const aquisicao of eixos.aquisicao) combos.push({ angulo, capa, aquisicao, oferta: 'kit4' });

  // Batch Thompson sampling: each slot draws a fresh posterior sample per axis value,
  // scores every combination as the sum of its values, and takes the best compliant one.
  // Compliance: a (capa, angulo) pair is used at most once (Shopee flags duplicates as spam).
  // Slot 1 is pinned to the best known combination (highest sum of posterior means),
  // so every round carries one pure exploit as the reference to beat.
  const meanScore = (c: Axes) => SCORED.reduce((s, a) => s + priors[a][c[a]].mean, 0);
  const anchor = combos.reduce((b, c) => (meanScore(c) > meanScore(b) ? c : b));
  const usedPairs = new Set<string>([`${anchor.capa}|${anchor.angulo}`]);
  const chosen: Axes[] = [anchor];
  count(anchor);
  while (chosen.length < variantesPorRodada) {
    const draw = {} as Record<ScoredAxis, Record<string, number>>;
    for (const axis of SCORED) {
      draw[axis] = {};
      for (const [value, p] of Object.entries(priors[axis])) draw[axis][value] = normal(p.mean, p.sd);
    }
    // The avoid cap is soft: when compliance leaves no other pair, an avoided value is allowed.
    const best = (respectCap: boolean) => {
      let pick: Axes | undefined;
      let pickScore = -Infinity;
      for (const c of combos) {
        if (usedPairs.has(`${c.capa}|${c.angulo}`) || (respectCap && overCap(c))) continue;
        const score = SCORED.reduce((s, a) => s + draw[a][c[a]], 0);
        if (score > pickScore) [pick, pickScore] = [c, score];
      }
      return pick;
    };
    const pick = best(true) ?? best(false);
    if (!pick) throw new Error(`only ${chosen.length} compliant combinations available`);
    usedPairs.add(`${pick.capa}|${pick.angulo}`);
    count(pick);
    chosen.push(pick);
  }

  const hookIndex = new Map<string, number>();
  const variants: VariantSpec[] = chosen.map((axes, i) => {
    const h = hookIndex.get(axes.angulo) ?? 0;
    hookIndex.set(axes.angulo, h + 1);
    const strong = (a: ScoredAxis) => {
      const s = priors[a][axes[a]].stat;
      return (!!s && (best[a] === axes[a] || (s.pBetter ?? 0) >= 0.8)) || rulesFor(a, axes[a]).some(isPositive);
    };
    // Exploit = every value has data and at least 2 of the 3 are proven (leader or pBetter >= 0.8).
    // With the (capa, angulo) compliance rule, all-3-proven would allow a single exploit per round.
    // Known = measured in stats.json, or backed by a playbook rule (memory counts as knowledge).
    const known = SCORED.every((a) => !!priors[a][axes[a]].stat || rulesFor(a, axes[a]).some(isPositive));
    const mode = known && SCORED.filter(strong).length >= 2 ? 'exploit' : 'explore';
    const notes: string[] = [];
    const evidence: string[] = [];
    for (const a of SCORED) {
      const p = priors[a][axes[a]];
      if (!p.stat) {
        notes.push(`${a}=${axes[a]} sem dado`);
        continue;
      }
      const s = p.stat;
      notes.push(`${a}=${axes[a]} ${best[a] === axes[a] ? 'lidera' : 'μ'} ${fmt(s.mean)}`);
      evidence.push(
        `${a}=${axes[a]}: profitPer1kImpr μ=${fmt(s.mean)} IC90 [${fmt(s.ci90[0])}, ${fmt(s.ci90[1])}]` +
          (s.pBetter !== undefined ? ` pBetter=${fmt(s.pBetter)}` : '') +
          (s.n !== undefined ? ` n=${s.n}` : ''),
      );
    }
    for (const a of SCORED) {
      for (const r of rulesFor(a, axes[a])) evidence.push(`regra ${r.id} (${r.confidence}): ${r.effect}`);
    }
    const rationale = `${mode === 'exploit' ? 'Aproveita o que já vence' : 'Explora incerteza'}: ${notes.join('; ')}`;
    return {
      variantId: `v${String(i + 1).padStart(2, '0')}`,
      round,
      produto: { ...produto },
      axes,
      mode,
      rationale,
      titleHook: TITLE_HOOKS[h % TITLE_HOOKS.length],
      priorEvidence: evidence.slice(0, 6),
    };
  });

  return Plan.parse({
    round,
    createdAt: new Date().toISOString(),
    dataQuality: stats.dataQuality,
    playbookVersion: playbook.version,
    variants,
  });
}

export function writePlan(plan: Plan) {
  const dir = runDir(plan.round);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
}

export function printPlan(plan: Plan) {
  console.table(
    plan.variants.map((v) => ({
      variante: v.variantId,
      angulo: v.axes.angulo,
      capa: v.axes.capa,
      aquisicao: v.axes.aquisicao,
      mode: v.mode,
      rationale: v.rationale,
    })),
  );
  const explore = plan.variants.filter((v) => v.mode === 'explore').length;
  console.log(`${plan.variants.length} variantes, ${explore} explore, ${plan.variants.length - explore} exploit`);
  if (plan.dataQuality) console.log(`dados: ${plan.dataQuality}`);
}

if (require.main === module) {
  const { values } = parseArgs({
    options: { round: { type: 'string' }, from: { type: 'string' }, seed: { type: 'string', default: '42' } },
  });
  if (!values.round) throw new Error('--round is required');
  const from = values.from;
  if (from && !existsSync(join(runDir(from), 'stats.json'))) {
    console.warn(`[plan] runs/${from}/stats.json not found: every axis value uses the wide prior`);
  }
  const plan = makePlan(values.round, from, Number(values.seed));
  writePlan(plan);
  printPlan(plan);
  console.log(`wrote runs/${plan.round}/plan.json`);
}
