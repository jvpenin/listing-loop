# Listing Loop: guia do front para o Codex

Você vai construir o front do Listing Loop: um app Next.js em `app/` que mostra o motor que já existe (droids do Factory, Apify e estatística) para os jurados do Cal Hacks 13. A submissão no Devpost é às **8h30 de domingo**. O code freeze é às **3h00**.

O back-end é de outro agente (Claude Code). **Você só cria e edita arquivos dentro de `app/`.**

---

## 1. Regras inegociáveis

1. **Só escreva em `app/`.** Nunca edite `src/`, `.factory/`, `runs/`, `memory/`, `data/`, `package.json` da raiz nem `.env`. O app tem o próprio `app/package.json`.
2. **Nunca rode `src/round.ts` nem `src/learn.ts`.** Cada execução abre sessões pagas da Factory, e o orçamento é contado em `runs/budget.json`. Para testar, use só os dados já gravados em `runs/`.
3. **O modo padrão é o replay:** o app só lê arquivos. O modo ao vivo, que dispara agentes, só existe com `LISTING_LOOP_LIVE=1`. Nesse caso os botões aparecem e chamam o motor. Sem a variável, esses botões ficam escondidos.
4. **Todo o texto da interface fica em português do Brasil.** O público é um vendedor brasileiro da Shopee.
5. **Não invente dados.** Tudo o que aparece na tela vem dos arquivos descritos na seção 4. Se faltar um campo, mostre "sem dado".
6. Para o deploy no Vercel, só o front vai, em modo replay, com uma cópia de `runs/` e `memory/`. Veja a seção 9.

---

## 2. O que é o produto (para acertar o tom)

Um vendedor de moda da Shopee (a loja DNT) gasta cerca de 8 horas para lançar um produto e nunca sabe por que um anúncio vende e outro não. O Listing Loop faz o seguinte:

1. **Benchmark.** O Apify coleta 179 concorrentes reais e comparáveis na shopee.com.br. O código calcula preço por peça, mix de kits, padrões de título e as palavras que a DNT ainda não usa.
2. **Planejamento.** O `plan.ts` usa Thompson sampling sobre o histórico da loja e escolhe 12 combinações de eixos (ângulo × capa × aquisição). Algumas variantes **aproveitam** o que já vende e outras **exploram** o que é incerto. A regra de compliance da Shopee proíbe repetir o par capa/ângulo.
3. **Geração.** Um conductor, criado pelo Droid SDK, aciona em paralelo o custom droid **listing-producer**. Cada um escreve um anúncio, validado por Zod, gera uma capa a partir da foto real do produto e prova o benchmark citando IDs de concorrentes reais. O código confere se esses IDs existem.
4. **Aprendizado.** O droid **performance-analyst** (Opus) lê as estatísticas e propõe regras para o playbook. O `memory.ts` aplica as regras e faz um commit no git ("learn: r1"). A rodada seguinte usa esse playbook.

Os jurados precisam ver: **droids trabalhando, dados reais de concorrentes, matemática honesta (incluindo "inconclusivo") e memória versionada.**

### Roteiro da demo (3 min). O app precisa servir a este roteiro.
1. **A dor (20s).**
2. **Gerar (60s).** Foto, custo e margens entram. Os concorrentes por ângulo aparecem. Os 12 cards se preenchem ao vivo, cada um com eixos e um "por quê".
3. **Revisar (20s).** Aprovar algumas variantes e baixar a planilha do Upseller.
4. **Aprender (60s).** Dashboard com os dados da loja, o diff da memória, `git log memory/` e a r2 já realocando.
5. **Escala (20s).**

---

## 3. Stack e estrutura

- Next.js (App Router) + TypeScript + Tailwind, dentro de `app/`. Exemplo: `npx create-next-app@latest app --ts --tailwind --app --eslint --src-dir --import-alias "@/*"`.
- As rotas de API leem arquivos do repositório com `fs`. A raiz do repositório é `process.env.LISTING_LOOP_ROOT ?? path.resolve(process.cwd(), '..')`.
- Para gráficos, use um SVG próprio ou Recharts. Mantenha simples e legível.
- Validação: copie os tipos da seção 4 para `app/src/lib/types.ts`. Não importe nada de `../src`, para o app continuar autocontido no deploy.

Estrutura sugerida:
```
app/src/
  app/
    page.tsx                  -> Novo lançamento
    rodada/[round]/page.tsx   -> Portfólio de variantes (12 cards)
    benchmark/[round]/page.tsx-> Concorrentes (intel do Apify)
    aprendizado/page.tsx      -> Aprendizado (stats + playbook + diff + git log)
    api/...                   -> rotas da seção 6
  components/VariantCard.tsx, AxisChip.tsx, ModeBadge.tsx, CiBar.tsx, ...
  lib/types.ts, lib/fsdata.ts
```

---

## 4. Contratos de dados (somente leitura)

Todos os caminhos são relativos à raiz do repositório. Existem duas rodadas: `r1` (completa, 12 de 12) e `r2` (por enquanto só o plano; uma amostra de variantes pode chegar depois).

### 4.1 `runs/<round>/plan.json`: o plano da rodada
```ts
type Axes = {
  angulo: 'academia' | 'casual' | 'conforto' | 'presente';
  capa: 'solo_grade' | 'solo_linha' | 'modelo' | 'uso';
  aquisicao: 'organico' | 'ads' | 'afiliado';
  oferta: 'kit4';
};
type VariantSpec = {
  variantId: string;            // "v01".."v12"
  round: string;
  produto: { sku: string; descricao: string; fotoReferencia: string; precoShopee: number };
  axes: Axes;
  mode: 'exploit' | 'explore';  // na tela: "aproveitando" | "explorando"
  rationale: string;            // ex.: "Aproveita o que já vence: angulo=casual lidera 3.66; ..."
  titleHook?: string;
  priorEvidence: string[];      // métricas e regras do playbook que justificaram a escolha
};
type Plan = { round: string; createdAt: string; dataQuality?: string; playbookVersion?: number; variants: VariantSpec[] };
```
`dataQuality` = "base de demonstração: 3 reais + 12 simulados". **Mostre essa frase na tela de Aprendizado.** A honestidade sobre os dados conta pontos com os jurados.

### 4.2 `runs/<round>/variants/<vid>.json`: o anúncio gerado pelo droid
```ts
type Listing = {
  variantId: string; axes: Axes; mode: 'exploit' | 'explore';
  title: string;                 // <= 120 caracteres
  description: string;           // <= 3000 caracteres, com quebras de linha
  keywords: string[];            // de 5 a 15
  coverBrief: string;            // o que a capa mostra
  coverPath: string;             // "runs/r1/covers/v01.png"
  appliedRules: string[];        // ids das regras do playbook (exploit)
  hypothesis: string;            // o que a variante testa (explore)
  benchmark: {
    competitorsAnalyzed: number;
    referenceItemIds: string[];  // ids reais da Shopee, conferidos pelo código
    pricePosition: string;       // ex.: "R$ 12,98 por peça contra mediana de R$ 15,00 ... mais barato que 67%"
    keywordsAdopted: string[];
    differentiators: string[];
  };
};
```
O link de um concorrente citado é `https://shopee.com.br/product/<shop_id>/<item_id>`. O `shop_id` está em `data/competitors/<angulo>.json`, junto com o `url`. Monte um mapa `item_id -> url` a partir desses arquivos.

### 4.3 `runs/<round>/covers/<vid>.png`
São PNGs quadrados de 1254 px, com cerca de 2 MB. Sirva por rota de API (seção 6) e use `<img loading="lazy">` ou `next/image` com `unoptimized`.

### 4.4 `runs/<round>/summary.json`: status da execução
```ts
type Summary = {
  round: string; updatedAt: string; lastRunSecs: number; ok: number; total: number;
  titleWarnings: string[];       // ex.: "v01~v04 (casual) títulos 87% iguais": mostre como alerta de spam
  variants: { variantId: string; ok: boolean; why: string; secs: number; attempts: number }[];
};
```

### 4.5 `runs/<round>/usage.json`: custo e tempo por variante
```ts
type Usage = {
  round: string;
  runs: { variantId: string; attempts: { sessionId: string | null; success: boolean; durationMs: number | null;
          tokenUsage: { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number;
                        thinkingTokens: number; factoryCredits: number } | null; why: string }[] }[];
  learn?: { sessionId: string; success: boolean; durationMs: number; tokenUsage: unknown }[];
};
```
Num rodapé ou num painel de "bastidores", mostre o tempo e os créditos Factory de cada card. Os jurados da Factory valorizam isso.

### 4.6 `runs/<round>/intel.json`: benchmark de concorrentes (Apify)
```ts
type AngleIntel = {
  n: number; excludedNotComparable: number;
  price: { min: number; p25: number; median: number; p75: number; max: number };
  pricePerPiece: { n: number; p25: number; median: number; p75: number };
  kits: { term: string; count: number; sharePct: number }[];        // "kit3" 45%
  discount: { sharePct: number; medianPct: number | null };
  ratingMedian: number | null;
  titles: { avgLength: number; startsWithKitPct: number;
            topWords: { term: string; count: number; sharePct: number }[];
            topBigrams: { term: string; count: number; sharePct: number }[] };
  dnt: { price: number; kit: number; pricePerPiece: number; cheaperPerPieceThanPct: number; priceVsMedianPct: number | null };
  keywordGaps: { term: string; count: number; sharePct: number }[];  // palavras que a DNT não usa
  topCompetitors: { itemId: string; title: string; price: number; kit: number | null; pricePerPiece: number | null;
                    discountPct: number | null; rating: number | null; salesRank: number | null; query: string | null; url: string | null }[];
};
type Intel = { round: string; generatedAt: string; source: string; queries: Record<string, string[]>;
               headlines: string[]; market: Omit<AngleIntel, 'topCompetitors'>; angles: Record<string, AngleIntel> };
```
Os dados brutos estão em `data/competitors/<angulo>.json` (campos `item_id`, `shop_id`, `name`, `url`, `image_url`, `price` em centavos, `discount_pct`, `rating`, `query`, `rank`).

### 4.7 `runs/<round>/stats.json`: desempenho por valor de eixo (histórico da loja)
```ts
type Metric = { mean: number; ci90: [number, number]; baselineMean: number; pBetter: number };
type AxisValue = { n: number; enoughData: boolean; listings: string[];
                   metrics: Partial<Record<'ctr' | 'cartRate' | 'paidConversion' | 'profitPer1kImpr', Metric>> };
type Stats = { generatedAt: string; unit: string; method: string;
               thresholds: { minListings: number; pBetterRule: number };
               dataQuality: { listings: number; realPartial: number; simulated: number; note: string };
               confounders: { item_id: string; campanha: string; diasSemEstoque: number }[];
               perListing: unknown[];
               axes: Record<'angulo' | 'capa' | 'aquisicao', Record<string, AxisValue>> };
```
**Gráfico principal da tela de Aprendizado:** lucro por mil impressões (`profitPer1kImpr`) por valor de eixo. Desenhe um ponto na média com um bigode de `ci90[0]` a `ci90[1]`, agrupado por eixo, e uma linha de referência em `baselineMean`. Mostre o rótulo `pBetter` como "P(melhor) 0,93". Em valores com `pBetter >= 0.8`, destaque com a cor de "vence". Em valores com `pBetter <= 0.2`, use a cor de "evitar". Os demais ficam neutros e marcados como "inconclusivo".

Insight para destacar: **academia tem o maior CTR (3,75%) e o menor lucro (R$ 0,88 por mil impressões).** "CTR alto não é anúncio lucrativo."

Os valores "neutro" (ângulo) aparecem no `stats.json`, mas estão fora do experimento. Mostre em cinza ou esconda.

### 4.8 `memory/playbook.json` e `memory/PLAYBOOK.md`: a memória
```ts
type MemoryRule = { id: string; scope: { category: string; channel: string };
  axis: 'angulo' | 'capa' | 'aquisicao'; value: string; effect: string;
  metric: 'ctr' | 'cartRate' | 'paidConversion' | 'profitPer1kImpr';
  evidence: { n: number; mean: number; ci90: [number, number]; pBetter: number };
  confidence: 'low' | 'medium' | 'high'; reason: string };
type Playbook = { version: number; updatedAt?: string; rules: MemoryRule[]; retired?: { id: string; reason: string; round: string }[] };
```
Hoje a versão é 1, com 6 regras, todas de confiança baixa. Regras com `evidence.pBetter < 0.5` são do tipo "evitar".

### 4.9 `runs/<round>/memory-diff.json`: o que o analyst mudou nesta rodada
```ts
type MemoryDiff = { round: string; add: MemoryRule[]; update: MemoryRule[]; retire: { id: string; reason: string }[];
                    inconclusive: { axis: string; value: string; note: string }[]; summary: string };
```
Mostre como um diff: as regras de `add` em verde, as de `update` em âmbar e as de `retire` em vermelho, e os itens inconclusivos numa lista "seguir explorando". O `summary` vira a frase do analyst.

### 4.10 Histórico da memória no git
Rode `git log --format="%h|%ad|%s|%b" --date=iso -- memory/` na raiz, via `child_process.execFile`. A primeira entrada é "learn: r1". Mostre isso como uma linha do tempo. Se o git não existir (no Vercel), use `app/public/replay/git-log.json`, gerado por um script `app/scripts/snapshot.ts`.

### 4.11 `runs/budget.json`
`{ cap: number, used: number, log: { at, round, sessions, what }[] }`. É opcional e pode aparecer no painel de bastidores.

---

## 5. Telas

### 5.1 Novo lançamento (`/`)
- Foto do produto (`data/product/photo.jpg`), SKU TP001-K4, "kit com 4 tops cropped femininos sem bojo, microfibra, cós largo", preço R$ 51,90.
- Campos de custo, margem mínima e máxima e ângulos a testar. No modo replay, são só exibição e vêm preenchidos.
- Um bloco com as headlines dos concorrentes (`intel.headlines`), com link para `/benchmark/r1`.
- Botão **"Gerar rodada"**. No modo replay, ele navega para `/rodada/r1` e anima os cards aparecendo um a um, com um intervalo de 250 a 400 ms, simulando o stream. No modo ao vivo, chama `POST /api/round`.

### 5.2 Portfólio de variantes (`/rodada/[round]`)
- Grade de 12 **VariantCard**, nas proporções de um card da Shopee.
- **VariantCard**, com uma prop por eixo e as propriedades do componente Figma "Card de variante":
  - capa (PNG);
  - título;
  - chips de eixo: ângulo, capa, aquisição;
  - selo **"aproveitando"** ou **"explorando"**;
  - o "por quê": se for exploit, as `appliedRules` mais o `rationale`; se for explore, a `hypothesis`;
  - preço R$ 51,90 e "R$ 12,98/peça";
  - linha de benchmark: `benchmark.pricePosition` e o número de concorrentes analisados.
- Ao clicar no card, abre um drawer com a descrição completa, as keywords, o benchmark completo (diferenciais, palavras adotadas, concorrentes citados com link), o `coverBrief` e os bastidores (tempo, créditos, tentativas).
- Estado inicial "gerando…", com skeleton, até o arquivo `variants/<vid>.json` existir (via SSE, seção 6).
- Botões **aprovar** e **rejeitar** em cada card. Barra superior com "N aprovadas", o botão **"Exportar para Upseller"** e o alerta de `titleWarnings`.

### 5.3 Benchmark (`/benchmark/[round]`). Peso grande com os jurados (tracks Apify e Anthropic)
- Linha de KPIs do mercado: 179 concorrentes únicos, mediana por peça R$ 13,86, e "DNT mais barata por peça que X%".
- Uma aba ou seção por ângulo:
  - distribuição de preço por peça (faixa p25 a p75, com a DNT marcada);
  - mix de kits em barras;
  - palavras mais frequentes e bigramas;
  - **keywordGaps**, com o título "o que a concorrência usa e você não";
  - tabela dos top concorrentes com link para a Shopee.
- Rodapé: "Fonte: Apify xtracto/shopee-search, shopee.com.br, ordenado por mais vendidos" e a data de `generatedAt`.

### 5.4 Aprendizado (`/aprendizado`)
1. A frase de `dataQuality` no topo, sem esconder.
2. O gráfico de lucro por mil impressões com faixa de 90% (4.7), por eixo.
3. O diff da memória (4.9) e a frase do analyst.
4. As regras do playbook (4.8), com efeito, evidência e confiança.
5. A linha do tempo do `git log memory/` (4.10).
6. **r1 contra r2:** a tabela dos dois `plan.json` lado a lado, destacando as linhas que mudaram e as contagens por valor de eixo (ex.: academia 3 → 2). O back ainda pode mudar o `runs/r2/plan.json`, então leia o arquivo e não fixe valores no código.

---

## 6. Rotas de API (`app/src/app/api/...`)

| Rota | O que faz |
|---|---|
| `GET /api/rounds` | lista as pastas `runs/r*` que têm `plan.json` |
| `GET /api/round/[round]` | `{ plan, summary, variants: Listing[], usage }` (variantes ausentes vêm como `null`) |
| `GET /api/round/[round]/cover/[vid]` | serve o PNG (`content-type: image/png`, cache longo) |
| `GET /api/round/[round]/stream` | SSE: observa `runs/<round>/variants/` (`fs.watch` mais uma varredura a cada 2s) e envia `{ variantId }` a cada arquivo novo e válido; no replay, emite os existentes em sequência com intervalo |
| `GET /api/intel/[round]` | o `intel.json` mais o mapa `item_id -> url` |
| `GET /api/learning?round=r1` | `{ stats, playbook, diff, gitLog, plans: { r1, r2 } }` |
| `POST /api/variant/[round]/[vid]/approve` | body `{ approved: boolean }`; grava em `app/.data/approvals.json` (no gitignore) |
| `GET /api/round/[round]/export` | gera a planilha do Upseller com as aprovadas (seção 7) |
| `POST /api/round` | **só com `LISTING_LOOP_LIVE=1`**: dispara `npx tsx src/round.ts --round <r>` na raiz (spawn detached, sem esperar) e retorna 202; sem a variável, retorna 403 |

---

## 7. Export para o Upseller
- Só as variantes aprovadas entram. Rejeitadas nunca entram.
- **O formato exato das colunas vem do vendedor.** Ele já tem uma skill que gera a importação do Upseller. Até receber o modelo, gere um CSV provisório com: `sku, titulo, descricao, preco, palavras_chave, imagem_capa, variante, angulo, capa, aquisicao`. Deixe o mapeamento de colunas num único arquivo, `app/src/lib/upseller.ts`, para trocar depois. Mostre na tela "formato provisório: confirmar com o modelo do Upseller".

---

## 8. Figma
O vendedor está montando no Figma as variáveis (cores, espaçamento, raio, tipografia) e os componentes ("Card de variante", com propriedades `angulo`, `capa`, `aquisicao`, `modo=explorar|aproveitar`).
- Se você tiver acesso ao MCP do Figma, leia as variáveis e gere tokens do Tailwind com **os mesmos nomes**. Gere o `VariantCard` com uma prop por propriedade de variante.
- Se não tiver, peça os frames exportados como PNG e a lista de variáveis, e reproduza à mão.
- **Grave a tela durante o uso do Figma para gerar código.** É a prova para a track do Figma.
- Enquanto o Figma não chega, use uma paleta neutra com uma cor de destaque. Defina tudo como tokens em `tailwind.config` e CSS variables, para trocar depois sem refatorar.

Cores semânticas de que o app precisa: `vence` (verde), `evitar` (vermelho), `inconclusivo` (cinza), `explorando` (azul ou roxo), `aproveitando` (verde-azulado).

---

## 9. Deploy (opcional, link público no Devpost)
- `app/scripts/snapshot.ts` copia `runs/r1`, `runs/r2`, `memory/` e `data/competitors/` para `app/public/replay/`, junto com o `git-log.json`.
- Quando `process.env.VERCEL` existir, o `fsdata.ts` lê de `public/replay/`.
- Os botões que disparam agentes ficam escondidos.

---

## 10. Critérios de pronto
- [ ] `cd app && npm run build` sem erros.
- [ ] `/rodada/r1` mostra 12 cards com capa, título, eixos, selo e "por quê", e aprovar, rejeitar e exportar funcionam.
- [ ] `/benchmark/r1` mostra os KPIs do mercado, os 4 ângulos e os concorrentes com link.
- [ ] `/aprendizado` mostra o gráfico com faixa de 90%, o diff da memória, o playbook, o git log e a comparação r1 contra r2.
- [ ] O replay funciona sem nenhuma chave de API e sem o binário `droid`.
- [ ] Nada fora de `app/` foi modificado (`git status` confirma).
- [ ] Prints das 3 telas principais, para revisão antes do code freeze.

## 11. Coordenação
- O Claude Code continua no back em paralelo. Ele pode adicionar arquivos em `runs/r2/` (amostra de variantes) e atualizar `runs/r2/plan.json`. **Leia sempre do disco.**
- Commits: só arquivos de `app/`, com mensagens `feat(app): ...`. Nunca commite `.env` nem `app/.data/`.
- Dúvidas de produto vão para o vendedor (João). Dúvidas sobre o formato dos dados: este guia é a fonte. Se um arquivo real divergir do guia, o arquivo vale.
