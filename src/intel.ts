import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, eixos, produto, runDir } from './config';

// Usage: npx tsx src/intel.ts --round r1   (no paid call)
// Turns the Apify datasets in data/competitors/<angulo>.json into runs/<round>/intel.json:
// per-angle market numbers (price, price per piece, kit mix, discounts, title patterns), where
// DNT's kit sits in that market, the search words competitors use and DNT does not, and the
// top competitors by sales rank. The math lives here; the listing-producer turns it into copy
// and must cite the competitors it benchmarked (round.ts checks the ids exist).

const COMPETITORS_DIR = join(ROOT, 'data', 'competitors');
const HISTORY_CSV = join(ROOT, 'data', 'history', 'dnt_tops.csv');
const DNT_KIT = 4;

const STOPWORDS = new Set(
  'de da do das dos e em para com sem por a o as os um uma no na nos nas kit top tops cropped feminino feminina femininos'.split(
    ' ',
  ),
);

type Item = Record<string, unknown>;

// Shopee scrapers differ in field names; take the first one that exists.
const pick = (it: Item, keys: string[]) => keys.map((k) => it[k]).find((v) => v !== undefined && v !== null);

// Shopee's API stores price * 100000; xtracto/shopee-search returns centavos (5000 = R$ 50,00).
// A kit of tops never costs R$ 1000+, so integers at or above that are taken as centavos.
function priceOf(it: Item): number | null {
  const raw = Number(pick(it, ['price', 'priceMin', 'price_min', 'currentPrice', 'salePrice']));
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (raw > 100_000) return raw / 100_000;
  return raw >= 1000 && Number.isInteger(raw) ? raw / 100 : raw;
}

const titleOf = (it: Item) => String(pick(it, ['title', 'name', 'productName', 'itemName']) ?? '');
const idOf = (it: Item) => String(pick(it, ['item_id', 'itemId', 'id']) ?? '');
const shopOf = (it: Item) => String(pick(it, ['shop_id', 'shopId']) ?? '');
const numOr = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const discountOf = (it: Item) => numOr(pick(it, ['discount_pct', 'discountPct', 'discount']));
const ratingOf = (it: Item) => numOr(pick(it, ['rating', 'rating_star', 'ratingStar']));

// "Kit 4", "KIT 03", "kit com 3", "3 tops": pieces in the listing, null when the title does not say.
function kitOf(title: string): number | null {
  const t = title.toLowerCase();
  const n = t.match(/kit\s*(?:com\s*)?0*(\d{1,2})\b/)?.[1] ?? t.match(/\b0*(\d{1,2})\s*(?:tops|croppeds|pe[çc]as|unidades)\b/)?.[1];
  const k = n ? Number(n) : NaN;
  return k >= 1 && k <= 20 ? k : null;
}

const words = (title: string) => (title.toLowerCase().normalize('NFC').match(/[a-zà-ú0-9]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w));

function quantile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

const round2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
const pct = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

function top(m: Map<string, number>, n: number, total: number) {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term, count]) => ({ term, count, sharePct: pct(count, total) }));
}

// DNT's current titles (real listings in the history), to find the words competitors use and DNT does not.
function dntTitleWords(): Set<string> {
  if (!existsSync(HISTORY_CSV)) return new Set();
  const [header, ...rows] = readFileSync(HISTORY_CSV, 'utf8').trim().split('\n');
  const cols = header.split(',');
  const ti = cols.indexOf('titulo');
  const fi = cols.indexOf('fonte');
  if (ti < 0) return new Set();
  return new Set(rows.map((r) => r.split(',')).filter((c) => c[fi] !== 'simulado').flatMap((c) => words(c[ti] ?? '')));
}

// The store's own listings show up in the search; they are not competitors.
function ownShopIds(items: Item[]): Set<string> {
  if (!existsSync(HISTORY_CSV)) return new Set();
  const ownItems = new Set(readFileSync(HISTORY_CSV, 'utf8').split('\n').slice(1).map((l) => l.split(',')[0]));
  return new Set(items.filter((it) => ownItems.has(idOf(it))).map(shopOf));
}

// Only comparable garments count: tube tops ("tomara que caia", faixa) and bras show up in the same
// searches but are a different product, and would distort price per piece.
const NOT_COMPARABLE = /tomara\s*que\s*caia|\btube\b|tubinho|\bfaixa\b|suti[ãa]|\bbiqu[ií]ni/i;
const isComparable = (it: Item) => !NOT_COMPARABLE.test(titleOf(it));

function analyze(items: Item[], dntWords: Set<string>) {
  const priced = items.filter((it) => titleOf(it) && priceOf(it) !== null);
  const titled = priced.filter(isComparable);
  const n = titled.length;
  const prices = titled.map((it) => priceOf(it)!);
  const perPiece = titled.flatMap((it) => {
    const k = kitOf(titleOf(it));
    return k ? [priceOf(it)! / k] : [];
  });
  const kits = new Map<string, number>();
  const wordCount = new Map<string, number>();
  const bigrams = new Map<string, number>();
  for (const it of titled) {
    const title = titleOf(it);
    const k = kitOf(title);
    if (k) kits.set(`kit${k}`, (kits.get(`kit${k}`) ?? 0) + 1);
    const ws = words(title);
    for (const w of new Set(ws)) wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
    for (const b of new Set(ws.slice(1).map((w, i) => `${ws[i]} ${w}`))) bigrams.set(b, (bigrams.get(b) ?? 0) + 1);
  }
  const discounts = titled.map(discountOf).filter((d) => Number.isFinite(d) && d > 0);
  const ratings = titled.map(ratingOf).filter((r) => Number.isFinite(r) && r > 0);

  const dntPerPiece = produto.precoShopee / DNT_KIT;
  const topWords = top(wordCount, 15, n);
  return {
    n,
    excludedNotComparable: priced.length - n,
    price: {
      min: round2(Math.min(...prices)),
      p25: round2(quantile(prices, 0.25)),
      median: round2(quantile(prices, 0.5)),
      p75: round2(quantile(prices, 0.75)),
      max: round2(Math.max(...prices)),
    },
    pricePerPiece: {
      n: perPiece.length,
      p25: round2(quantile(perPiece, 0.25)),
      median: round2(quantile(perPiece, 0.5)),
      p75: round2(quantile(perPiece, 0.75)),
    },
    kits: top(kits, 5, n),
    discount: { sharePct: pct(discounts.length, n), medianPct: quantile(discounts, 0.5) },
    ratingMedian: quantile(ratings, 0.5),
    titles: {
      avgLength: Math.round(titled.reduce((s, it) => s + titleOf(it).length, 0) / Math.max(n, 1)),
      startsWithKitPct: pct(titled.filter((it) => /^kit\b/i.test(titleOf(it).trim())).length, n),
      topWords,
      topBigrams: top(bigrams, 8, n),
    },
    dnt: {
      price: produto.precoShopee,
      kit: DNT_KIT,
      pricePerPiece: round2(dntPerPiece),
      cheaperPerPieceThanPct: pct(perPiece.filter((p) => p > dntPerPiece).length, perPiece.length),
      priceVsMedianPct: prices.length ? Math.round((100 * (produto.precoShopee - quantile(prices, 0.5)!)) / quantile(prices, 0.5)!) : null,
    },
    // Frequent competitor words that none of DNT's current titles use.
    keywordGaps: topWords.filter((w) => !dntWords.has(w.term)).slice(0, 8),
    topCompetitors: [...titled]
      .sort((a, b) => numOr(a.rank) - numOr(b.rank))
      .slice(0, 8)
      .map((it) => {
        const title = titleOf(it);
        const k = kitOf(title);
        return {
          itemId: idOf(it),
          title,
          price: priceOf(it),
          kit: k,
          pricePerPiece: k ? round2(priceOf(it)! / k) : null,
          discountPct: Number.isFinite(discountOf(it)) ? discountOf(it) : null,
          rating: Number.isFinite(ratingOf(it)) ? ratingOf(it) : null,
          salesRank: Number.isFinite(numOr(it.rank)) ? numOr(it.rank) : null,
          query: it.query ?? null,
          url: it.url ?? null,
        };
      }),
  };
}

const brl = (x: number | null) => (x === null ? '?' : `R$ ${x.toFixed(2).replace('.', ',')}`);

// One-line findings per angle, written from the numbers, for the producer and the demo.
function headline(angulo: string, a: ReturnType<typeof analyze>): string {
  const kit = a.kits[0];
  return (
    `${angulo}: ${a.n} concorrentes comparáveis (${a.excludedNotComparable} excluídos: outro tipo de peça); mediana ${brl(a.price.median)} (${brl(a.pricePerPiece.median)}/peça); ` +
    `kit dominante ${kit ? `${kit.term} (${kit.sharePct}%)` : '?'}; DNT ${brl(a.dnt.pricePerPiece)}/peça é mais barato por peça que ` +
    `${a.dnt.cheaperPerPieceThanPct}% deles; palavras que a DNT não usa: ${a.keywordGaps.slice(0, 4).map((w) => w.term).join(', ') || '-'}`
  );
}

export function buildIntel(round: string): string | null {
  if (!existsSync(COMPETITORS_DIR)) return null;
  const files = readdirSync(COMPETITORS_DIR).filter((f) => f.endsWith('.json'));
  const dntWords = dntTitleWords();
  const angles: Record<string, ReturnType<typeof analyze>> = {};
  const pooled = new Map<string, Item>();
  const queries: Record<string, string[]> = {};
  for (const angulo of eixos.angulo) {
    const file = files.find((f) => f.replace(/\.json$/, '') === angulo);
    if (!file) continue;
    const raw = JSON.parse(readFileSync(join(COMPETITORS_DIR, file), 'utf8'));
    const items: Item[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
    const own = ownShopIds(items);
    const competitors = items.filter((it) => !own.has(shopOf(it)));
    angles[angulo] = analyze(competitors, dntWords);
    queries[angulo] = [...new Set(competitors.map((it) => String(it.query ?? '')).filter(Boolean))];
    for (const it of competitors) pooled.set(idOf(it), it);
  }
  if (Object.keys(angles).length === 0) return null;
  const market = analyze([...pooled.values()], dntWords);
  const out = join(runDir(round), 'intel.json');
  mkdirSync(runDir(round), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        round,
        generatedAt: new Date().toISOString(),
        source: 'Apify xtracto/shopee-search, shopee.com.br, ordenado por mais vendidos',
        queries,
        headlines: Object.entries(angles).map(([a, x]) => headline(a, x)),
        market: { ...market, topCompetitors: undefined },
        angles,
      },
      null,
      2,
    ) + '\n',
  );
  return out;
}

// All competitor ids the producer may cite for an angle (round.ts checks benchmark references).
export function competitorIds(round: string, angulo: string): Set<string> | null {
  const file = join(runDir(round), 'intel.json');
  if (!existsSync(file)) return null;
  const angle = JSON.parse(readFileSync(file, 'utf8')).angles?.[angulo];
  if (!angle) return null;
  const raw = JSON.parse(readFileSync(join(COMPETITORS_DIR, `${angulo}.json`), 'utf8'));
  return new Set<string>((Array.isArray(raw) ? raw : (raw.items ?? [])).map(idOf));
}

if (require.main === module) {
  const i = process.argv.indexOf('--round');
  const round = i > 0 ? process.argv[i + 1] : 'r1';
  const out = buildIntel(round);
  if (!out) {
    console.log('[intel] no data/competitors/<angulo>.json found: producer runs without competitor intel');
  } else {
    const intel = JSON.parse(readFileSync(out, 'utf8'));
    for (const h of intel.headlines) console.log(`- ${h}`);
    const m = intel.market;
    console.log(
      `- mercado: ${m.n} concorrentes únicos; mediana ${brl(m.pricePerPiece.median)}/peça; DNT mais barato por peça que ${m.dnt.cheaperPerPieceThanPct}%`,
    );
    console.log(`wrote ${out}`);
  }
}
