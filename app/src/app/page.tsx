import { promises as fs } from "node:fs";
import path from "node:path";
import { read, root, parseCsv, live } from "@/lib/fsdata";
import { Overview, type DroidInfo, type Proof } from "@/components/Overview";
import type { Playbook, Summary } from "@/lib/types";

// Built-in descriptions for replay deploys, where .factory/ is not shipped.
const fallbackDroids: DroidInfo[] = [
  {
    name: "listing-producer",
    model: "claude-haiku-5-5",
    description:
      "Produces ONE listing variant (JSON + cover PNG) from a VariantSpec JSON. Use once per variant.",
    prompt: "",
  },
  {
    name: "performance-analyst",
    model: "claude-opus-5-5",
    description:
      "Reads per-axis stats of a round and the current playbook, and proposes evidence-backed playbook updates as memory-diff.json. Use once per round.",
    prompt: "",
  },
];

async function readDroids(): Promise<DroidInfo[]> {
  const dir = path.join(root, ".factory/droids");
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort();
    const droids = await Promise.all(
      files.map(async (f) => {
        const text = await fs.readFile(path.join(dir, f), "utf8");
        const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        const front = m?.[1] ?? "";
        const field = (k: string) =>
          front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim() ?? "";
        return {
          name: field("name") || f.replace(/\.md$/, ""),
          model: field("model"),
          description: field("description"),
          prompt: (m?.[2] ?? text).trim(),
        };
      }),
    );
    return droids.length ? droids : fallbackDroids;
  } catch {
    return fallbackDroids;
  }
}

export default async function Home() {
  const [droids, r1, r2, playbook, budget, historyText] = await Promise.all([
    readDroids(),
    read<Summary>("runs/r1/summary.json"),
    read<Summary>("runs/r2/summary.json"),
    read<Playbook>("memory/playbook.json"),
    read<{ used: number; cap: number }>("runs/budget.json"),
    fs.readFile(path.join(root, "data/history/dnt_tops.csv"), "utf8").catch(() => ""),
  ]);
  const realListings = parseCsv(historyText).filter((r) => r.fonte === "real").length;
  const proof: Proof = {
    r1: r1 ? { ok: r1.ok, total: r1.total } : null,
    r2: r2 ? { ok: r2.ok, total: r2.total } : null,
    playbook: playbook ? { version: playbook.version, rules: playbook.rules.length } : null,
    budget: budget ? { used: budget.used, cap: budget.cap } : null,
    realListings: realListings || null,
  };
  return <Overview droids={droids} proof={proof} live={live} />;
}
