# Playbook — tops na Shopee

Versão 2 · atualizado em 2026-10-25T07:38:24.156Z. Gerado por src/memory.ts a partir de memory/playbook.json.

Última rodada (r2): Com 14 anúncios reais e sem confundidores, r2 inverte três regras de r1: academia e capa solo_linha passam a ser priorizadas, casual passa a ser evitado, e a capa modelo entra como regra de evitar. O lucro é antes do gasto com ADS, e casual e modelo se sobrepõem em três anúncios, então convém testar esses eixos de forma independente.

## Regras

| id | regra | métrica | evidência | confiança |
| --- | --- | --- | --- | --- |
| angulo-academia-profit | angulo=academia: Priorizar o ângulo academia, que teve lucro por mil impressões maior que o ângulo casual, com CTR, carrinho e conversão paga também melhores. | profitPer1kImpr | n=11, μ=7.65, IC90 [6.81, 8.50], P(melhor)=0.97 | high |
| angulo-casual-profit | angulo=casual: Evitar o ângulo casual como padrão, pois teve lucro por mil impressões abaixo do ângulo academia e funil pior em todas as etapas. | profitPer1kImpr | n=3, μ=5.59, IC90 [4.24, 6.94], P(melhor)=0.03 | medium |
| aquisicao-ads-profit | aquisicao=ads: Evitar depender de ads como aquisição principal, pois o lucro por mil impressões ficou bem abaixo dos demais canais. | profitPer1kImpr | n=8, μ=0.946, IC90 [0.024, 1.86], P(melhor)=0.09 | low |
| aquisicao-organico-profit | aquisicao=organico: Priorizar a aquisição orgânica, que teve o maior lucro por mil impressões entre os canais de aquisição. | profitPer1kImpr | n=5, μ=3.58, IC90 [1.65, 5.52], P(melhor)=0.98 | low |
| capa-modelo-profit | capa=modelo: Evitar a capa modelo, que teve lucro por mil impressões bem abaixo das demais capas e o pior funil em todas as etapas. | profitPer1kImpr | n=4, μ=5.53, IC90 [4.47, 6.80], P(melhor)=0.00 | medium |
| capa-solo_grade-profit | capa=solo_grade: Priorizar a capa solo_grade, que teve maior lucro por mil impressões e a melhor conversão paga entre as capas. | profitPer1kImpr | n=5, μ=3.17, IC90 [2.05, 4.30], P(melhor)=0.97 | low |
| capa-solo_linha-profit | capa=solo_linha: Priorizar a capa solo_linha, que teve o maior lucro por mil impressões entre as capas, com carrinho e conversão paga também melhores. | profitPer1kImpr | n=5, μ=8.76, IC90 [8.00, 9.80], P(melhor)=1.00 | medium |

## Inconclusivos (seguir explorando)

- angulo=conforto: seguir explorando: nenhum anúncio com este ângulo nesta rodada.
- angulo=presente: seguir explorando: nenhum anúncio com este ângulo nesta rodada.
- capa=solo_grade: seguir explorando: só 1 anúncio (enoughData falso); a regra capa-solo_grade-profit de r1 fica como está, sem nova evidência.
- capa=uso: seguir explorando: nenhum anúncio com esta capa nesta rodada.
- capa=sem_capa: fora do experimento
- aquisicao=ads: seguir explorando: todos os 14 anúncios rodam ADS, então o eixo não varia, não há métricas e o lucro não desconta o gasto com ADS; a regra aquisicao-ads-profit de r1 fica como está.
- aquisicao=organico: seguir explorando: nenhum anúncio orgânico nesta rodada; a regra aquisicao-organico-profit de r1 fica como está.
- aquisicao=afiliado: seguir explorando: nenhum anúncio com afiliado nesta rodada.
