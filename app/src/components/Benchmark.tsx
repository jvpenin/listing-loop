"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  TrendingDown,
  Users,
  Star,
  Info,
} from "lucide-react";
import { PageTitle, Badge, Notice } from "./Brand";
import { CaseHeader } from "./CaseHeader";
import { money, label, number } from "@/lib/format";
import type { Intel } from "@/lib/types";
export function Benchmark({ intel, round }: { intel: Intel; round: string }) {
  const [angle, setAngle] = useState("academia");
  const data = intel.angles[angle] ?? Object.values(intel.angles)[0];
  const max = Math.max(data.pricePerPiece.p75, data.dnt.pricePerPiece) * 1.35;
  const pos = (v: number) => `${Math.min(97, (v / max) * 100)}%`;
  return (
    <>
      <CaseHeader droids={["producer"]} />
      <PageTitle
        kicker="COMPETITOR INTEL · APIFY"
        title="Real competitors, scraped per angle."
        description="An Apify actor (xtracto/shopee-search) scraped Shopee Brazil top sellers for each angle. src/intel.ts computes the numbers; the listing-producer must cite real competitor ids, and the code rejects any id not in the dataset."
        action={
          <Link href={`/rodada/${round}`} className="button secondary">
            Back to variants <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="kpi-grid">
        <div className="kpi">
          <span>
            <Users size={17} /> Unique competitors
          </span>
          <strong>{number(intel.market.n)}</strong>
          <small>Real Shopee Brazil listings</small>
        </div>
        <div className="kpi">
          <span>Median price per piece</span>
          <strong>{money(intel.market.pricePerPiece.median)}</strong>
          <small>
            Median of {intel.market.pricePerPiece.n} comparable listings
          </small>
        </div>
        <div className="kpi">
          <span>
            <TrendingDown size={17} /> DNT price per piece
          </span>
          <strong>{money(intel.market.dnt.pricePerPiece)}</strong>
          <small>
            Kit of {intel.market.dnt.kit} for {money(intel.market.dnt.price)}
          </small>
        </div>
        <div className="kpi accent">
          <span>Price advantage</span>
          <strong>{intel.market.dnt.cheaperPerPieceThanPct}%</strong>
          <small>of competitors cost more per piece</small>
        </div>
      </div>
      <div className="f2-explainer">
        <Info size={18} />
        <p>
          Prices are normalized <strong>per piece</strong>: kit sizes vary
          (1–6 pieces), so comparing totals would be misleading. The producer
          uses this to write the price-per-piece argument into the copy.
        </p>
      </div>
      <div className="section-heading market-tabs-heading">
        <div>
          <span className="eyebrow">ONE SEARCH PER ANGLE</span>
          <h2>Market by experiment angle</h2>
        </div>
        <span className="muted small">
          A competitor can appear under more than one angle.
        </span>
      </div>
      <div
        className="tabs large-tabs"
        role="group"
        aria-label="Search angle"
      >
        {Object.keys(intel.angles).map((a) => (
          <button
            key={a}
            className={a === angle ? "active" : ""}
            onClick={() => setAngle(a)}
          >
            {label(a)}
            <span>{intel.angles[a].n}</span>
          </button>
        ))}
      </div>
      <div className="benchmark-grid">
        <section className="panel">
          <div className="section-heading">
            <h3>DNT vs market</h3>
            <Badge tone="green">Per piece</Badge>
          </div>
          <p className="muted small">
            Interquartile price range for this angle.
          </p>
          <div className="price-range">
            <div className="price-range-track" />
            <div
              className="price-iqr"
              style={{
                left: pos(data.pricePerPiece.p25),
                width: `${((data.pricePerPiece.p75 - data.pricePerPiece.p25) / max) * 100}%`,
              }}
            />
            <div
              className="price-marker median"
              style={{ left: pos(data.pricePerPiece.median) }}
            >
              <span>
                Market
                <br />
                <strong>{money(data.pricePerPiece.median)}</strong>
              </span>
            </div>
            <div
              className="price-marker dnt"
              style={{ left: pos(data.dnt.pricePerPiece) }}
            >
              <span>
                DNT
                <br />
                <strong>{money(data.dnt.pricePerPiece)}</strong>
              </span>
            </div>
          </div>
          <div className="range-legend">
            <span>
              <i /> 25th–75th percentile
            </span>
            <span>
              {money(data.pricePerPiece.p25)} — {money(data.pricePerPiece.p75)}
            </span>
          </div>
          <div className="insight-inline">
            <TrendingDown size={18} />
            <p>
              DNT is cheaper per piece than{" "}
              <strong>{data.dnt.cheaperPerPieceThanPct}%</strong> of{" "}
              {label(angle).toLowerCase()} listings.
            </p>
          </div>
        </section>
        <section className="panel">
          <h3>Kit sizes competitors sell</h3>
          <p className="muted small">Pieces per offer, parsed from titles.</p>
          <div className="bar-list">
            {data.kits.map((k) => (
              <div className="bar-row" key={k.term}>
                <span>{k.term.replace("kit", "Kit ")}</span>
                <div>
                  <i style={{ width: `${k.sharePct}%` }} />
                </div>
                <strong>{k.sharePct}%</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel keyword-panel">
          <Badge tone="warm">
            <Search size={12} /> KEYWORD GAPS
          </Badge>
          <h3>Words they use that DNT does not</h3>
          <p className="muted small">
            Frequent competitor title words missing from DNT’s current titles.
          </p>
          <div className="keyword-cloud">
            {data.keywordGaps.map((k) => (
              <span key={k.term}>
                {k.term}
                <small>{k.sharePct}%</small>
              </span>
            ))}
          </div>
          <Notice tone="warm">
            The producer prompt only allows a gap word when it is true for the
            product (e.g. never “suplex” or “bojo”: it is microfiber, no
            padding). Data suggests; it does not confirm product facts.
          </Notice>
        </section>
        <section className="panel">
          <h3>Title vocabulary</h3>
          <p className="muted small">
            Top words and bigrams across scraped titles.
          </p>
          <div className="word-list">
            {data.titles.topWords.slice(0, 7).map((k) => (
              <div key={k.term}>
                <span>{k.term}</span>
                <span className="word-track">
                  <i style={{ width: `${k.sharePct}%` }} />
                </span>
                <small>{k.sharePct}%</small>
              </div>
            ))}
          </div>
          <div className="chips">
            {data.titles.topBigrams.slice(0, 4).map((k) => (
              <Badge tone="neutral" key={k.term}>
                {k.term} · {k.sharePct}%
              </Badge>
            ))}
          </div>
        </section>
      </div>
      <section className="panel competitor-table">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RAW DATASET</span>
            <h2>Top competitors by sales rank</h2>
          </div>
          <Badge tone="neutral">
            {data.n} comparable · {data.excludedNotComparable} excluded
          </Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Kit</th>
                <th>Price</th>
                <th>Per piece</th>
                <th>Rating</th>
                <th>
                  <span className="sr-only">Link</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topCompetitors.map((c) => (
                <tr key={c.itemId}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>ID {c.itemId}</small>
                  </td>
                  <td>{c.kit ? `${c.kit} pcs` : "no data"}</td>
                  <td>{money(c.price)}</td>
                  <td>
                    <strong>{money(c.pricePerPiece)}</strong>
                  </td>
                  <td>
                    {c.rating != null ? (
                      <span className="rating">
                        <Star size={12} />
                        {number(c.rating)}
                      </span>
                    ) : (
                      "no data"
                    )}
                  </td>
                  <td>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open on Shopee: ${c.title}`}
                      >
                        <ArrowUpRight size={18} />
                      </a>
                    ) : (
                      "no link"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="data-source">
        <Info size={14} /> Source: {intel.source} · Collected:{" "}
        {new Date(intel.generatedAt).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        })}{" "}
        (Pacific time). Per-angle counts can overlap.
      </p>
    </>
  );
}
