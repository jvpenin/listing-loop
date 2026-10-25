# Playbook — tops na Shopee

Versão 1 · atualizado em 2026-10-25T06:37:18.343Z. Gerado por src/memory.ts a partir de memory/playbook.json.

Última rodada (r1): Na rodada r1, os melhores resultados de lucro vieram de casual, solo_grade e orgânico, enquanto academia, solo_linha e ads ficaram abaixo dos demais; todas as regras têm confiança baixa por causa de confundidores. A base tem 12 de 15 anúncios simulados, então estas regras precisam ser confirmadas com dados reais.

## Regras

| id | regra | métrica | evidência | confiança |
| --- | --- | --- | --- | --- |
| angulo-academia-profit | angulo=academia: Evitar o ângulo academia como padrão, pois teve lucro por mil impressões bem abaixo dos demais ângulos apesar do CTR maior. | profitPer1kImpr | n=8, μ=0.875, IC90 [-0.260, 1.99], P(melhor)=0.05 | low |
| angulo-casual-profit | angulo=casual: Priorizar o ângulo casual, que entregou maior lucro por mil impressões que os demais ângulos. | profitPer1kImpr | n=4, μ=3.66, IC90 [0.733, 6.22], P(melhor)=0.93 | low |
| aquisicao-ads-profit | aquisicao=ads: Evitar depender de ads como aquisição principal, pois o lucro por mil impressões ficou bem abaixo dos demais canais. | profitPer1kImpr | n=8, μ=0.946, IC90 [0.024, 1.86], P(melhor)=0.09 | low |
| aquisicao-organico-profit | aquisicao=organico: Priorizar a aquisição orgânica, que teve o maior lucro por mil impressões entre os canais de aquisição. | profitPer1kImpr | n=5, μ=3.58, IC90 [1.65, 5.52], P(melhor)=0.98 | low |
| capa-solo_grade-profit | capa=solo_grade: Priorizar a capa solo_grade, que teve maior lucro por mil impressões e a melhor conversão paga entre as capas. | profitPer1kImpr | n=5, μ=3.17, IC90 [2.05, 4.30], P(melhor)=0.97 | low |
| capa-solo_linha-profit | capa=solo_linha: Evitar a capa solo_linha, que atrai cliques e carrinhos mas teve lucro por mil impressões negativo. | profitPer1kImpr | n=5, μ=-0.466, IC90 [-1.32, 0.330], P(melhor)=0.00 | low |

## Inconclusivos (seguir explorando)

- angulo=conforto: seguir explorando: nenhum anúncio testado nesta rodada.
- angulo=presente: seguir explorando: nenhum anúncio testado nesta rodada.
- angulo=neutro: fora do experimento
- capa=modelo: seguir explorando: pBetter de lucro 0,792 ficou abaixo do limite de 0,8.
- capa=uso: seguir explorando: nenhum anúncio testado nesta rodada.
- aquisicao=afiliado: seguir explorando: n=2 é menor que minListings (enoughData false).
