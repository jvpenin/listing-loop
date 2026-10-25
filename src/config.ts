import { join } from 'node:path';

export const ROOT = join(__dirname, '..');

export const produto = {
  sku: 'TP001-K4',
  descricao: 'kit com 4 tops cropped femininos sem bojo, microfibra, cós largo',
  fotoReferencia: 'data/product/photo.jpg',
  precoShopee: 51.9,
} as const;

// TODO confirmar no Seller Center
export const shopee = { tituloMax: 120, descricaoMax: 3000 } as const;

export const eixos = {
  angulo: ['academia', 'casual', 'conforto', 'presente'],
  capa: ['solo_grade', 'solo_linha', 'modelo', 'uso'],
  aquisicao: ['organico', 'ads', 'afiliado'],
  oferta: ['kit4'],
} as const;

// Switch producer to claude-sonnet-5-5 only for the final demo rounds.
export const modelos = { conductor: 'claude-haiku-5-5', producer: 'claude-haiku-5-5' } as const;

export const variantesPorRodada = 12;
export const concorrencia = 4;
export const timeoutMs = 240_000;

// Demo budget guard: a variant whose output is bad (missing file, Zod error, axes changed) is redone
// once, at most `maxRetriesPerRun` times per execution and only while the budget has
// `minBudgetLeftForRetry` sessions to spare. Timeouts and SDK errors are never redone automatically.
export const retry = { maxRetriesPerRun: 2, minBudgetLeftForRetry: 5 } as const;

export const runDir = (round: string) => join(ROOT, 'runs', round);
