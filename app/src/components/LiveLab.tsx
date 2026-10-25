"use client";
import Link from "next/link";
import "./LiveLab.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Play,
  Sparkles,
  X,
  Plus,
  Minus,
  LoaderCircle,
  CircleCheck,
  CircleX,
  Circle,
  CircleSlash,
  Brain,
  ArrowRight,
  RotateCcw,
  Timer,
  Search,
  ImageIcon,
  TriangleAlert,
  FlaskConical,
  Radio,
} from "lucide-react";
import { secs } from "./DroidTerminal";
import { Mascot } from "./Brand";
import { SponsorBadge } from "./EngineTerminal";
import {
  initialStatus,
  type LabEvent,
  type LabStatus,
  type MemoryEventRule,
  type Sponsor,
  type StageName,
  type StageStatus,
} from "@/lib/labTypes";
import type { Listing, MemoryDiff, MemoryRule, RoundData, VariantSpec } from "@/lib/types";

// ---------- helpers shared with the campaign pages ----------

export function formatMoney(value: number | undefined, currency = "BRL") {
  if (value === undefined || !Number.isFinite(value)) return "no data";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const AXIS_LABEL: Record<string, string> = {
  angulo: "Angle",
  capa: "Cover",
  aquisicao: "Acquisition",
  oferta: "Offer",
};
const VALUE_LABEL: Record<string, string> = {
  academia: "gym",
  casual: "casual",
  conforto: "comfort",
  presente: "gift",
  solo_grade: "product grid",
  solo_linha: "product row",
  solo: "product only",
  modelo: "on model",
  uso: "in use",
  organico: "organic",
  ads: "ads",
  afiliado: "affiliate",
  kit4: "kit of 4",
  single: "single",
};
export const axisValue = (v: string) => VALUE_LABEL[v] ?? v.replace(/_/g, " ");
export const axisName = (a: string) => AXIS_LABEL[a] ?? a;

export const roundUrl = (campaign: string, round: string) =>
  `/api/campaigns/${encodeURIComponent(campaign)}/rounds/${round}`;
export const coverUrl = (campaign: string, round: string, vid: string, ts?: number) =>
  `${roundUrl(campaign, round)}/cover/${vid}${ts ? `?ts=${ts}` : ""}`;

// Case-study rounds still live behind the legacy endpoints; fall back to them if needed.
export async function fetchRound(campaign: string, round: string): Promise<RoundData | null> {
  for (const url of [roundUrl(campaign, round), ...(campaign === "dnt-top-cropped" ? [`/api/round/${round}`] : [])]) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) return (await r.json()) as RoundData;
    } catch {}
  }
  return null;
}

export function CoverImage({
  campaign,
  round,
  vid,
  ts,
  alt,
}: {
  campaign: string;
  round: string;
  vid: string;
  ts?: number;
  alt: string;
}) {
  const [src, setSrc] = useState(coverUrl(campaign, round, vid, ts));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(coverUrl(campaign, round, vid, ts));
    setFailed(false);
  }, [campaign, round, vid, ts]);
  if (failed)
    return (
      <div className="lab-cover-missing">
        <ImageIcon size={22} />
        <span>cover unavailable</span>
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => {
        const legacy = `/api/round/${round}/cover/${vid}`;
        if (campaign === "dnt-top-cropped" && src !== legacy) setSrc(legacy);
        else setFailed(true);
      }}
    />
  );
}

// What each axis value makes the droid do (mirrors .factory/droids/listing-producer.md).
const COVER_STRATEGY: Record<string, string> = {
  solo_grade: "The 4 tops, no person, 2×2 grid on a neutral background.",
  solo_linha: "The 4 tops, no person, side by side in a row on a neutral background.",
  solo: "The product alone on a neutral background.",
  modelo: "Worn by a model, catalog photo, neutral background.",
  uso: "A model in real action (gym or daily life), with movement and environment.",
};
const ACQUISITION_STRATEGY: Record<string, string> = {
  organico: "Organic search: the description favors long-tail search terms throughout.",
  ads: "Paid ads: the first 2 lines of the description carry the main search keywords.",
  afiliado: "Affiliates: one-line hooks easy to repeat in a short video (price per piece, 4 colors).",
};
const ANGLE_KEYWORD: Record<string, string> = {
  academia: "Top Cropped Academia",
  casual: "Top Cropped Casual",
  conforto: "Top Cropped Confortável",
  presente: "Kit Presente Top Cropped",
};

function Section({ title, by, open, children }: { title: string; by?: Sponsor; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="lab-strat" open={open}>
      <summary>
        <span>{title}</span>
        {by && <SponsorBadge by={by} />}
      </summary>
      <div className="lab-strat-body">{children}</div>
    </details>
  );
}

export type VariantEvidence = Extract<LabEvent, { type: "variant" }>;

export function LabVariantCard({
  spec,
  listing,
  campaign,
  round,
  state,
  coverTs,
  why,
  secsTaken,
  currency,
  price,
  memoryRules = [],
  competitorUrls = {},
  evidence,
}: {
  spec?: VariantSpec;
  listing?: Listing | null;
  campaign: string;
  round: string;
  state: "planned" | "generating" | "cover" | "ok" | "error";
  coverTs?: number;
  why?: string;
  secsTaken?: number;
  currency?: string;
  price?: number;
  memoryRules?: MemoryEventRule[];
  competitorUrls?: Record<string, string>;
  evidence?: VariantEvidence;
}) {
  const vid = listing?.variantId ?? spec?.variantId ?? "v??";
  const axes = (listing?.axes ?? spec?.axes ?? {}) as Record<string, string>;
  const mode = listing?.mode ?? spec?.mode;
  const showCover = state === "cover" || state === "ok" || (!!listing && state !== "error");
  const titleMax = (spec?.produto as { tituloMax?: number } | undefined)?.tituloMax ?? 120;
  const ruleText = (id: string) => memoryRules.find((r) => r.id === id);
  const backing = memoryRules.filter((r) => axes[r.axis] === r.value);
  const keyword = ANGLE_KEYWORD[axes.angulo];
  return (
    <article className={`lab-card ${state}`}>
      <div className="lab-card-cover">
        {showCover ? (
          <CoverImage campaign={campaign} round={round} vid={vid} ts={coverTs} alt={listing?.coverBrief ?? `Cover of ${vid}`} />
        ) : (
          <div className="lab-cover-wait">
            {state === "error" ? <CircleX size={24} /> : state === "planned" ? <Circle size={22} /> : <LoaderCircle size={24} className="spin" />}
            <span>
              {state === "error" ? "failed" : state === "planned" ? "planned" : "droid generating cover…"}
            </span>
          </div>
        )}
        <span className="lab-card-id">{vid}</span>
        {mode && <span className={`lab-mode ${mode}`}>{mode === "explore" ? "Explore" : "Exploit"}</span>}
      </div>
      <div className="lab-card-body">
        <div className="lab-axes">
          {Object.entries(axes)
            .filter(([, v]) => v)
            .map(([a, v]) => (
              <span key={a} title={axisName(a)}>
                <small>{axisName(a)}</small> {axisValue(v)}
              </span>
            ))}
        </div>
        {spec?.rationale && (
          <p className="lab-why">
            <SponsorBadge by="code" /> {spec.rationale}
          </p>
        )}
        {listing ? (
          <div className="lab-strats">
            <Section title="Generated listing" by="claude" open>
              <h4>{listing.title}</h4>
              <small className={listing.title.length > titleMax ? "lab-over" : ""}>
                {listing.title.length}/{titleMax} chars
                {keyword ? ` · starts with the angle keyword “${keyword}”` : ""}
                {spec?.titleHook ? ` · hook “${spec.titleHook}” keeps same-angle titles apart` : ""}
              </small>
              {price !== undefined && <strong className="lab-price">{formatMoney(price, currency)}</strong>}
            </Section>
            <Section title="Description & keywords" by="claude">
              <p className="lab-strat-rule">{ACQUISITION_STRATEGY[axes.aquisicao] ?? `Acquisition: ${axisValue(axes.aquisicao ?? "")}`}</p>
              <details className="lab-desc-full">
                <summary>Read the full description ({listing.description.length} chars)</summary>
                <p className="lab-desc">{listing.description}</p>
              </details>
              {listing.keywords?.length > 0 && (
                <p className="lab-kw">
                  {listing.keywords.map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                </p>
              )}
            </Section>
            <Section title="Cover strategy" by="claude">
              <p className="lab-strat-rule">
                <b>{axisValue(axes.capa ?? "")}</b> · {COVER_STRATEGY[axes.capa] ?? "Cover style set by the plan."} Generated from the real
                product photo inside the droid.
              </p>
              <p>{listing.coverBrief}</p>
            </Section>
            <Section title="Benchmark" by="apify">
              <p>{listing.benchmark.pricePosition}</p>
              {listing.benchmark.differentiators.length > 0 && (
                <ul>
                  {listing.benchmark.differentiators.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {listing.benchmark.keywordsAdopted.length > 0 && (
                <p className="lab-kw">
                  <small>Competitor words adopted:</small>
                  {listing.benchmark.keywordsAdopted.map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                </p>
              )}
              {listing.benchmark.referenceItemIds.length > 0 && (
                <p className="lab-refs">
                  <small>Compared against {listing.benchmark.competitorsAnalyzed} scraped listings; cites:</small>
                  {listing.benchmark.referenceItemIds.map((id) =>
                    competitorUrls[id] ? (
                      <a key={id} href={competitorUrls[id]} target="_blank" rel="noreferrer">
                        {id}
                      </a>
                    ) : (
                      <code key={id}>{id}</code>
                    ),
                  )}
                </p>
              )}
            </Section>
            <Section title="Acquisition" by="code">
              <p className="lab-strat-rule">
                <b>{axisValue(axes.aquisicao ?? "")}</b> · {ACQUISITION_STRATEGY[axes.aquisicao] ?? "Set by the plan."}
              </p>
              <small>The axis is fixed by the planner; the droid must not change it (checked by Zod).</small>
            </Section>
            <Section title={mode === "explore" ? "Hypothesis & memory" : "Memory used"} by="claude">
              {listing.hypothesis && (
                <p className="lab-strat-rule">
                  <FlaskConical size={12} /> {listing.hypothesis}
                </p>
              )}
              {listing.appliedRules.length > 0 ? (
                <ul className="lab-rules-used">
                  {listing.appliedRules.map((id) => {
                    const r = ruleText(id);
                    return (
                      <li key={id}>
                        <code>{id}</code>
                        {r && (
                          <span>
                            {" "}
                            · {r.effect} <small>({r.confidence}, P(better) {r.evidence.pBetter.toFixed(2)})</small>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : backing.length ? (
                <p className="muted">Rules backing these axes: {backing.map((r) => r.id).join(", ")}</p>
              ) : (
                <p className="muted">No playbook rule cited by the droid.</p>
              )}
            </Section>
          </div>
        ) : state === "error" ? (
          <p className="lab-card-error">{why || "The droid output failed validation."}</p>
        ) : (
          <>
            <div className="lab-skel w80" />
            <div className="lab-skel w60" />
          </>
        )}
        {(secsTaken !== undefined || evidence) && (
          <small className="lab-card-foot">
            <SponsorBadge by="factory" />
            {state === "ok" ? " Zod-validated" : " finished"}
            {secsTaken !== undefined ? ` in ${secsTaken.toFixed(0)}s` : ""}
            {evidence?.attempts && evidence.attempts > 1 ? ` · ${evidence.attempts} attempts` : ""}
          </small>
        )}
      </div>
    </article>
  );
}

// ---------- job stream ----------

type JobSource = { kind: "sse"; id: string } | { kind: "recorded"; id: string };

// Recorded runs are compressed to roughly this many seconds when replayed.
const REPLAY_TARGET_MS = 28_000;

function useJob(source: JobSource | null) {
  const [events, setEvents] = useState<LabEvent[]>([]);
  const [error, setError] = useState("");
  const [base, setBase] = useState<{ t: number; at: number } | null>(null);
  useEffect(() => {
    setEvents([]);
    setError("");
    setBase(null);
    if (!source) return;
    let closed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const push = (e: LabEvent) => {
      if (closed) return;
      setEvents((all) => [...all, e]);
      setBase({ t: e.t, at: Date.now() });
    };
    const play = (all: LabEvent[]) => {
      const last = all[all.length - 1]?.t ?? 1;
      const factor = Math.max(1, last / REPLAY_TARGET_MS);
      // Keep `t` faithful (it is shown in the UI); only the playback speed is compressed.
      for (const e of all) timers.push(setTimeout(() => push(e), e.t / factor));
    };
    const es = new EventSource(`/api/lab/jobs/${encodeURIComponent(source.id)}/stream`);
    const buffer: LabEvent[] = [];
    let finished = false;
    // The server replays the whole job on every (re)connect, so start clean on open.
    es.onopen = () => {
      if (source.kind === "sse") setEvents([]);
      buffer.length = 0;
    };
    es.onmessage = (m) => {
      let e: LabEvent;
      try {
        e = JSON.parse(m.data);
      } catch {
        return;
      }
      if (source.kind === "sse") push(e);
      else buffer.push(e);
      if (e.type === "done") {
        finished = true;
        es.close();
        if (source.kind === "recorded") play(buffer);
      }
    };
    es.onerror = () => {
      if (finished || closed) return;
      if (source.kind === "recorded") {
        es.close();
        if (buffer.length) play(buffer);
        else setError("The recorded run could not be loaded.");
      } else setError("Lost the connection to the job stream — reconnecting…");
    };
    return () => {
      closed = true;
      es.close();
      timers.forEach(clearTimeout);
    };
  }, [source]);
  const done = events.find((e): e is Extract<LabEvent, { type: "done" }> => e.type === "done");
  return { events, error: done ? "" : error, done, base };
}

function useElapsed(base: { t: number; at: number } | null, running: boolean, doneSecs?: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(i);
  }, [running]);
  if (doneSecs !== undefined) return doneSecs * 1000;
  if (!base) return 0;
  return base.t + (running ? Date.now() - base.at : 0);
}

type StageView = { status: StageStatus | "idle"; start?: number; end?: number; detail?: string };
function stagesOf(events: LabEvent[]) {
  const map: Partial<Record<StageName, StageView>> = {};
  for (const e of events) {
    if (e.type !== "stage") continue;
    const prev = map[e.stage] ?? { status: "idle" as const };
    map[e.stage] = {
      status: e.status,
      start: e.status === "start" ? e.t : prev.start,
      end: e.status === "start" ? undefined : e.t,
      detail: e.detail ?? prev.detail,
    };
  }
  return map;
}

function Stepper({
  steps,
  stages,
  now,
  finished,
}: {
  steps: { id: StageName; label: string; hint: string; by: Sponsor }[];
  stages: Partial<Record<StageName, StageView>>;
  now: number;
  finished: boolean;
}) {
  return (
    <ol className="lab-stepper">
      {steps.map((s, i) => {
        const v = stages[s.id] ?? { status: "idle" as const };
        const running = v.status === "start" && !finished;
        const took = v.start !== undefined ? (v.end ?? (running ? now : v.start)) - v.start : undefined;
        return (
          <li key={s.id} className={`st-${running ? "running" : v.status}`}>
            <span className="lab-step-icon">
              {running ? (
                <LoaderCircle size={16} className="spin" />
              ) : v.status === "ok" ? (
                <CircleCheck size={16} />
              ) : v.status === "error" ? (
                <CircleX size={16} />
              ) : v.status === "skip" ? (
                <CircleSlash size={16} />
              ) : (
                <span className="lab-step-n">{i + 1}</span>
              )}
            </span>
            <div>
              <strong>
                {s.label} <SponsorBadge by={s.by} />
              </strong>
              <small>{v.detail ?? s.hint}</small>
            </div>
            {took !== undefined && <time>{secs(took)}</time>}
          </li>
        );
      })}
    </ol>
  );
}

type Step = { id: StageName; label: string; hint: string; by: Sponsor };
const ROUND_STEPS = (n: number): Step[] => [
  { id: "apify", label: "Find competitors", hint: "Apify searches Shopee Brazil", by: "apify" },
  { id: "intel", label: "Read the market", hint: "Prices, keywords and gaps", by: "code" },
  { id: "plan", label: "Choose what to test", hint: "Use past results and explore new angles", by: "code" },
  { id: "producer", label: `listing-producer × ${n}`, hint: "Factory custom droids, one session each, in parallel", by: "factory" },
  { id: "validate", label: "Check the listings", hint: "Validate product facts, structure and competitor references", by: "code" },
];
const LEARN_STEPS: Step[] = [
  { id: "analyst", label: "performance-analyst", hint: "Factory custom droid on Claude Opus 5.5", by: "factory" },
  { id: "memory", label: "Memory diff validation", hint: "Zod MemoryDiff, dry-run (no commit)", by: "code" },
];

// ---------- feedback memory ----------

function MemoryPanel({ memory, plan }: { memory: Extract<LabEvent, { type: "memory" }>; plan: VariantSpec[] }) {
  const backs = (r: MemoryEventRule) =>
    plan.filter((v) => (v.axes as Record<string, string>)[r.axis] === r.value).map((v) => v.variantId);
  return (
    <section className="panel lab-memory">
      <span className="eyebrow">
        <Brain size={13} /> FEEDBACK MEMORY · <SponsorBadge by="code" />
      </span>
      <h3>
        Feedback memory (playbook v{memory.version}
        {memory.commit ? `, commit ${memory.commit.hash}` : ""}) — what the planner reads
      </h3>
      <p className="lab-note">
        {memory.commit ? (
          <>
            <code>memory/playbook.json</code> last changed by <code>{memory.commit.subject}</code> on {memory.commit.date}.{" "}
          </>
        ) : null}
        Scope <b>{memory.scope.category}</b> on <b>{memory.scope.channel}</b>: {memory.rules.length} of {memory.totalRules} rules
        apply. {memory.source ? <>Source: {memory.source}.</> : null}
      </p>
      {memory.rules.length === 0 ? (
        <p className="muted">
          No rules in scope: this product has no feedback history, so every axis starts as an exploration (cold start).
        </p>
      ) : (
        <ul className="lab-mem-rules">
          {memory.rules.map((r) => {
            const used = backs(r);
            const avoid = r.evidence.pBetter < 0.5;
            return (
              <li key={r.id} className={avoid ? "avoid" : "prefer"}>
                <div>
                  <b>
                    {axisName(r.axis)} = {axisValue(r.value)}
                  </b>{" "}
                  <span className={`lab-rule-conf conf-${r.confidence}`}>{r.confidence}</span>
                  <p>{r.effect}</p>
                  <small>
                    n={r.evidence.n} · P(better) {r.evidence.pBetter.toFixed(2)} · 90% CI [{r.evidence.ci90[0].toFixed(2)},{" "}
                    {r.evidence.ci90[1].toFixed(2)}]
                  </small>
                </div>
                {plan.length > 0 && (
                  <span className={`lab-mem-use ${used.length ? "on" : ""}`}>
                    {used.length ? `${avoid ? "capped in" : "backs"} ${used.join(", ")}` : avoid ? "avoided" : "not picked"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- memory diff ----------

function RuleCard({ rule, kind }: { rule: MemoryRule; kind: "add" | "update" }) {
  const e = rule.evidence;
  return (
    <article className={`lab-rule ${kind} conf-${rule.confidence}`}>
      <header>
        <span className={`lab-rule-kind ${kind}`}>{kind === "add" ? "New rule" : "Updated"}</span>
        <code>{rule.id}</code>
        <span className="lab-rule-conf">{rule.confidence} confidence</span>
      </header>
      <p>
        <b>
          {axisName(rule.axis)} = {axisValue(rule.value)}
        </b>{" "}
        · {rule.effect}
      </p>
      <dl>
        <div>
          <dt>n</dt>
          <dd>{e.n}</dd>
        </div>
        <div>
          <dt>mean</dt>
          <dd>{e.mean.toFixed(2)}</dd>
        </div>
        <div>
          <dt>90% CI</dt>
          <dd>
            [{e.ci90[0].toFixed(2)}, {e.ci90[1].toFixed(2)}]
          </dd>
        </div>
        <div>
          <dt>P(better)</dt>
          <dd>{e.pBetter.toFixed(2)}</dd>
        </div>
      </dl>
      <small>
        {rule.metric} · {rule.reason}
      </small>
    </article>
  );
}

function DiffView({ diff }: { diff: MemoryDiff }) {
  const empty = !diff.add.length && !diff.update.length && !diff.retire.length;
  return (
    <section className="lab-diff">
      <p className="lab-diff-summary">
        <Brain size={16} /> {diff.summary}
      </p>
      <div className="lab-rules">
        {diff.add.map((r) => (
          <RuleCard key={`a-${r.id}`} rule={r} kind="add" />
        ))}
        {diff.update.map((r) => (
          <RuleCard key={`u-${r.id}`} rule={r} kind="update" />
        ))}
        {diff.retire.map((r) => (
          <article key={`r-${r.id}`} className="lab-rule retire">
            <header>
              <span className="lab-rule-kind retire">Retired</span>
              <code>{r.id}</code>
            </header>
            <p>{r.reason}</p>
          </article>
        ))}
      </div>
      {empty && <p className="muted">No rule met the evidence bar (P(better) ≥ 0.8 with enough listings) this time.</p>}
      {diff.inconclusive.length > 0 && (
        <div className="lab-inconclusive">
          <strong>Inconclusive · keep exploring</strong>
          <ul>
            {diff.inconclusive.map((i, k) => (
              <li key={k}>
                <b>
                  {axisName(i.axis)} = {axisValue(i.value)}
                </b>{" "}
                — {i.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------- form ----------

type FormState = {
  name: string;
  description: string;
  price: string;
  marginPct: string;
  category: string;
  marketplace: string;
  angles: string[];
  variants: number;
  photo: File | null;
};
const EMPTY_FORM: FormState = {
  name: "Kit 4 Top Cropped Sem Bojo",
  description: "Kit com 4 tops cropped femininos sem bojo (preto, branco, azul-marinho, rosa), microfibra, alça larga, cós largo.",
  price: "51.90",
  marginPct: "",
  category: "tops",
  marketplace: "shopee_br",
  angles: ["academia", "casual", "conforto", "presente"],
  variants: 2,
  photo: null,
};
const MAX_PHOTO = 8 * 1024 * 1024;

function validate(f: FormState): string {
  if (!f.name.trim()) return "Give the product a name.";
  if (!f.description.trim()) return "Add a few product facts, such as material, colors and what is included.";
  const p = Number(f.price.replace(",", "."));
  if (!Number.isFinite(p) || p <= 0) return "Enter a price greater than zero.";
  if (f.marginPct.trim() && (!Number.isFinite(Number(f.marginPct.replace(",", "."))) || Number(f.marginPct.replace(",", ".")) < 0 || Number(f.marginPct.replace(",", ".")) >= 100)) return "Target margin must be between 0 and 99%.";
  if (!f.photo) return "Upload a product photo: the droid uses it as the reference for every cover.";
  if (!/^image\/(jpeg|png)$/.test(f.photo.type)) return "The photo must be a JPG or PNG.";
  if (f.photo.size > MAX_PHOTO) return "The photo must be 8 MB or less.";
  if (f.angles.length > 4) return "Choose up to 4 keywords or approaches.";
  if (f.angles.length === 1) return "Add at least 2 angles, or leave them empty to let the planner choose.";
  return "";
}

async function errorText(r: Response) {
  let msg = "";
  try {
    msg = (await r.json()).error ?? "";
  } catch {}
  if (r.status === 403) return msg || "Live mode is off. Start the app with LISTING_LOOP_LIVE=1 to run the droids.";
  if (r.status === 409) return msg || "Another job is already running. Wait for it to finish (or reattach with ?job=<id>).";
  return msg || `Request failed (HTTP ${r.status}).`;
}

// ---------- page ----------

type Ctx = { campaignId?: string; round?: string; currency: string; price?: number };

export function LiveLab({ live, initialJob }: { live: boolean; initialJob?: string }) {
  const [status, setStatus] = useState<LabStatus>({ ...initialStatus, live });
  const [noRecording, setNoRecording] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [keywords, setKeywords] = useState(EMPTY_FORM.angles.join(", "));
  const [photoLoading, setPhotoLoading] = useState(true);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundSource, setRoundSource] = useState<JobSource | null>(
    initialJob && live ? { kind: "sse", id: initialJob } : null,
  );
  const [learnSource, setLearnSource] = useState<JobSource | null>(null);
  const [ctx, setCtx] = useState<Ctx>({ currency: "BRL" });
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [actionError, setActionError] = useState("");
  const results = useRef<HTMLDivElement>(null);

  // Seed only the reference photo; never replace a judge's edits when the request finishes.
  useEffect(() => {
    let active = true;
    fetch("/api/product").then(async (response) => {
      if (!response.ok) return;
      const file = new File([await response.blob()], "dnt-tp001-k4.jpg", { type: "image/jpeg" });
      if (active) setForm((current) => current.photo || current.name !== EMPTY_FORM.name ? current : { ...current, photo: file });
    }).catch(() => {}).finally(() => { if (active) setPhotoLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form.photo) { setPreview(""); return; }
    const url = URL.createObjectURL(form.photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.photo]);

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/lab/status", { cache: "no-store" });
      if (r.ok) {
        const s = (await r.json()) as LabStatus;
        setStatus({ ...initialStatus, ...s, marketplaces: s.marketplaces?.length ? s.marketplaces : initialStatus.marketplaces });
        return s;
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    refreshStatus().then((s) => {
      const isLive = s?.live ?? live;
      if (isLive && !initialJob && s?.runningJobId) setRoundSource({ kind: "sse", id: s.runningJobId });
      if (!isLive && !initialJob) {
        if (s?.replayJobId) setRoundSource({ kind: "recorded", id: s.replayJobId });
        else setNoRecording(true);
      }
      if (!isLive && initialJob) setRoundSource({ kind: "recorded", id: initialJob });
    });
  }, [refreshStatus, live, initialJob]);

  const isLive = status.live;
  const round = useJob(roundSource);
  const learn = useJob(learnSource);
  const roundRunning = !!roundSource && !round.done;
  const learnRunning = !!learnSource && !learn.done;
  const anyRunning = roundRunning || learnRunning;

  // Campaign + round come from the POST response, or from the stream's `done` event on reattach/replay.
  useEffect(() => {
    if (round.done?.campaignId && round.done.round)
      setCtx((c) => ({ ...c, campaignId: round.done!.campaignId, round: round.done!.round }));
  }, [round.done]);

  const plan = useMemo(() => {
    const p = [...round.events].reverse().find((e): e is Extract<LabEvent, { type: "plan" }> => e.type === "plan");
    return p?.variants ?? [];
  }, [round.events]);
  const intel = round.events.find((e): e is Extract<LabEvent, { type: "intel" }> => e.type === "intel");
  const memory = round.events.find((e): e is Extract<LabEvent, { type: "memory" }> => e.type === "memory");
  // Competitor id -> Shopee URL, from the Apify sample in the intel event.
  const competitorUrls = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of intel?.top ?? []) if (c.url) m[c.itemId] = c.url;
    return m;
  }, [intel]);
  // Factory session per lane, from the "[session] <id>" lines and the final variant event.
  const sessions = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of [...round.events, ...learn.events]) {
      if (e.type === "log") {
        const id = e.text.match(/^\[session\] ([0-9a-f-]{8,})/)?.[1];
        if (id) m[e.source] = id;
      }
      if (e.type === "variant" && e.sessionId) m[e.variantId] = e.sessionId;
    }
    return m;
  }, [round.events, learn.events]);
  const covers = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of round.events) if (e.type === "cover") m[e.variantId] = e.t;
    return m;
  }, [round.events]);
  const finished = useMemo(() => {
    const m: Record<string, Extract<LabEvent, { type: "variant" }>> = {};
    for (const e of round.events) if (e.type === "variant") m[e.variantId] = e;
    return m;
  }, [round.events]);
  const diff = learn.events.find((e): e is Extract<LabEvent, { type: "diff" }> => e.type === "diff")?.diff;
  const finishedCount = Object.keys(finished).length;

  // Fetch the round's listings whenever a variant finishes (and once more at the end).
  useEffect(() => {
    if (!ctx.campaignId || !ctx.round || (finishedCount === 0 && !round.done)) return;
    let stale = false;
    fetchRound(ctx.campaignId, ctx.round).then((d) => {
      if (!stale && d) setRoundData(d);
    });
    return () => {
      stale = true;
    };
  }, [ctx.campaignId, ctx.round, finishedCount, round.done]);

  useEffect(() => {
    if (round.done && isLive) refreshStatus();
  }, [round.done, learn.done, isLive, refreshStatus]);

  const now = useElapsed(round.base, roundRunning, round.done?.secs);
  const learnNow = useElapsed(learn.base, learnRunning, learn.done?.secs);
  const roundStages = stagesOf(round.events);
  const learnStages = stagesOf(learn.events);
  const sources = useMemo(() => {
    const s = new Set<string>(plan.map((v) => v.variantId));
    for (const e of round.events) if ((e.type === "log" || e.type === "tool") && /^v\d+$/.test(e.source)) s.add(e.source);
    return [...s].sort();
  }, [plan, round.events]);
  const stageErrors = [...round.events, ...learn.events].filter(
    (e): e is Extract<LabEvent, { type: "stage" }> => e.type === "stage" && e.status === "error",
  );

  function setPhoto(file: File | null) {
    setForm((f) => ({ ...f, photo: file }));
  }
  // The DNT case: the only product with feedback memory (its real Shopee listings).
  async function useDntCase() {
    setFormError("");
    setKeywords(EMPTY_FORM.angles.join(", "));
    let photo: File | null = null;
    try {
      const r = await fetch("/api/product");
      if (r.ok) photo = new File([await r.blob()], "dnt-tp001-k4.jpg", { type: "image/jpeg" });
    } catch {}
    setForm({
      name: "Kit 4 Top Cropped Sem Bojo",
      description: "kit com 4 tops cropped femininos sem bojo (preto, branco, azul-marinho, rosa), microfibra, alça larga, cós largo",
      price: "51.90",
      marginPct: "",
      category: "tops",
      marketplace: "shopee_br",
      angles: ["academia", "casual", "conforto", "presente"],
      variants: 2,
      photo: null,
    });
    setPhoto(photo);
    if (!photo) setFormError("Case filled in, but the product photo could not be loaded. Upload it to continue.");
  }

  function startJob(source: JobSource, next: Ctx) {
    setRoundData(null);
    setLearnSource(null);
    setActionError("");
    setCtx(next);
    setRoundSource(source);
    setTimeout(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    setFormError(problem);
    if (problem && (!form.description.trim() || !Number(form.price.replace(",", ".")))) setDetailsOpen(true);
    if (problem || !isLive) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("name", form.name.trim());
      body.set("description", form.description.trim());
      body.set("price", String(Number(form.price.replace(",", "."))));
      if (form.marginPct.trim()) body.set("marginPct", String(Number(form.marginPct.replace(",", "."))));
      body.set("marketplace", form.marketplace);
      body.set("category", form.category.trim().toLowerCase());
      if (form.angles.length) body.set("angles", form.angles.join(","));
      body.set("variants", String(form.variants));
      body.set("photo", form.photo!);
      const r = await fetch("/api/lab/campaigns", { method: "POST", body });
      if (!r.ok) {
        setFormError(await errorText(r));
        return;
      }
      const { campaignId, round: rnd, jobId } = await r.json();
      const m = status.marketplaces.find((x) => x.id === form.marketplace);
      startJob({ kind: "sse", id: jobId }, { campaignId, round: rnd, currency: m?.currency ?? "BRL", price: Number(form.price.replace(",", ".")) });
      history.replaceState(null, "", `${window.location.pathname}?job=${encodeURIComponent(jobId)}`);
    } catch {
      setFormError("Could not reach the server. Is `npm run dev` still running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function runAnalyst() {
    setActionError("");
    if (!isLive) {
      if (status.replayLearnJobId) setLearnSource({ kind: "recorded", id: status.replayLearnJobId });
      else setActionError("No recorded analyst run available.");
      return;
    }
    try {
      const r = await fetch("/api/lab/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) return setActionError(await errorText(r));
      const { jobId } = await r.json();
      setLearnSource({ kind: "sse", id: jobId });
    } catch {
      setActionError("Could not reach the server.");
    }
  }

  async function nextRound() {
    if (!ctx.campaignId) return;
    setActionError("");
    try {
      const r = await fetch(`/api/lab/campaigns/${encodeURIComponent(ctx.campaignId)}/rounds`, { method: "POST" });
      if (!r.ok) return setActionError(await errorText(r));
      const { campaignId, round: rnd, jobId } = await r.json();
      startJob({ kind: "sse", id: jobId }, { ...ctx, campaignId, round: rnd });
      history.replaceState(null, "", `${window.location.pathname}?job=${encodeURIComponent(jobId)}`);
    } catch {
      setActionError("Could not reach the server.");
    }
  }

  const listingOf = (vid: string) => roundData?.variants.find((v) => v?.variantId === vid) ?? null;
  const specs: VariantSpec[] = plan.length ? plan : (roundData?.plan.variants ?? []);
  const market = status.marketplaces.find((m) => m.id === form.marketplace);
  const canRunLive = isLive && !anyRunning;
  const replaying = !isLive && !!roundSource;

  return (
    <div className="lab judge-lab">
      <header className="lab-head">
        <div>
          <h1>Try a campaign.</h1>
          <p>Start with our cropped top. Edit the title and keywords, then generate two ads.</p>
        </div>
        <div className="demo-guide-anchor"><Mascot name="lo" /><Link className="demo-how-link" href="/architecture">How does it work? <ArrowRight size={18} /></Link></div>
      </header>
      {!isLive && <p className="demo-recording-note">{noRecording ? "Live generation is available on our laptop at the judging table." : "You’re viewing a recorded run. Try live generation on our laptop at the judging table."}</p>}

      <div className="lab-grid">
        <form className="panel lab-form" onSubmit={submit} aria-disabled={!isLive}>
          <fieldset disabled={!isLive || submitting || anyRunning}>
            <div className="demo-form-layout">
              <div className="demo-photo-column">
                <label className="lab-photo judge-photo">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Product reference preview" />
                  ) : <span>{photoLoading ? <LoaderCircle size={24} className="spin" /> : <Upload size={24} />}<b>{photoLoading ? "Loading photo…" : "Add a product photo"}</b></span>}
                  <input type="file" aria-label="Upload a product reference photo" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                </label>
                <span className="demo-photo-caption">Reference photo · click to replace</span>
              </div>
              <div className="demo-fields">
                <label>Product title
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What are you selling?" maxLength={80} />
                </label>
                <label>Keywords to test
                  <input value={keywords} onChange={(e) => { setKeywords(e.target.value); setForm({ ...form, angles: e.target.value.split(",").map(a => a.trim()).filter(Boolean) }); }} placeholder="e.g. gym, everyday, comfort" aria-describedby="keyword-help" />
                </label>
                <p id="keyword-help" className="demo-field-help">Separate 2–4 audiences or uses with commas. Each ad tests a different approach.</p>
                <button className="demo-product-reset" type="button" onClick={() => { setDetailsOpen(true); setKeywords(""); setForm({ ...EMPTY_FORM, name: "", description: "", price: "", category: "", angles: [], photo: null }); setFormError(""); }}>Use my product <ArrowRight size={16} /></button>
              </div>
            </div>
            <details className="judge-details judge-settings" open={detailsOpen} onToggle={e => setDetailsOpen(e.currentTarget.open)}>
              <summary>Product details & pricing <span>Optional for the sample</span></summary>
              <div className="judge-settings-body">
                <label>Product category
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. tops, bags, electronics" maxLength={40} />
                  <small>Use “tops” for the DNT history. Other categories start with no learned rules.</small>
                </label>
                <label>Key product facts<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Material, colors, sizes and what is included." rows={3} maxLength={600} /></label>
                <div className="lab-row">
                  <label>Selling price (BRL)<input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                  <label>Target margin % <small>optional</small><input inputMode="decimal" value={form.marginPct} onChange={(e) => setForm({ ...form, marginPct: e.target.value })} placeholder="e.g. 30" /></label>
                </div>
                <p className="demo-field-help">Margin is a target before ad spend, not calculated profit.</p>
                <div className="lab-variants"><div><b>Listings this round</b><small>2 recommended for a quick demo</small></div><div className="lab-stepper-input"><button type="button" aria-label="Fewer variants" onClick={() => setForm((f) => ({ ...f, variants: Math.max(1, f.variants - 1) }))}><Minus size={14} /></button><output>{form.variants}</output><button type="button" aria-label="More variants" onClick={() => setForm((f) => ({ ...f, variants: Math.min(4, f.variants + 1) }))}><Plus size={14} /></button></div></div>
                <button type="button" className="button secondary" onClick={useDntCase}><Sparkles size={14} /> Reset to DNT sample</button>
              </div>
            </details>
            {formError && <p className="lab-error" role="alert"><TriangleAlert size={14} /> {formError}</p>}
            {isLive && <button type="submit" className="button primary lab-go" disabled={photoLoading}>
              {submitting ? <LoaderCircle size={17} className="spin" /> : <Play size={17} />}
              {isLive ? submitting ? "Starting the droids…" : `Generate ${form.variants} listings` : "Watch the recorded run →"}
            </button>}
            <p className="demo-field-help demo-publish-note">You’ll review the ads before using them. Nothing is published to Shopee.</p>
          </fieldset>
        </form>

        {roundSource && <div className="lab-results" ref={results}>
          <section className="panel lab-pipeline">
            <div className="section-heading"><div className="demo-stage-heading"><Mascot name="fox" /><h2>{roundSource ? round.done ? round.done.ok ? "Your listings are ready." : "Run finished. Review the results." : replaying ? "Replaying a real run" : "The droids are working…" : "From reference to ready-to-test."}</h2></div>{roundSource && <span className="lab-clock"><Timer size={14} /> {secs(now)}</span>}</div>
            {!round.done && <div className="demo-progress" role="status">{roundStages.producer?.status === "start" ? "Creating your ads. Covers and copy will appear below as they’re ready." : "Researching competitors and preparing your campaign. Keep this page open."}</div>}
            {round.done && <p className="demo-field-help">Compare the covers and open each listing to read the copy. Then try the analyst below.</p>}
            {!roundSource && <p className="lab-note">Start a run to see real competitors, then watch each cover and listing arrive here.</p>}
            {round.error && <p className="lab-error" role="alert"><TriangleAlert size={14} /> {round.error}</p>}
            {stageErrors.map((e, i) => <p key={i} className="lab-error"><CircleX size={14} /> {e.stage} failed{e.detail ? `: ${e.detail}` : ""}</p>)}
            {actionError && <p className="lab-error" role="alert"><TriangleAlert size={14} /> {actionError}</p>}
          </section>

          {intel && <section className="panel lab-intel judge-benchmark">
            <div className="judge-benchmark-heading"><SponsorBadge by="apify" /><h3>{intel.n} competitors benchmarked</h3>{intel.secs !== undefined && <small>{intel.secs.toFixed(1)}s</small>}</div>
            <p className="lab-note">Shopee Brazil · “{intel.query}”{intel.cached ? " · Live search returned no items; using a recorded benchmark." : ""}</p>
            <ul>{intel.headlines.slice(0, 2).map((h, i) => <li key={i}>{h}</li>)}</ul>
            <details className="judge-details"><summary>See competitors & scrape evidence</summary>
              <ol className="lab-top">{intel.top?.map((c) => <li key={c.itemId}>{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.title}</a> : c.title} <b>{formatMoney(c.price)}</b>{c.sold ? <small> · {c.sold} sold</small> : null}</li>)}</ol>
              <dl className="lab-evidence"><div><dt>Apify actor</dt><dd>{intel.actor}</dd></div>{intel.runId && <div><dt>Run</dt><dd><code>{intel.runId}</code></dd></div>}{intel.datasetId && <div><dt>Dataset</dt><dd><code>{intel.datasetId}</code></dd></div>}</dl>
            </details>
          </section>}

          {specs.length > 0 && ctx.campaignId && ctx.round && <div className="lab-cards">
            {specs.map((v) => {
              const f = finished[v.variantId];
              const listing = f?.ok ? listingOf(v.variantId) : null;
              const producing = roundStages.producer && roundStages.producer.status !== "skip";
              const state = f ? f.ok ? "ok" : "error" : covers[v.variantId] !== undefined ? "cover" : producing && !round.done ? "generating" : "planned";
              return <LabVariantCard key={v.variantId} spec={v} listing={listing} campaign={ctx.campaignId!} round={ctx.round!} state={state} coverTs={covers[v.variantId]} why={f?.why} secsTaken={f?.secs} currency={ctx.currency} price={ctx.price ?? (v.produto as { preco?: number } | undefined)?.preco ?? v.produto?.precoShopee} memoryRules={memory?.rules} competitorUrls={competitorUrls} evidence={f} />;
            })}
          </div>}

          {round.done && <section className="panel lab-next">
            <div className="demo-stage-heading"><Mascot name="spark" /><h2>Next: see what the sales teach us.</h2></div>
            <p className="lab-note">Try the analyst on DNT’s 14 real listings and 30 days of sales. It proposes memory changes; this demo does not save them. New ads need sales before they can teach the loop.</p>
            <div className="lab-actions"><button className="button primary" onClick={runAnalyst} disabled={learnRunning || (isLive && anyRunning)}>{learnRunning ? <LoaderCircle size={16} className="spin" /> : <Brain size={16} />} {learnRunning ? "Reading sales evidence…" : "Run the analyst"}</button>
              {isLive && ctx.campaignId && ctx.campaignId !== "dnt-top-cropped" && <button className="button secondary" onClick={nextRound} disabled={!canRunLive}><RotateCcw size={16} /> Generate next round</button>}
              {ctx.campaignId && <Link className="button secondary" href={`/campaigns/${encodeURIComponent(ctx.campaignId)}`}>View campaign <ArrowRight size={16} /></Link>}
            </div>
          </section>}

          {learnSource && <section className="panel lab-learn">
            <div className="section-heading"><div><span className="eyebrow">DROID 02 · PERFORMANCE-ANALYST · {status.models.analyst}</span><h2>{learn.done ? "What the analyst would change" : "Reading real sales evidence…"}</h2></div><span className="lab-clock"><Timer size={14} /> {secs(learnNow)}</span></div>
            <Stepper steps={LEARN_STEPS} stages={learnStages} now={learnNow} finished={!!learn.done} />
            {learn.error && <p className="lab-error"><TriangleAlert size={14} /> {learn.error}</p>}
            {diff && <><DiffView diff={diff} /><p className="demo-field-help">You’ve completed the demo. <Link href="/architecture">Open Architecture to trace each step →</Link></p></>}
          </section>}

        </div>}
      </div>
    </div>
  );
}
