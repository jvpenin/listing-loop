import type { MemoryDiff, VariantSpec } from "./types";

// Job events from claude/LIVE_CONTRACT.md. Every event has `t` (ms since job start) and, since v2,
// `by`: who acted (apify | factory | claude | code | system). Older recorded jobs lack `by`.
export type StageName = "apify" | "intel" | "plan" | "producer" | "validate" | "analyst" | "memory";
export type StageStatus = "start" | "ok" | "error" | "skip";
export type Sponsor = "apify" | "factory" | "claude" | "code" | "system";

export type MemoryEventRule = {
  id: string;
  axis: string;
  value: string;
  effect: string;
  confidence: "low" | "medium" | "high";
  evidence: { n: number; mean: number; ci90: [number, number]; pBetter: number };
};
export type CompetitorRef = { itemId: string; title: string; price: number; sold: number | null; url: string | null };

export type LabEvent = { t: number; by?: Sponsor } & (
  | { type: "stage"; stage: StageName; status: StageStatus; detail?: string }
  | { type: "log"; source: string; text: string }
  | { type: "tool"; source: string; name: string; detail?: string }
  | {
      type: "intel";
      n: number;
      query: string;
      actor: string;
      headlines: string[];
      runId?: string;
      datasetId?: string;
      secs?: number;
      cached?: string;
      top?: CompetitorRef[];
    }
  | {
      type: "memory";
      version: number;
      commit: { hash: string; subject: string; date: string } | null;
      scope: { category: string; channel: string };
      totalRules: number;
      rules: MemoryEventRule[];
      source?: string;
    }
  | { type: "plan"; variants: VariantSpec[] }
  | { type: "cover"; variantId: string }
  | {
      type: "variant";
      variantId: string;
      ok: boolean;
      why?: string;
      secs: number;
      sessionId?: string | null;
      attempts?: number;
      factoryCredits?: number | null;
      models?: { conductor: string; producer: string };
    }
  | { type: "diff"; diff: MemoryDiff }
  | { type: "done"; ok: boolean; secs: number; campaignId?: string; round?: string; error?: string }
);

export type Marketplace = { id: string; label: string; currency: string; language: string; titleMax: number };
export type LabStatus = {
  live: boolean;
  budget: { used: number; cap: number } | null;
  droidVersion?: string | null;
  models: { conductor: string; producer: string; analyst: string };
  marketplaces: Marketplace[];
  runningJobId?: string | null;
  replayJobId?: string | null;
  replayLearnJobId?: string | null;
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

// Shown until /api/lab/status answers: no numbers are invented (budget unknown = null).
export const initialStatus: LabStatus = {
  live: false,
  budget: null,
  models: { conductor: "claude-haiku-5-5", producer: "claude-haiku-5-5", analyst: "claude-opus-5-5" },
  marketplaces: [{ id: "shopee_br", label: "Shopee Brazil", currency: "BRL", language: "pt-BR", titleMax: 120 }],
};

// Who acted, for events recorded before `by` existed (contract v2 fallback mapping).
export function sponsorOf(e: LabEvent): Sponsor {
  if (e.by) return e.by;
  switch (e.type) {
    case "stage":
      return e.stage === "apify" ? "apify" : e.stage === "producer" || e.stage === "analyst" ? "factory" : "code";
    case "intel":
      return "apify";
    case "tool":
    case "variant":
      return "factory";
    case "diff":
    case "cover":
      return "claude";
    case "plan":
    case "memory":
      return "code";
    case "log":
      if (e.source === "apify") return "apify";
      if (e.source === "plan") return "code";
      if (/^\[(session|result|retry)\]/.test(e.text)) return "factory";
      if (/^\[(file|wait)\]/.test(e.text)) return "code";
      if (/^(v\d+|analyst)$/.test(e.source)) return "claude";
      return "system";
    default:
      return "system";
  }
}

export const SPONSOR_LABEL: Record<Sponsor, string> = {
  apify: "APIFY",
  factory: "FACTORY",
  claude: "CLAUDE",
  code: "CODE",
  system: "SYS",
};
