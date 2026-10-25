import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ApifyClient } from 'apify-client';
import pLimit from 'p-limit';

import { ROOT, eixos } from './config';
import { buildIntel } from './intel';

// Usage: npx tsx src/competitors.ts [--angles academia,casual] [--max 20] [--round r1]
// Runs the Apify actor once per angle on shopee.com.br (top sales), saves the dataset to
// data/competitors/<angulo>.json and rebuilds runs/<round>/intel.json. Costs Apify credits,
// not Factory sessions.

// axery/shopee-scraper returned placeholder data for br (sequential ids, flat R$ 25, 0 sold).
const ACTOR = 'xtracto/shopee-search';

// Two searches per angle: the angle's own wording plus the product's generic search, so
// "presente"/"conforto" are benchmarked against real kits of tops, not tube tops.
export const keywords: Record<(typeof eixos.angulo)[number], string[]> = {
  academia: ['kit top cropped academia', 'kit top fitness academia feminino'],
  casual: ['kit top cropped casual', 'kit cropped feminino basico'],
  conforto: ['kit top cropped sem bojo', 'kit top cropped microfibra'],
  presente: ['kit 4 top cropped feminino', 'kit top cropped cores'],
};

async function main() {
  if (!process.env.APIFY_TOKEN) process.loadEnvFile(join(ROOT, '.env'));
  const { values } = parseArgs({
    options: {
      angles: { type: 'string', default: eixos.angulo.join(',') },
      max: { type: 'string', default: '40' },
      round: { type: 'string', default: 'r1' },
    },
  });
  const angles = values.angles.split(',').map((a) => a.trim()) as (keyof typeof keywords)[];
  const unknown = angles.filter((a) => !(a in keywords));
  if (unknown.length) throw new Error(`unknown angles: ${unknown.join(', ')}`);

  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const dir = join(ROOT, 'data', 'competitors');
  mkdirSync(dir, { recursive: true });

  // Each (angle, keyword) search is its own actor run. The free Apify plan caps total run memory
  // at 16 GB, so at most 3 run at once with 1 GB each.
  const searches = angles.flatMap((angulo) => keywords[angulo].map((keyword) => ({ angulo, keyword })));
  const limit = pLimit(3);
  const runs = await Promise.all(
    searches.map(({ angulo, keyword }) => limit(async () => {
      const start = Date.now();
      try {
        const run = await client.actor(ACTOR).call({
          country: 'br',
          mode: 'keyword',
          keyword,
          sort: 'sales',
          maxProducts: Number(values.max),
        }, { memory: 1024 });
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return { angulo, keyword, status: run.status, items, usd: run.usageTotalUsd ?? 0, secs: (Date.now() - start) / 1000 };
      } catch (err) {
        const status = `ERROR ${(err as Error).message.slice(0, 100)}`;
        return { angulo, keyword, status, items: [], usd: 0, secs: (Date.now() - start) / 1000 };
      }
    })),
  );

  // One file per angle, deduplicated by item, each item tagged with its query and rank in it.
  const results = angles.map((angulo) => {
    const byId = new Map<string, Record<string, unknown>>();
    for (const r of runs.filter((x) => x.angulo === angulo)) {
      r.items.forEach((it, rank) => {
        const id = String(it.item_id);
        if (!byId.has(id)) byId.set(id, { ...it, query: r.keyword, rank: rank + 1 });
      });
    }
    const failed = runs.some((x) => x.angulo === angulo && x.status !== 'SUCCEEDED');
    if (byId.size > 0 && !failed) writeFileSync(join(dir, `${angulo}.json`), JSON.stringify([...byId.values()], null, 2) + '\n');
    const mine = runs.filter((x) => x.angulo === angulo);
    return {
      angulo,
      status: mine.map((x) => x.status).join(' / '),
      unique: byId.size,
      usd: mine.reduce((s, x) => s + x.usd, 0).toFixed(3),
      secs: Math.max(...mine.map((x) => x.secs)).toFixed(0),
    };
  });
  console.table(results);

  const intel = buildIntel(values.round);
  console.log(intel ? `intel -> ${intel}` : 'no competitor data saved, intel not built');
  process.exitCode = results.every((r) => r.unique > 0) ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
