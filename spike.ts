import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  AutonomyLevel,
  DroidMessageType,
  ToolConfirmationOutcome,
  run,
  type ClientPermissionHandler,
} from '@factory/droid-sdk/node';

// Usage: npx tsx spike.ts v1          (one variant)
//        npx tsx spike.ts v1 v2 v3 v4 (parallel)

const MODEL_ID = 'claude-haiku-5-5';
const TIMEOUT_MS = 180_000;
const OUT_DIR = join(__dirname, 'runs', 'spike');
const PRODUTO = 'top cropped feminino de academia, tecido canelado, cor preta';

interface VariantSpec {
  variantId: string;
  produto: string;
  angulo: 'academia' | 'casual' | 'conforto' | 'presente';
  capa: 'modelo' | 'solo' | 'uso';
}

const SPECS: VariantSpec[] = [
  { variantId: 'v1', produto: PRODUTO, angulo: 'academia', capa: 'modelo' },
  { variantId: 'v2', produto: PRODUTO, angulo: 'casual', capa: 'solo' },
  { variantId: 'v3', produto: PRODUTO, angulo: 'conforto', capa: 'uso' },
  { variantId: 'v4', produto: PRODUTO, angulo: 'presente', capa: 'solo' },
];

function promptFor(spec: VariantSpec): string {
  return [
    'Use the subagent listing-producer with this variant spec and WAIT until it finishes (do not run it in background).',
    'Pass the spec to the subagent exactly as given. The product is ONLY the "produto" field.',
    '',
    JSON.stringify(spec, null, 2),
    '',
    'When the subagent has finished, reply DONE.',
  ].join('\n');
}

function permissionHandlerFor(id: string): ClientPermissionHandler {
  return ({ toolUses, options }) => {
    for (const t of toolUses) {
      const d = t.details as { type: string; command?: string; filePath?: string };
      console.log(`[${id}] [permission] ${t.toolUse.name} (${d.type}) ${d.command ?? d.filePath ?? ''}`);
    }
    const ok = options.some((o) => o.value === ToolConfirmationOutcome.ProceedOnce);
    if (!ok) console.log(`[${id}] [permission] ProceedOnce not offered -> Cancel`);
    return ok ? ToolConfirmationOutcome.ProceedOnce : ToolConfirmationOutcome.Cancel;
  };
}

// Checks the files once, after the run returned. No waiting.
function checkOutputs(id: string): string | null {
  const json = join(OUT_DIR, `${id}.json`);
  const png = join(OUT_DIR, `${id}.png`);
  if (!existsSync(json)) return 'missing json';
  if (!existsSync(png)) return 'missing png';
  try {
    const data = JSON.parse(readFileSync(json, 'utf8'));
    if (data.variantId !== id) return `json variantId=${data.variantId}`;
    const text = JSON.stringify(data).toLowerCase();
    if (!text.includes('cropped')) return 'json does not mention the top cropped';
  } catch (err) {
    return `invalid json: ${(err as Error).message}`;
  }
  return null;
}

async function runVariant(spec: VariantSpec, signal: AbortSignal) {
  const id = spec.variantId;
  const start = Date.now();
  try {
    const result = await run(promptFor(spec), {
      cwd: __dirname,
      modelId: MODEL_ID,
      autonomyLevel: AutonomyLevel.High,
      permissionHandler: permissionHandlerFor(id),
      abortSignal: signal,
    });
    const tools = result.messages
      .filter((m) => m.type === DroidMessageType.ToolCall)
      .map((m) => (m as { name: string }).name);
    console.log(`[${id}] tools: ${tools.join(', ') || '(none)'}`);
    if (!result.success) {
      return { id, ok: false, secs: (Date.now() - start) / 1000, why: result.error?.message ?? result.subtype };
    }
    const problem = checkOutputs(id);
    return { id, ok: problem === null, secs: (Date.now() - start) / 1000, why: problem ?? '' };
  } catch (err) {
    const why = signal.aborted ? `aborted after ${TIMEOUT_MS / 1000}s` : (err as Error).message;
    return { id, ok: false, secs: (Date.now() - start) / 1000, why };
  }
}

async function main() {
  // FACTORY_API_KEY lives in .env; the SDK only reads process.env.
  if (!process.env.FACTORY_API_KEY) process.loadEnvFile(join(__dirname, '.env'));

  const ids = process.argv.slice(2);
  const specs = SPECS.filter((s) => ids.includes(s.variantId));
  if (specs.length === 0) throw new Error('Pass variant ids, e.g. v1 or v1 v2 v3 v4');

  // Old outputs (from earlier runs) would make the check pass falsely.
  for (const s of specs) {
    rmSync(join(OUT_DIR, `${s.variantId}.json`), { force: true });
    rmSync(join(OUT_DIR, `${s.variantId}.png`), { force: true });
  }

  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const start = Date.now();
  const results = await Promise.all(specs.map((s) => runVariant(s, signal)));
  const total = (Date.now() - start) / 1000;

  console.table(results.map((r) => ({ ...r, secs: r.secs.toFixed(1) })));
  console.log(`total: ${total.toFixed(1)}s, max individual: ${Math.max(...results.map((r) => r.secs)).toFixed(1)}s`);
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
