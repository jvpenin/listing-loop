# Roteiro da demo para jurados (Cal Hacks 13)

## A história em uma frase

O PME lança um produto na Shopee. O Listing Loop pesquisa o mercado, propõe anúncios com estratégias diferentes de título, descrição, capa, benchmark e aquisição, aprende com as vendas e realoca a próxima rodada. **A Apify faz a varredura, os droids da Factory orquestram e executam, e o Claude escreve e decide.**

**Por que todo jurado usa o top cropped:** é o único produto com memória de feedback. Os 14 anúncios reais da DNT (Seller Center, 30 dias) fazem o papel dos dados que teríamos depois de algumas rodadas analisando os anúncios criados pelo sistema. Um produto sem memória funciona, mas roda "frio": só explora. Diga isso com essas palavras, porque é uma simulação assumida e não um truque.

## Antes do jurado chegar

```sh
cd app && LISTING_LOOP_LIVE=1 npm run dev     # http://localhost:3000
```

Na sidebar, o box **Engine status** precisa mostrar: Mode Live, sessões `x / 80` e a versão do droid CLI. Abra o **Engine terminal** no rodapé.

## Workflow (≈ 4 min), com o sponsor de cada passo

| # | O jurado faz | O que aparece | Quem está agindo (selo no terminal) |
| --- | --- | --- | --- |
| 1 | Abre a **Overview** (30s) | Arquitetura, os dois droids lidos de `.factory/droids/` e "Built with", com a linha **In this repo** contada dos arquivos (44 sessões Factory, 18 listings, 5 datasets Apify, 2 commits de memória) | — |
| 2 | **Live Lab → "Use the DNT case product" → Run droids** (2 variantes) | Formulário com foto, preço e ângulos | — |
| 3 | Espera ~7s | Stage Apify com actor `xtracto/shopee-search`, **run id e dataset id**, 20 concorrentes e os top 5 com link | **APIFY** |
| 4 | Instantâneo | **Feedback memory**: playbook v2, commit `c9d33d9 learn: r2`, 7 regras com n, P(melhor) e IC90. Depois o plano: v01/v02 **EXPLOIT**, apoiados por `angulo-academia-profit` e `capa-solo_linha-profit`, e uma variante **EXPLORE** | **CODE** (Thompson sampling) lendo a memória que o **CLAUDE** (analyst) escreveu |
| 5 | ~2 min | Duas sessões Factory em paralelo: `session …`, `Task → listing-producer`, arquivos gravados, "still working" a cada 15s | **FACTORY** (orquestra) e **CLAUDE** (escreve e gera a capa) |
| 6 | Ao terminar | Cada card aberto por estratégia: **título** (keyword do ângulo + hook, chars/120), **descrição** (por aquisição: orgânico = cauda longa, ads = keywords nas 2 primeiras linhas, afiliado = ganchos de vídeo curto), **capa** (estilo + brief + imagem a partir da foto real), **benchmark** (preço vs. mediana, IDs de concorrentes citados e verificados), **aquisição**, **memória usada** (regras aplicadas ou hipótese) | **CODE** (Zod: eixos fixos e IDs de concorrentes reais) |
| 7 | **Run performance-analyst** (~55s) | Diff do playbook: confirma 4 regras e aposenta 3 que vinham de dados simulados, citando `enoughData=false`. Dry-run: não commita | **FACTORY** + **CLAUDE Opus** |
| 8 | **Case study → Learning loop** | A prova longitudinal: r1 → r2, o dado real inverteu regras, `git log memory/` | — |

## Frases para cada sponsor

- **Apify:** "Toda rodada começa com um run real do actor. O ID está na tela. Sem a Apify, o droid não tem o que citar, e o Zod rejeita um benchmark com concorrente inventado."
- **Factory:** "O conductor é uma sessão do Droid SDK. Cada variante é um custom droid em processo próprio, e os de uma rodada rodam em paralelo. Os IDs de sessão e os créditos aparecem por variante. Já rodamos 44 sessões neste repo."
- **Anthropic:** "O Claude escreve o anúncio, gera a capa a partir da foto real e, no Opus, decide o que vira regra, com evidência. Quando não há dado suficiente, ele diz 'inconclusivo'."
- **Figma:** "Design-time: o guia, o wireframe e as telas foram desenhados no Figma e serviram de spec para esta UI. O Figma não roda no pipeline."

## Custos e limites

- Cada rodada usa 1 sessão por variante, e o analyst usa 1. Teto de 80 em `runs/budget.json`.
- Só um job por vez. Um segundo clique recebe 409 com mensagem clara.
- Nada é publicado na Shopee.

## Se algo falhar

| Sintoma | O que fazer |
| --- | --- |
| Apify vazio | Ele tenta de novo e depois usa o cache da rodada anterior da campanha (o stage avisa). No primeiro uso não há cache, então a rodada segue sem intel. |
| Variante reprovada no Zod | O card mostra o motivo. Apresente como feature. |
| Droid travado | Corte em 4 min, e o job sempre termina. Mostre a outra variante. |
| Sem Wi-Fi ou Factory fora | O Engine terminal e o Lab reproduzem o último run real gravado (`/lab?job=<id>`). |
| Plano B total | O link do Vercel (replay) e o vídeo de backup. |
