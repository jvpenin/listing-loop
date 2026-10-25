import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  Plan,
  Listing,
  Summary,
  Usage,
  Intel,
  Stats,
  Playbook,
  MemoryDiff,
  GitEntry,
  RoundData,
  LearningData,
} from "./types";
const exec = promisify(execFile);
export const root = process.env.VERCEL
  ? path.join(process.cwd(), "public/replay")
  : (process.env.LISTING_LOOP_ROOT ?? path.resolve(process.cwd(), ".."));
export const live =
  process.env.LISTING_LOOP_LIVE === "1" && !process.env.VERCEL;
export function validRound(s: string) {
  if (!/^r[1-9]\d{0,5}$/.test(s)) throw new Error("Rodada inválida");
  return s;
}
export function validVariant(s: string) {
  if (!/^v\d{2,3}$/.test(s)) throw new Error("Variante inválida");
  return s;
}
export async function read<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(root, file), "utf8")) as T;
  } catch {
    return null;
  }
}
export async function rounds() {
  const candidates = (await fs.readdir(path.join(root, "runs")).catch(() => []))
    .filter((r) => /^r[1-9]\d*$/.test(r))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const plans = await Promise.all(
    candidates.map((r) => read<Plan>(`runs/${r}/plan.json`)),
  );
  return candidates.filter((_, i) => plans[i] !== null);
}
export async function getRound(round: string): Promise<RoundData | null> {
  validRound(round);
  const plan = await read<Plan>(`runs/${round}/plan.json`);
  if (!plan) return null;
  const [variants, summary, usage, approvals] = await Promise.all([
    Promise.all(
      plan.variants.map((s) =>
        read<Listing>(
          `runs/${round}/variants/${validVariant(s.variantId)}.json`,
        ),
      ),
    ),
    read<Summary>(`runs/${round}/summary.json`),
    read<Usage>(`runs/${round}/usage.json`),
    getApprovals(round),
  ]);
  return { plan, variants, summary, usage, approvals };
}
export async function getIntel(round: string) {
  return read<Intel>(`runs/${validRound(round)}/intel.json`);
}
export async function competitorUrls() {
  const map: Record<string, string> = {};
  for (const angle of ["academia", "casual", "conforto", "presente"]) {
    const raw = await read<unknown>(`data/competitors/${angle}.json`);
    const rows = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "items" in raw
        ? (raw as { items: unknown[] }).items
        : [];
    for (const row of rows as {
      item_id: string;
      shop_id: string;
      url?: string;
    }[])
      if (row.item_id)
        map[String(row.item_id)] =
          row.url ??
          `https://shopee.com.br/product/${row.shop_id}/${row.item_id}`;
  }
  return map;
}
export async function gitLog(): Promise<GitEntry[]> {
  if (process.env.VERCEL) return (await read<GitEntry[]>("git-log.json")) ?? [];
  try {
    const { stdout } = await exec(
      "git",
      [
        "log",
        "--format=%h%x1f%ad%x1f%s%x1f%b%x1e",
        "--date=iso",
        "--",
        "memory/",
      ],
      { cwd: root },
    );
    return stdout
      .split("\x1e")
      .filter((s) => s.trim())
      .map((s) => {
        const [hash, date, subject, body] = s.trim().split("\x1f");
        return { hash, date, subject, body };
      });
  } catch {
    return (await read<GitEntry[]>("git-log.json")) ?? [];
  }
}
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (c === "\n" && !quoted) {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}
export async function getLearning(round: string): Promise<LearningData> {
  validRound(round);
  let previousPlaybook = await read<Playbook>("playbook-v1.json");
  if (!previousPlaybook)
    try {
      const { stdout } = await exec(
        "git",
        ["show", "8d06919:memory/playbook.json"],
        { cwd: root },
      );
      previousPlaybook = JSON.parse(stdout);
    } catch {}
  const [stats, playbook, diff, log, r1, r2, historyText] = await Promise.all([
    read<Stats>(`runs/${round}/stats.json`),
    read<Playbook>("memory/playbook.json"),
    read<MemoryDiff>(`runs/${round}/memory-diff.json`),
    gitLog(),
    read<Plan>("runs/r1/plan.json"),
    read<Plan>("runs/r2/plan.json"),
    fs
      .readFile(path.join(root, "data/history/dnt_tops.csv"), "utf8")
      .catch(() => ""),
  ]);
  return {
    stats,
    playbook: round === "r1" ? previousPlaybook : playbook,
    diff,
    gitLog: log,
    plans: { r1, r2 },
    previousPlaybook,
    history: parseCsv(historyText).filter((r) => r.fonte === "real"),
  };
}
const approvalsFile = path.join(
  process.env.VERCEL ? "/tmp/listing-loop" : process.cwd(),
  ".data/approvals.json",
);
let writeQueue: Promise<unknown> = Promise.resolve();
export async function getApprovals(
  round: string,
): Promise<Record<string, boolean>> {
  try {
    return JSON.parse(await fs.readFile(approvalsFile, "utf8"))[round] ?? {};
  } catch {
    return {};
  }
}
export function setApproval(round: string, vid: string, approved: boolean) {
  validRound(round);
  validVariant(vid);
  const operation = writeQueue
    .catch(() => {})
    .then(async () => {
      let all: Record<string, Record<string, boolean>> = {};
      try {
        all = JSON.parse(await fs.readFile(approvalsFile, "utf8"));
      } catch {}
      all[round] = { ...all[round], [vid]: approved };
      await fs.mkdir(path.dirname(approvalsFile), { recursive: true });
      const temp = approvalsFile + ".tmp";
      await fs.writeFile(temp, JSON.stringify(all, null, 2));
      await fs.rename(temp, approvalsFile);
      return all[round];
    });
  writeQueue = operation;
  return operation;
}
