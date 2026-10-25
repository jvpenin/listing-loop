"use client";
import Link from "next/link";
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
  Wallet,
  Search,
  ImageIcon,
  TriangleAlert,
  FlaskConical,
  Radio,
} from "lucide-react";
import { DroidTerminal, secs } from "./DroidTerminal";
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
            <Section title="Title strategy" by="claude" open>
              <h4>{listing.title}</h4>
              <small className={listing.title.length > titleMax ? "lab-over" : ""}>
                {listing.title.length}/{titleMax} chars
                {keyword ? ` · starts with the angle keyword “${keyword}”` : ""}
                {spec?.titleHook ? ` · hook “${spec.titleHook}” keeps same-angle titles apart` : ""}
              </small>
              {price !== undefined && <strong className="lab-price">{formatMoney(price, currency)}</strong>}
            </Section>
            <Section title="Description strategy" by="claude" open>
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
            {evidence?.sessionId ? ` · session ${evidence.sessionId.slice(0, 8)}…` : ""}
            {evidence?.factoryCredits ? ` · ${evidence.factoryCredits} credits` : ""}
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
  { id: "apify", label: "Apify scrape", hint: "Actor run on Apify cloud: live Shopee Brazil search", by: "apify" },
  { id: "intel", label: "Competitor intel", hint: "Price bands, title patterns, keyword gaps (TypeScript)", by: "code" },
  { id: "plan", label: "Plan · Thompson sampling", hint: "Picks axes per variant from beliefs + feedback memory", by: "code" },
  { id: "producer", label: `listing-producer × ${n}`, hint: "Factory custom droids, one session each, in parallel", by: "factory" },
  { id: "validate", label: "Zod validation", hint: "Schema, fixed axes, cited competitor ids", by: "code" },
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
  category: string;
  marketplace: string;
  angles: string[];
  variants: number;
  photo: File | null;
};
const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  marketplace: "shopee_br",
  angles: [],
  variants: 2,
  photo: null,
};
const MAX_PHOTO = 8 * 1024 * 1024;

function validate(f: FormState): string {
  if (!f.name.trim()) return "Give the product a name.";
  const p = Number(f.price.replace(",", "."));
  if (!Number.isFinite(p) || p <= 0) return "Enter a price greater than zero.";
  if (!f.photo) return "Upload a product photo: the droid uses it as the reference for every cover.";
  if (!/^image\/(jpeg|png)$/.test(f.photo.type)) return "The photo must be a JPG or PNG.";
  if (f.photo.size > MAX_PHOTO) return "The photo must be 8 MB or less.";
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
  const [angleDraft, setAngleDraft] = useState("");
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [roundSource, setRoundSource] = useState<JobSource | null>(
    initialJob && live ? { kind: "sse", id: initialJob } : null,
  );
  const [learnSource, setLearnSource] = useState<JobSource | null>(null);
  const [ctx, setCtx] = useState<Ctx>({ currency: "BRL" });
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [actionError, setActionError] = useState("");
  const results = useRef<HTMLDivElement>(null);

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
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : "");
    setForm((f) => ({ ...f, photo: file }));
  }
  function addAngle(raw: string) {
    const a = raw.trim().toLowerCase();
    if (!a || form.angles.includes(a) || form.angles.length >= 4) return;
    setForm((f) => ({ ...f, angles: [...f.angles, a] }));
    setAngleDraft("");
  }
  // The DNT case: the only product with feedback memory (its real Shopee listings).
  async function useDntCase() {
    setFormError("");
    let photo: File | null = null;
    try {
      const r = await fetch("/api/product");
      if (r.ok) photo = new File([await r.blob()], "dnt-tp001-k4.jpg", { type: "image/jpeg" });
    } catch {}
    setForm({
      name: "Kit 4 Top Cropped Sem Bojo",
      description: "kit com 4 tops cropped femininos sem bojo (preto, branco, azul-marinho, rosa), microfibra, alça larga, cós largo",
      price: "51.90",
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
    if (problem || !isLive) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("name", form.name.trim());
      body.set("description", form.description.trim());
      body.set("price", String(Number(form.price.replace(",", "."))));
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
      history.replaceState(null, "", `/lab?job=${encodeURIComponent(jobId)}`);
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
      history.replaceState(null, "", `/lab?job=${encodeURIComponent(jobId)}`);
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
    <div className="lab">
      <header className="lab-head">
        <div>
          <span className="eyebrow">
            <Radio size={13} /> LIVE LAB · RUN BOTH FACTORY DROIDS NOW
          </span>
          <h1>Give it a product. Watch Apify, Factory and Claude build the listings.</h1>
          <p>
            An <b>Apify</b> actor scrapes real Shopee competitors, our planner reads the feedback memory and picks what to test,
            parallel <b>Factory</b> <code>listing-producer</code> droids (<b>Claude</b>) write title, description, benchmark and cover for
            each variant, and the <code>performance-analyst</code> turns sales evidence into memory.
          </p>
        </div>
        <div className="lab-meters">
          <span>
            <Wallet size={14} /> Factory sessions{" "}
            {status.budget ? (
              <>
                <b>{status.budget.used}</b>/{status.budget.cap}
              </>
            ) : (
              "—"
            )}
          </span>
          <span>
            <Timer size={14} /> {roundSource ? secs(now) : "—"}
          </span>
          <span className={`lab-live ${isLive ? "on" : ""}`}>
            <i /> {isLive ? "LIVE" : "REPLAY"}
          </span>
        </div>
      </header>

      {!isLive && (
        <div className="lab-banner">
          <Play size={16} />
          <p>
            <b>Live droids run on our laptop at the judging table.</b>{" "}
            {noRecording
              ? "No recorded run is available in this deployment."
              : "Below: a real recorded run (same events the engine wrote), replayed with compressed timing."}
          </p>
        </div>
      )}

      <div className="lab-grid">
        <form className="panel lab-form" onSubmit={submit} aria-disabled={!isLive}>
          <fieldset disabled={!isLive || submitting || anyRunning}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">1 · PRODUCT</span>
                <h2>What are we launching?</h2>
              </div>
            </div>
            <div className="lab-case">
              <button type="button" className="button primary" onClick={useDntCase}>
                <Sparkles size={15} /> Use the DNT case product
              </button>
              <p>
                Feedback memory exists for this product only: DNT&apos;s 14 real Shopee listings (Seller Center, 30 days) stand in for
                the sales feedback our own listings would generate over time. Any other product runs cold (no memory in scope).
              </p>
            </div>
            <label className="lab-photo">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Product reference preview" />
              ) : (
                <span>
                  <Upload size={22} />
                  <b>Upload product photo</b>
                  <small>JPG or PNG, up to 8 MB. Every cover is generated from it.</small>
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Product name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Stainless steel water bottle 1L"
                maxLength={120}
              />
            </label>
            <label>
              Short description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Material, sizes, what is in the box. The droid never invents product facts."
                rows={3}
                maxLength={600}
              />
            </label>
            <div className="lab-row">
              <label>
                Price ({market?.currency ?? "BRL"})
                <input
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="49.90"
                />
              </label>
              <label>
                Marketplace
                <input readOnly value="Shopee Brazil" aria-describedby="lab-market-note" />
              </label>
            </div>
            <label>
              Category <small>(memory scope; the DNT case is “tops”)</small>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. tops — empty = general (no memory)"
                maxLength={40}
              />
            </label>
            {market && (
              <small className="lab-hint">
                <span id="lab-market-note">Shopee Brazil case: listings in {market.language} (the store&apos;s customers) · title limit {market.titleMax} chars · prices in {market.currency}</span>
              </small>
            )}
            <span className="eyebrow lab-sub">2 · EXPERIMENT</span>
            <label>
              Angles to test <small>(optional, 2–4)</small>
              <div className="lab-chips">
                {form.angles.map((a) => (
                  <span key={a}>
                    {a}
                    <button
                      type="button"
                      aria-label={`Remove ${a}`}
                      onClick={() => setForm((f) => ({ ...f, angles: f.angles.filter((x) => x !== a) }))}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {form.angles.length < 4 && (
                  <input
                    value={angleDraft}
                    onChange={(e) => setAngleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addAngle(angleDraft);
                      }
                    }}
                    onBlur={() => addAngle(angleDraft)}
                    placeholder={form.angles.length ? "add another…" : "e.g. gym, office, gift — Enter to add"}
                  />
                )}
              </div>
            </label>
            <div className="lab-variants">
              <div>
                <b>Variants this round</b>
                <small>Each variant = 1 paid Factory session, ~2 min, run in parallel.</small>
              </div>
              <div className="lab-stepper-input">
                <button
                  type="button"
                  aria-label="Fewer variants"
                  onClick={() => setForm((f) => ({ ...f, variants: Math.max(1, f.variants - 1) }))}
                >
                  <Minus size={14} />
                </button>
                <output>{form.variants}</output>
                <button
                  type="button"
                  aria-label="More variants"
                  onClick={() => setForm((f) => ({ ...f, variants: Math.min(4, f.variants + 1) }))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {formError && (
              <p className="lab-error" role="alert">
                <TriangleAlert size={14} /> {formError}
              </p>
            )}
            <button type="submit" className="button primary lab-go">
              {submitting ? <LoaderCircle size={17} className="spin" /> : <Play size={17} />}
              {isLive ? `Run droids · ${form.variants} variant${form.variants > 1 ? "s" : ""}` : "Live only at the judging table"}
            </button>
            <small className="lab-hint center">
              Nothing is published. Models: conductor {status.models.conductor} · producer {status.models.producer} · analyst{" "}
              {status.models.analyst}
            </small>
          </fieldset>
        </form>

        <div className="lab-results" ref={results}>
          <section className="panel lab-pipeline">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PIPELINE{ctx.round ? ` · ROUND ${ctx.round.toUpperCase()}` : ""}</span>
                <h2>{roundSource ? (round.done ? (round.done.ok ? "Round complete" : "Round finished with errors") : replaying ? "Replaying a recorded run" : "Droids at work") : "Ready when you are"}</h2>
              </div>
              {roundSource && (
                <span className="lab-clock">
                  <Timer size={14} /> {secs(now)}
                </span>
              )}
            </div>
            {!roundSource ? (
              <p className="muted">
                Fill in the product and hit <b>Run droids</b>. Each stage below lights up as it happens; every line comes from a
                real Factory session or from our TypeScript validators.
              </p>
            ) : (
              <Stepper steps={ROUND_STEPS(specs.length || form.variants)} stages={roundStages} now={now} finished={!!round.done} />
            )}
            {roundSource && (
              <DroidTerminal
                source={["system", "apify", "plan"]}
                title="Pipeline log"
                subtitle="TypeScript orchestrator · Apify · planner"
                events={round.events}
                state={round.done ? (round.done.ok ? "ok" : "error") : "running"}
                emptyText="Connecting to the job…"
              />
            )}
            {round.error && (
              <p className="lab-error">
                <TriangleAlert size={14} /> {round.error}
              </p>
            )}
            {stageErrors.map((e, i) => (
              <p key={i} className="lab-error">
                <CircleX size={14} /> {e.stage} failed{e.detail ? `: ${e.detail}` : ""}
              </p>
            ))}
            {actionError && (
              <p className="lab-error" role="alert">
                <TriangleAlert size={14} /> {actionError}
              </p>
            )}
          </section>

          {intel && (
            <section className="panel lab-intel">
              <span className="eyebrow">
                <Search size={13} /> <SponsorBadge by="apify" /> {intel.actor}
              </span>
              <div className="lab-intel-top">
                <strong>{intel.n}</strong>
                <span>
                  real competitors for
                  <br />“{intel.query}”
                </span>
              </div>
              <dl className="lab-evidence">
                {intel.runId && (
                  <div>
                    <dt>Actor run</dt>
                    <dd>
                      <code>{intel.runId}</code>
                    </dd>
                  </div>
                )}
                {intel.datasetId && (
                  <div>
                    <dt>Dataset</dt>
                    <dd>
                      <code>{intel.datasetId}</code>
                    </dd>
                  </div>
                )}
                {intel.secs !== undefined && (
                  <div>
                    <dt>Run time</dt>
                    <dd>{intel.secs.toFixed(1)}s</dd>
                  </div>
                )}
                {intel.cached && (
                  <div>
                    <dt>Source</dt>
                    <dd>live scrape empty; cached from {intel.cached}</dd>
                  </div>
                )}
              </dl>
              <ul>
                {intel.headlines.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
              {intel.top && intel.top.length > 0 && (
                <ol className="lab-top">
                  {intel.top.map((c) => (
                    <li key={c.itemId}>
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer">
                          {c.title}
                        </a>
                      ) : (
                        c.title
                      )}{" "}
                      <b>{formatMoney(c.price)}</b>
                      <small>
                        {" "}
                        · id {c.itemId}
                        {c.sold ? ` · ${c.sold} sold` : ""}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {memory && <MemoryPanel memory={memory} plan={specs} />}

          {specs.length > 0 && (
            <section className="panel lab-plan">
              <span className="eyebrow">
                PLAN · THOMPSON SAMPLING · <SponsorBadge by="code" />
              </span>
              <div className="lab-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Angle</th>
                      <th>Cover</th>
                      <th>Acquisition</th>
                      <th>Mode</th>
                      <th>Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((v) => (
                      <tr key={v.variantId}>
                        <td>
                          <code>{v.variantId}</code>
                        </td>
                        <td>{axisValue(v.axes.angulo)}</td>
                        <td>{axisValue(v.axes.capa)}</td>
                        <td>{axisValue(v.axes.aquisicao)}</td>
                        <td>
                          <span className={`lab-mode inline ${v.mode}`}>{v.mode === "explore" ? "explore" : "exploit"}</span>
                        </td>
                        <td className="lab-rationale">{v.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {roundStages.producer?.status === "skip" && (
            <p className="lab-note">Dry run: the plan was written, no Factory droid session was opened.</p>
          )}
          {sources.length > 0 && roundStages.producer?.status !== "skip" && (
            <div className="lab-lanes">
              {sources.map((s) => {
                const f = finished[s];
                const st = f ? (f.ok ? "ok" : "error") : round.done ? "error" : roundStages.producer?.status === "start" ? "running" : "idle";
                return (
                  <DroidTerminal
                    key={s}
                    source={s}
                    title={`listing-producer · ${s}`}
                    subtitle={`Factory session ${sessions[s] ? sessions[s].slice(0, 8) + "…" : "opening…"} · conductor ${
                      f?.models?.conductor ?? status.models.conductor
                    } → producer ${f?.models?.producer ?? status.models.producer}${f?.factoryCredits ? ` · ${f.factoryCredits} credits` : ""}`}
                    events={round.events}
                    state={st}
                  />
                );
              })}
            </div>
          )}

          {specs.length > 0 && ctx.campaignId && ctx.round && (
            <div className="lab-cards">
              {specs.map((v) => {
                const f = finished[v.variantId];
                const listing = f?.ok ? listingOf(v.variantId) : null;
                const producing = roundStages.producer && roundStages.producer.status !== "skip";
                const state = f ? (f.ok ? "ok" : "error") : covers[v.variantId] !== undefined ? "cover" : producing && !round.done ? "generating" : "planned";
                return (
                  <LabVariantCard
                    key={v.variantId}
                    spec={v}
                    listing={listing}
                    campaign={ctx.campaignId!}
                    round={ctx.round!}
                    state={state}
                    coverTs={covers[v.variantId]}
                    why={f?.why}
                    secsTaken={f?.secs}
                    currency={ctx.currency}
                    price={ctx.price ?? (v.produto as { preco?: number } | undefined)?.preco ?? v.produto?.precoShopee}
                    memoryRules={memory?.rules}
                    competitorUrls={competitorUrls}
                    evidence={f}
                  />
                );
              })}
            </div>
          )}

          {round.done && (
            <section className="panel lab-next">
              <span className="eyebrow">3 · CLOSE THE LOOP</span>
              <h2>Now let the second droid learn.</h2>
              <p className="lab-note">
                No sales exist yet for a listing created a minute ago, so the analyst runs on the DNT store&apos;s 14 real listings
                (30-day Seller Center export). <b>Dry-run: memory is not committed.</b>
              </p>
              <div className="lab-actions">
                <button className="button primary" onClick={runAnalyst} disabled={learnRunning || (isLive && anyRunning)}>
                  {learnRunning ? <LoaderCircle size={16} className="spin" /> : <Brain size={16} />} Run performance-analyst (Opus 5.5)
                  now
                </button>
                {isLive && ctx.campaignId && ctx.campaignId !== "dnt-top-cropped" && (
                  <button className="button secondary" onClick={nextRound} disabled={!canRunLive}>
                    <RotateCcw size={16} /> Plan next round
                  </button>
                )}
                {ctx.campaignId && (
                  <Link className="button secondary" href={`/campaigns/${encodeURIComponent(ctx.campaignId)}`}>
                    Open campaign <ArrowRight size={16} />
                  </Link>
                )}
                {replaying && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setLearnSource(null);
                      setRoundSource((s) => (s ? { ...s } : s));
                    }}
                  >
                    <RotateCcw size={16} /> Replay again
                  </button>
                )}
              </div>
            </section>
          )}

          {learnSource && (
            <section className="panel lab-learn">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PERFORMANCE-ANALYST · {status.models.analyst}</span>
                  <h2>{learn.done ? "What the analyst would change" : "Analyst reading the evidence"}</h2>
                </div>
                <span className="lab-clock">
                  <Timer size={14} /> {secs(learnNow)}
                </span>
              </div>
              <Stepper steps={LEARN_STEPS} stages={learnStages} now={learnNow} finished={!!learn.done} />
              {learn.error && (
                <p className="lab-error">
                  <TriangleAlert size={14} /> {learn.error}
                </p>
              )}
              <DroidTerminal
                source="analyst"
                title="performance-analyst"
                subtitle={`Factory session ${sessions.analyst ? sessions.analyst.slice(0, 8) + "…" : "opening…"} · reads runs/r2/stats.json + memory/playbook.json`}
                events={learn.events}
                state={learn.done ? (learn.done.ok ? "ok" : "error") : "running"}
              />
              {diff && (
                <>
                  <p className="lab-note">
                    <SponsorBadge by="claude" /> Written by {status.models.analyst} inside the <code>performance-analyst</code> droid;
                    validated by Zod before it is shown.
                  </p>
                  <DiffView diff={diff} />
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
