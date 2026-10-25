import "server-only";
import { promises as fs, existsSync, openSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { root, read, live, getRound, validRound, validVariant } from "./fsdata";
import type { Plan, Listing, Summary, Usage, RoundData } from "./types";

// Live judge demo: campaigns in runs/campaigns/<id>/, jobs in runs/jobs/<id>/ (see claude/LIVE_CONTRACT.md).
// The engine (src/lab.ts) runs as a detached process; the app only spawns it and tails its events.
const exec = promisify(execFile);

// The demo is Shopee Brazil only; a marketplace is one config entry (engine: src/marketplaces.ts).
export const MARKETPLACES = [
  { id: "shopee_br", label: "Shopee Brazil", currency: "BRL", language: "pt-BR", titleMax: 120, actor: "xtracto/shopee-search" },
] as const;

export const CASE_ID = "dnt-top-cropped";
const campaignsDir = path.join(root, "runs", "campaigns");
const jobsDir = path.join(root, "runs", "jobs");

export function validId(s: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(s)) throw new Error("Id inválido");
  return s;
}

export type CampaignFile = {
  id: string;
  createdAt: string;
  product: { name: string; description: string; price: number; currency: string; sku: string; category: string };
  marketplace: string;
  angles: string[];
  photo: string;
};

export type JobFile = {
  id: string;
  kind: "round" | "learn";
  campaignId?: string;
  round?: string;
  n?: number;
  dry?: boolean;
  status?: "running" | "done" | "error";
  pid?: number;
  createdAt?: string;
};

const alive = (pid?: number) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export async function readJob(id: string) {
  return read<JobFile>(`runs/jobs/${validId(id)}/job.json`);
}

export async function listJobs(): Promise<JobFile[]> {
  const ids = await fs.readdir(jobsDir).catch(() => [] as string[]);
  const jobs = await Promise.all(ids.map((id) => read<JobFile>(`runs/jobs/${id}/job.json`)));
  return jobs.filter((j): j is JobFile => !!j).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function runningJob() {
  return (await listJobs()).find((j) => j.status === "running" && alive(j.pid)) ?? null;
}

// The newest successful real (non-dry) round job: what replay mode plays back.
export async function replayJobId() {
  const jobs = await listJobs();
  return (jobs.find((j) => j.kind === "round" && !j.dry && j.status === "done") ?? null)?.id ?? null;
}

export async function replayLearnJobId() {
  return (await listJobs()).find((j) => j.kind === "learn" && j.status === "done")?.id ?? null;
}

export async function startJob(job: Omit<JobFile, "id" | "createdAt" | "status" | "pid">) {
  const id = `${job.kind}-${Date.now().toString(36)}`;
  const dir = path.join(jobsDir, id);
  await fs.mkdir(dir, { recursive: true });
  const file: JobFile = { ...job, id, createdAt: new Date().toISOString(), status: "running" };
  const log = openSync(path.join(dir, "stdout.log"), "a");
  const child = spawn("npx", ["tsx", "src/lab.ts", "--job", id], {
    cwd: root,
    detached: true,
    stdio: ["ignore", log, log],
    // A normal variant takes ~2 min; a stalled droid is cut at 4 min so the judge never waits longer.
    env: { ...process.env, LISTING_LOOP_TIMEOUT_MS: process.env.LISTING_LOOP_TIMEOUT_MS ?? "240000" },
  });
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  await fs.writeFile(path.join(dir, "job.json"), JSON.stringify({ ...file, pid: child.pid }, null, 2));
  return id;
}

export function readEvents(id: string, offset: number) {
  const file = path.join(jobsDir, validId(id), "events.jsonl");
  if (!existsSync(file)) return { lines: [] as string[], offset };
  const text = readFileSync(file, "utf8");
  const end = text.lastIndexOf("\n") + 1;
  if (end <= offset) return { lines: [], offset };
  return { lines: text.slice(offset, end).split("\n").filter(Boolean), offset: end };
}

export function jobAlive(job: JobFile | null) {
  return !!job && job.status === "running" && alive(job.pid);
}

export async function readCampaign(id: string) {
  return read<CampaignFile>(`runs/campaigns/${validId(id)}/campaign.json`);
}

async function campaignRounds(id: string) {
  const entries = await fs.readdir(path.join(campaignsDir, id)).catch(() => [] as string[]);
  return entries.filter((r) => /^r[1-9]\d*$/.test(r)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

export async function nextRound(id: string) {
  const rounds = await campaignRounds(id);
  return `r${rounds.length ? Number(rounds[rounds.length - 1].slice(1)) + 1 : 1}`;
}

async function roundCounts(base: string) {
  const plan = await read<Plan>(`${base}/plan.json`);
  if (!plan) return null;
  const files = await fs.readdir(path.join(root, base, "variants")).catch(() => [] as string[]);
  return { planned: plan.variants.length, generated: files.filter((f) => f.endsWith(".json")).length };
}

export async function listCampaigns() {
  const out = [];
  const caseRounds = [];
  for (const r of ["r1", "r2"]) {
    const c = await roundCounts(`runs/${r}`);
    if (c) caseRounds.push({ round: r, ...c });
  }
  const plan = await read<Plan>("runs/r1/plan.json");
  out.push({
    id: CASE_ID,
    kind: "case" as const,
    product: {
      name: plan?.variants[0]?.produto.descricao ?? "Kit of 4 cropped tops",
      price: plan?.variants[0]?.produto.precoShopee ?? null,
      currency: "BRL",
    },
    marketplace: "shopee_br",
    photoUrl: "/api/product",
    createdAt: plan?.createdAt ?? null,
    rounds: caseRounds,
  });
  const ids = await fs.readdir(campaignsDir).catch(() => [] as string[]);
  const live = [];
  for (const id of ids) {
    const c = await read<CampaignFile>(`runs/campaigns/${id}/campaign.json`);
    if (!c) continue;
    const rounds = [];
    for (const r of await campaignRounds(id)) {
      const counts = await roundCounts(`runs/campaigns/${id}/${r}`);
      if (counts) rounds.push({ round: r, ...counts });
    }
    live.push({
      id,
      kind: "live" as const,
      product: { name: c.product.name, price: c.product.price, currency: c.product.currency },
      marketplace: c.marketplace,
      photoUrl: `/api/campaigns/${id}/photo`,
      createdAt: c.createdAt,
      rounds,
    });
  }
  live.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...out, ...live];
}

// RoundData for a live campaign round, or the DNT case round when id = CASE_ID.
export async function getCampaignRound(id: string, round: string): Promise<RoundData | null> {
  validRound(round);
  if (id === CASE_ID) return getRound(round);
  validId(id);
  const base = `runs/campaigns/${id}/${round}`;
  const plan = await read<Plan>(`${base}/plan.json`);
  if (!plan) return null;
  const [variants, summary, usage, approvals] = await Promise.all([
    Promise.all(plan.variants.map((s) => read<Listing>(`${base}/variants/${validVariant(s.variantId)}.json`))),
    read<Summary>(`${base}/summary.json`),
    read<Usage>(`${base}/usage.json`),
    getCampaignApprovals(id, round),
  ]);
  return { plan, variants, summary, usage, approvals };
}

export function coverPath(id: string, round: string, vid: string) {
  validRound(round);
  validVariant(vid);
  return id === CASE_ID
    ? path.join(root, `runs/${round}/covers/${vid}.png`)
    : path.join(campaignsDir, validId(id), round, "covers", `${vid}.png`);
}

export async function photoPath(id: string) {
  if (id === CASE_ID) return path.join(root, "data/product/photo.jpg");
  const c = await readCampaign(id);
  return c ? path.join(campaignsDir, id, c.photo) : null;
}

const approvalsFile = path.join(process.env.VERCEL ? "/tmp/listing-loop" : process.cwd(), ".data/campaign-approvals.json");
let writeQueue: Promise<unknown> = Promise.resolve();

async function getCampaignApprovals(id: string, round: string): Promise<Record<string, boolean>> {
  try {
    return JSON.parse(await fs.readFile(approvalsFile, "utf8"))[`${id}/${round}`] ?? {};
  } catch {
    return {};
  }
}

export function setCampaignApproval(id: string, round: string, vid: string, approved: boolean) {
  const key = `${validId(id)}/${validRound(round)}`;
  validVariant(vid);
  const op = writeQueue
    .catch(() => {})
    .then(async () => {
      let all: Record<string, Record<string, boolean>> = {};
      try {
        all = JSON.parse(await fs.readFile(approvalsFile, "utf8"));
      } catch {}
      all[key] = { ...all[key], [vid]: approved };
      await fs.mkdir(path.dirname(approvalsFile), { recursive: true });
      await fs.writeFile(approvalsFile + ".tmp", JSON.stringify(all, null, 2));
      await fs.rename(approvalsFile + ".tmp", approvalsFile);
      return all[key];
    });
  writeQueue = op;
  return op;
}

export async function createCampaign(input: {
  name: string;
  description: string;
  price: number;
  marketplace: string;
  category: string;
  angles: string[];
  photo: { bytes: Buffer; ext: "jpg" | "png" };
}) {
  const mp = MARKETPLACES.find((m) => m.id === input.marketplace)!;
  const slug = input.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "product";
  const id = `${slug}-${Date.now().toString(36).slice(-5)}`;
  const dir = path.join(campaignsDir, id);
  await fs.mkdir(dir, { recursive: true });
  const photo = `photo.${input.photo.ext}`;
  await fs.writeFile(path.join(dir, photo), input.photo.bytes);
  const campaign: CampaignFile = {
    id,
    createdAt: new Date().toISOString(),
    product: {
      name: input.name,
      description: input.description,
      price: input.price,
      currency: mp.currency,
      sku: slug.toUpperCase().slice(0, 20),
      category: input.category,
    },
    marketplace: mp.id,
    angles: input.angles,
    photo,
  };
  await fs.writeFile(path.join(dir, "campaign.json"), JSON.stringify(campaign, null, 2));
  return campaign;
}

let droidVersion: string | null | undefined;
async function getDroidVersion() {
  if (droidVersion !== undefined) return droidVersion;
  try {
    droidVersion = (await exec("droid", ["--version"], { timeout: 5000 })).stdout.trim();
  } catch {
    droidVersion = null;
  }
  return droidVersion;
}

const modelOf = (text: string) => text.match(/^model:\s*(\S+)/m)?.[1] ?? null;

export async function labStatus() {
  const [budget, producer, analyst, config] = await Promise.all([
    read<{ used: number; cap: number }>("runs/budget.json"),
    fs.readFile(path.join(root, ".factory/droids/listing-producer.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(root, ".factory/droids/performance-analyst.md"), "utf8").catch(() => ""),
    fs.readFile(path.join(root, "src/config.ts"), "utf8").catch(() => ""),
  ]);
  const running = live ? await runningJob() : null;
  return {
    live,
    budget: budget ? { used: budget.used, cap: budget.cap } : null,
    droidVersion: live ? await getDroidVersion() : null,
    models: {
      conductor: config.match(/conductor:\s*'([^']+)'/)?.[1] ?? "claude-haiku-5-5",
      producer: modelOf(producer) ?? "claude-haiku-5-5",
      analyst: modelOf(analyst) ?? "claude-opus-5-5",
    },
    marketplaces: MARKETPLACES,
    runningJobId: running?.id ?? null,
    replayJobId: await replayJobId(),
    replayLearnJobId: await replayLearnJobId(),
  };
}
