// src/stats.ts — calcula o desempenho por valor de eixo a partir do histórico etiquetado.
// Uso: npx tsx src/stats.ts [rodada]   (padrão: r1)  → grava runs/<rodada>/stats.json
//
// Unidade do experimento = o ANÚNCIO. Cada anúncio vira uma taxa por métrica, e cada valor
// de eixo é comparado com "os demais anúncios do mesmo eixo" por bootstrap: sorteamos
// anúncios com reposição milhares de vezes e contamos quantas vezes o grupo ganha.
// Isso evita que um anúncio gigante (milhões de impressões) decida tudo sozinho.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ---------- Configuração (custos da Plataforma DNT, taxas Shopee vigentes) ----------
export const CONFIG = {
  historyCsv: "data/history/dnt_tops.csv",
  custoKit4: 23.4, // TP001-K4, Plataforma DNT
  shopee: { comissaoPct: 0.22, taxaFixaPorItem: 4.5, impostoPct: 0.01 }, // faixa < R$ 80
  comissaoAfiliadoPct: 0.15,
  draws: 4000, // sorteios do bootstrap
  minListings: 3, // mínimo de anúncios num grupo para virar regra
  pBetterRule: 0.8, // limiar para o analyst criar ou reforçar uma regra
  axes: ["angulo", "capa", "aquisicao"] as const, // "oferta" fica de fora: todos são kit4
  // A = 4 tops sem modelo em grade 2x2 · B = 4 tops sem modelo lado a lado · C = 4 tops na modelo, casual
  coverLabels: { capa_A: "solo_grade", capa_B: "solo_linha", capa_C: "modelo" } as Record<string, string>,
};

const METRICS = ["ctr", "cartRate", "paidConversion", "profitPer1kImpr"] as const;
type Metric = (typeof METRICS)[number];
type Row = Record<string, string>;

// ---------- Leitura do CSV (aceita campos entre aspas) ----------
function parseCsv(text: string): Row[] {
  const lines: string[][] = [];
  let field = "", row: string[] = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) lines.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); lines.push(row); }
  const [header, ...body] = lines;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));
}

const num = (v: string) => Number(v);

// ---------- Métricas por anúncio ----------
function listingMetrics(r: Row): Record<Metric, number> {
  const s = CONFIG.shopee;
  const vendas = num(r.vendas), unidades = num(r.unidades);
  const lucro =
    vendas * (1 - s.comissaoPct - s.impostoPct) -
    unidades * (s.taxaFixaPorItem + CONFIG.custoKit4) -
    num(r.gasto_ads) -
    num(r.vendas_afiliados) * CONFIG.comissaoAfiliadoPct;
  return {
    ctr: num(r.cliques) / num(r.impressoes),
    cartRate: num(r.add_carrinho) / num(r.visitantes),
    paidConversion: num(r.pedidos_pagos) / num(r.visitantes),
    profitPer1kImpr: (lucro / num(r.impressoes)) * 1000,
  };
}

// ---------- Estatística ----------
function mulberry32(seed: number) { // gerador aleatório com semente: mesmo resultado a cada execução
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

function bootstrapMeans(xs: number[], rand: () => number, draws: number): number[] {
  const out = new Array<number>(draws);
  for (let d = 0; d < draws; d++) {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)];
    out[d] = s / xs.length;
  }
  return out;
}

function compare(group: number[], rest: number[], rand: () => number) {
  const g = bootstrapMeans(group, rand, CONFIG.draws);
  const b = bootstrapMeans(rest, rand, CONFIG.draws);
  let wins = 0;
  for (let d = 0; d < CONFIG.draws; d++) if (g[d] > b[d]) wins++;
  const sorted = [...g].sort((x, y) => x - y);
  return {
    mean: mean(group),
    ci90: [quantile(sorted, 0.05), quantile(sorted, 0.95)] as [number, number],
    baselineMean: mean(rest),
    pBetter: wins / CONFIG.draws,
  };
}

// ---------- Principal ----------
export function computeStats(rows: Row[]) {
  const rand = mulberry32(241026);
  const listings = rows.map((r) => ({ row: r, m: listingMetrics(r) }));
  const axes: Record<string, Record<string, unknown>> = {};

  for (const axis of CONFIG.axes) {
    axes[axis] = {};
    const values = [...new Set(listings.map((l) => l.row[axis]))];
    for (const value of values) {
      const inGroup = listings.filter((l) => l.row[axis] === value);
      const rest = listings.filter((l) => l.row[axis] !== value);
      const label = axis === "capa" ? CONFIG.coverLabels[value] ?? value : value;
      const entry: Record<string, unknown> = {
        n: inGroup.length,
        enoughData: inGroup.length >= CONFIG.minListings && rest.length >= CONFIG.minListings,
        listings: inGroup.map((l) => l.row.item_id),
        metrics: {},
      };
      if (inGroup.length >= 2 && rest.length >= 2) {
        for (const metric of METRICS) {
          (entry.metrics as Record<string, unknown>)[metric] = compare(
            inGroup.map((l) => l.m[metric]),
            rest.map((l) => l.m[metric]),
            rand,
          );
        }
      }
      axes[axis][label] = entry;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    unit: "listing",
    method: "bootstrap por anúncio; pBetter = P(média do grupo > média dos demais anúncios do eixo)",
    thresholds: { minListings: CONFIG.minListings, pBetterRule: CONFIG.pBetterRule },
    dataQuality: {
      listings: rows.length,
      realPartial: rows.filter((r) => r.fonte === "real_parcial").length,
      simulated: rows.filter((r) => r.fonte === "simulado").length,
      note: `Base de demonstração: ${rows.filter((r) => r.fonte === "real_parcial").length} anúncios reais parciais (vendas, unidades e preço reais; funil estimado) e ${rows.filter((r) => r.fonte === "simulado").length} simulados. Não apresentar os simulados como histórico real da loja.`,
    },
    confounders: rows
      .filter((r) => r.campanha === "sim" || num(r.dias_sem_estoque) >= 3)
      .map((r) => ({ item_id: r.item_id, campanha: r.campanha, diasSemEstoque: num(r.dias_sem_estoque) })),
    perListing: listings.map((l) => ({ item_id: l.row.item_id, fonte: l.row.fonte, ...l.m })),
    axes,
  };
}

const isMain = process.argv[1]?.endsWith("stats.ts");
if (isMain) {
  const round = process.argv[2] ?? "r1";
  const rows = parseCsv(readFileSync(CONFIG.historyCsv, "utf8"));
  const stats = computeStats(rows);
  const outDir = join("runs", round);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "stats.json"), JSON.stringify(stats, null, 2));

  // Resumo legível no terminal
  console.log(`stats: ${rows.length} anúncios (${stats.dataQuality.realPartial} reais parciais, ${stats.dataQuality.simulated} simulados)`);
  for (const [axis, values] of Object.entries(stats.axes)) {
    for (const [value, e] of Object.entries(values as Record<string, any>)) {
      const p = e.metrics.profitPer1kImpr;
      const c = e.metrics.ctr;
      console.log(
        `${axis}=${value}`.padEnd(22),
        `n=${e.n}`.padEnd(5),
        p ? `lucro/1k R$ ${p.mean.toFixed(2)} [${p.ci90[0].toFixed(2)}, ${p.ci90[1].toFixed(2)}] P(melhor)=${p.pBetter.toFixed(2)}` : "dados insuficientes",
        c ? `| CTR ${(c.mean * 100).toFixed(2)}% P=${c.pBetter.toFixed(2)}` : "",
      );
    }
  }
  console.log(`→ ${join(outDir, "stats.json")}`);
}
