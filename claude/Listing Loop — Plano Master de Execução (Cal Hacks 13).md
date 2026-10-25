# Listing Loop — Plano Master de Execução (Cal Hacks 13)

Oct 24, 2026 · @João Caldeira

## Como usar este plano

O Listing Loop entrega, até domingo 8h30, um ciclo completo na Shopee DNT: foto + custo viram 12 anúncios diferenciados, e o histórico real da loja ensina a próxima rodada. As fases estão em ordem cronológica, e cada uma termina com algo que funciona sozinho. O foco é só Shopee. Mercado Livre, TikTok Shop e outras lojas entram no pitch como escala, não no código.

**Legenda**

- **\[FAÇA\]**: passos para executar agora, em ordem.
- **\[ENTENDA\]**: o conceito por trás do passo, em linguagem simples, para você saber o que está construindo.
- **\[LEIA QUANDO\]**: material de referência e o momento certo de abrir.
- **\[CHECKPOINT\]**: pare aqui e me envie o que está pedido. A fase seguinte já está escrita, mas eu ajusto os detalhes com o seu resultado antes de você executá-la.
- **\[SE FALHAR\]**: o plano B, para não travar.

**As três ideias que guiam tudo**

1. **O Factory é o motor, não só a IDE.** Os dois agentes do produto são custom droids, e um *conductor* (via Droid SDK) os aciona. A Factory pediu exatamente isso.
2. **Os agentes conversam por arquivos.** Cada agente lê e escreve arquivos JSON numa pasta da rodada. O código valida tudo. Isso torna o sistema auditável e fácil de depurar às 2h da manhã.
3. **A matemática fica no código, o julgamento fica no agente.** Estatística é calculada em TypeScript. O agente interpreta, decide e explica.

A visão geral desenhada do sistema e do cronograma está no fim desta seção.

&#91;embedded content: arquitetura · o loop de uma rodada\]

O conductor e os dois droids rodam no Factory. `plan.ts`, `stats.ts` e `memory.ts` são código seu, que planeja, calcula e valida.

&#91;embedded content: cronograma · 9 fases, 7 checkpoints\]

Cada losango é um checkpoint: a fase seguinte já está escrita, mas eu ajusto com o seu resultado antes de você executá-la.

## Fase 0 — Setup (17h45–18h05)

Ao fim desta fase você tem o repo criado, o Droid rodando pelo SDK e a lista exata dos modelos disponíveis.

**\[FAÇA\]**

1. Preencha o [formulário de créditos da Factory](https://docs.google.com/forms/d/e/1FAIpQLSd90bta_Gj7szptt1sprHlO2mz_t-ZGeXHWO0e-p_rcuh2fgQ/viewform). Os créditos pagam cada chamada de agente.
2. Instale o CLI: `curl -fsSL https://app.factory.ai/cli | sh`. Depois confirme com `droid --version`.
3. Crie o projeto: `mkdir listing-loop && cd listing-loop && git init && npm init -y`.
4. Instale as dependências: `npm install @factory/droid-sdk zod apify-client p-limit` e `npm install -D tsx typescript @types/node`.
5. Crie a chave em app.factory.ai/settings/api-keys. Depois crie você mesmo, na raiz do repo, dois arquivos de texto que um projeto novo ainda não tem: .env (guarda as chaves, nunca vai para o GitHub) e .gitignore (lista o que o git deve ignorar). Coloque `FACTORY_API_KEY=...` e `APIFY_TOKEN=...` num `.env`, e adicione `.env` ao `.gitignore` antes do primeiro commit.
6. Rode o descobridor de modelos (copie `examples/node/model-discovery.ts` do [repo do SDK](https://github.com/Factory-AI/droid-sdk-typescript)). Anote os IDs exatos de Opus 5.5, Sonnet 5.5 e Haiku 5.5.
7. Crie as pastas: `.factory/droids/`, `src/`, `memory/`, `data/`, `runs/`.
8. Primeiro commit.

**\[ENTENDA\] O que é o Droid SDK.** É uma biblioteca TypeScript que deixa o seu código conversar com o Droid como se fosse uma função. Por baixo, o SDK abre o programa `droid` como um subprocesso e troca mensagens com ele. Por isso o CLI precisa estar instalado: sem ele, o SDK não tem o que abrir.

**\[ENTENDA\] Por que o ID exato do modelo importa.** O nome que você vê no seletor ("Opus 5.5") é um rótulo. O arquivo de cada droid precisa do identificador técnico. Um ID errado faz o droid cair no modelo padrão, e você só percebe pelo custo ou pela qualidade.

**\[LEIA QUANDO\]** algo do SDK não se comportar como esperado: a [referência do SDK](https://github.com/Factory-AI/droid-sdk-typescript/blob/main/docs/typescript-sdk-reference.md), seções "One-shot runs", "Sessions" e "Structured output".

**\[CHECKPOINT 0\]** Me envie a lista de IDs dos modelos. Eu coloco os IDs certos nos arquivos dos droids (Anexo A).

## Fase 1 — Spike: droids e imagem pelo SDK (18h05–18h40)

Esta fase responde uma pergunta só: o seu código consegue acionar os custom droids em paralelo, no modelo certo, e eles escrevem arquivo e geram imagem? Tudo o que vem depois depende de um "sim".

**\[ENTENDA\] O que é um spike.** É um teste descartável, feito antes de construir, para provar que a peça mais arriscada funciona. Se ela falhar, você descobre às 18h40 e não às 2h, quando não há mais tempo para outro caminho.

**\[ENTENDA\] Custom droid, subagente e Task.** Um *custom droid* é um agente especializado definido num arquivo Markdown em `.factory/droids/`. O topo do arquivo (*frontmatter*) diz o nome, o modelo e as ferramentas que ele pode usar. O corpo é o *system prompt*, ou seja, as instruções fixas dele. Ele não roda sozinho: uma sessão principal o chama pela ferramenta **Task**, e aí ele vira um *subagente*. O subagente trabalha num contexto limpo, sem ver a conversa da sessão principal. Ele não pode fazer perguntas nem chamar outros subagentes: termina a tarefa e reporta.

**\[ENTENDA\] O conductor.** É a sessão principal que o seu código abre com `createSession()` do SDK, apontando `cwd` para a raiz do repo (assim ela enxerga `.factory/droids/`). O papel dele é só distribuir trabalho: "rode o listing-producer na variante 3", "rode o performance-analyst nesta rodada". Por isso pode usar um modelo barato.

**\[FAÇA\]**

1. Crie `.factory/droids/listing-producer.md` com a versão de teste: copie o Anexo A, mas troque o corpo por "Write the file runs/spike/\<variantId>.json containing {variantId, title}. Then generate one product cover image and save it as runs/spike/\<variantId>.png".
2. Crie `spike.ts`. Ele abre um `createSession({ cwd: <raiz do repo>, modelId: 'claude-haiku-5-5' })` e manda um único prompt: "Use the subagent listing-producer for variantIds v1, v2, v3 and v4, all in background, in parallel. Wait for all of them, then reply DONE".
3. Rode com `npx tsx spike.ts` e cronometre.
4. Verifique os cinco pontos abaixo.

| # | O que verificar | Como ver |
| --- | --- | --- |
| 1 | A sessão do SDK achou o droid | O stream mostra uma chamada Task com `listing-producer` |
| 2 | Os quatro rodaram em paralelo | O tempo total é bem menor que 4× o tempo de um |
| 3 | O modelo do frontmatter foi usado | Metadados da sessão ou o painel de uso da Factory |
| 4 | Os arquivos JSON apareceram | `ls runs/spike/` |
| 5 | A imagem foi gerada dentro do droid | O `.png` existe e abre |

**\[SE FALHAR\]**

- **Pontos 1 ou 2 falharam:** o código passa a fazer a distribuição. Ele lê o corpo do `.md` do droid e chama `run()` uma vez por variante, com `p-limit(4)` para limitar a 4 ao mesmo tempo. O arquivo do droid continua sendo a fonte única do prompt, então a história "o Factory é o motor" se mantém.
- **Ponto 5 falhou dentro do subagente** (mas funcionou na sua sessão manual): a imagem passa para o conductor, numa segunda etapa que lê o `imagePrompt` de cada JSON.

**\[CHECKPOINT 1\]** Me envie:

- os cinco pontos marcados como ok ou falhou;
- o tempo total do spike;
- **como você gerou a imagem no Factory**: qual modelo ou ferramenta apareceu no stream, se aceitou a foto real como referência, e onde o arquivo foi salvo.

Com isso eu fecho a versão final do prompt do producer e da etapa de capa da Fase 4.

## Fase 2 — Dados: histórico DNT e concorrentes (18h40–19h20)

Ao fim desta fase você tem dois arquivos: `data/history/dnt_tops.csv` (o seu histórico, limpo e etiquetado) e `data/competitors/*.json` (os concorrentes por ângulo, rodando em background enquanto você faz o Figma).

### 2A. Histórico da DNT

**\[ENTENDA\] O funil do anúncio.** Cada anúncio passa por quatro portas: ser visto (impressão), ser clicado (visita), ir para o carrinho, e virar pedido pago. Cada eixo do seu experimento age numa porta diferente. Capa e título decidem o clique. Preço, kit e oferta decidem o carrinho e o pedido. Medir por porta é o que permite dizer *por que* um anúncio venceu.

**\[ENTENDA\] Confundidor.** É algo que muda o resultado mas não é o que você está testando. Exemplo: o anúncio A vendeu mais, mas estava numa flash sale e o B estava sem estoque. Se você não registrar isso, o sistema vai "aprender" que o título do A é melhor, quando na verdade foi a promoção.

**\[FAÇA\]**

1. Exporte do Seller Center da DNT o desempenho por produto de uma janela fixa (sugestão: últimos 60 dias). Use a mesma janela para todos os anúncios.
2. Filtre só tops (curva A).
3. Remova anúncios com menos de 14 dias de vida na janela ou com menos de 100 visitantes. Com menos que isso, o número é ruído.
4. Garanta estas colunas por anúncio:

| Grupo | Colunas | Para que serve |
| --- | --- | --- |
| Identificação | item ID, SKU/kit, título, URL da imagem de capa, data de criação | Etiquetar os eixos |
| Topo do funil | impressões, visitantes (ou cliques), CTR | Testa capa e título |
| Meio do funil | adições ao carrinho, taxa visita → carrinho | Testa preço, kit e oferta |
| Fundo do funil | pedidos pagos, unidades, vendas (R$), conversão visita → pedido pago | O resultado |
| Economia | preço médio praticado, desconto, gasto e ROAS de Ads, vendas via afiliado | O eixo aquisição e a margem |
| Confundidores | dias sem estoque, participação em flash sale ou campanha, nota, nº de avaliações | Separar sinal de ruído |

5. Some o custo de cada SKU/kit (da Plataforma DNT) para calcular a margem por pedido.

**\[ENTENDA\] A métrica principal: lucro por 1.000 impressões.** É o lucro total do anúncio dividido pelas impressões, vezes 1.000. Junta em um número a capa e o título (que trazem cliques), o preço (que define a margem) e a conversão. É a métrica que um dono de loja entende de primeira, e é ela que o dashboard destaca.

### 2B. Etiquetagem dos eixos

Cada anúncio histórico precisa de uma etiqueta por eixo. Na Shopee, os eixos são:

| Eixo | Valores |
| --- | --- |
| Ângulo | academia, casual, conforto, presente |
| Capa | modelo, produto solo, em uso |
| Aquisição | orgânico, Ads, afiliado (15%) |
| Oferta | kit 1, 2, 3 ou 4; tipo de promoção |

O ângulo sai do título, e a capa sai da imagem. Os dois podem ser etiquetados por um droid com visão (passe a URL da capa) e conferidos por você em 10 minutos. A aquisição e a oferta você já sabe de cabeça.

### 2C. Concorrentes via Apify (roda em background)

**\[ENTENDA\] Actor e dataset.** Um *actor* da Apify é um robô de coleta pronto, que roda na nuvem deles e já lida com proxy e bloqueios. Você passa uma entrada (ex.: "top cropped academia") e ele grava os resultados num *dataset*, uma tabela que você baixa como JSON.

**\[FAÇA\]**

1. Teste `axery/shopee-scraper` com 20 resultados para "top cropped academia". Se vier vazio ou falso, teste `ione_labs/shopee-products-scraper`.
2. Escreva `src/intel.ts`: para cada ângulo, roda o actor, salva em `data/competitors/<angulo>.json`, e extrai padrões (palavras mais frequentes no título, faixa de preço, kit mais comum, vendas).
3. Dispare para os quatro ângulos e siga para a Fase 3 enquanto roda.

**\[SE FALHAR\]** Os dois actors falharam: use só o histórico da DNT para gerar. A Apify continua na demo pela busca de um ângulo, rodada antes e salva em cache.

**\[CHECKPOINT 2\]** Me envie os **nomes das colunas** do export e **uma linha de exemplo** (pode trocar os números). Eu devolvo o mapeamento coluna → métrica e o `src/stats.ts` da Fase 5 já adaptado ao seu arquivo.

## Fase 3 — Figma: do mapa ao mockup (19h20–20h30)

Ao fim desta fase você tem o mapa do loop no FigJam e as três telas em alta fidelidade, montadas com variáveis e componentes que o Droid vai transformar em código na Fase 6. Para a track do Figma, o argumento é este: **o Figma fica no meio do pipeline**. Ele define a interface e o vocabulário visual do experimento, e o código nasce dele.

**\[ENTENDA\] Variáveis e componentes.** Uma *variável* é um valor nomeado (uma cor, um espaçamento, um tamanho de fonte) usado em todo o design. Mudou a variável, mudou tudo. Um *componente* é um elemento reutilizável, e as *propriedades de variante* dele são as versões que ele pode assumir. Exemplo: um card com a propriedade `capa` que pode valer `modelo`, `solo` ou `uso`. Quando o Droid lê o Figma, ele recebe esses nomes e os transforma direto em tokens do Tailwind e em props de componentes React.

**\[ENTENDA\] MCP.** O *Model Context Protocol* é um jeito padrão de plugar uma ferramenta externa num agente. Com o MCP do Figma conectado, o Droid consegue "abrir" um frame seu e ler estrutura, variáveis e componentes, em vez de adivinhar por um print.

**\[FAÇA\]** Grave a tela durante os passos 3 e 4. O vídeo é a prova de uso para os jurados do Figma.

1. **FigJam (15 min):** desenhe o loop (Gerar → Revisar → Medir → Aprender → Gerar) e o fluxo do vendedor. Esse quadro vira o diagrama do README e um slide do pitch.
2. **Wireframes em baixa fidelidade (20 min)**, três telas:
   - **Novo lançamento:** foto do produto, custo, margem mínima e máxima, ângulos a testar, botão "Gerar rodada".
   - **Portfólio de variantes:** 12 cards, cada um com capa, título, etiquetas de eixo e o "por quê" (regras aplicadas ou hipótese). Um selo diz "explorando" ou "aproveitando". Os cards aparecem conforme os droids terminam. Cada card tem aprovar e rejeitar, e há um botão "Exportar para Upseller".
   - **Aprendizado:** lucro por 1.000 impressões por valor de eixo, com a faixa de incerteza, o diff da memória desta rodada, e a linha do tempo de commits do playbook.
3. **Mockup em alta fidelidade (35 min):** crie as variáveis primeiro (cores, espaçamento, raio, tipografia). Depois crie o componente **Card de variante**, com propriedades de variante iguais aos eixos (`angulo`, `capa`, `aquisicao`, `modo=explorar|aproveitar`). Monte as três telas usando só esses componentes.
4. **Conecte o MCP do Figma ao Droid** e teste com um frame: "leia o frame Card de variante e liste variáveis e propriedades". O uso de verdade fica para a Fase 6.

**\[LEIA QUANDO\]** for conectar o MCP do Figma ao Droid: a documentação de MCP do Factory (o mesmo menu onde você adiciona qualquer servidor MCP) e a página do servidor MCP do Figma.

**Upgrade opcional (só se as Fases 4 e 5 estiverem adiantadas):** um componente **Selo de capa** com variantes ("Kit 4", "Frete grátis", "Academia"). Na Fase 6, o Droid gera a partir dele os overlays que o app aplica sobre a capa gerada. O eixo "capa" do experimento passa a ser definido no Figma.

**\[SE FALHAR\]** Se o MCP do Figma não conectar, exporte os frames como PNG e passe as imagens ao Droid, junto com a lista de variáveis copiada à mão. O vídeo do processo continua valendo para a track.

## Fase 4 — Gerar: 12 variantes com capa (20h30–23h00)

Ao fim desta fase, um comando (`npx tsx src/round.ts --product top-cropped`) produz uma rodada real em `runs/r1/`: 12 JSONs de anúncio validados e 12 capas. O detalhe final do prompt do producer depende do Checkpoint 1.

### Como a rodada é montada

1. **`src/plan.ts` monta a matriz.** Combina os valores dos quatro eixos (ângulo × capa × aquisição × oferta) e gera todas as combinações possíveis.
2. **Filtro de compliance.** Remove as combinações que deixariam duas variantes com a mesma capa e o mesmo ângulo de título. A Shopee trata anúncio duplicado como spam, com pontos de penalidade.
3. **Escolha das 12 por Thompson sampling.** Detalhe no \[ENTENDA\] abaixo.
4. **`plan.json`.** O plano é gravado em `runs/r1/plan.json`, com uma linha por variante, seus eixos e se ela está "explorando" ou "aproveitando".
5. **Fan-out pelo código (validado no spike).** O código faz `Promise.all` de uma chamada `run()` por variante, com limite de 4 ao mesmo tempo (`p-limit`). Cada chamada abre um conductor em `claude-haiku-5-5`, que delega ao `listing-producer` em primeiro plano ("WAIT until it finishes, do not run it in background") e espera ele terminar. Use `AutonomyLevel.High`, `AbortSignal.timeout(180_000)` e nunca polling de arquivos. A foto real do produto vai em `data/product/photo.jpg` e é a referência da capa.
6. **Validação.** Cada `runs/r1/variants/<id>.json` passa pelo schema Zod. Um arquivo inválido é refeito uma vez. Se falhar de novo, a variante sai da rodada com o erro registrado.

**\[ENTENDA\] Explorar ou aproveitar.** Todo sistema que aprende enfrenta esse dilema. *Aproveitar* é repetir o que a memória diz que vence. *Explorar* é testar algo de que ainda se sabe pouco. Só aproveitar faz você ficar preso num "vencedor" que talvez fosse sorte. Só explorar desperdiça vendas. A meta da rodada é por volta de 70% aproveitando e 30% explorando.

**\[ENTENDA\] Thompson sampling.** É o jeito mais simples de equilibrar explorar e aproveitar sem escolher uma porcentagem na mão. Para cada valor de eixo (ex.: capa = modelo), o sistema guarda uma "faixa de crença" sobre a taxa de conversão. Pouco dado deixa a faixa larga, e muito dado deixa a faixa estreita. A cada escolha, ele sorteia um número dentro de cada faixa e fica com o maior. Uma opção pouco testada tem faixa larga, então às vezes sorteia alto e ganha uma chance. Uma opção comprovada sorteia alto quase sempre. A exploração acontece sozinha, na medida da incerteza.

**\[ENTENDA\] Saída estruturada e Zod.** O Zod descreve em código o formato exato de um objeto, por exemplo: "um título é texto, `axes.capa` é um destes três valores". O producer recebe esse formato no prompt e deve escrever um JSON que obedeça. O seu código confere com `Listing.parse()` antes de aceitar. É o que impede uma resposta criativa demais de quebrar a interface.

### O que cada variante contém

| Campo | Conteúdo |
| --- | --- |
| `variantId`, `axes` | Identidade e os quatro eixos (fixados pelo plano, o droid não muda) |
| `title` | Título com a palavra-chave do ângulo no começo, dentro do limite da Shopee |
| `description` | Descrição completa |
| `keywords` | Palavras-chave, com base nos concorrentes do ângulo |
| `coverBrief`, cover | O que a capa mostra e a imagem gerada, sempre a partir da foto real do produto |
| `appliedRules` | IDs das regras do playbook que ele usou |
| `hypothesis` | Quando explora: o que ele espera descobrir |

Confirme no Seller Center os limites atuais de título e descrição e coloque-os em `src/config.ts`. O validador usa esses números.

**\[ENTENDA\] Por que a capa parte da foto real.** Em moda, uma capa com uma peça inventada é inutilizável: é propaganda enganosa, e você nunca publicaria. A geração muda cenário, modelo, enquadramento e selos, mas a peça precisa ser a sua.

**\[FAÇA\]**

1. Escreva `src/schemas.ts` (Listing, Plan, MemoryDiff).
2. Escreva `src/plan.ts` com a matriz, o filtro de compliance e o Thompson sampling. Na primeira rodada, as crenças vêm do histórico da Fase 2.
3. Coloque o prompt final do producer (Anexo A, ajustado após o Checkpoint 1).
4. Escreva `src/round.ts`: plan → conductor → validação → `runs/r1/summary.json`.
5. Rode com o top cropped real. Leia os 12 resultados de olho crítico de vendedor.

**\[CHECKPOINT 3\]** Me envie **duas variantes** (o JSON e a capa): a melhor e a pior da rodada. Eu ajusto o prompt do producer e as regras de compliance antes da rodada 2. Pode seguir para a Fase 5 enquanto eu reviso.

## Fase 5 — Aprender: stats, analyst e memória (23h00–01h00)

Ao fim desta fase, o sistema lê o histórico, calcula o desempenho por eixo, o `performance-analyst` propõe mudanças no playbook, e a rodada 2 sai com uma alocação diferente da rodada 1. Esse "antes e depois" é o coração da demo.

### O fluxo

1. **`src/stats.ts`** lê `data/history/dnt_tops.csv` e calcula, para cada valor de cada eixo: CTR, taxa visita → carrinho, conversão paga e lucro por 1.000 impressões. Para cada uma, calcula a média estimada, a faixa de 90% e a probabilidade de ser melhor que a referência. Grava em `runs/r1/stats.json`.
2. **O conductor aciona o `performance-analyst`.** Ele lê `stats.json` e `memory/playbook.json` e escreve `runs/r1/memory-diff.json`.
3. **`src/memory.ts`** valida o diff com Zod, aplica as mudanças no `playbook.json`, regenera o `PLAYBOOK.md` legível e faz um `git commit` com a mensagem "learn: r1" e o resumo do analyst.
4. **Rodada 2:** `plan.ts` roda de novo com o playbook atualizado. A distribuição das 12 variantes muda.

**\[ENTENDA\] Beta-Binomial, em português.** Uma taxa de conversão é sempre "sucessos sobre tentativas": pedidos sobre visitas, cliques sobre impressões. A distribuição Beta é a forma matemática de dizer "acho que a taxa está por aqui, com esta certeza". Você começa com Beta(1, 1), que quer dizer "não sei nada". A cada visita, soma 1 em sucesso ou em fracasso. Com 3 pedidos em 100 visitas, a crença é Beta(4, 98): centrada perto de 3%, mas larga. Com 300 em 10.000, fica centrada no mesmo lugar, só que estreita. São duas linhas de código, e é exatamente o que o Thompson sampling da Fase 4 sorteia.

**\[ENTENDA\] Faixa de 90% e P(melhor).** A *faixa de 90%* (intervalo de credibilidade) diz: "com 90% de chance, a taxa verdadeira está entre X e Y". A *P(melhor)* responde: "qual a chance de capa = modelo ser melhor que capa = solo?". Calcula-se sorteando 10.000 vezes de cada Beta e contando quantas vezes um ganha. Se der 0,85, existe 85% de chance de ser melhor. A regra do analyst: só vira regra no playbook com P ≥ 0,8 e volume mínimo. Abaixo disso, o eixo é marcado como "inconclusivo, seguir explorando".

**\[ENTENDA\] Por que dizer "inconclusivo" vale ponto.** Com pouco tráfego, a maioria das comparações não fecha. Um sistema que admite isso, em vez de inventar um vencedor, é o que um jurado técnico procura. Também é a resposta pronta para "e com pouco tráfego?", a pergunta que quase certamente vem.

**\[ENTENDA\] A memória como arquivo versionado.** O `playbook.json` é a memória de longo prazo: uma lista de regras do tipo "em tops na Shopee, capa com modelo aumenta o CTR", cada uma com evidência e confiança. Como ele vive no git, cada aprendizado é um commit. `git log memory/` mostra a história do que o sistema aprendeu, e `git diff` mostra o que mudou nesta rodada. Na demo, isso é mostrado ao vivo.

**\[ENTENDA\] Por que agregar entre anúncios.** Um anúncio sozinho tem pouco dado. Agrupando todos os anúncios com capa = modelo, o sistema junta as visitas de vários anúncios e a faixa estreita bem mais rápido. É assim que uma loja pequena aprende alguma coisa.

**\[FAÇA\]**

1. Escreva `src/stats.ts` (eu entrego a versão adaptada às suas colunas no retorno do Checkpoint 2).
2. Crie `.factory/droids/performance-analyst.md` (Anexo A).
3. Escreva `src/memory.ts`: validar, aplicar, regenerar o `PLAYBOOK.md` e commitar.
4. Crie a semente `memory/playbook.json` com `{ "version": 0, "rules": [] }`.
5. Rode `src/learn.ts` (stats → analyst → memória) e depois a rodada 2.
6. Compare `runs/r1/plan.json` com `runs/r2/plan.json`. A diferença precisa ser visível e explicável numa frase.

**\[CHECKPOINT 4\]** Me envie o `stats.json` (pode ser só um eixo), o `memory-diff.json` e a comparação r1 → r2. Eu reviso se as conclusões batem com os números. Uma regra errada na demo é o tipo de coisa que um jurado pega.

## Fase 6 — Front via Figma + Droid e export Upseller (01h00–03h00)

Ao fim desta fase, o vendedor faz tudo pelo navegador: cria a rodada, vê os droids trabalhando, aprova as variantes, baixa a planilha do Upseller e vê o aprendizado. Às 3h00 entra o **code freeze**.

**\[ENTENDA\] Code freeze.** É o momento em que você para de adicionar funcionalidades e só corrige bugs. Tudo o que não estiver pronto às 3h00 vira "próximo passo" no pitch. Uma funcionalidade nova às 4h é a principal causa de demo quebrada.

### 6A. Front a partir do Figma

**\[FAÇA\]**

1. Crie o app: `npx create-next-app@latest app --ts --tailwind --app`.
2. Com o MCP do Figma conectado, peça ao Droid (no Factory Desktop):
   - "Leia as variáveis do arquivo Listing Loop e gere `tailwind` tokens com os mesmos nomes";
   - "Gere o componente React `VariantCard` a partir do componente Card de variante, com uma prop por propriedade de variante";
   - "Monte as telas Novo lançamento, Portfólio e Aprendizado usando só esses componentes".
3. Crie as rotas de API do Next.js que chamam o seu código da Fase 4 e 5:
   - `POST /api/round` dispara uma rodada;
   - `GET /api/round/[id]/stream` envia o progresso dos droids para a tela;
   - `POST /api/variant/[id]/approve` marca a aprovação humana;
   - `GET /api/round/[id]/export` gera a planilha.
4. Na tela Portfólio, os cards começam como "gerando" e se preenchem conforme cada `runs/<r>/variants/<id>.json` aparece.
5. Na tela Aprendizado, mostre o lucro por 1.000 impressões por valor de eixo com a faixa de 90%, o diff da memória e o `git log` do playbook.

**\[ENTENDA\] Streaming com SSE.** *Server-Sent Events* é uma conexão em que o servidor vai mandando mensagens para a página à medida que as coisas acontecem, sem a página perguntar de novo. É o que faz os 12 cards se preencherem ao vivo, um por um, em vez de a tela ficar parada um minuto e aparecer tudo junto. O jeito mais simples: a rota observa a pasta `runs/<r>/variants/` e envia um evento a cada arquivo novo.

### 6B. Export Upseller

**\[FAÇA\]**

1. Reaproveite o formato de importação que a sua skill `adiciona-produto-upseller` já gera. As colunas e os SKUs já estão certos.
2. `src/exportUpseller.ts` transforma as variantes **aprovadas** numa planilha nesse formato. Uma variante rejeitada nunca entra.
3. Teste importando no Upseller com um produto de teste ou como rascunho, sem publicar.

**\[ENTENDA\] Por que a aprovação humana fica.** Nesta versão, nada é publicado sem você. Isso protege contra penalidade da Shopee, contra uma capa errada e contra um preço abaixo da margem. No pitch, é uma decisão de produto: "o vendedor decide, o sistema propõe e aprende".

### 6C. Deploy

O motor (SDK + droids) precisa do binário `droid` e de processos longos, então roda no seu notebook durante a demo. Se quiser link público no Devpost, faça deploy no Vercel só do front em **modo replay**, lendo as rodadas já gravadas em `runs/`. Esconda os botões que disparam agentes nesse modo.

**\[SE FALHAR\]** A geração do front a partir do Figma não ficou boa: use os componentes gerados só como base e ajuste à mão o card e o dashboard. São as duas telas que aparecem na demo.

**\[CHECKPOINT 5\]** Me envie prints das três telas. Eu reviso o que o jurado vai ver em 3 minutos e aponto o que cortar.

## Fases 7 e 8 — Dormir, documentar, pitch e submissão (03h00–08h30)

A submissão no Devpost sai às 8h30, com 30 minutos de margem antes do prazo das 9h. O judging é das 10h30 às 12h30, com demo ao vivo.

### Fase 7 — Dormir (03h00–06h00)

Antes de deitar, deixe gravado um **vídeo de backup** do fluxo completo (2 a 3 min, tela + narração rápida) e faça push do repo. Uma demo ao vivo cansado é o maior risco do fim de semana, e 3 horas de sono rendem mais do que 3 horas de código às 4h.

### Fase 8 — Entrega (06h00–08h30)

**\[FAÇA\] Repositório (06h00–06h45)**

1. README, nesta ordem: o problema em 3 linhas; o diagrama do loop (o do FigJam); como rodar (`.env.example`, `npm install`, `npx tsx src/round.ts`); arquitetura (conductor, os dois droids, contratos por arquivo, memória no git); uma seção "Como usamos cada sponsor"; limitações honestas.
2. Confira que nenhuma chave foi commitada: `git log -p | grep -i -E "api_key|token"`.
3. Deixe `runs/r1`, `runs/r2` e o histórico de commits de `memory/` no repo. Eles são a prova do loop funcionando.
4. Push e repo público.

**\[FAÇA\] Devpost (06h45–07h30)** Uma seção por track, cada uma respondendo "o que exatamente usamos e por quê":

| Track | O que mostrar |
| --- | --- |
| Anthropic | O Claude é o raciocínio dos dois agentes. A memória é auditável e cita evidência. A comunidade é a de pequenos vendedores brasileiros, com o seu caso real de 8h por produto |
| Factory | O Factory é o runtime: conductor via Droid SDK, dois custom droids, fan-out paralelo, um modelo por tarefa e geração de imagem dentro do droid. "Multi-agent app", nas palavras do próprio deck deles |
| Apify | Os actors trazem a inteligência de concorrentes por ângulo, que alimenta cada variante |
| Figma | Figma → Droid → produto: variáveis e componentes viraram tokens e componentes React, e as propriedades de variante do card são os eixos do experimento. Link do vídeo do processo |

**\[FAÇA\] Pitch e demo (07h30–08h30)**

O roteiro tem 3 minutos:

1. **A dor (20s).** "Eu vendo moda na Shopee. Lançar um produto me toma 8 horas, e eu nunca sei por que um anúncio vende e outro não."
2. **Gerar (60s).** Foto, custo e margens entram. Os concorrentes por ângulo aparecem. Os 12 cards se preenchem ao vivo, cada um com eixos e um "por quê".
3. **Revisar (20s).** Aprovar algumas e baixar a planilha do Upseller.
4. **Aprender (60s).** O dashboard com dados reais da loja, o diff da memória, `git log memory/` e a rodada 2 já realocando.
5. **Escala (20s).** Os três pontos de escala abaixo.

Ensaie três vezes com cronômetro. A última vez, só com o vídeo de backup, para treinar o plano B.

**\[ENTENDA\] O argumento de escala.** O código de hoje é Shopee. A arquitetura não depende disso, e é isso que você mostra:

- **Outros marketplaces:** o canal é só mais um eixo e mais um conjunto de limites em `config.ts`. Mercado Livre e TikTok Shop entram com os actors que já estão no briefing.
- **Aprendizado entre lojas:** o playbook é por categoria. Com várias lojas, cada uma começa com o que as outras já provaram. É aí que a loja pequena ganha o tráfego que sozinha não tem.
- **Fora do Brasil:** é o "A/B testing da Amazon" para os marketplaces que não têm (Walmart, TikTok Shop, Etsy), com o Brasil como mercado de entrada.

**\[CHECKPOINT 6\]** Até as 7h30, me envie o rascunho do README e do texto do Devpost. Eu reviso clareza e o que cada track precisa ler.

- [ ] Repo público com README e `runs/` de exemplo
- [ ] Vídeo de backup gravado
- [ ] Devpost submetido até 8h30
- [ ] Demo ensaiada 3 vezes
- [ ] Notebook carregado e Wi-Fi testado no local do judging

## Anexos

### Anexo A — Os dois custom droids

Modelos definidos no Checkpoint 0. O trecho de capa do producer é fechado com o retorno do Checkpoint 1.

| Papel | Model ID | Por quê |
| --- | --- | --- |
| Conductor (SDK) | `claude-haiku-5-5`, `reasoningEffort: low` | Só distribui tarefas, roda o tempo todo: o mais barato que segue instruções bem |
| listing-producer | `claude-sonnet-5-5` | Roda 12 vezes por rodada e escreve o texto que o jurado lê. Se o spike mostrar lentidão ou custo alto, troque por `claude-haiku-5-5` |
| performance-analyst | `claude-opus-5-5` | Roda uma vez por rodada e decide o que vira regra: é onde o raciocínio mais pesa |

```markdown
<!-- .factory/droids/listing-producer.md -->
---
name: listing-producer
description: Produces ONE Shopee listing variant (copy + cover) from a variant spec, the playbook and competitor intel. Use once per variant.
model: claude-sonnet-5-5
---
You produce exactly one Shopee Brazil listing variant for a small apparel seller (store DNT).

Inputs (read them):
- the variant spec in your task: variantId, round, axes {angulo, capa, aquisicao, oferta}, mode (exploit|explore)
- memory/playbook.json (rules learned from the seller's own sales)
- runs/<round>/intel.json (competitor patterns for this angle)
- data/product/photo.jpg (the REAL product: never invent or alter the garment)

Rules:
- The axes are fixed by the plan. Never change them.
- Brazilian Portuguese. Title within the Shopee limit in src/config.ts, angle keyword first.
- mode=exploit: follow the playbook rules that match these axes and list their ids in appliedRules.
- mode=explore: state in hypothesis what this variant tests and what result would confirm it.
- Cover: generate from the real product photo. Change only scene, model, framing and badges required by axes.capa and axes.oferta.

Outputs (write ONLY these two files):
- runs/<round>/variants/<variantId>.json with
  { variantId, axes, mode, title, description, keywords[], coverBrief, coverPath, appliedRules[], hypothesis }
- runs/<round>/covers/<variantId>.png
```

```markdown
<!-- .factory/droids/performance-analyst.md -->
---
name: performance-analyst
description: Reads per-axis stats and the current playbook and proposes evidence-backed playbook updates.
model: claude-opus-5-5
---
You update a Shopee seller's listing playbook from measured performance.
You do NOT compute statistics. Read them from runs/<round>/stats.json:
for each axis value and metric (ctr, cartRate, paidConversion, profitPer1kImpr) you get
n, mean, ci90 [low, high] and pBetter versus the baseline value.

Rules:
- Add or strengthen a rule only when pBetter >= 0.8 and n meets the minimum in stats.json.
- Otherwise list the axis value under inconclusive with "keep exploring".
- Never delete a rule silently. Weaken, strengthen or retire it, always with a reason.
- Watch the confounders listed in stats.json (stockouts, flash sales). If they could explain an effect, say so and lower confidence.

Write ONLY runs/<round>/memory-diff.json:
{ add[], update[], retire[], inconclusive[], summary }
each rule = { id, scope {category, channel}, axis, value, effect, metric,
              evidence {n, mean, ci90, pBetter}, confidence: low|medium|high, reason }
```

### Anexo B — Prompt de bootstrap no Factory Desktop

Cole na Fase 0, depois do setup, para o Droid montar o esqueleto:

> Use the TypeScript Factory Droid SDK to build me: **Listing Loop**, a Node 20 + TypeScript engine for a Shopee seller. A conductor opens `createSession()` from `@factory/droid-sdk/node` with `cwd` at the repo root and delegates through the Task tool to two custom droids in `.factory/droids/`: `listing-producer` (one per variant, in background, in parallel) and `performance-analyst`. Agents exchange data only through files in `runs/<round>/`; code validates every file with Zod schemas in `src/schemas.ts`. Create `src/schemas.ts`, `src/plan.ts` (axis matrix, a compliance filter so no two variants share cover and title angle, Thompson sampling with Beta priors), `src/round.ts`, `src/stats.ts` (Beta-Binomial per axis value: mean, 90% interval, P(better) by 10,000 draws), `src/memory.ts` (validate diff, update `memory/playbook.json`, render `PLAYBOOK.md`, git commit), and an `AGENTS.md`. No UI yet.

### Anexo C — Glossário rápido

| Termo | Em uma frase | Onde aparece |
| --- | --- | --- |
| Droid SDK | Biblioteca que deixa o seu código abrir e controlar sessões do Droid | Fase 0 |
| Custom droid | Agente especializado definido num `.md`, com modelo e instruções próprios | Fase 1, Anexo A |
| Subagente / Task | O custom droid rodando a pedido de outra sessão, em contexto limpo | Fase 1 |
| Conductor | A sessão principal que distribui o trabalho entre os droids | Fase 1 |
| Spike | Teste descartável que prova a peça mais arriscada antes de construir | Fase 1 |
| Actor / dataset | Robô de coleta da Apify e a tabela de resultados que ele grava | Fase 2 |
| Funil e CTR | As portas impressão → clique → carrinho → pedido; CTR = cliques ÷ impressões | Fase 2 |
| Confundidor | O que muda o resultado mas não é o que você testa (ex.: flash sale) | Fase 2 |
| Variável / componente Figma | Valor nomeado reutilizável / elemento reutilizável com variantes | Fase 3 |
| MCP | Padrão para plugar uma ferramenta externa num agente | Fase 3 |
| Explorar × aproveitar | Testar o desconhecido × repetir o que já funciona | Fase 4 |
| Thompson sampling | Sorteia dentro da faixa de crença de cada opção e fica com o maior | Fase 4 |
| Zod / saída estruturada | Formato exato que o JSON do agente precisa obedecer, conferido pelo código | Fase 4 |
| Beta-Binomial | A "faixa de crença" de uma taxa, atualizada somando sucessos e fracassos | Fase 5 |
| Faixa de 90% | Onde a taxa verdadeira está, com 90% de chance | Fase 5 |
| P(melhor) | A chance de uma opção ser melhor que a referência | Fase 5 |
| Playbook | A memória de regras aprendidas, versionada no git | Fase 5 |
| SSE | Conexão em que o servidor envia atualizações para a página ao vivo | Fase 6 |
| Code freeze | Hora a partir da qual só se corrigem bugs | Fase 6 |
