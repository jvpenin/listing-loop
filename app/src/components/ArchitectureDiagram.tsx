import { ArrowRight, CornerDownLeft } from "lucide-react";
import { Fragment } from "react";

type Kind = "agent" | "code" | "file" | "external" | "human";
type Node = { kind: Kind; title: string; sub?: string; files?: string[] };

const generate: Node[] = [
  { kind: "external", title: "Apify actor", sub: "competitors for this product + marketplace", files: ["intel.json"] },
  { kind: "code", title: "plan.ts", sub: "Thompson sampling over the axes, explore vs exploit", files: ["plan.json"] },
  { kind: "agent", title: "Conductor", sub: "Droid SDK · claude-haiku-5-5 · one session per variant" },
  {
    kind: "agent",
    title: "N × listing-producer",
    sub: "custom droid, in parallel, generates the cover image itself",
    files: ["variants/vNN.json", "covers/vNN.png"],
  },
  { kind: "code", title: "Zod validation", sub: "schema, fixed axes, cited competitor ids; one retry" },
  { kind: "human", title: "Seller approves", sub: "nothing is published automatically" },
];

const learn: Node[] = [
  { kind: "external", title: "Marketplace sales", sub: "Seller Center export: impressions → clicks → cart → paid" },
  { kind: "code", title: "stats.ts", sub: "Beta-Binomial, 90% CI, P(better) per axis value", files: ["stats.json"] },
  {
    kind: "agent",
    title: "performance-analyst",
    sub: "custom droid · claude-opus-5-5 · judges what becomes a rule",
    files: ["memory-diff.json"],
  },
  { kind: "code", title: "memory.ts", sub: "validates the diff, applies it, git commit \"learn: rN\"", files: ["playbook.json"] },
];

const legend: { kind: Kind; label: string }[] = [
  { kind: "agent", label: "Factory droid (Claude)" },
  { kind: "code", label: "TypeScript (math + validation)" },
  { kind: "external", label: "External data" },
  { kind: "human", label: "Human" },
  { kind: "file", label: "File contract" },
];

function Lane({ title, nodes }: { title: string; nodes: Node[] }) {
  return (
    <div className="arch-lane">
      <span className="arch-lane-title">{title}</span>
      <ol className="arch-row">
        {nodes.map((n, i) => (
          <Fragment key={n.title}>
            <li className={`arch-node ${n.kind}`}>
              <strong>{n.title}</strong>
              {n.sub && <span>{n.sub}</span>}
              {n.files && (
                <span className="arch-files">
                  {n.files.map((f) => (
                    <code key={f}>{f}</code>
                  ))}
                </span>
              )}
            </li>
            {i < nodes.length - 1 && (
              <li className="arch-arrow" aria-hidden="true">
                <ArrowRight size={16} />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="arch" aria-label="Listing Loop architecture: one round">
      <Lane title="1 · GENERATE A ROUND" nodes={generate} />
      <Lane title="2 · LEARN FROM SALES" nodes={learn} />
      <div className="arch-return">
        <CornerDownLeft size={16} />
        <span>
          <code>playbook.json</code> feeds the next <code>plan.ts</code>: proven
          values get narrower, higher beliefs; &quot;avoid&quot; values are
          capped but never frozen out. Round N+1 reallocates the variants.
        </span>
      </div>
      <figcaption className="arch-legend">
        {legend.map((l) => (
          <span key={l.kind}>
            <i className={`arch-dot ${l.kind}`} /> {l.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
