import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { ROOT } from './config';

// Every run() opens one paid Factory session. This ledger is the single counter for the whole
// project (round.ts, learn.ts), and refuses to go past the cap.
const BUDGET_CAP = 80;
const BUDGET_FILE = join(ROOT, 'runs', 'budget.json');

interface Budget {
  cap: number;
  used: number;
  log: { at: string; round: string; sessions: number; what: string }[];
}

export function readBudget(): Budget {
  return existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) : { cap: BUDGET_CAP, used: 0, log: [] };
}

export const remaining = () => {
  const b = readBudget();
  return b.cap - b.used;
};

// Records the sessions before they are opened; throws if they do not fit.
export function reserveSessions(sessions: number, round: string, what: string): Budget {
  const budget = readBudget();
  if (budget.used + sessions > budget.cap) {
    throw new Error(`budget: ${budget.used}/${budget.cap} used, ${what} needs ${sessions} sessions`);
  }
  budget.used += sessions;
  budget.log.push({ at: new Date().toISOString(), round, sessions, what });
  mkdirSync(dirname(BUDGET_FILE), { recursive: true });
  writeFileSync(BUDGET_FILE, JSON.stringify(budget, null, 2) + '\n');
  console.log(`[budget] ${what}: +${sessions} paid sessions -> ${budget.used}/${budget.cap} used`);
  return budget;
}
