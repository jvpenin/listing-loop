import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, eixos, runDir } from './config';

// Usage: npx tsx src/intel.ts --round r1   (no paid call)
// Reads the Apify datasets in data/competitors/<angulo>.json (one per angle, exported as a JSON
// array or { items: [...] }) and writes runs/<round>/intel.json with the patterns per angle,
// which the listing-producer uses as context.

const COMPETITORS_DIR = join(ROOT, 'data', 'competitors');

const STOPWORDS = new Set(
  'de da do das dos e em para com sem por a o as os um uma no na nos nas kit top cropped feminino feminina'.split(' '),
);

type Item = Record<string, unknown>;

// Shopee scrapers differ in field names; take the first one that exists.
const pick = (it: Item, keys: string[]) => keys.map((k) => it[k]).find((v) => v !== undefined && v !== null);

function priceOf(it: Item): number | null {
  const raw = Number(pick(it, ['price', 'priceMin', 'price_min', 'currentPrice', 'salePrice']));
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return raw > 100_000 ? raw / 100_000 : raw; // Shopee's API stores price * 100000
}

const soldOf = (it: Item) => Number(pick(it, ['historicalSold', 'historical_sold', 'sold', 'soldCount', 'sales']) ?? 0) || 0;
const titleOf = (it: Item) => String(pick(it, ['title', 'name', 'productName', 'itemName']) ?? '');

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

function patterns(items: Item[]) {
  const titled = items.filter((it) => titleOf(it));
  const words = new Map<string, number>();
  const kits = new Map<string, number>();
  for (const it of titled) {
    const title = titleOf(it).toLowerCase();
    for (const w of new Set(title.normalize('NFC').match(/[a-zà-ú0-9]{3,}/g) ?? [])) {
      if (!STOPWORDS.has(w)) words.set(w, (words.get(w) ?? 0) + 1);
    }
    const kit = title.match(/kit\s*(?:com\s*)?(\d+)/)?.[1];
    if (kit) kits.set(`kit${kit}`, (kits.get(`kit${kit}`) ?? 0) + 1);
  }
  const prices = titled.map(priceOf).filter((p): p is number => p !== null);
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => ({ term: k, count: c }));
  return {
    n: titled.length,
    topWords: top(words, 15),
    kits: top(kits, 4),
    price: prices.length ? { min: Math.min(...prices), median: median(prices), max: Math.max(...prices) } : null,
    bestSellers: [...titled]
      .sort((a, b) => soldOf(b) - soldOf(a))
      .slice(0, 5)
      .map((it) => ({ title: titleOf(it), price: priceOf(it), sold: soldOf(it) })),
  };
}

export function buildIntel(round: string): string | null {
  if (!existsSync(COMPETITORS_DIR)) return null;
  const files = readdirSync(COMPETITORS_DIR).filter((f) => f.endsWith('.json'));
  const angles: Record<string, ReturnType<typeof patterns>> = {};
  for (const angulo of eixos.angulo) {
    const file = files.find((f) => f.replace(/\.json$/, '') === angulo);
    if (!file) continue;
    const raw = JSON.parse(readFileSync(join(COMPETITORS_DIR, file), 'utf8'));
    const items: Item[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
    angles[angulo] = patterns(items);
  }
  if (Object.keys(angles).length === 0) return null;
  const out = join(runDir(round), 'intel.json');
  mkdirSync(runDir(round), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify({ round, generatedAt: new Date().toISOString(), source: 'Apify (data/competitors)', angles }, null, 2) + '\n',
  );
  return out;
}

if (require.main === module) {
  const i = process.argv.indexOf('--round');
  const round = i > 0 ? process.argv[i + 1] : 'r1';
  const out = buildIntel(round);
  if (!out) {
    console.log('[intel] no data/competitors/<angulo>.json found: producer runs without competitor intel');
  } else {
    const intel = JSON.parse(readFileSync(out, 'utf8'));
    for (const [a, p] of Object.entries<any>(intel.angles)) {
      const price = p.price ? `R$ ${p.price.min.toFixed(2)}–${p.price.max.toFixed(2)} (med ${p.price.median.toFixed(2)})` : 'sem preço';
      console.log(`${a.padEnd(9)} n=${p.n} ${price} | ${p.topWords.slice(0, 6).map((w: any) => w.term).join(', ')}`);
    }
    console.log(`wrote ${out}`);
  }
}
