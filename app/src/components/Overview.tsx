import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  FileJson,
  FlaskConical,
  Hammer,
  Figma,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { Mascot } from "./Brand";

export type DroidInfo = {
  name: string;
  model: string;
  description: string;
  prompt: string;
};
export type Proof = {
  r1: { ok: number; total: number } | null;
  r2: { ok: number; total: number } | null;
  playbook: { version: number; rules: number } | null;
  budget: { used: number; cap: number } | null;
  realListings: number | null;
};
export type Evidence = {
  listings: number;
  factorySessions: number | null;
  sessionBatches: number | null;
  apifyDatasets: number;
  competitorItems: number;
  memoryCommits: number;
};

const droidRoles: Record<string, { role: string; io: [string, string][] }> = {
  "listing-producer": {
    role: "Writes one listing variant and generates its cover from the real product photo. Runs N times per round, in parallel.",
    io: [
      ["reads", "VariantSpec (fixed axes) · playbook.json · intel.json · product photo"],
      ["writes", "variants/vNN.json · covers/vNN.png"],
    ],
  },
  "performance-analyst": {
    role: "Turns measured stats into playbook rules, only when the evidence clears the bar. Says \"inconclusive\" otherwise. Runs once per round.",
    io: [
      ["reads", "stats.json (computed in code) · playbook.json"],
      ["writes", "memory-diff.json → validated and committed to git"],
    ],
  },
};

// What each sponsor already did in this repo, counted from files (see app/src/app/page.tsx).
const trackEvidence = (e: Evidence): Record<string, string> => ({
  "Anthropic · Claude": `${e.listings} listings written by Claude through the producer droid · ${e.memoryCommits} memory commits decided by the analyst ("learn: rN" in git)`,
  Factory: `${e.factorySessions ?? "—"} paid Factory sessions run so far, in ${e.sessionBatches ?? "—"} batches (runs/budget.json)`,
  Apify: `${e.apifyDatasets} Apify datasets in the repo, ${e.competitorItems} competitor rows scraped from Shopee (179 unique comparables in the case study)`,
  Figma: "Design-time only: Figma does not run in the pipeline.",
});

const tracks = [
  {
    name: "Anthropic · Claude",
    icon: Brain,
    points: [
      "Opus 5.5 is the analyst: it decides what becomes a rule and cites the evidence (n, mean, 90% CI, P(better)).",
      "Haiku 5.5 is the conductor and the producer: cheap, fast, and it follows the file contract.",
      "Memory is auditable: every rule has evidence and a confidence level, and git keeps its history.",
      "Community: Brazilian small sellers. Real store: DNT, which spends about 8 h per product launch.",
    ],
  },
  {
    name: "Factory",
    icon: Bot,
    points: [
      "Factory is the runtime: a Droid SDK conductor delegates through Task to 2 custom droids in .factory/droids/.",
      "Parallel fan-out, each attempt in a killable worker process. A model per task.",
      "Image generation runs inside the droid, with the real product photo as the reference.",
      "A session budget ledger (runs/budget.json) caps paid sessions.",
    ],
  },
  {
    name: "Apify",
    icon: Database,
    points: [
      "Live competitor scraping on Shopee Brazil for the product you pick in the Live Lab.",
      "Shopee: xtracto/shopee-search, with 179 real comparable competitors in the case study.",
      "Code turns raw data into intel: price quartiles, title patterns, keyword gaps. Producers must cite real item ids.",
    ],
  },
  {
    name: "Figma",
    icon: Figma,
    points: [
      "The design guide, wireframe and screen mockups were drawn in Figma and used as the visual spec for this UI.",
      "The mascots (Lo, Fox, Spark) live in a Figma workspace linked from the README.",
      "The UX was mapped for small sellers first. This judge view sits on top of it.",
    ],
  },
];

const stack = ["Next.js 16", "TypeScript", "Zod", "Server-Sent Events", "git as memory", "Droid SDK", "Thompson sampling", "Beta-Binomial"];

const fmt = (x: { ok: number; total: number } | null) => (x ? `${x.ok}/${x.total}` : "—");

export function Overview({
  droids,
  proof,
  evidence,
  live,
}: {
  droids: DroidInfo[];
  proof: Proof;
  evidence: Evidence;
  live: boolean;
}) {
  return (
    <div className="ov">
      <section className="ov-hero">
        <div className="ov-hero-copy">
          <span className="eyebrow">
            <Sparkles size={13} /> CAL HACKS 13 · FOR THE JUDGES
          </span>
          <h1>
            We mapped the UX for small sellers.
            <br />
            <span>This page is for you: the architecture.</span>
          </h1>
          <p className="ov-lede">
            Listing Loop runs a <strong>long-running, iterative listing campaign</strong> for{" "}
            <strong>any product a small seller launches</strong>. Today&apos;s case is Shopee
            Brazil, the channel of our real store. Each round, Factory droids
            generate listing variants, the seller approves them, the marketplace sells, and a
            second droid learns from the sales. Then the next round reallocates the variants.
          </p>
          <div className="ov-loop" aria-label="The loop">
            {["Generate variants", "Human approves", "Marketplace sells", "Learn", "Reallocate next round"].map(
              (s, i, all) => (
                <span key={s}>
                  {s}
                  {i < all.length - 1 && <ArrowRight size={13} />}
                </span>
              ),
            )}
          </div>
          <div className="ov-cta">
            <Link href="/lab" className="button primary">
              <FlaskConical size={17} /> Run the droids live
            </Link>
            <Link href="/rodada/r2" className="button secondary">
              See a real 2-round campaign <ArrowRight size={16} />
            </Link>
          </div>
          <p className="ov-note">
            <strong>Judges: use the DNT case product</strong> (one click in the Live Lab). Its
            feedback memory is real: 14 DNT Shopee listings from the Seller Center stand in for
            the sales feedback our own listings generate after a few rounds. Any other product
            runs cold.
          </p>
          {!live && (
            <p className="ov-note">
              Replay mode: this deploy replays recorded runs. Live runs happen on our laptop
              at the table.
            </p>
          )}
        </div>
        <div className="ov-hero-art" aria-hidden="true">
          <Mascot name="fox" />
          <Mascot name="spark" />
        </div>
      </section>

      <section className="ov-proof" aria-label="Proof from the repository">
        <div>
          <strong>{fmt(proof.r1)}</strong>
          <span>Round 1 variants generated</span>
        </div>
        <div>
          <strong>{fmt(proof.r2)}</strong>
          <span>Round 2 variants (real data)</span>
        </div>
        <div>
          <strong>{proof.realListings ?? "—"}</strong>
          <span>real DNT listings in the history</span>
        </div>
        <div>
          <strong>
            {proof.playbook ? `v${proof.playbook.version} · ${proof.playbook.rules} rules` : "—"}
          </strong>
          <span>playbook (memory in git)</span>
        </div>
        <div>
          <strong>{proof.budget ? `${proof.budget.used}/${proof.budget.cap}` : "—"}</strong>
          <span>paid Factory sessions used</span>
        </div>
      </section>

      <section className="panel ov-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ARCHITECTURE · ONE ROUND</span>
            <h2>Agents talk through files. Code validates every file.</h2>
            <p>
              Math lives in code (sampling, statistics, validation). Judgment lives in the
              agent (copy, covers, what counts as a rule). Every step leaves a JSON file you can
              open, which makes the system auditable and easy to debug.
            </p>
          </div>
        </div>
        <ArchitectureDiagram />
        <div className="ov-principles">
          <div>
            <FileJson size={18} />
            <p>
              <strong>File contracts.</strong> <code>runs/&lt;round&gt;/</code> holds plan, intel,
              variants, covers, stats, and diff. The UI only reads these files.
            </p>
          </div>
          <div>
            <ShieldCheck size={18} />
            <p>
              <strong>Zod at every boundary.</strong> If a droid changes a fixed axis or cites a
              competitor that is not in the Apify data, its output is rejected.
            </p>
          </div>
          <div>
            <Hammer size={18} />
            <p>
              <strong>Killable workers.</strong> Each variant runs in its own process group.
              A hung model call never blocks the round.
            </p>
          </div>
        </div>
      </section>

      <section className="ov-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE TWO CUSTOM DROIDS</span>
            <h2>Read live from .factory/droids/</h2>
          </div>
        </div>
        <div className="ov-droids">
          {droids.map((d) => {
            const meta = droidRoles[d.name];
            return (
              <article key={d.name} className="panel ov-droid">
                <header>
                  <Bot size={20} />
                  <div>
                    <code className="ov-droid-name">{d.name}</code>
                    <span className="ov-model">{d.model || "model not set"}</span>
                  </div>
                </header>
                <p>{meta?.role ?? d.description}</p>
                {meta && (
                  <dl>
                    {meta.io.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="ov-desc">
                  <em>frontmatter:</em> {d.description}
                </p>
                {d.prompt && (
                  <details>
                    <summary>View the system prompt</summary>
                    <pre>{d.prompt}</pre>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="ov-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BUILT WITH · TRACKS · WHAT EACH ONE ALREADY DID HERE</span>
            <h2>What exactly we used, and why</h2>
          </div>
        </div>
        <div className="ov-tracks">
          {tracks.map(({ name, icon: Icon, points }) => (
            <article key={name} className="panel ov-track">
              <header>
                <span className="icon-square">
                  <Icon size={19} />
                </span>
                <h3>{name}</h3>
              </header>
              <ul>
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="ov-evidence">
                <strong>In this repo:</strong> {trackEvidence(evidence)[name]}
              </p>
            </article>
          ))}
        </div>
        <div className="ov-stack" aria-label="Stack">
          <span>STACK</span>
          {stack.map((s) => (
            <code key={s}>{s}</code>
          ))}
        </div>
      </section>

      <section className="ov-two">
        <article className="panel ov-section">
          <span className="eyebrow">
            <Store size={13} /> WHY A SMALL-SELLER UX AT ALL
          </span>
          <h2>The product is real. The judge view sits on top.</h2>
          <p>
            The seller screens (portfolio, approvals, learning) come from a real store, DNT,
            with 14 listings of real Shopee data. The case study shows the full loop on that
            data: round 2 reversed three rules from round 1 once real sales came in.
          </p>
          <Link href="/aprendizado" className="ov-link">
            See memory change its mind <ArrowRight size={15} />
          </Link>
        </article>
        <article className="panel ov-section">
          <span className="eyebrow">
            <Users size={13} /> HONEST LIMITS
          </span>
          <ul className="ov-limits">
            <li>A human approves every listing. Nothing is published automatically.</li>
            <li>
              Small stores get little traffic, so many axes stay &quot;inconclusive&quot;. That
              is by design: no invented winners.
            </li>
            <li>A new product has no sales yet, so its first round explores more.</li>
            <li>
              Shopee Brazil only, on purpose. Another marketplace is one config entry (limits,
              language, an Apify actor), and the playbook is scoped by category and channel.
              That is the scale path. We did not build it for the demo.
            </li>
            <li>
              Vercel serves replay only. The droids need the local <code>droid</code> CLI, so
              live runs happen on our laptop.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
