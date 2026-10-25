import { z } from 'zod';

import { eixos, produto, shopee } from './config';

export const Axes = z.object({
  angulo: z.enum(eixos.angulo),
  capa: z.enum(eixos.capa),
  aquisicao: z.enum(eixos.aquisicao),
  oferta: z.enum(eixos.oferta),
});
export type Axes = z.infer<typeof Axes>;

export const Mode = z.enum(['exploit', 'explore']);

export const VariantSpec = z.object({
  variantId: z.string().regex(/^v\d{2}$/),
  round: z.string().min(1),
  produto: z.object({
    sku: z.literal(produto.sku),
    descricao: z.string(),
    fotoReferencia: z.string(),
    precoShopee: z.number(),
  }),
  axes: Axes,
  mode: Mode,
  rationale: z.string().max(300),
  priorEvidence: z.array(z.string()).max(6),
});
export type VariantSpec = z.infer<typeof VariantSpec>;

export const Listing = z.object({
  variantId: z.string(),
  axes: Axes,
  mode: Mode,
  title: z.string().min(1).max(shopee.tituloMax),
  description: z.string().min(1).max(shopee.descricaoMax),
  keywords: z.array(z.string().min(1)).min(5).max(15),
  coverBrief: z.string().min(1),
  coverPath: z.string().min(1),
  appliedRules: z.array(z.string()),
  hypothesis: z.string(),
});
export type Listing = z.infer<typeof Listing>;

export const Plan = z.object({
  round: z.string(),
  createdAt: z.string(),
  dataQuality: z.string().optional(),
  playbookVersion: z.number().optional(),
  variants: z.array(VariantSpec),
});
export type Plan = z.infer<typeof Plan>;

export const MemoryRule = z.object({
  id: z.string().min(1),
  scope: z.object({ category: z.string(), channel: z.string() }),
  axis: z.enum(['angulo', 'capa', 'aquisicao']),
  value: z.string(),
  effect: z.string(),
  metric: z.enum(['ctr', 'cartRate', 'paidConversion', 'profitPer1kImpr']),
  evidence: z.object({ n: z.number(), mean: z.number(), ci90: z.tuple([z.number(), z.number()]), pBetter: z.number() }),
  confidence: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
});
export type MemoryRule = z.infer<typeof MemoryRule>;

export const MemoryDiff = z.object({
  round: z.string(),
  add: z.array(MemoryRule),
  update: z.array(MemoryRule),
  retire: z.array(z.object({ id: z.string(), reason: z.string() })),
  inconclusive: z.array(z.object({ axis: z.string(), value: z.string(), note: z.string() })),
  summary: z.string(),
});
export type MemoryDiff = z.infer<typeof MemoryDiff>;

export const Playbook = z.object({
  version: z.number(),
  updatedAt: z.string().optional(),
  rules: z.array(MemoryRule),
  retired: z.array(z.object({ id: z.string(), reason: z.string(), round: z.string() })).optional(),
});
export type Playbook = z.infer<typeof Playbook>;
