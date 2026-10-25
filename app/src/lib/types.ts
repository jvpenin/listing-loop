export type Axes = {
  angulo: "academia" | "casual" | "conforto" | "presente";
  capa: "solo_grade" | "solo_linha" | "modelo" | "uso";
  aquisicao: "organico" | "ads" | "afiliado";
  oferta: "kit4";
};
export type VariantSpec = {
  variantId: string;
  round: string;
  produto: {
    sku: string;
    descricao: string;
    fotoReferencia: string;
    precoShopee: number;
  };
  axes: Axes;
  mode: "exploit" | "explore";
  rationale: string;
  titleHook?: string;
  priorEvidence: string[];
};
export type Plan = {
  round: string;
  createdAt: string;
  dataQuality?: string;
  playbookVersion?: number;
  variants: VariantSpec[];
};
export type Listing = {
  variantId: string;
  axes: Axes;
  mode: "exploit" | "explore";
  title: string;
  description: string;
  keywords: string[];
  coverBrief: string;
  coverPath: string;
  appliedRules: string[];
  hypothesis: string;
  benchmark: {
    competitorsAnalyzed: number;
    referenceItemIds: string[];
    pricePosition: string;
    keywordsAdopted: string[];
    differentiators: string[];
  };
};
export type Summary = {
  round: string;
  updatedAt: string;
  lastRunSecs: number;
  ok: number;
  total: number;
  titleWarnings: string[];
  variants: {
    variantId: string;
    ok: boolean;
    why: string;
    secs: number;
    attempts: number;
  }[];
};
export type Usage = {
  round: string;
  runs: {
    variantId: string;
    attempts: {
      sessionId: string | null;
      success: boolean;
      durationMs: number | null;
      tokenUsage: { factoryCredits: number } | null;
      why: string;
    }[];
  }[];
};
export type AngleIntel = {
  n: number;
  excludedNotComparable: number;
  price: { min: number; p25: number; median: number; p75: number; max: number };
  pricePerPiece: { n: number; p25: number; median: number; p75: number };
  kits: { term: string; count: number; sharePct: number }[];
  discount: { sharePct: number; medianPct: number | null };
  ratingMedian: number | null;
  titles: {
    avgLength: number;
    startsWithKitPct: number;
    topWords: { term: string; count: number; sharePct: number }[];
    topBigrams: { term: string; count: number; sharePct: number }[];
  };
  dnt: {
    price: number;
    kit: number;
    pricePerPiece: number;
    cheaperPerPieceThanPct: number;
    priceVsMedianPct: number | null;
  };
  keywordGaps: { term: string; count: number; sharePct: number }[];
  topCompetitors: {
    itemId: string;
    title: string;
    price: number;
    kit: number | null;
    pricePerPiece: number | null;
    discountPct: number | null;
    rating: number | null;
    salesRank: number | null;
    query: string | null;
    url: string | null;
  }[];
};
export type Intel = {
  round: string;
  generatedAt: string;
  source: string;
  headlines: string[];
  market: Omit<AngleIntel, "topCompetitors">;
  angles: Record<string, AngleIntel>;
};
export type Metric = {
  mean: number;
  ci90: [number, number];
  baselineMean: number;
  pBetter: number;
};
export type AxisValue = {
  n: number;
  enoughData: boolean;
  listings: string[];
  metrics: Partial<
    Record<"ctr" | "cartRate" | "paidConversion" | "profitPer1kImpr", Metric>
  >;
};
export type Stats = {
  generatedAt: string;
  unit: string;
  method: string;
  thresholds: { minListings: number; pBetterRule: number };
  dataQuality: {
    listings: number;
    real?: number;
    realPartial: number;
    simulated: number;
    note: string;
  };
  confounders: { item_id: string; campanha: string; diasSemEstoque: number }[];
  axes: Record<string, Record<string, AxisValue>>;
};
export type MemoryRule = {
  id: string;
  scope: { category: string; channel: string };
  axis: string;
  value: string;
  effect: string;
  metric: string;
  evidence: {
    n: number;
    mean: number;
    ci90: [number, number];
    pBetter: number;
  };
  confidence: "low" | "medium" | "high";
  reason: string;
};
export type Playbook = {
  version: number;
  updatedAt?: string;
  rules: MemoryRule[];
  retired?: { id: string; reason: string; round: string }[];
};
export type MemoryDiff = {
  round: string;
  add: MemoryRule[];
  update: MemoryRule[];
  retire: { id: string; reason: string }[];
  inconclusive: { axis: string; value: string; note: string }[];
  summary: string;
};
export type GitEntry = {
  hash: string;
  date: string;
  subject: string;
  body: string;
};
export type HistoryListing = Record<string, string>;
export type RoundData = {
  plan: Plan;
  summary: Summary | null;
  variants: (Listing | null)[];
  usage: Usage | null;
  approvals: Record<string, boolean>;
};
export type LearningData = {
  stats: Stats | null;
  playbook: Playbook | null;
  diff: MemoryDiff | null;
  gitLog: GitEntry[];
  plans: Record<string, Plan | null>;
  previousPlaybook: Playbook | null;
  history: HistoryListing[];
};
