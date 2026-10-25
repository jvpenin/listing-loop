import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ApifyClient } from 'apify-client';

import { ROOT, eixos } from './config';
import { buildIntel } from './intel';

// Usage: npx tsx src/competitors.ts [--angles academia,casual] [--max 20] [--round r1]
// Runs the Apify actor once per angle on shopee.com.br (top sales), saves the dataset to
// data/competitors/<angulo>.json and rebuilds runs/<round>/intel.json. Costs Apify credits,
// not Factory sessions (~US$ 0.005 per run + 0.002 per product).

// axery/shopee-scraper returned placeholder data for br (sequential ids, flat R$ 25, 0 sold).
const ACTOR = 'xtracto/shopee-search';

export const keywords: Record<(typeof eixos.angulo)[number], string> = {
  academia: 'kit top cropped academia',
  casual: 'kit top cropped casual',
  conforto: 'kit top cropped sem bojo confortavel',
  presente: 'kit top cropped feminino presente',
};

async function main() {
  if (!process.env.APIFY_TOKEN) process.loadEnvFile(join(ROOT, '.env'));
  const { values } = parseArgs({
    options: {
      angles: { type: 'string', default: eixos.angulo.join(',') },
      max: { type: 'string', default: '20' },
      round: { type: 'string', default: 'r1' },
    },
  });
  const angles = values.angles.split(',').map((a) => a.trim()) as (keyof typeof keywords)[];
  const unknown = angles.filter((a) => !(a in keywords));
  if (unknown.length) throw new Error(`unknown angles: ${unknown.join(', ')}`);

  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const dir = join(ROOT, 'data', 'competitors');
  mkdirSync(dir, { recursive: true });

  // Angles run in parallel: each is an independent actor run.
  const results = await Promise.all(
    angles.map(async (angulo) => {
      const start = Date.now();
      try {
        const run = await client.actor(ACTOR).call({
          country: 'br',
          mode: 'keyword',
          keyword: keywords[angulo],
          sort: 'sales',
          maxProducts: Number(values.max),
        });
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        if (items.length > 0) writeFileSync(join(dir, `${angulo}.json`), JSON.stringify(items, null, 2) + '\n');
        return {
          angulo,
          status: run.status,
          items: items.length,
          usd: run.usageTotalUsd?.toFixed(3) ?? '?',
          secs: ((Date.now() - start) / 1000).toFixed(0),
          runId: run.id,
        };
      } catch (err) {
        return { angulo, status: `ERROR ${(err as Error).message.slice(0, 120)}`, items: 0, usd: '?', secs: '-', runId: '' };
      }
    }),
  );
  console.table(results);

  const intel = buildIntel(values.round);
  console.log(intel ? `intel -> ${intel}` : 'no competitor data saved, intel not built');
  process.exitCode = results.every((r) => r.items > 0) ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
