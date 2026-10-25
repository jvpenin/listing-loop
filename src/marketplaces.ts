import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ApifyClient } from 'apify-client';

import { ROOT } from './config';

// Usage: npx tsx src/marketplaces.ts --query "garrafa termica" [--max 20]
// The demo is Shopee Brazil only. The marketplace is a config entry (actor, limits, language), so
// another channel is one more entry here, not new architecture. Costs Apify credits, not Factory sessions.

export type MarketplaceId = 'shopee_br';

export interface Marketplace {
  id: MarketplaceId;
  label: string;
  currency: 'BRL';
  language: 'pt-BR';
  titleMax: number;
  descMax: number;
  actor: string;
}

export const MARKETPLACES: Record<MarketplaceId, Marketplace> = {
  shopee_br: { id: 'shopee_br', label: 'Shopee Brazil', currency: 'BRL', language: 'pt-BR', titleMax: 120, descMax: 3000, actor: 'xtracto/shopee-search' },
};

export interface CompetitorItem {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  sold?: number;
  rating?: number;
  url?: string;
  image?: string;
}

type Raw = Record<string, unknown>;

const TIMEOUT_SECS = 150;

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

// Same rule as src/intel.ts: Shopee prices may come as price * 100000 or in centavos.
function shopeePrice(raw: unknown): number | undefined {
  const p = num(raw);
  if (p === undefined || p <= 0) return undefined;
  if (p > 100_000) return p / 100_000;
  return p >= 1000 && Number.isInteger(p) ? p / 100 : p;
}

function inputFor(query: string, max: number): Raw {
  return { country: 'br', mode: 'keyword', keyword: query, sort: 'sales', maxProducts: max };
}

function normalize(it: Raw): CompetitorItem | null {
  const item: CompetitorItem = {
    itemId: String(it.item_id ?? ''),
    title: String(it.name ?? it.title ?? ''),
    price: shopeePrice(it.price) ?? NaN,
    currency: 'BRL',
    sold: num(it.sold_count),
    rating: num(it.rating),
    url: it.url as string | undefined,
    image: it.image_url as string | undefined,
  };
  if (!item.itemId || !item.title || !(item.price > 0)) return null;
  for (const k of Object.keys(item) as (keyof CompetitorItem)[]) if (item[k] === undefined) delete item[k];
  return item;
}

export async function scrapeCompetitors(
  marketplaceId: MarketplaceId,
  query: string,
  max = 20,
): Promise<{ actor: string; runId: string; datasetId: string; items: CompetitorItem[]; secs: number }> {
  const market = MARKETPLACES[marketplaceId];
  if (!market) throw new Error(`unknown marketplace ${marketplaceId}`);
  if (!process.env.APIFY_TOKEN) process.loadEnvFile(join(ROOT, '.env'));
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const start = Date.now();
  const actor = market.actor;
  const run = await client.actor(actor).call(inputFor(query, max), { memory: 1024, waitSecs: TIMEOUT_SECS, log: null });
  if (run.status !== 'SUCCEEDED') {
    await client.run(run.id).abort().catch(() => {});
    throw new Error(`apify ${actor} ${run.status} after ${((Date.now() - start) / 1000).toFixed(0)}s for "${query}"`);
  }
  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: Math.max(max, 20) });
  const seen = new Set<string>();
  const out = items
    .map((it) => normalize(it as Raw))
    .filter((it): it is CompetitorItem => !!it && !seen.has(it.itemId) && !!seen.add(it.itemId))
    .slice(0, max);
  if (!out.length) throw new Error(`apify ${actor} returned no usable items for "${query}"`);
  return { actor, runId: run.id, datasetId: run.defaultDatasetId, items: out, secs: (Date.now() - start) / 1000 };
}

if (require.main === module) {
  const { values } = parseArgs({
    options: { query: { type: 'string' }, max: { type: 'string', default: '20' } },
  });
  if (!values.query) throw new Error('--query is required');
  scrapeCompetitors('shopee_br', values.query, Number(values.max))
    .then(({ actor, items, secs }) => {
      console.log(`${actor}: ${items.length} items in ${secs.toFixed(1)}s`);
      console.log(JSON.stringify(items.slice(0, 3), null, 2));
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
