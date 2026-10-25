"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
  Clock,
  ChevronRight,
  AlertTriangle,
  Copy,
  CheckCheck,
  LoaderCircle,
  Bot,
} from "lucide-react";
import { PageTitle, Badge, Empty } from "./Brand";
import { CaseHeader } from "./CaseHeader";
import { money, label, number } from "@/lib/format";
import type { RoundData, Listing, VariantSpec } from "@/lib/types";

// Product fields differ between the DNT case (precoShopee) and live campaigns (preco/price).
type AnyProduct = Record<string, unknown> | undefined;
const priceOf = (p: AnyProduct) => {
  const v = p?.precoShopee ?? p?.preco ?? p?.price;
  return typeof v === "number" ? v : null;
};
const kitOf = (p: AnyProduct) => {
  const m = typeof p?.sku === "string" ? p.sku.match(/-K(\d+)$/i) : null;
  return m ? Number(m[1]) : null;
};
const modeLabel = (m: string) =>
  m === "exploit" ? "Exploit · proven values" : "Explore · tests an unknown";

export function Portfolio({
  data,
  round,
  replay = false,
  urls = {},
  rounds,
  coverUrl = (r, vid) => `/api/round/${r}/cover/${vid}`,
  approveUrl = (r, vid) => `/api/variant/${r}/${vid}/approve`,
  streamUrl = (r) => `/api/round/${r}/stream`,
  title,
  currency = "BRL",
  caseStudy,
}: {
  data: RoundData;
  round: string;
  replay?: boolean;
  urls?: Record<string, string>;
  /** Round switcher entries; hidden when omitted. */
  rounds?: { round: string; href: string; label?: string }[];
  coverUrl?: (round: string, vid: string) => string;
  approveUrl?: (round: string, vid: string) => string;
  streamUrl?: (round: string) => string;
  title?: string;
  currency?: string;
  /** Shows the DNT case-study strip and links (default when `rounds` is given). */
  caseStudy?: boolean;
}) {
  const isCase = caseStudy ?? !!rounds;
  const [approvals, setApprovals] = useState(data.approvals),
    [filter, setFilter] = useState("all"),
    [mode, setMode] = useState("all"),
    [selected, setSelected] = useState<Listing | null>(null),
    [visible, setVisible] = useState<string[]>(
      replay ? [] : data.variants.filter(Boolean).map((v) => v!.variantId),
    ),
    [streaming, setStreaming] = useState(replay),
    [toast, setToast] = useState(""),
    [pending, setPending] = useState<string[]>([]),
    [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const stream = streamUrl(round);
  useEffect(() => {
    if (!replay) return;
    const es = new EventSource(stream);
    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setVisible((v) =>
        v.includes(event.variantId) ? v : [...v, event.variantId],
      );
    };
    const finish = () => {
      setStreaming(false);
      es.close();
    };
    es.addEventListener("done", finish);
    es.onerror = () => {
      finish();
      setVisible(data.variants.filter(Boolean).map((v) => v!.variantId));
      setToast("Replay finished with the files on disk.");
    };
    return () => es.close();
  }, [replay, stream, data.variants]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const available = data.variants.filter((v): v is Listing => !!v);
  const approved = Object.values(approvals).filter(Boolean).length;
  const product = data.plan.variants[0]?.produto as AnyProduct;
  const price = priceOf(product);
  const kit = kitOf(product);
  const angles = [...new Set(data.plan.variants.map((s) => s.axes.angulo))];
  const explore = data.plan.variants.filter((s) => s.mode === "explore").length;
  async function decide(id: string, value: boolean) {
    const old = approvals[id];
    setApprovals((a) => ({ ...a, [id]: value }));
    setPending((p) => [...p, id]);
    try {
      const res = await fetch(approveUrl(round, id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: value }),
      });
      if (!res.ok) throw new Error();
      setToast(
        value
          ? "Approved. Human sign-off saved."
          : "Rejected. It will never be exported.",
      );
    } catch {
      setApprovals((a) => {
        const next = { ...a };
        if (old === undefined) delete next[id];
        else next[id] = old;
        return next;
      });
      setToast("Could not save. Try again.");
    } finally {
      setPending((p) => p.filter((x) => x !== id));
    }
  }
  const listings = data.plan.variants.filter(
    (s) =>
      (filter === "all" ||
        (filter === "approved" && approvals[s.variantId] === true) ||
        (filter === "pending" && approvals[s.variantId] === undefined) ||
        s.axes.angulo === filter) &&
      (mode === "all" || s.mode === mode),
  );
  function close() {
    setSelected(null);
    trigger.current?.focus();
  }
  return (
    <>
      {isCase && <CaseHeader droids={["producer"]} />}
      <PageTitle
        kicker={`ROUND ${round.replace(/^r/, "")} · VARIANT PORTFOLIO`}
        title={title ?? "One product, a designed experiment."}
        description={`The planner picked ${data.plan.variants.length} axis combinations by Thompson sampling (${data.plan.variants.length - explore} exploit, ${explore} explore). One listing-producer droid ran per variant, in parallel, and wrote a Zod-validated JSON plus a cover generated from the real product photo.`}
        action={
          rounds && rounds.length > 1 ? (
            <div className="round-switch">
              {rounds.map((r) => (
                <Link
                  key={r.round}
                  className={round === r.round ? "active" : ""}
                  href={r.href}
                >
                  {r.label ?? `Round ${r.round.replace(/^r/, "")}`}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />
      <div className="f2-explainer">
        <Bot size={18} />
        <p>
          {streaming
            ? "Replaying the round: cards appear in the order the droids finished."
            : "Each card is one experiment cell: angle × cover style × acquisition channel."}{" "}
          Axes are fixed by the planner; the droid writes copy and cover inside
          them. <strong>Nothing is published without human approval.</strong>
        </p>
      </div>
      <div className="portfolio-toolbar">
        <div className="review-progress">
          <span className="icon-square green">
            <CheckCheck size={21} />
          </span>
          <div>
            <strong>
              {approved} {approved === 1 ? "variant approved" : "variants approved"}
            </strong>
            <span>
              {available.length} generated of {data.plan.variants.length}{" "}
              planned {streaming && "· replaying…"}
            </span>
          </div>
        </div>
        {isCase && (
          <Link href="/aprendizado" className="button primary">
            See what the analyst learned <ArrowRight size={16} />
          </Link>
        )}
      </div>
      {streaming && (
        <div
          className="stream-track"
          role="progressbar"
          aria-label="Replay progress"
          aria-valuenow={visible.length}
          aria-valuemax={available.length}
        >
          <span
            style={{
              width: `${(visible.length / Math.max(1, available.length)) * 100}%`,
            }}
          />
        </div>
      )}
      {!!data.summary?.titleWarnings.length && (
        <details className="warning-details">
          <summary>
            <AlertTriangle size={16} />
            <span>
              Compliance check: {data.summary.titleWarnings.length} title pairs
              ≥80% similar (Jaccard) within one angle. Shopee flags near-duplicates
              as spam.
            </span>
            <ChevronRight size={16} />
          </summary>
          <ul>
            {data.summary.titleWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="filter-bar">
        <div className="tabs" role="group" aria-label="Filter variants">
          {[
            ["all", "All"],
            ["pending", "To review"],
            ["approved", "Approved"],
            ...angles.map((a) => [a, label(a)]),
          ].map(([value, text]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {text}
              {value === "all" && <span>{data.plan.variants.length}</span>}
            </button>
          ))}
        </div>
        <label className="select-label">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Variant mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="all">Explore + exploit</option>
            <option value="exploit">Exploit only</option>
            <option value="explore">Explore only</option>
          </select>
        </label>
      </div>
      <div className="variant-grid">
        {listings.map((spec) => {
          const listing = available.find((v) => v.variantId === spec.variantId);
          const ready = listing && visible.includes(spec.variantId);
          return (
            <VariantCard
              key={spec.variantId}
              spec={spec}
              listing={ready ? listing : undefined}
              coverSrc={coverUrl(round, spec.variantId)}
              angulo={spec.axes.angulo}
              capa={spec.axes.capa}
              aquisicao={spec.axes.aquisicao}
              modo={spec.mode}
              price={price}
              kit={kit}
              currency={currency}
              approved={approvals[spec.variantId]}
              waiting={streaming && !!listing}
              pending={pending.includes(spec.variantId)}
              onOpen={(e) => {
                if (listing) {
                  trigger.current = e.currentTarget;
                  setCopied(false);
                  setSelected(listing);
                }
              }}
              onDecide={(value) => decide(spec.variantId, value)}
            />
          );
        })}
      </div>
      {!listings.length && <Empty>No variants match this filter.</Empty>}
      <div className="portfolio-foot">
        <span>
          <Check size={14} /> Approvals are stored locally (human-in-the-loop
          gate before export).
        </span>
        {isCase && (
          <Link href={`/benchmark/${round}`}>
            See the Apify competitor research behind these listings{" "}
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      <dialog
        ref={dialog}
        className="listing-drawer"
        aria-label="Variant details"
        onCancel={close}
        onClose={() => {
          if (selected) close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (e.clientX < rect.left) close();
          }
        }}
      >
        {selected && (
          <>
            <div className="drawer-header">
              <div>
                <span className="eyebrow">
                  VARIANT {selected.variantId.toUpperCase()} · ROUND{" "}
                  {round.replace(/^r/, "")}
                </span>
                <h2>Droid output, validated.</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close details"
                onClick={close}
              >
                <X />
              </button>
            </div>
            <div className="drawer-body">
              <img
                className="drawer-cover"
                src={coverUrl(round, selected.variantId)}
                alt={selected.title}
              />
              <div className="chips">
                <Badge tone={selected.mode === "exploit" ? "green" : "blue"}>
                  {label(selected.mode)}
                </Badge>
                {[
                  selected.axes.angulo,
                  selected.axes.capa,
                  selected.axes.aquisicao,
                ].map((a) => (
                  <Badge key={a} tone="neutral">
                    {label(a)}
                  </Badge>
                ))}
              </div>
              <span className="f2-lang">Listing (as generated)</span>
              <h2>{selected.title}</h2>
              <div className="drawer-price">
                {money(price, currency)}{" "}
                {kit && <small>kit of {kit} pieces</small>}
              </div>
              <section>
                <div className="section-heading">
                  <h3>Listing copy</h3>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${selected.title}\n\n${selected.description}`,
                        );
                        setCopied(true);
                      } catch {
                        setToast("Clipboard is not available in this browser.");
                      }
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                    {copied ? "Copied" : "Copy text"}
                  </button>
                </div>
                <p className="listing-description">{selected.description}</p>
              </section>
              <section>
                <h3>Keywords</h3>
                <div className="chips">
                  {selected.keywords.map((k) => (
                    <Badge tone="neutral" key={k}>
                      {k}
                    </Badge>
                  ))}
                </div>
              </section>
              <section className="reason-box">
                <span className="eyebrow">
                  {selected.mode === "explore"
                    ? "HYPOTHESIS UNDER TEST"
                    : "WHY THE PLANNER CHOSE IT"}
                </span>
                <p>
                  {selected.hypothesis ||
                    data.plan.variants.find(
                      (s) => s.variantId === selected.variantId,
                    )?.rationale ||
                    "no data"}
                </p>
                {selected.appliedRules.length > 0 && (
                  <small>
                    Playbook rules applied: {selected.appliedRules.join(", ")}
                  </small>
                )}
              </section>
              <section>
                <h3>Competitor benchmark (Apify)</h3>
                <p>{selected.benchmark.pricePosition}</p>
                <h4>Differentiators</h4>
                <ul>
                  {selected.benchmark.differentiators.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <h4>Keywords adopted from competitors</h4>
                <p>
                  {selected.benchmark.keywordsAdopted.join(" · ") || "no data"}
                </p>
                <h4>
                  Competitors cited · {selected.benchmark.competitorsAnalyzed}{" "}
                  analyzed (ids verified against the scraped dataset)
                </h4>
                <div className="chips">
                  {selected.benchmark.referenceItemIds.map((id) =>
                    urls[id] ? (
                      <a
                        key={id}
                        className="badge blue"
                        href={urls[id]}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {id} <ArrowUpRight size={12} />
                      </a>
                    ) : (
                      <Badge key={id} tone="neutral">
                        {id}
                      </Badge>
                    ),
                  )}
                </div>
              </section>
              <details className="drawer-details">
                <summary>Cover brief (image generated inside the droid)</summary>
                <p>{selected.coverBrief}</p>
              </details>
              <details className="drawer-details">
                <summary>Run metadata · Factory Droid SDK</summary>
                {(() => {
                  const summary = data.summary?.variants.find(
                    (v) => v.variantId === selected.variantId,
                  );
                  const attempts = data.usage?.runs.find(
                    (v) => v.variantId === selected.variantId,
                  )?.attempts;
                  const credits = attempts
                    ?.filter((a) => a.tokenUsage)
                    .reduce(
                      (sum, a) => sum + (a.tokenUsage?.factoryCredits ?? 0),
                      0,
                    );
                  return (
                    <>
                      <p>
                        Wall time:{" "}
                        {summary ? `${number(summary.secs)} s` : "no data"} ·
                        Attempts: {summary?.attempts ?? "no data"} · Factory
                        credits: {credits ? number(credits) : "no data"}
                      </p>
                      {summary?.why && <p>{summary.why}</p>}
                    </>
                  );
                })()}
              </details>
            </div>
            <div className="drawer-actions">
              <button
                className="button secondary"
                disabled={pending.includes(selected.variantId)}
                onClick={() => decide(selected.variantId, false)}
              >
                <X size={16} /> Reject
              </button>
              <button
                className="button primary"
                disabled={pending.includes(selected.variantId)}
                onClick={() => decide(selected.variantId, true)}
              >
                <Check size={16} />{" "}
                {approvals[selected.variantId] === true ? "Approved" : "Approve"}
              </button>
            </div>
          </>
        )}
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
export function VariantCard({
  spec,
  listing,
  coverSrc,
  angulo,
  capa,
  aquisicao,
  modo,
  price,
  kit,
  currency = "BRL",
  approved,
  waiting,
  pending,
  onOpen,
  onDecide,
}: {
  spec: VariantSpec;
  listing?: Listing;
  coverSrc?: string;
  angulo: string;
  capa: string;
  aquisicao: string;
  modo: string;
  price?: number | null;
  kit?: number | null;
  currency?: string;
  approved?: boolean;
  waiting: boolean;
  pending: boolean;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDecide: (approved: boolean) => void;
}) {
  const src = coverSrc ?? `/api/round/${spec.round}/cover/${spec.variantId}`;
  const value = price ?? priceOf(spec.produto as AnyProduct);
  return (
    <article
      className={`variant-card ${approved === true ? "is-approved" : ""} ${approved === false ? "is-rejected" : ""}`}
    >
      <div className="variant-cover">
        {listing ? (
          <button
            onClick={onOpen}
            aria-label={`Open ${spec.variantId}: ${listing.title}`}
          >
            <img src={src} alt={listing.title} loading="lazy" />
            <span className="cover-open">
              Details <ArrowUpRight size={14} />
            </span>
          </button>
        ) : (
          <div className={`variant-placeholder ${waiting ? "skeleton" : ""}`}>
            {waiting ? (
              <>
                <LoaderCircle className="spin" />
                <span>Droid working…</span>
              </>
            ) : (
              <>
                <Clock size={25} />
                <strong>Planned only</strong>
                <span>Not generated in this run.</span>
              </>
            )}
          </div>
        )}
        <span className="variant-id">{spec.variantId.toUpperCase()}</span>
        {approved !== undefined && (
          <span className={`decision-badge ${approved ? "green" : "neutral"}`}>
            {approved ? <Check size={12} /> : <X size={12} />}{" "}
            {approved ? "Approved" : "Rejected"}
          </span>
        )}
      </div>
      <div className="variant-content">
        <Badge tone={modo === "exploit" ? "green" : "blue"}>
          <span className="tiny-dot" />
          {modeLabel(modo)}
        </Badge>
        <button className="variant-title" disabled={!listing} onClick={onOpen}>
          {listing?.title ??
            spec.titleHook ??
            `${label(angulo)} · ${label(capa)}`}
        </button>
        <div className="variant-price">
          {money(value, currency)}
          {kit && value != null && (
            <span>{money(value / kit, currency)}/piece</span>
          )}
        </div>
        <div className="axis-chips">
          {[angulo, capa, aquisicao].map((a) => (
            <span key={a}>{label(a)}</span>
          ))}
        </div>
        <div className="variant-why">
          <Sparkles size={13} />
          <p>{listing?.hypothesis || spec.rationale}</p>
        </div>
        {listing && (
          <small className="variant-benchmark">
            Benchmarked against {listing.benchmark.competitorsAnalyzed}{" "}
            competitors <ArrowUpRight size={11} />
          </small>
        )}
      </div>
      <div className="card-actions">
        <button
          disabled={!listing || pending}
          className={approved === false ? "selected-reject" : ""}
          aria-label={`Reject ${spec.variantId}`}
          onClick={() => onDecide(false)}
        >
          <X size={15} /> Reject
        </button>
        <button
          disabled={!listing || pending}
          className={approved === true ? "selected-approve" : ""}
          aria-label={`Approve ${spec.variantId}`}
          onClick={() => onDecide(true)}
        >
          {pending ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Check size={15} />
          )}{" "}
          {approved === true ? "Approved" : "Approve"}
        </button>
      </div>
    </article>
  );
}
