import { promises as fs } from "node:fs";
import path from "node:path";
import { read, root, parseCsv, live, gitLog } from "@/lib/fsdata";
import { Overview, type DroidInfo, type Proof, type Evidence } from "@/components/Overview";
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

const countFiles = async (dir: string, ext: string) =>
  (await fs.readdir(path.join(root, dir)).catch(() => [] as string[])).filter((f) => f.endsWith(ext)).length;

// Every number here is counted from files in the repo (or the replay snapshot), never typed in.
async function readEvidence(): Promise<Evidence> {
  const campaigns = await fs.readdir(path.join(root, "runs/campaigns")).catch(() => [] as string[]);
  let listings = (await countFiles("runs/r1/variants", ".json")) + (await countFiles("runs/r2/variants", ".json"));
  let liveScrapes = 0;
  let scraped = 0;
  for (const c of campaigns) {
    const rounds = (await fs.readdir(path.join(root, "runs/campaigns", c)).catch(() => [] as string[])).filter((r) => /^r\d+$/.test(r));
    for (const r of rounds) {
      listings += await countFiles(`runs/campaigns/${c}/${r}/variants`, ".json");
      const comp = await read<{ items?: unknown[] }>(`runs/campaigns/${c}/${r}/competitors.json`);
      if (comp?.items) {
        liveScrapes++;
        scraped += comp.items.length;
      }
    }
  }
  const angleFiles = (await fs.readdir(path.join(root, "data/competitors")).catch(() => [] as string[])).filter((f) => f.endsWith(".json"));
  for (const f of angleFiles) {
    const raw = await read<unknown>(`data/competitors/${f}`);
    const items = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] } | null)?.items ?? []);
    scraped += items.length;
  }
  const budget = await read<{ used: number; log: { sessions: number }[] }>("runs/budget.json");
  const log = await gitLog();
  return {
    listings,
    factorySessions: budget?.used ?? null,
    sessionBatches: budget?.log.length ?? null,
    apifyDatasets: angleFiles.length + liveScrapes,
    competitorItems: scraped,
    memoryCommits: log.filter((e) => e.subject.startsWith("learn:")).length,
  };
}

export default async function Home() {
  const [droids, r1, r2, playbook, budget, historyText, evidence] = await Promise.all([
    readDroids(),
    read<Summary>("runs/r1/summary.json"),
    read<Summary>("runs/r2/summary.json"),
    read<Playbook>("memory/playbook.json"),
    read<{ used: number; cap: number }>("runs/budget.json"),
    fs.readFile(path.join(root, "data/history/dnt_tops.csv"), "utf8").catch(() => ""),
    readEvidence(),
  ]);
  const realListings = parseCsv(historyText).filter((r) => r.fonte === "real").length;
  const proof: Proof = {
    r1: r1 ? { ok: r1.ok, total: r1.total } : null,
    r2: r2 ? { ok: r2.ok, total: r2.total } : null,
    playbook: playbook ? { version: playbook.version, rules: playbook.rules.length } : null,
    budget: budget ? { used: budget.used, cap: budget.cap } : null,
    realListings: realListings || null,
  };
  return <Overview droids={droids} proof={proof} evidence={evidence} live={live} />;
}
