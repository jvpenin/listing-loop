"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, GitBranch, Pause, Play, RefreshCw, ShoppingBag, ShieldCheck, TrendingUp } from "lucide-react";
import { Mascot } from "./Brand";
import styles from "../app/architecture/architecture.module.css";

const chapters = [
  { label: "Research", title: "Real market. Better starting point.", description: "Apify collects Shopee competitors. TypeScript turns market context and memory into a fixed experiment plan." },
  { label: "Create", title: "One producer. Parallel possibilities.", description: "The Factory conductor delegates each variant to listing-producer. Claude creates the copy and cover; code validates, then you approve." },
  { label: "Learn", title: "A second droid connects results to decisions.", description: "TypeScript computes the sales statistics. performance-analyst interprets the evidence and proposes a playbook diff." },
  { label: "Improve", title: "The next round starts smarter.", description: "Code validates the proposed diff. The full workflow saves versioned memory in Git and feeds it into the next experiment plan." },
];

export function ArchitectureExperience({ models }: { models: { conductor: string; producer: string; analyst: string } }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const respectMotion = () => { if (preference.matches) setPlaying(false); };
    respectMotion();
    preference.addEventListener("change", respectMotion);
    return () => preference.removeEventListener("change", respectMotion);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setActive(value => (value + 1) % chapters.length), 4500);
    return () => clearInterval(timer);
  }, [playing]);
  const chapter = chapters[active];
  return <section className={`${styles.experience} ${playing ? "" : styles.paused}`} aria-label="Architecture map" data-stage={active}>
    <div className={styles.mapToolbar}>
      <span className={styles.systemLabel}><span /> SYSTEM MAP <b>01 — 04</b></span>
      <button className={styles.playButton} onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? "Pause tour" : "Play the loop"}</button>
    </div>

    <div className={styles.scene}>
      <div className={styles.orbit} aria-hidden="true" />
      <svg className={styles.wires} viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="currentColor" strokeWidth="1.3" /></marker></defs>
        <g fill="none" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#flow-arrow)">
          <path className={active === 0 ? styles.activeWire : ""} d="M218 172H298" />
          <path className={active === 1 ? styles.activeWire : ""} d="M702 172H782" />
          <path d="M884 274V338" />
          <path className={active === 2 ? styles.activeWire : ""} d="M782 410H702" />
          <path className={active === 3 ? styles.activeWire : ""} d="M298 410H218" />
          <path className={active === 3 ? styles.activeWire : ""} d="M116 338V274" />
        </g>
        <g className={styles.packets} fill="var(--primary)">
          <circle r="4"><animateMotion dur="2.6s" repeatCount="indefinite" path="M218 172H298" /></circle>
          <circle r="4"><animateMotion dur="2.6s" begin=".6s" repeatCount="indefinite" path="M702 172H782" /></circle>
          <circle r="4"><animateMotion dur="2.6s" begin="1.2s" repeatCount="indefinite" path="M782 410H702" /></circle>
          <circle r="4"><animateMotion dur="2.6s" begin="1.8s" repeatCount="indefinite" path="M298 410H218" /></circle>
        </g>
      </svg>

      <div className={`${styles.node} ${styles.research} ${active === 0 ? styles.selected : ""}`}>
        <span className={styles.nodeEyebrow}>01 / MARKET INPUT</span>
        <div className={styles.productMini}><img src="/replay/data/product/photo.jpg" alt="Reference product" /><div><strong>Product brief</strong><span>Photo + price + details</span></div></div>
        <div className={styles.nodeRule} />
        <img className={styles.apifyLogo} src="/brand/apify.svg" alt="Apify" width="90" height="27" />
        <strong>Real competitors</strong><span>Shopee market research</span>
        <div className={styles.dataBars} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      </div>
      <span className={`${styles.connectorLabel} ${styles.planLabel}`}>TS · plan <ArrowRight size={10} /></span>

      <div className={styles.factory}>
        <div className={styles.factoryHeader}><img src="/brand/factory.svg" alt="Factory" width="130" height="25" /><span>2 SPECIALIST DROIDS</span></div>
        <div className={styles.conductor}><span className={styles.statusDot} /> Droid SDK conductor <span>{models.conductor}</span></div>
        <div className={`${styles.droid} ${styles.producer} ${active === 1 ? styles.selected : ""}`}>
          <div className={styles.mascotPlatform}><Mascot name="fox" /><div /></div>
          <div className={styles.droidCopy}><span className={styles.droidNumber}>DROID 01 <span>CREATE</span></span><h2>listing-producer</h2><p>One brief → parallel listings</p><span className={styles.model}><ClaudeMark /> {models.producer}</span></div>
          <div className={styles.droidPorts} aria-hidden="true"><i /><i /><i /></div>
        </div>
        <div className={styles.droidDivider}><span /> SAME RUNTIME. DIFFERENT JOBS. <span /></div>
        <div className={`${styles.droid} ${styles.analyst} ${active === 2 ? styles.selected : ""}`}>
          <div className={styles.mascotPlatform}><Mascot name="spark" /><div /></div>
          <div className={styles.droidCopy}><span className={styles.droidNumber}>DROID 02 <span>LEARN</span></span><h2>performance-analyst</h2><p>Sales evidence → better rules</p><span className={styles.model}><ClaudeMark /> {models.analyst}</span></div>
          <div className={styles.droidPorts} aria-hidden="true"><i /><i /><i /></div>
        </div>
        <div className={styles.powered}>REASONING BY <span><ClaudeMark /> Anthropic <b>Claude</b></span></div>
      </div>

      <span className={`${styles.connectorLabel} ${styles.reviewLabel}`}><ShieldCheck size={12} /> Validate</span>
      <div className={`${styles.node} ${styles.output} ${active === 1 ? styles.selected : ""}`}>
        <span className={styles.nodeEyebrow}>02 / YOUR NEXT LISTINGS</span>
        <div className={styles.listingStack} aria-label="Generated listing variants">
          {["v01", "v02", "v04"].map((id, i) => <div key={id} style={{ "--card-index": i } as React.CSSProperties}><img src={`/replay/runs/r2/covers/${id}.png`} alt={`Generated cover ${id}`} /><span /><span /></div>)}
        </div>
        <strong>Copy + covers</strong><span>Grounded in the benchmark</span>
        <div className={styles.approval}><ShieldCheck size={13} /> You approve. Then publish.</div>
      </div>
      <span className={`${styles.connectorLabel} ${styles.salesLabel}`}>Sales window <ArrowDown size={10} /></span>
      <div className={`${styles.node} ${styles.sales} ${active === 2 ? styles.selected : ""}`}>
        <span className={styles.nodeEyebrow}>03 / MARKET FEEDBACK</span>
        <div className={styles.shopee}><ShoppingBag size={26} strokeWidth={1.6} /><strong>Shopee</strong></div>
        <div className={styles.chart} aria-hidden="true"><i /><i /><i /><i /><i /><i /><TrendingUp size={30} /></div>
        <strong>Actual sales history</strong><span>Clicks · orders · profit</span>
        <small>Statistics computed in TypeScript</small>
      </div>
      <div className={`${styles.node} ${styles.memory} ${active === 3 ? styles.selected : ""}`}>
        <span className={styles.nodeEyebrow}>04 / PERSISTENT MEMORY</span>
        <div className={styles.memoryVisual} aria-hidden="true"><div /><div /><div><GitBranch size={28} /></div></div>
        <strong>A playbook that evolves</strong><span>Validated rules. Versioned in Git.</span>
        <div className={styles.memoryChips}><span>+ add</span><span>↻ update</span><span>− retire</span></div>
      </div>
      <span className={`${styles.connectorLabel} ${styles.feedbackLabel}`}><RefreshCw size={11} /> Next round</span>
    </div>

    <div className={styles.tour}>
      <div className={styles.tourSteps} aria-label="Explore the architecture">{chapters.map((item, index) => <button key={item.label} aria-pressed={active === index} onClick={() => { setActive(index); setPlaying(false); }}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}{index < 3 && <ArrowRight size={13} />}</button>)}</div>
      <div className={styles.tourCaption} aria-live="polite"><strong>{chapter.title}</strong><p>{chapter.description}</p></div>
    </div>
    <p className={styles.loopNote}><RefreshCw size={14} /> Updated memory feeds the next experiment plan.</p>
  </section>;
}
function ClaudeMark() { return <svg viewBox="0 0 32 32" width="19" height="19" fill="none" aria-hidden="true">{Array.from({length: 12}, (_, i) => <path key={i} d="M16 3V12" transform={`rotate(${i * 30} 16 16)`} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />)}</svg>; }
