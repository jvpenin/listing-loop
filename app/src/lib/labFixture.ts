import type { MemoryDiff, VariantSpec } from "./types";

// Job events from claude/LIVE_CONTRACT.md. Every event has `t` (ms since job start).
export type StageName =
  | "apify"
  | "intel"
  | "plan"
  | "producer"
  | "validate"
  | "analyst"
  | "memory";
export type StageStatus = "start" | "ok" | "error" | "skip";
export type LabEvent = { t: number } & (
  | { type: "stage"; stage: StageName; status: StageStatus; detail?: string }
  | { type: "log"; source: string; text: string }
  | { type: "tool"; source: string; name: string; detail?: string }
  | {
      type: "intel";
      n: number;
      query: string;
      actor: string;
      headlines: string[];
    }
  | { type: "plan"; variants: VariantSpec[] }
  | { type: "cover"; variantId: string }
  | {
      type: "variant";
      variantId: string;
      ok: boolean;
      why?: string;
      secs: number;
    }
  | { type: "diff"; diff: MemoryDiff }
  | {
      type: "done";
      ok: boolean;
      secs: number;
      campaignId?: string;
      round?: string;
    }
);

export type Marketplace = {
  id: string;
  label: string;
  currency: string;
  language: string;
  titleMax: number;
};
export type LabStatus = {
  live: boolean;
  budget: { used: number; cap: number };
  droidVersion?: string;
  models: { conductor: string; producer: string; analyst: string };
  marketplaces: Marketplace[];
  replayJobId?: string;
  replayLearnJobId?: string;
};

export type CampaignSummary = {
  id: string;
  kind: "case" | "live";
  product: { name: string; price: number; currency: string };
  marketplace: string;
  photoUrl: string;
  createdAt: string;
  rounds: { round: string; planned: number; generated: number }[];
};

export const fallbackStatus: LabStatus = {
  live: false,
  budget: { used: 31, cap: 80 },
  models: {
    conductor: "claude-haiku-5-5",
    producer: "claude-haiku-5-5",
    analyst: "claude-opus-5-5",
  },
  marketplaces: [
    {
      id: "shopee_br",
      label: "Shopee Brazil",
      currency: "BRL",
      language: "pt-BR",
      titleMax: 120,
    },
  ],
};

// Recorded run used when the app is not live and no recorded job exists. The variant
// contents point at the real DNT case (round r1, v01/v10), so covers and copy are real files.
export const FIXTURE_CAMPAIGN = "dnt-top-cropped";
export const FIXTURE_ROUND = "r1";

const spec = (
  variantId: string,
  angulo: string,
  capa: string,
  aquisicao: string,
  mode: "explore" | "exploit",
  rationale: string,
): VariantSpec => ({
  variantId,
  round: FIXTURE_ROUND,
  produto: {
    sku: "TP001-K4",
    descricao: "kit com 4 tops cropped femininos sem bojo, microfibra, cós largo",
    fotoReferencia: "data/product/photo.jpg",
    precoShopee: 51.9,
  },
  axes: { angulo, capa, aquisicao, oferta: "kit4" } as VariantSpec["axes"],
  mode,
  rationale,
  priorEvidence: [],
});

export const fixtureJob: LabEvent[] = [
  { t: 0, type: "log", source: "system", text: "job started · campaign dnt-top-cropped · round r1 · 2 variants" },
  { t: 200, type: "stage", stage: "apify", status: "start", detail: "xtracto/shopee-search" },
  { t: 600, type: "log", source: "apify", text: "actor run started: query \"kit top cropped casual\" (max 40, sort=sales)" },
  { t: 9800, type: "log", source: "apify", text: "dataset ready: 40 items" },
  { t: 10200, type: "stage", stage: "apify", status: "ok", detail: "40 items" },
  { t: 10300, type: "stage", stage: "intel", status: "start" },
  {
    t: 11000,
    type: "intel",
    n: 179,
    query: "kit top cropped casual",
    actor: "xtracto/shopee-search",
    headlines: [
      "DNT is cheaper per piece than 59% of 179 comparable competitors",
      "Kit 3 is the most common offer; kit 4 is under-supplied",
      "\"fitness\" and \"suplex\" lead competitor titles",
    ],
  },
  { t: 11200, type: "stage", stage: "intel", status: "ok", detail: "179 competitors" },
  { t: 11300, type: "stage", stage: "plan", status: "start", detail: "Thompson sampling over playbook v2" },
  {
    t: 11900,
    type: "plan",
    variants: [
      spec("v01", "casual", "solo_grade", "organico", "exploit", "Exploits what wins: angulo=casual leads 3.66; capa=solo_grade leads 3.17; aquisicao=organico leads 3.58"),
      spec("v02", "casual", "modelo", "afiliado", "explore", "Explores uncertainty: capa=modelo μ 2.61; aquisicao=afiliado μ 0.54"),
    ],
  },
  { t: 12000, type: "stage", stage: "plan", status: "ok", detail: "1 exploit · 1 explore" },
  { t: 12100, type: "stage", stage: "producer", status: "start", detail: "2 listing-producer droids in parallel" },
  { t: 13000, type: "log", source: "v01", text: "conductor claude-haiku-5-5 session opened" },
  { t: 13400, type: "log", source: "v02", text: "conductor claude-haiku-5-5 session opened" },
  { t: 15000, type: "tool", source: "v01", name: "Task", detail: "listing-producer" },
  { t: 15600, type: "tool", source: "v02", name: "Task", detail: "listing-producer" },
  { t: 19000, type: "tool", source: "v01", name: "Read", detail: "memory/playbook.json" },
  { t: 19800, type: "tool", source: "v02", name: "Read", detail: "runs/r1/intel.json" },
  { t: 23000, type: "tool", source: "v01", name: "Read", detail: "runs/r1/intel.json" },
  { t: 26000, type: "log", source: "v02", text: "benchmarking 5 top competitors for angle casual" },
  { t: 31000, type: "tool", source: "v01", name: "GenerateImage", detail: "reference: attached product photo" },
  { t: 34000, type: "tool", source: "v02", name: "GenerateImage", detail: "reference: attached product photo" },
  { t: 62000, type: "cover", variantId: "v01" },
  { t: 64000, type: "tool", source: "v01", name: "Create", detail: "runs/r1/variants/v01.json" },
  { t: 70000, type: "cover", variantId: "v02" },
  { t: 72000, type: "tool", source: "v02", name: "Create", detail: "runs/r1/variants/v02.json" },
  { t: 74000, type: "stage", stage: "validate", status: "start", detail: "Zod Listing schema + axes + competitor ids" },
  { t: 74500, type: "variant", variantId: "v01", ok: true, secs: 62.4 },
  { t: 80000, type: "variant", variantId: "v02", ok: true, secs: 67.9 },
  { t: 80200, type: "stage", stage: "producer", status: "ok", detail: "2/2 ok" },
  { t: 80300, type: "stage", stage: "validate", status: "ok", detail: "2/2 valid" },
  { t: 80500, type: "done", ok: true, secs: 80.5, campaignId: FIXTURE_CAMPAIGN, round: FIXTURE_ROUND },
];

export const fixtureLearn: LabEvent[] = [
  { t: 0, type: "log", source: "system", text: "analyst job started · dry-run on DNT real data (runs/r2/stats.json)" },
  { t: 300, type: "stage", stage: "analyst", status: "start", detail: "performance-analyst · claude-opus-5-5" },
  { t: 2000, type: "tool", source: "analyst", name: "Task", detail: "performance-analyst" },
  { t: 5000, type: "tool", source: "analyst", name: "Read", detail: "runs/r2/stats.json" },
  { t: 7000, type: "tool", source: "analyst", name: "Read", detail: "memory/playbook.json" },
  { t: 30000, type: "tool", source: "analyst", name: "Create", detail: "memory-diff.json" },
  { t: 31000, type: "stage", stage: "analyst", status: "ok" },
  { t: 31200, type: "stage", stage: "memory", status: "start", detail: "Zod MemoryDiff validation (dry-run)" },
  {
    t: 31800,
    type: "diff",
    diff: {
      round: "r2",
      add: [],
      update: [
        {
          id: "angulo-academia-profit",
          scope: { category: "tops", channel: "shopee" },
          axis: "angulo",
          value: "academia",
          effect: "Prioritize the gym angle: highest profit per 1k impressions.",
          metric: "profitPer1kImpr",
          evidence: { n: 11, mean: 7.65, ci90: [6.81, 8.5], pBetter: 0.97 },
          confidence: "high",
          reason: "11 real listings, P(better) 0.97, no confounders.",
        },
      ],
      retire: [],
      inconclusive: [
        { axis: "aquisicao", value: "afiliado", note: "keep exploring: no real listing used affiliates" },
      ],
      summary: "Real data confirms academia and in-line solo covers; acquisition stays inconclusive.",
    },
  },
  { t: 32000, type: "stage", stage: "memory", status: "ok", detail: "dry-run: not committed" },
  { t: 32100, type: "done", ok: true, secs: 32.1 },
];
