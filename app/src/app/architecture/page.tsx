import type { Metadata } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { root } from "@/lib/fsdata";
import { TrackBrands } from "@/components/TrackBrands";
import { ArchitectureExperience } from "@/components/ArchitectureExperience";
import styles from "./architecture.module.css";

export const metadata: Metadata = { title: "Architecture" };

async function configuredModels() {
  const [producer, analyst, config] = await Promise.all([
    fs.readFile(path.join(root, ".factory/droids/listing-producer.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(root, ".factory/droids/performance-analyst.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(root, "src/config.ts"), "utf8").catch(() => ""),
  ]);
  // Replay bundles omit engine files; these defaults match the recorded configuration.
  const display = (model: string) => model.replace("claude-", "Claude ").replace("haiku", "Haiku").replace("opus", "Opus").replace(/(\d)-(\d)/g, "$1.$2").replaceAll("-", " ");
  return {
    conductor: display(config.match(/conductor:\s*['"]([^'"]+)['"]/)?.[1] ?? "claude-haiku-5-5"),
    producer: display(producer.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? "claude-haiku-5-5"),
    analyst: display(analyst.match(/^model:\s*(.+)$/m)?.[1]?.trim() ?? "claude-opus-5-5"),
  };
}

export default async function ArchitecturePage() {
  const models = await configuredModels();
  return <article className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.kicker}>THE ARCHITECTURE / Fox.ai</span><h1>Two droids.<br />One <span>smarter loop.</span></h1><p>Research. Create. Learn. Come back better.</p></div>
      <Link className={styles.demoLink} href="/">Open the demo <ArrowUpRight size={18} /></Link>
    </header>

    <ArchitectureExperience models={models} />

    <section className={styles.explanation} aria-labelledby="stages-title">
      <div className={styles.sectionHeading}><span className={styles.kicker}>UNDER THE HOOD</span><h2 id="stages-title">Inside each stage.</h2><p>The details, when you want them.</p></div>
      <div className={styles.detailGrid}>
        {[
          ["01", "Research & planning", "Apify + TypeScript", "Apify collects real Shopee competitors. TypeScript summarizes prices and keywords, then Thompson sampling combines scoped memory with exploration to choose fixed experiment axes."],
          ["02", "Create & approve", "Factory + Claude + you", `A Droid SDK conductor (${models.conductor}) delegates parallel variants to listing-producer (${models.producer}). Each produces copy and a cover from the reference photo. Zod validates outputs and competitor IDs. The seller approves before publishing.`],
          ["03", "Interpret the evidence", "Factory + Claude", `TypeScript computes uncertainty and profit per 1,000 impressions. performance-analyst (${models.analyst}) proposes evidence-backed changes. Insufficient evidence stays inconclusive.`],
          ["04", "Remember & improve", "TypeScript + Git", "Code validates the analyst’s memory diff. In the full campaign workflow, accepted changes update the playbook and are committed to Git. The next experiment reads the updated rules."],
        ].map(([number, title, owner, detail]) => <details key={number} className={styles.detail}><summary><span>{number}</span><div><h3>{title}</h3><small>{owner}</small></div><span className={styles.expand}>+</span></summary><p>{detail}</p></details>)}
      </div>
    </section>

    <aside className={styles.demoNote} aria-label="What the live demo demonstrates">
      <Check size={19} aria-hidden="true" /><div><h3>What happens during the demo</h3><p>Competitor research and listing generation run live. The analyst uses the DNT store’s existing sales history as feedback; these are historical results, not sales from the listings just generated. Its demo run previews a validated diff without saving memory.</p></div>
    </aside>

    <footer className={styles.brands}><TrackBrands /><p>Figma was used for product design. It is not part of the runtime pipeline.</p></footer>
  </article>;
}
