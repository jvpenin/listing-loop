import { promises as fs } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
async function main() {
const app = process.cwd();
const root = process.env.LISTING_LOOP_ROOT ?? path.resolve(app, "..");
const out = path.join(app, "public/replay");
await fs.mkdir(out, { recursive: true });
for (const folder of [
  "runs/r1",
  "runs/r2",
  // Live lab: the recorded live campaign + its job events replay on Vercel.
  "runs/campaigns",
  "runs/jobs",
  "runs/budget.json",
  ".factory/droids",
  "memory",
  "data/competitors",
  "data/product",
  "data/history",
]) {
  const from = path.join(root, folder),
    to = path.join(out, folder);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, {
    recursive: true,
    filter: (source) => !source.endsWith(".log") && !path.basename(source).startsWith("etapa-"),
  });
}
try {
  const stdout = execFileSync(
    "git",
    [
      "log",
      "--format=%h%x1f%ad%x1f%s%x1f%b%x1e",
      "--date=iso",
      "--",
      "memory/",
    ],
    { cwd: root, encoding: "utf8" },
  );
  const log = stdout
    .split("\x1e")
    .filter((s) => s.trim())
    .map((s) => {
      const [hash, date, subject, body] = s.trim().split("\x1f");
      return { hash, date, subject, body };
    });
  await fs.writeFile(
    path.join(out, "git-log.json"),
    JSON.stringify(log, null, 2),
  );
} catch {
  console.warn("Histórico git indisponível.");
}
try {
  const previous = execFileSync(
    "git",
    ["show", "8d06919:memory/playbook.json"],
    { cwd: root, encoding: "utf8" },
  );
  await fs.writeFile(path.join(out, "playbook-v1.json"), previous);
} catch {
  console.warn("Snapshot v1 indisponível.");
}
console.log(
  "Replay preparado em app/public/replay, sem chaves nem execução de agentes.",
);

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
