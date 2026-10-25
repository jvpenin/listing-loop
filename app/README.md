# Fox.ai · Front-end

Interface em inglês para jurados: apresentação curta, demo ao vivo, revisão dos anúncios e aprendizado entre rodadas. Os anúncios para a Shopee Brasil são gerados em pt-BR. Usa as artes Lo, Fox e Spark do guia visual fornecido, com o fundo retirado pela skill Imagegen. O arquivo original do guia permanece intacto; o recorte transparente está em `public/brand/mascots-cutout.png`.

```sh
cd app
npm install
npm run dev
```

Abra http://localhost:3000. O modo padrão é replay: lê os arquivos do repositório e não inicia agentes pagos. `LISTING_LOOP_ROOT` permite apontar para outra cópia do motor. O servidor deve ser iniciado a partir de `app/`.

- `/`: demo diretamente: foto pronta, título e palavras-chave → gerar dois anúncios.
- `/architecture`: mapa detalhado do processo, responsabilidades das empresas, entradas/saídas e memória.
- `/lab`: alias preservado da demo; detalhes do produto, preço e margem ficam recolhidos.
- `/campaigns`: campanhas e rodadas preservadas.
- `/rodada/r1?replay=1`: 12 anúncios, reprodução por SSE, detalhes e aprovação persistida em `.data/approvals.json`.
- `/rodada/r2`: amostra real disponível; variantes não geradas ficam identificadas como planejadas.
- `/benchmark/r1`: pesquisa real, comparações por peça, palavras e links para concorrentes.
- `/aprendizado`: r2 por padrão; alterna entre r1 e r2 com dados, intervalos de credibilidade, mudanças da memória, planos e histórico git.

As dez capas reais disponíveis no histórico têm cópias locais em `public/history/`; `sources.json` registra as URLs originais. As fontes Inter e os mascotes também são servidos localmente.

A exportação Upseller foi adiada a pedido do usuário. A interface não publica anúncios.

## Verificar

```sh
npm run build
npm run test:e2e
```

Os testes de navegador usam o Chrome instalado no macOS; configure `CHROME_PATH` em outro ambiente. Eles sobem um servidor próprio em 3101 e exercitam aprovação e rejeição, replay, filtros, dados, acessibilidade de navegação e telas no celular. Os prints ficam em `.design-preview/`.

## Preparar deploy replay

```sh
npm run snapshot
npm run build
```

O snapshot copia dados e imagens para `public/replay/`, sem credenciais ou logs. Em Vercel, o leitor usa esse snapshot. Aprovações na Vercel usam `/tmp` e não têm persistência garantida entre instâncias; para uso multiusuário em produção, conectar armazenamento por usuário. Localmente são persistidas em `app/.data/`.

## Demo ao vivo para jurados

```sh
npm run demo
```

Inicie a partir de `app/`, com o CLI Factory autenticado e as credenciais do motor configuradas. O comando ativa `LISTING_LOOP_LIVE=1` apenas no processo local. `/lab` cria campanhas pela API existente e acompanha o pipeline real por SSE. Sem essa variável, ou na Vercel, a experiência reproduz execuções gravadas.

Na página inicial, confirme o título e as palavras-chave, gere duas variantes e siga a orientação dos resultados para acionar o analyst. A arquitetura fica em uma aba separada; o terminal foi removido da interface. O alvo de 5 minutos depende da disponibilidade e latência da Apify/Factory; não é um prazo garantido. A margem opcional é uma meta do vendedor enviada no briefing, não uma medida de lucro ou um otimizador de preços. O segundo droid demonstra aprendizado sobre os 14 anúncios históricos reais da DNT, em dry-run, sem gravar nova memória. Os anúncios recém-gerados ainda não têm vendas.
