import Link from "next/link";
import { ArrowRight, Check, Play, Sparkles, ShieldCheck } from "lucide-react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { Mascot } from "./Brand";
import { TrackBrands } from "./TrackBrands";
import styles from "./Overview.module.css";

export type DroidInfo = { name: string; model: string; description: string; prompt: string };
export type Proof = {
  r1: { ok: number; total: number } | null;
  r2: { ok: number; total: number } | null;
  playbook: { version: number; rules: number } | null;
  budget: { used: number; cap: number } | null;
  realListings: number | null;
};
export type Evidence = {
  listings: number; factorySessions: number | null; sessionBatches: number | null;
  apifyDatasets: number; competitorItems: number; memoryCommits: number;
};

const roles: Record<string, { number: string; title: string; mascot: "fox" | "spark"; description: string }> = {
  "listing-producer": { number: "01", title: "The producer", mascot: "fox", description: "Creates different titles, descriptions and covers from your photo, competitor research and learned rules." },
  "performance-analyst": { number: "02", title: "The analyst", mascot: "spark", description: "Reads sales statistics, keeps evidence-backed rules and retires weak ones. The next round uses that memory." },
};
const modelName = (model: string) => model.replace(/^claude-/, "Claude ").replace(/haiku/i, "Haiku").replace(/opus/i, "Opus").replace(/(\d)-(\d)/g, "$1.$2").replaceAll("-", " ");

export function Overview({ droids, proof, evidence, live }: { droids: DroidInfo[]; proof: Proof; evidence: Evidence; live: boolean }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="eyebrow"><Sparkles size={13} /> FROM PRODUCT PHOTO TO A LEARNING CAMPAIGN</span>
          <h1>Your next listing.<br /><span>Smarter every round.</span></h1>
          <p>Small sellers spend hours launching a product, then guess what works. Fox.ai researches competitors, creates listing variants and learns from sales.</p>
          <div className={styles.actions}>
            <Link href="/lab" className="button primary"><Play size={17} /> {live ? "Start the live demo" : "Explore the recorded demo"}<ArrowRight size={17} /></Link>
            <span className={styles.duration}>{live ? "A few inputs · 2 variants · about 5 min" : "Recorded runs · live demo on our laptop"}</span>
          </div>
          <div className={styles.assurance}><ShieldCheck size={14} /> You review the listings. Nothing publishes automatically.</div>
        </div>
        <div className={styles.preview}>
          <div className={styles.previewHeading}><span className={styles.dot} /> REAL OUTPUT · TOP CROPPED</div>
          <div className={styles.covers}>
            {/* Existing outputs: this preview never implies a running job. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/replay/runs/r2/covers/v01.png" alt="Recorded listing cover generated for the DNT cropped top campaign" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/replay/runs/r2/covers/v02.png" alt="A second generated cover exploring a different campaign strategy" />
          </div>
          <div className={styles.previewFooter}><Check size={14} /><span>Copy + cover + competitor benchmark</span></div>
          <Link href="/rodada/r2">View the recorded campaign <ArrowRight size={13} /></Link>
        </div>
      </section>

      <section className={styles.demoPath} aria-label="Try the demo in three steps">
        <div className={styles.sectionIntro}><span className="eyebrow">TRY IT YOURSELF</span><h2>One product. The whole loop.</h2></div>
        <ol>
          <li><span className={styles.step}>1</span><div><strong>Start with a product</strong><p>Top cropped is prefilled. Add details, a reference photo and your pricing.</p></div></li>
          <li><span className={styles.step}>2</span><div><strong>Watch the droids create</strong><p>Follow Apify research and two listing variants as they arrive.</p></div></li>
          <li><span className={styles.step}>3</span><div><strong>See the analyst learn</strong><p>Run the second droid on the store’s real sales history.</p></div></li>
        </ol>
        <p className={styles.caseNote}>The top cropped demo uses {proof.realListings ?? "existing"} historical DNT listings as feedback. Other categories start without learned rules.</p>
      </section>

      <section className={styles.engine} aria-label="Architecture and the two custom droids">
        <div className={styles.sectionIntro}><span className="eyebrow">UNDER THE HOOD</span><h2>Two droids. One continuous experiment.</h2></div>
        <ArchitectureDiagram />
        <div className={styles.droids}>
          {droids.filter((d) => d.name in roles).map((d) => {
            const role = roles[d.name];
            return <article key={d.name} className={styles.droid}>
              <Mascot name={role.mascot} />
              <div><div className={styles.droidHeading}><h3>{role.number} · {role.title}</h3><span className={styles.model}>{modelName(d.model) || "Model not set"}</span></div><p>{role.description}</p><code>{d.name}</code></div>
            </article>;
          })}
        </div>
        <div className={styles.evidence}><span><strong>{evidence.listings}</strong> listings generated</span><span><strong>{evidence.competitorItems}</strong> competitor records</span><span><strong>{proof.playbook?.rules ?? "—"}</strong> rules in memory</span><Link href="/aprendizado">See how real data changed the rules <ArrowRight size={14} /></Link></div>
      </section>

      <section className={styles.tracks} aria-label="Technology and sponsor tracks"><span className="eyebrow">BUILT WITH</span><TrackBrands /><span className={styles.trackNote}>Figma shapes the experience; Factory, Claude and Apify power the running campaign.</span></section>
    </div>
  );
}
