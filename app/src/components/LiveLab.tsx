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
import {
  fallbackStatus,
  fixtureJob,
  fixtureLearn,
  type LabEvent,
  type LabStatus,
  type StageName,
  type StageStatus,
} from "@/lib/labFixture";
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
}) {
  const vid = listing?.variantId ?? spec?.variantId ?? "v??";
  const axes = (listing?.axes ?? spec?.axes ?? {}) as Record<string, string>;
  const mode = listing?.mode ?? spec?.mode;
  const showCover = state === "cover" || state === "ok" || (!!listing && state !== "error");
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
        {mode && <span className={`lab-mode ${mode}`}>{mode === "explore" ? "Exploring" : "Exploiting"}</span>}
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
        {listing ? (
          <>
            <h4>{listing.title}</h4>
            {price !== undefined && <strong className="lab-price">{formatMoney(price, currency)}</strong>}
            <p className="lab-desc">{listing.description}</p>
            {listing.benchmark?.pricePosition && (
              <p className="lab-bench">
                <Search size={12} /> {listing.benchmark.pricePosition}
              </p>
            )}
            {listing.hypothesis ? (
              <p className="lab-why">
                <FlaskConical size={12} /> {listing.hypothesis}
              </p>
            ) : listing.appliedRules?.length ? (
              <p className="lab-why">
                <Brain size={12} /> Applies playbook rules: {listing.appliedRules.join(", ")}
              </p>
            ) : null}
          </>
        ) : state === "error" ? (
          <p className="lab-card-error">{why || "The droid output failed validation."}</p>
        ) : (
          <>
            <div className="lab-skel w80" />
            <div className="lab-skel w60" />
            {spec?.rationale && <p className="lab-why">{spec.rationale}</p>}
          </>
        )}
        {secsTaken !== undefined && (
          <small className="lab-card-foot">
            {state === "ok" ? "Zod-validated" : "finished"} in {secsTaken.toFixed(0)}s
          </small>
        )}
      </div>
    </article>
  );
}

// ---------- job stream ----------

type JobSource =
  | { kind: "sse"; id: string }
  | { kind: "recorded"; id: string; fallback: LabEvent[] }
  | { kind: "fixture"; events: LabEvent[] };

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
    if (source.kind === "fixture") {
      play(source.events);
      return () => {
        closed = true;
        timers.forEach(clearTimeout);
      };
    }
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
        play(buffer.length ? buffer : source.fallback);
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
  steps: { id: StageName; label: string; hint: string }[];
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
              <strong>{s.label}</strong>
              <small>{v.detail ?? s.hint}</small>
            </div>
            {took !== undefined && <time>{secs(took)}</time>}
          </li>
        );
      })}
    </ol>
  );
}

const ROUND_STEPS = (n: number): { id: StageName; label: string; hint: string }[] => [
  { id: "apify", label: "Apify scrape", hint: "Live competitor search on Shopee Brazil" },
  { id: "intel", label: "Competitor intel", hint: "Price bands, title patterns, keyword gaps (TypeScript)" },
  { id: "plan", label: "Plan · Thompson sampling", hint: "Picks axes per variant from beliefs + playbook" },
  { id: "producer", label: `listing-producer × ${n}`, hint: "Factory custom droids, in parallel" },
  { id: "validate", label: "Zod validation", hint: "Schema, fixed axes, cited competitor ids" },
];
const LEARN_STEPS: { id: StageName; label: string; hint: string }[] = [
  { id: "analyst", label: "performance-analyst", hint: "Factory custom droid on Opus 5.5" },
  { id: "memory", label: "Memory diff validation", hint: "Zod MemoryDiff, dry-run (no commit)" },
];

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
  marketplace: string;
  angles: string[];
  variants: number;
  photo: File | null;
};
const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
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
  const [status, setStatus] = useState<LabStatus>({ ...fallbackStatus, live });
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
        setStatus({ ...fallbackStatus, ...s, marketplaces: s.marketplaces?.length ? s.marketplaces : fallbackStatus.marketplaces });
        return s;
      }
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    refreshStatus().then((s) => {
      const isLive = s?.live ?? live;
      if (!isLive && !initialJob)
        setRoundSource(
          s?.replayJobId ? { kind: "recorded", id: s.replayJobId, fallback: fixtureJob } : { kind: "fixture", events: fixtureJob },
        );
      if (!isLive && initialJob) setRoundSource({ kind: "recorded", id: initialJob, fallback: fixtureJob });
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
  async function prefill() {
    setFormError("");
    let photo: File | null = null;
    try {
      const r = await fetch("/api/product");
      if (r.ok) photo = new File([await r.blob()], "example.jpg", { type: "image/jpeg" });
    } catch {}
    setForm({
      name: "Kit 4 seamless cropped tops",
      description: "Kit of 4 women's cropped tops, no padding, microfiber, wide band. Black, white, navy, pink.",
      price: "51.90",
      marketplace: status.marketplaces.find((m) => m.id === "shopee_br")?.id ?? status.marketplaces[0]?.id ?? "shopee_br",
      angles: ["gym", "everyday", "gift"],
      variants: 2,
      photo: null,
    });
    setPhoto(photo);
    if (!photo) setFormError("Example filled in. Add a product photo to continue.");
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
      setLearnSource(
        status.replayLearnJobId
          ? { kind: "recorded", id: status.replayLearnJobId, fallback: fixtureLearn }
          : { kind: "fixture", events: fixtureLearn },
      );
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
          <h1>Pick any product. Watch the droids build the campaign.</h1>
          <p>
            Apify scrapes real competitors, the planner picks what to test, parallel <code>listing-producer</code> droids write
            listings and generate covers from your photo, and the <code>performance-analyst</code> turns sales evidence into memory.
          </p>
        </div>
        <div className="lab-meters">
          <span>
            <Wallet size={14} /> Factory sessions <b>{status.budget.used}</b>/{status.budget.cap}
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
            <b>Live droids run on our laptop at the judging table.</b> Below: a recorded live run, replayed with compressed
            timing. Come by the table to run it on your own product.
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
              <button type="button" className="button secondary small" onClick={prefill}>
                <Sparkles size={14} /> Prefill example
              </button>
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
                <Search size={13} /> APIFY · {intel.actor}
              </span>
              <div className="lab-intel-top">
                <strong>{intel.n}</strong>
                <span>
                  real competitors for
                  <br />“{intel.query}”
                </span>
              </div>
              <ul>
                {intel.headlines.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </section>
          )}

          {specs.length > 0 && (
            <section className="panel lab-plan">
              <span className="eyebrow">PLAN · THOMPSON SAMPLING</span>
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

          {sources.length > 0 && (
            <div className="lab-lanes">
              {sources.map((s) => {
                const f = finished[s];
                const st = f ? (f.ok ? "ok" : "error") : round.done ? "error" : roundStages.producer?.status === "start" ? "running" : "idle";
                return (
                  <DroidTerminal
                    key={s}
                    source={s}
                    title={`listing-producer · ${s}`}
                    subtitle={`via conductor ${status.models.conductor}`}
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
                const state = f ? (f.ok ? "ok" : "error") : covers[v.variantId] !== undefined ? "cover" : roundStages.producer ? "generating" : "planned";
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
                    price={ctx.price ?? v.produto?.precoShopee}
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
                subtitle="reads runs/r2/stats.json + memory/playbook.json"
                events={learn.events}
                state={learn.done ? (learn.done.ok ? "ok" : "error") : "running"}
              />
              {diff && <DiffView diff={diff} />}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
