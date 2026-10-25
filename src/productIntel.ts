import { MARKETPLACES, type CompetitorItem, type MarketplaceId } from './marketplaces';

// Pure: turns one competitor search (src/marketplaces.ts) into an intel.json the listing-producer
// already reads. A live product gets one search, so every angle carries the same market numbers.
// The math lives here, like src/intel.ts; the orchestrator writes the file.

const STOPWORDS = new Set(
  (
    'de da do das dos e em para com sem por a o as os um uma no na nos nas ao aos à às ou que se mais muito ' +
    'the and for with without of to in on at by from or an is it its this that your you our new pack set ' +
    'pcs pc pçs unidade unidades und kit'
  ).split(' '),
);

const words = (t: string) => (t.toLowerCase().normalize('NFC').match(/[a-zà-ú0-9]{3,}/g) ?? []).filter((w) => !STOPWORDS.has(w) && !/^\d+$/.test(w));

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

const round2 = (x: number) => Math.round(x * 100) / 100;
const pct = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

function top(m: Map<string, number>, n: number, total: number) {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term, count]) => ({ term, count, sharePct: pct(count, total) }));
}

// Counts each term once per title (share = % of competitors that use it).
function termCounts(titles: string[], bigrams: boolean) {
  const m = new Map<string, number>();
  for (const t of titles) {
    const w = words(t);
    const terms = bigrams ? w.slice(1).map((x, i) => `${w[i]} ${x}`) : w;
    for (const term of new Set(terms)) m.set(term, (m.get(term) ?? 0) + 1);
  }
  return m;
}

export interface ProductIntelInput {
  marketplaceId: MarketplaceId;
  query: string;
  price: number;
  items: CompetitorItem[];
  angles: string[];
  // The seller's own name + description: competitor words missing from it become keywordGaps.
  sellerText?: string;
  round?: string;
  actor?: string;
}

export function buildProductIntel({ marketplaceId, query, price, items, angles, sellerText = '', round, actor }: ProductIntelInput) {
  const market = MARKETPLACES[marketplaceId];
  const money = (x: number) => (market.currency === 'BRL' ? `R$ ${x.toFixed(2).replace('.', ',')}` : `$${x.toFixed(2)}`);
  const prices = items.map((i) => i.price);
  const titles = items.map((i) => i.title);
  const n = items.length;
  const median = quantile(prices, 0.5);
  const words1 = termCounts(titles, false);
  const own = new Set([...words(sellerText), ...words(query)]);
  const gapsMap = new Map([...words1].filter(([w, c]) => !own.has(w) && c >= 2));
  const ratings = items.map((i) => i.rating).filter((r): r is number => r !== undefined);

  const angleIntel = {
    n,
    price: {
      min: round2(Math.min(...prices)),
      p25: round2(quantile(prices, 0.25)),
      median: round2(median),
      p75: round2(quantile(prices, 0.75)),
      max: round2(Math.max(...prices)),
    },
    ratingMedian: ratings.length ? quantile(ratings, 0.5) : null,
    titles: {
      avgLength: Math.round(titles.reduce((s, t) => s + t.length, 0) / Math.max(n, 1)),
      topWords: top(words1, 15, n),
      topBigrams: top(termCounts(titles, true), 10, n),
    },
    seller: {
      price,
      priceVsMedianPct: median ? Math.round((100 * (price - median)) / median) : null,
      cheaperThanPct: pct(prices.filter((p) => p > price).length, n),
    },
    keywordGaps: top(gapsMap, 8, n),
    // Actor order is the marketplace's own ranking (sales on Shopee, relevance elsewhere);
    // re-sorted by units sold when the actor reports them.
    topCompetitors: items
      .map((it, i) => ({ ...it, salesRank: i + 1 }))
      .sort((a, b) => (b.sold ?? -1) - (a.sold ?? -1) || a.salesRank - b.salesRank)
      .slice(0, 8)
      .map((it) => ({
        itemId: it.itemId,
        title: it.title,
        price: it.price,
        rating: it.rating ?? null,
        sold: it.sold ?? null,
        salesRank: it.salesRank,
        url: it.url ?? null,
      })),
  };

  const s = angleIntel.seller;
  const headline =
    `${market.label}: ${n} competitors for "${query}"; median ${money(median)} ` +
    `(range ${money(angleIntel.price.p25)}–${money(angleIntel.price.p75)}); ` +
    `your ${money(price)} is cheaper than ${s.cheaperThanPct}% of them` +
    (angleIntel.keywordGaps.length ? `; words competitors use and you do not: ${angleIntel.keywordGaps.slice(0, 4).map((g) => g.term).join(', ')}` : '');

  return {
    ...(round ? { round } : {}),
    generatedAt: new Date().toISOString(),
    source: `Apify ${actor ?? market.actor}, ${market.label}, query "${query}"`,
    marketplace: marketplaceId,
    headlines: [headline],
    market: angleIntel,
    angles: Object.fromEntries(angles.map((a) => [a, angleIntel])),
  };
}
