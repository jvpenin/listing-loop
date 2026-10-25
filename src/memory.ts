import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ROOT, runDir } from './config';
import { MemoryDiff, Playbook, type MemoryRule } from './schemas';

// Usage: npx tsx src/memory.ts --round r1 [--dry-run] [--diff <path>]
// Validates runs/<round>/memory-diff.json, applies it to memory/playbook.json,
// renders memory/PLAYBOOK.md and commits "learn: <round>". No paid call.

const PLAYBOOK_JSON = join(ROOT, 'memory', 'playbook.json');
const PLAYBOOK_MD = join(ROOT, 'memory', 'PLAYBOOK.md');
const GIT_AUTHOR = ['-c', 'user.name=Joao Victor Penin Caldeira', '-c', 'user.email=jvpenin@gmail.com'];

export function readPlaybook(): Playbook {
  return existsSync(PLAYBOOK_JSON)
    ? Playbook.parse(JSON.parse(readFileSync(PLAYBOOK_JSON, 'utf8')))
    : { version: 0, rules: [] };
}

// Pure: add, update by id (an update of an unknown id is added), retire = move to `retired`.
export function applyDiff(playbook: Playbook, diff: MemoryDiff): Playbook {
  const rules = new Map(playbook.rules.map((r) => [r.id, r]));
  for (const r of [...diff.add, ...diff.update]) rules.set(r.id, r);
  const retired = [...(playbook.retired ?? [])];
  for (const { id, reason } of diff.retire) {
    if (rules.delete(id)) retired.push({ id, reason, round: diff.round });
  }
  return {
    version: playbook.version + 1,
    updatedAt: new Date().toISOString(),
    rules: [...rules.values()].sort((a, b) => a.id.localeCompare(b.id)),
    retired,
  };
}

const fmt = (x: number) => (Math.abs(x) < 1 ? x.toFixed(3) : x.toFixed(2));
const evidence = (r: MemoryRule) =>
  `n=${r.evidence.n}, μ=${fmt(r.evidence.mean)}, IC90 [${fmt(r.evidence.ci90[0])}, ${fmt(r.evidence.ci90[1])}], P(melhor)=${r.evidence.pBetter.toFixed(2)}`;
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function renderPlaybook(pb: Playbook, diff?: MemoryDiff): string {
  const lines = [
    '# Playbook — tops na Shopee',
    '',
    `Versão ${pb.version}${pb.updatedAt ? ` · atualizado em ${pb.updatedAt}` : ''}. Gerado por src/memory.ts a partir de memory/playbook.json.`,
    '',
  ];
  if (diff) lines.push(`Última rodada (${diff.round}): ${diff.summary}`, '');
  lines.push('## Regras', '');
  if (pb.rules.length === 0) lines.push('Nenhuma regra ainda: todos os eixos seguem em exploração.', '');
  else {
    lines.push('| id | regra | métrica | evidência | confiança |', '| --- | --- | --- | --- | --- |');
    for (const r of pb.rules) {
      lines.push(`| ${r.id} | ${cell(`${r.axis}=${r.value}: ${r.effect}`)} | ${r.metric} | ${evidence(r)} | ${r.confidence} |`);
    }
    lines.push('');
  }
  if (diff?.inconclusive.length) {
    lines.push('## Inconclusivos (seguir explorando)', '');
    for (const i of diff.inconclusive) lines.push(`- ${i.axis}=${i.value}: ${i.note}`);
    lines.push('');
  }
  if (pb.retired?.length) {
    lines.push('## Aposentadas', '');
    for (const r of pb.retired) lines.push(`- ${r.id} (${r.round}): ${r.reason}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function readDiff(file: string): MemoryDiff {
  return MemoryDiff.parse(JSON.parse(readFileSync(file, 'utf8')));
}

// Writes playbook.json + PLAYBOOK.md and commits them with the diff.
export function commitLearning(round: string, diff: MemoryDiff, diffFile: string, dryRun = false): Playbook {
  const next = applyDiff(readPlaybook(), diff);
  const md = renderPlaybook(next, diff);
  if (dryRun) {
    console.log(JSON.stringify(next, null, 2));
    console.log(md);
    return next;
  }
  writeFileSync(PLAYBOOK_JSON, JSON.stringify(next, null, 2) + '\n');
  writeFileSync(PLAYBOOK_MD, md);
  execFileSync('git', ['add', 'memory/', diffFile], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('git', [...GIT_AUTHOR, 'commit', '-m', `learn: ${round}`, '-m', diff.summary], { cwd: ROOT, stdio: 'inherit' });
  console.log(`[memory] playbook v${next.version}: ${next.rules.length} rules, +${diff.add.length} ~${diff.update.length} -${diff.retire.length}`);
  return next;
}

if (require.main === module) {
  const { values } = parseArgs({
    options: { round: { type: 'string' }, 'dry-run': { type: 'boolean', default: false }, diff: { type: 'string' } },
  });
  if (!values.round) throw new Error('--round is required');
  const diffFile = values.diff ?? join(runDir(values.round), 'memory-diff.json');
  commitLearning(values.round, readDiff(diffFile), diffFile, values['dry-run']);
}
