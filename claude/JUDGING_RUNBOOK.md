# Roteiro da mesa de julgamento (Cal Hacks 13)

## Antes do jurado chegar (2 min)

```sh
cd app
LISTING_LOOP_LIVE=1 npm run dev     # http://localhost:3000
```

Confira na sidebar o box **Engine status**: Mode = Live (droids armed), Factory sessions `x / 80`, versão do droid CLI.
Se o CLI aparecer como "—": rode `droid --version` no terminal. Se a sessão Factory expirou, refaça o login.

## O que o jurado faz (≈ 4 min)

1. **Overview (`/`), 30s.** "Mapeamos a UX para o pequeno vendedor, mas esta página é para vocês: a arquitetura." Mostre o diagrama, os dois droids lidos de `.factory/droids/` e a seção *Built with*.
2. **Live Lab (`/lab`).** O jurado escolhe um produto: **Prefill example** ou o dele (foto do celular). O canal é sempre **Shopee Brasil** (Apify ~10s, anúncio em pt-BR, análise em inglês). Outros marketplaces entram só no pitch de escala.
   Deixe **2 variantes** e clique em **Run droids**: ~2 min no total.
   - Enquanto roda: o stepper (Apify → intel → plano Thompson → producers em paralelo → Zod), o plano com explore/exploit e um terminal por droid. O stream mostra `Task → listing-producer`, os arquivos gravados e um aviso "still working" a cada 15s.
   - Os cards aparecem com a capa gerada a partir da foto real, título, descrição e benchmark com IDs reais de concorrentes.
3. **Run performance-analyst (Opus 5.5)**, ~50s. Como não existem vendas de um anúncio criado agora, ele roda sobre os 14 anúncios reais da DNT, em dry-run. O diff aparece com add/update/retire/inconclusive e evidência (n, μ, IC90, P(melhor)). Na última execução ele aposentou as regras que vinham dos dados simulados da r1.
4. **Campaigns → campanha nova**: rodadas, aprovar/rejeitar e **Plan next round live**, que mostra a campanha como trabalho de longo prazo.
5. **Case study → Learning loop (`/aprendizado`)**: a prova com dado real. Na r2 a memória inverteu regras da r1, com `git log memory/`.

## Custos e limites

- Cada rodada usa 1 sessão Factory por variante (2 por padrão). O analyst usa 1. O teto está em `runs/budget.json` (cap 80), que o código respeita (`src/budget.ts`).
- Só **um job por vez**. Um segundo clique recebe 409 com mensagem clara.
- Nada é publicado em marketplace nenhum.

## Se algo falhar

| Sintoma | O que fazer |
| --- | --- |
| Apify deu erro | A rodada continua sem intel (o stage fica vermelho e explica). É só seguir. |
| Uma variante falhou na validação | O card mostra o motivo (é o Zod funcionando). Mostre isso como feature. |
| Wi-Fi caiu / Factory fora | Abra `/lab?job=round-mvnlndri` (ou o último job em `runs/jobs/`): replay do run real gravado. |
| Servidor travou | Ctrl+C, rode `LISTING_LOOP_LIVE=1 npm run dev` de novo e reanexe com `/lab?job=<id>`. |
| Plano B total | O link do Vercel (modo replay) e o vídeo de backup. |

## Deploy replay (Vercel)

```sh
cd app && npm run snapshot && npm run build
```

O snapshot copia `runs/r1`, `runs/r2`, `runs/campaigns`, `runs/jobs` (sem `stdout.log`), `.factory/droids` e `memory`.
No Vercel, o Lab reproduz o job real mais recente, os botões pagos ficam desativados e a API responde 403.
