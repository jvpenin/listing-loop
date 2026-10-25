"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  LoaderCircle,
  Radio,
  Database,
  Repeat,
  Store,
  TriangleAlert,
  ImageIcon,
} from "lucide-react";
import { fetchRound, formatMoney } from "./LiveLab";
import { Portfolio } from "./Portfolio";
import type { CampaignSummary } from "@/lib/labFixture";
import type { RoundData } from "@/lib/types";

const MARKET_LABEL: Record<string, string> = {
  shopee_br: "Shopee Brazil",
  tiktok_us: "TikTok Shop US",
};
export const marketLabel = (id: string) => MARKET_LABEL[id] ?? id.replace(/_/g, " ");

const CASE_ID = "dnt-top-cropped";

function useCampaigns() {
  const [list, setList] = useState<CampaignSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/campaigns", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        setList(await r.json());
      })
      .catch(() => {
        setError("Could not load campaigns.");
        setList([]);
      });
  }, []);
  return { list, error };
}

function Photo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return (
      <div className="lab-cover-missing">
        <ImageIcon size={22} />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
}

function LoopExplainer() {
  return (
    <ol className="camp-loop">
      <li>
        <b>Generate</b>
        <span>Planner picks what to test; listing-producer droids write variants + covers.</span>
      </li>
      <li>
        <b>Publish & sell</b>
        <span>The seller approves; the marketplace collects impressions, clicks and orders.</span>
      </li>
      <li>
        <b>Learn</b>
        <span>stats.ts computes Beta posteriors; performance-analyst commits evidence-backed rules.</span>
      </li>
      <li>
        <b>Reallocate</b>
        <span>Next round shifts variants toward what won and keeps exploring what is unclear.</span>
      </li>
    </ol>
  );
}

export function CampaignList() {
  const { list, error } = useCampaigns();
  return (
    <div className="camp">
      <header className="lab-head">
        <div>
          <span className="eyebrow">
            <Repeat size={13} /> CAMPAIGNS · PRODUCT × MARKETPLACE × ROUNDS
          </span>
          <h1>A campaign is a long-running experiment, not a one-off listing.</h1>
          <p>
            Each round adds variants, sales come back, the analyst updates memory, and the next round reallocates. Memory is
            scoped by category and channel, so a new product starts with what earlier campaigns already proved.
          </p>
        </div>
        <Link href="/lab" className="button primary">
          <Radio size={16} /> New live campaign
        </Link>
      </header>
      <LoopExplainer />
      {error && (
        <p className="lab-error">
          <TriangleAlert size={14} /> {error}
        </p>
      )}
      {!list ? (
        <p className="muted camp-loading">
          <LoaderCircle size={16} className="spin" /> Loading campaigns…
        </p>
      ) : list.length === 0 ? (
        <p className="muted">
          No campaigns yet. <Link href="/lab">Start one in the Live Lab</Link>.
        </p>
      ) : (
        <div className="camp-grid">
          {list.map((c) => {
            const generated = c.rounds.reduce((s, r) => s + r.generated, 0);
            return (
              <Link key={c.id} href={`/campaigns/${encodeURIComponent(c.id)}`} className="camp-card">
                <div className="camp-photo">
                  <Photo src={c.photoUrl} alt={c.product.name} />
                  <span className={`camp-kind ${c.kind}`}>
                    {c.kind === "case" ? (
                      <>
                        <Database size={11} /> Case study · real data
                      </>
                    ) : (
                      <>
                        <Radio size={11} /> Live
                      </>
                    )}
                  </span>
                </div>
                <div className="camp-body">
                  <h3>{c.product.name}</h3>
                  <p>
                    <Store size={12} /> {marketLabel(c.marketplace)} · {formatMoney(c.product.price, c.product.currency)}
                  </p>
                  <div className="camp-rounds">
                    {c.rounds.map((r) => (
                      <span key={r.round}>
                        <b>{r.round}</b> {r.generated}/{r.planned}
                      </span>
                    ))}
                  </div>
                  <small>
                    {c.rounds.length} round{c.rounds.length === 1 ? "" : "s"} · {generated} listings generated
                    {c.createdAt ? ` · started ${new Date(c.createdAt).toLocaleDateString("en-US")}` : ""}
                  </small>
                  <span className="camp-open">
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CampaignDetail({ id, live }: { id: string; live: boolean }) {
  const { list, error } = useCampaigns();
  const campaign = list?.find((c) => c.id === id);
  const [round, setRound] = useState<string>("");
  const [data, setData] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (campaign && !round) setRound(campaign.rounds[campaign.rounds.length - 1]?.round ?? "");
  }, [campaign, round]);
  useEffect(() => {
    if (!round) return;
    let stale = false;
    setLoading(true);
    setData(null);
    fetchRound(id, round).then((d) => {
      if (!stale) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      stale = true;
    };
  }, [id, round]);

  async function nextRound() {
    setStarting(true);
    setActionError("");
    try {
      const r = await fetch(`/api/lab/campaigns/${encodeURIComponent(id)}/rounds`, { method: "POST" });
      if (!r.ok) {
        let msg = "";
        try {
          msg = (await r.json()).error ?? "";
        } catch {}
        setActionError(msg || (r.status === 409 ? "Another job is already running." : `Request failed (HTTP ${r.status}).`));
        return;
      }
      const { jobId } = await r.json();
      window.location.href = `/lab?job=${encodeURIComponent(jobId)}`;
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setStarting(false);
    }
  }

  if (list && !campaign)
    return (
      <div className="camp">
        <p className="lab-error">
          <TriangleAlert size={14} /> {error || `Campaign “${id}” not found.`}
        </p>
        <Link href="/campaigns" className="button secondary">
          All campaigns
        </Link>
      </div>
    );
  if (!campaign)
    return (
      <p className="muted camp-loading">
        <LoaderCircle size={16} className="spin" /> Loading campaign…
      </p>
    );

  const isCase = campaign.kind === "case";
  const listings = data?.variants.filter(Boolean) ?? [];
  return (
    <div className="camp">
      <header className="camp-head">
        <div className="camp-head-photo">
          <Photo src={campaign.photoUrl} alt={campaign.product.name} />
        </div>
        <div>
          <span className="eyebrow">
            <Link href="/campaigns">CAMPAIGNS</Link> / {isCase ? "CASE STUDY · REAL STORE DATA" : "LIVE CAMPAIGN"}
          </span>
          <h1>{campaign.product.name}</h1>
          <p>
            {marketLabel(campaign.marketplace)} · {formatMoney(campaign.product.price, campaign.product.currency)} ·{" "}
            {campaign.rounds.length} round{campaign.rounds.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="camp-head-actions">
          {!isCase && live && (
            <button className="button primary" onClick={nextRound} disabled={starting}>
              {starting ? <LoaderCircle size={16} className="spin" /> : <Repeat size={16} />} Plan next round live
            </button>
          )}
        </div>
      </header>
      {actionError && (
        <p className="lab-error">
          <TriangleAlert size={14} /> {actionError}
        </p>
      )}

      {isCase && (
        <section className="panel camp-case">
          <span className="eyebrow">THE REAL LOOP, ALREADY RUN</span>
          <h2>DNT · Shopee Brazil · 14 real listings, 2 rounds</h2>
          <p className="muted">
            Round 1 was planned from a demo base; round 2 replanned after the store&apos;s real 30-day Seller Center data arrived,
            and the analyst reversed rules from round 1. Explore the full case:
          </p>
          <div className="camp-links">
            <Link href="/rodada/r1">
              Round 1 listings <ArrowUpRight size={14} />
            </Link>
            <Link href="/rodada/r2">
              Round 2 listings <ArrowUpRight size={14} />
            </Link>
            <Link href="/benchmark/r1">
              Apify competitor benchmark <ArrowUpRight size={14} />
            </Link>
            <Link href="/aprendizado">
              Learning & memory diff <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW THIS CAMPAIGN EVOLVES</span>
            <h2>Every round feeds the next</h2>
          </div>
        </div>
        <LoopExplainer />
      </section>

      <div className="camp-tabs" role="tablist" aria-label="Rounds">
        {campaign.rounds.map((r) => (
          <button
            key={r.round}
            role="tab"
            aria-selected={round === r.round}
            className={round === r.round ? "active" : ""}
            onClick={() => setRound(r.round)}
          >
            Round {r.round.replace(/^r/, "")} <small>
              {r.generated}/{r.planned}
            </small>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted camp-loading">
          <LoaderCircle size={16} className="spin" /> Loading round…
        </p>
      ) : !data ? (
        <p className="muted">This round has no data yet.</p>
      ) : (
        <>
          {data.plan.dataQuality && <p className="lab-hint">Data: {data.plan.dataQuality}</p>}
          <Portfolio
            key={`${id}-${round}`}
            data={data}
            round={round}
            title={`${campaign.product.name} · round ${round.replace(/^r/, "")}`}
            currency={campaign.product.currency}
            coverUrl={(r, v) => `/api/campaigns/${encodeURIComponent(id)}/rounds/${r}/cover/${v}`}
            approveUrl={(r, v) => `/api/campaigns/${encodeURIComponent(id)}/rounds/${r}/approve/${v}`}
          />
        </>
      )}
    </div>
  );
}
