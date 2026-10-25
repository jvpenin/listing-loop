"use client";
import Link from "next/link";
import historyCovers from "../../public/history/sources.json";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  GitCommitHorizontal,
  Check,
  ChevronDown,
  TrendingUp,
  RotateCcw,
  Database,
  Info,
} from "lucide-react";
import { PageTitle, Badge, Notice, Empty } from "./Brand";
import { CaseHeader } from "./CaseHeader";
import { label, money, number, percent, probability } from "@/lib/format";
import type {
  LearningData,
  Metric,
  AxisValue,
  Plan,
  MemoryRule,
} from "@/lib/types";
export function Learning({
  data,
  round,
}: {
  data: LearningData;
  round: string;
}) {
  const [axis, setAxis] = useState("angulo");
  const stats = data.stats;
  const [historyOpen, setHistoryOpen] = useState(false);
  if (!stats)
    return <Empty>No learning data for this round yet.</Empty>;
  const rows = Object.entries(stats.axes[axis] ?? {}).filter(
    ([key]) => !["neutro", "sem_capa"].includes(key),
  );
  const metrics = rows.flatMap(([, v]) =>
    v.metrics.profitPer1kImpr ? [v.metrics.profitPer1kImpr] : [],
  );
  const minimum = Math.min(0, ...metrics.map((m) => m.ci90[0]));
  const maximum = Math.max(1, ...metrics.map((m) => m.ci90[1]));
  const best = Object.entries(stats.axes.capa ?? {})
    .filter(([, v]) => v.enoughData && v.metrics.profitPer1kImpr)
    .sort(
      (a, b) =>
        (b[1].metrics.profitPer1kImpr?.mean ?? 0) -
        (a[1].metrics.profitPer1kImpr?.mean ?? 0),
    )[0];
  const changes = [...(data.diff?.update ?? []), ...(data.diff?.add ?? [])];
  const reversed = changes.filter((rule) => {
    const before = data.previousPlaybook?.rules.find(
      (r) => r.axis === rule.axis && r.value === rule.value,
    );
    return before && before.evidence.pBetter >= 0.5 !== rule.evidence.pBetter >= 0.5;
  }).length;
  const count = (plan: Plan | null, value: string, axis: string) =>
    plan?.variants.filter((v) => v.axes[axis as keyof typeof v.axes] === value)
      .length ?? 0;
  return (
    <>
      <CaseHeader droids={["analyst"]} />
      <PageTitle
        kicker="LEARN · STATS IN CODE, JUDGMENT IN THE DROID"
        title="What the performance-analyst learned"
        description="src/stats.ts computes Beta-Binomial posteriors per axis value (90% credible interval, P(better) by 10,000 draws). The performance-analyst droid (claude-opus-5-5) reads them and writes a memory diff; src/memory.ts validates it with Zod, applies it to the playbook and commits it to git."
        action={
          <div className="round-switch">
            <Link
              className={round === "r1" ? "active" : ""}
              href="/aprendizado?round=r1"
            >
              Round 1
            </Link>
            <Link
              className={round === "r2" ? "active" : ""}
              href="/aprendizado?round=r2"
            >
              Round 2 · real data
            </Link>
          </div>
        }
      />
      <Notice tone={round === "r2" ? "green" : "warm"}>
        <strong>
          {round === "r1"
            ? "Demo base: 3 real + 12 simulated listings."
            : `${stats.dataQuality.real ?? 0} real DNT listings.`}
        </strong>{" "}
        {stats.dataQuality.note}
      </Notice>
      <section className="learning-hero">
        <div>
          <Badge tone="white">
            <TrendingUp size={13} /> THIS ROUND’S LEARNING
          </Badge>
          <h2>
            {round === "r2"
              ? `Real data arrived;\nthe analyst reversed ${reversed} rules from round 1.`
              : "Clicks get attention.\nProfit tells another story."}
          </h2>
          <p>
            {round === "r2"
              ? "Round 1 learned from a partly simulated base. With 14 real Seller Center listings, Gym and flat-lay row moved to prioritize, Casual and on-model moved to avoid, and the next plan reallocated variants. A memory that can change its mind, with evidence, is the point."
              : "Round 1 ran on a demo base (3 real + 12 simulated). Its conclusions were provisional by design and were later tested against real data."}
          </p>
          <Link href={`/rodada/${round}`} className="text-link">
            See this round’s variants <ArrowRight size={16} />
          </Link>
        </div>
        <div className="f2-pipeline">
          <code>stats.ts</code>
          <ArrowDown size={14} />
          <code>performance-analyst</code>
          <ArrowDown size={14} />
          <code>memory-diff.json</code>
          <ArrowDown size={14} />
          <code>git commit memory/</code>
        </div>
      </section>
      <div className="kpi-grid learning-kpis">
        <div className="kpi">
          <span>
            <Database size={16} /> Data analyzed
          </span>
          <strong>
            {stats.dataQuality.listings}
            <small> listings</small>
          </strong>
          <small>
            {stats.dataQuality.simulated
              ? `${stats.dataQuality.simulated} simulated in this base`
              : "Real Seller Center data"}
          </small>
        </div>
        <div className="kpi">
          <span>Most profitable cover style</span>
          <strong className="text-kpi">
            {best ? label(best[0]) : "no data"}
          </strong>
          <small>
            {best
              ? `${money(best[1].metrics.profitPer1kImpr?.mean)} per 1k impressions`
              : "Not enough evidence yet"}
          </small>
        </div>
        <div className="kpi">
          <span>Playbook (memory)</span>
          <strong>
            v{data.playbook?.version ?? "—"}
            <small> · {data.playbook?.rules.length ?? 0} rules</small>
          </strong>
          <small>Each rule carries its evidence</small>
        </div>
        <div className="kpi accent">
          <span>Memory diff</span>
          <strong>
            {changes.length}
            <small> {changes.length === 1 ? "change" : "changes"}</small>
          </strong>
          <small>
            {data.diff?.inconclusive.length ?? 0} marked inconclusive
          </small>
        </div>
      </div>
      <section className="panel chart-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PRIMARY METRIC</span>
            <h2>Profit per 1,000 impressions</h2>
            <p className="muted">
              Combines click-through (cover, title), margin (price) and conversion in one number a seller understands.
            </p>
          </div>
          <Badge tone="neutral">90% credible interval</Badge>
        </div>
        <div className="chart-tabs tabs">
          {["angulo", "capa", "aquisicao"].map((a) => (
            <button
              className={axis === a ? "active" : ""}
              key={a}
              onClick={() => setAxis(a)}
            >
              {label(a)}
            </button>
          ))}
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-dot green" /> Prioritize (P ≥ 0.8)
          </span>
          <span>
            <i className="legend-dot red" /> Avoid (P ≤ 0.2)
          </span>
          <span>
            <i className="legend-dot neutral" /> Inconclusive
          </span>
          <span>
            <i className="legend-dash" /> Baseline
          </span>
        </div>
        <div className="ci-chart">
          {rows.map(([value, entry]) => {
            const metric = entry.metrics.profitPer1kImpr;
            const state =
              metric && entry.enoughData
                ? metric.pBetter >= 0.8
                  ? "green"
                  : metric.pBetter <= 0.2
                    ? "red"
                    : "neutral"
                : "neutral";
            return (
              <div className="ci-row" key={value}>
                <div className="ci-label">
                  <strong>{label(value)}</strong>
                  <small>
                    {entry.n} {entry.n === 1 ? "listing" : "listings"}
                  </small>
                </div>
                {metric ? (
                  <>
                    <CiPlot
                      metric={metric}
                      min={minimum}
                      max={maximum}
                      state={state}
                    />
                    <div className="ci-value">
                      <strong>{money(metric.mean)}</strong>
                      <small>
                        {money(metric.ci90[0])} to {money(metric.ci90[1])}
                      </small>
                    </div>
                    <Badge tone={state}>
                      {state === "green"
                        ? "Prioritize"
                        : state === "red"
                          ? "Avoid"
                          : "Inconclusive"}
                    </Badge>
                    <span className="ci-prob">
                      P(better) {probability(metric.pBetter)}
                    </span>
                  </>
                ) : (
                  <div className="ci-no-data">
                    Inconclusive · no variation or not enough data.
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="chart-explain">
          <Info size={18} />
          <p>
            The dot is the posterior mean; the bar is the 90% credible interval.
            <strong> P(better)</strong> is the probability this value beats the
            other listings on the same axis. A rule is only written at P ≥ 0.8
            with minimum volume; below that the analyst says{" "}
            <em>inconclusive, keep exploring</em> instead of inventing a winner.
            With small-store traffic, admitting that is the honest answer.
          </p>
        </div>
        {round === "r2" && (
          <Notice tone="warm">
            Profit is before ad spend (the export has no ad cost). Every real
            listing ran ads, so this round cannot compare acquisition channels;
            the analyst marks that axis inconclusive.
          </Notice>
        )}
        {round === "r1" && (
          <Notice tone="warm">
            In this demo base, Gym has an estimated CTR of{" "}
            {percent(stats.axes.angulo.academia?.metrics.ctr?.mean ?? 0)}, but
            profit of{" "}
            {money(stats.axes.angulo.academia?.metrics.profitPer1kImpr?.mean)}{" "}
            per 1k impressions. More clicks do not guarantee more profit.
          </Notice>
        )}
      </section>
      <div className="learning-columns">
        <section className="panel memory-diff">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MEMORY DIFF · memory-diff.json</span>
              <h2>What the analyst changed</h2>
            </div>
            <Badge tone="blue">Round {round.slice(1)}</Badge>
          </div>
          <p className="analyst-summary">{data.diff?.summary ?? "no data"}</p>
          <div className="rule-changes">
            {changes.map((rule) => {
              const before = data.previousPlaybook?.rules.find(
                (r) => r.axis === rule.axis && r.value === rule.value,
              );
              const changed =
                round === "r2" &&
                before &&
                before.evidence.pBetter >= 0.5 !== rule.evidence.pBetter >= 0.5;
              const tone = rule.evidence.pBetter >= 0.5 ? "green" : "red";
              return (
                <details key={rule.id} className="rule-change">
                  <summary>
                    <span className={`change-icon ${tone}`}>
                      {tone === "green" ? (
                        <TrendingUp size={17} />
                      ) : (
                        <ArrowDown size={17} />
                      )}
                    </span>
                    <div>
                      <strong>{label(rule.value)}</strong>
                      <span>
                        {changed ? (
                          <>
                            <s>
                              {before!.evidence.pBetter >= 0.5
                                ? "Prioritize"
                                : "Avoid"}
                            </s>
                            <ArrowRight size={12} />
                          </>
                        ) : null}
                        {tone === "green" ? "Prioritize" : "Avoid"}
                        <small> · {label(rule.confidence)} confidence</small>
                      </span>
                    </div>
                    <ChevronDown size={15} />
                  </summary>
                  <div className="rule-change-detail">
                    <p>{rule.effect}</p>
                    <p>{rule.reason}</p>
                    <span>
                      {rule.evidence.n} listings · P(better){" "}
                      {probability(rule.evidence.pBetter)} ·{" "}
                      {money(rule.evidence.mean)}/1k impressions
                    </span>
                  </div>
                </details>
              );
            })}
            {data.diff?.retire.map((r) => (
              <div className="notice red" key={r.id}>
                <strong>Rule retired: {r.id}</strong>
                <p>{r.reason}</p>
              </div>
            ))}
          </div>
          <details className="inconclusive-list">
            <summary>
              Inconclusive, keep exploring · {data.diff?.inconclusive.length ?? 0}{" "}
              <ChevronDown size={14} />
            </summary>
            {data.diff?.inconclusive.map((i) => (
              <p key={`${i.axis}-${i.value}`}>
                <strong>{label(i.value)}</strong> · {i.note}
              </p>
            ))}
          </details>
        </section>
        <section className="panel reallocation">
          <span className="eyebrow">LEARNING → NEXT PLAN</span>
          <h2>The next round reallocated.</h2>
          <p className="muted">
            Variant counts per axis value, read from runs/r1/plan.json and
            runs/r2/plan.json. Thompson sampling uses the updated beliefs and
            playbook.
          </p>
          <table>
            <thead>
              <tr>
                <th>Axis value</th>
                <th>Round 1</th>
                <th>Round 2</th>
              </tr>
            </thead>
            <tbody>
              {["angulo", "capa"].flatMap((axis) =>
                Array.from(
                  new Set(
                    Object.values(data.plans).flatMap(
                      (p) =>
                        p?.variants.map(
                          (v) => v.axes[axis as "angulo" | "capa"],
                        ) ?? [],
                    ),
                  ),
                ).map((value) => {
                  const a = count(data.plans.r1, value, axis),
                    b = count(data.plans.r2, value, axis);
                  return (
                    <tr
                      key={`${axis}-${value}`}
                      className={a !== b ? "changed" : ""}
                    >
                      <td>
                        {label(value)}
                        <small>{label(axis)}</small>
                      </td>
                      <td>{a}</td>
                      <td>
                        <span
                          className={
                            b > a ? "change-up" : b < a ? "change-down" : ""
                          }
                        >
                          {b}
                          {a !== b && (
                            <small>
                              {b > a ? "+" : ""}
                              {b - a}
                            </small>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
          <Link href="/rodada/r2" className="button primary">
            Open round 2 <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel playbook">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PLAYBOOK · memory/playbook.json</span>
            <h2>Rules the next round inherits</h2>
          </div>
          <Badge tone="neutral">
            Playbook v{data.playbook?.version ?? "—"}
          </Badge>
        </div>
        <p className="muted small">
          Each rule keeps its evidence (n, mean, 90% CI, P(better)) and a
          confidence level. Rules are never deleted silently: they are
          weakened, strengthened or retired with a reason.
        </p>
        <div className="playbook-grid">
          {data.playbook?.rules.map((rule) => (
            <details key={rule.id}>
              <summary>
                <span
                  className={`tiny-dot ${rule.evidence.pBetter >= 0.5 ? "green" : "red"}`}
                />
                <strong>{label(rule.value)}</strong>
                <Badge tone="neutral">{label(rule.confidence)} confidence</Badge>
                <ChevronDown size={15} />
              </summary>
              <p>{rule.effect}</p>
              <p className="muted small">{rule.reason}</p>
              <p className="small">
                {rule.evidence.n} listings · {money(rule.evidence.mean)}/1k
                impressions · CI {money(rule.evidence.ci90[0])} to{" "}
                {money(rule.evidence.ci90[1])} · P(better){" "}
                {probability(rule.evidence.pBetter)}
              </p>
            </details>
          ))}
        </div>
      </section>
      <section className="panel history-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GROUND TRUTH · SELLER CENTER EXPORT</span>
            <h2>The real listings behind the numbers</h2>
          </div>
          <button
            className="text-button"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            {historyOpen
              ? "Show less"
              : `Show all ${data.history.length} listings`}
            <ChevronDown size={15} />
          </button>
        </div>
        <p className="muted small">
          Real covers and 30-day results from DNT’s Shopee Seller Center.
          Listings without a cover in the export are marked.
        </p>
        <div className="history-grid">
          {data.history.slice(0, historyOpen ? undefined : 4).map((item, index) => (
            <article key={item.item_id}>
              <div className="history-image">
                {item.capa_url ? (
                  <img
                    src={item.item_id in historyCovers ? `/history/${item.item_id}.jpg` : item.capa_url}
                    alt={item.titulo}
                    loading={index < 4 ? "eager" : "lazy"}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement?.classList.add(
                        "image-failed",
                      );
                    }}
                  />
                ) : (
                  <span>No cover in export</span>
                )}
              </div>
              <h4>{item.titulo || "no data"}</h4>
              <div>
                <span>{number(Number(item.pedidos_pagos))} orders</span>
                <strong>{money(Number(item.vendas))}</strong>
              </div>
              <small>ID {item.item_id}</small>
            </article>
          ))}
        </div>
      </section>
      <section className="panel timeline-panel">
        <div>
          <span className="eyebrow">git log -- memory/</span>
          <h2>Memory commits</h2>
          <p className="muted">
            Every learning step is a git commit on memory/. The diff is
            auditable and reversible.
          </p>
        </div>
        <div className="timeline">
          {data.gitLog.length ? (
            data.gitLog.map((g) => (
              <div key={g.hash}>
                <span className="commit-icon">
                  <GitCommitHorizontal size={18} />
                </span>
                <div>
                  <strong>{g.subject}</strong>
                  <small>
                    {new Date(g.date).toLocaleString("en-US", {
                      timeZone: "America/Los_Angeles",
                    })}{" "}
                    (Pacific) · <code>{g.hash}</code>
                  </small>
                  {g.body && (
                    <details>
                      <summary>Commit message</summary>
                      <p>{g.body}</p>
                    </details>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="muted">git history unavailable in this environment.</p>
          )}
        </div>
      </section>
    </>
  );
}
function CiPlot({
  metric,
  min,
  max,
  state,
}: {
  metric: Metric;
  min: number;
  max: number;
  state: string;
}) {
  const x = (v: number) => 10 + ((v - min) / (max - min)) * 280;
  return (
    <svg
      className={`ci-plot ${state}`}
      viewBox="0 0 300 40"
      role="img"
      aria-label={`Estimated profit ${money(metric.mean)}, 90% interval ${money(metric.ci90[0])} to ${money(metric.ci90[1])}; baseline ${money(metric.baselineMean)}`}
    >
      <line x1="10" x2="290" y1="20" y2="20" stroke="#e8edf5" />
      <line
        x1={x(metric.baselineMean)}
        x2={x(metric.baselineMean)}
        y1="3"
        y2="37"
        stroke="#a0adbd"
        strokeDasharray="3 3"
      />
      <line
        className="ci-line"
        x1={x(metric.ci90[0])}
        x2={x(metric.ci90[1])}
        y1="20"
        y2="20"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        className="ci-line"
        x1={x(metric.ci90[0])}
        x2={x(metric.ci90[0])}
        y1="14"
        y2="26"
      />
      <line
        className="ci-line"
        x1={x(metric.ci90[1])}
        x2={x(metric.ci90[1])}
        y1="14"
        y2="26"
      />
      <circle
        className="ci-point"
        cx={x(metric.mean)}
        cy="20"
        r="6"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}
