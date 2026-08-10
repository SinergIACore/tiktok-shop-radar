# CHANGELOG

## Etapa 02C.1 — Motor de tendência histórica (LAB)

Adicionado:

- `src/server/intelligence/`: `trend-types.ts`, `trend-metrics.ts`,
  `trend-classifier.ts`, `trend-explanation.ts`, `trend-engine.ts` (camada pura)
  e `trend-read.service.ts` (orquestração de leitura).
- Métricas novas: `gmvVelocity`, `reviewVelocity`, `sellerVideoVelocity`,
  `salesAcceleration`, `velocityRatio`, `growthConsistency`, direções de sinal.
- `TrendStatus` e `TrendEvidence` determinísticos + explicação em texto sem IA.
- `ProductReadRepository.listHistoriesForProducts()` (Postgres em query única).
- `GET /api/labs/products/trends` e `GET /api/labs/products/:id/trend`.
- LAB `/labs/product-trends` com badges semânticos e detalhes por intervalo.
- `src/server/intelligence/trend-engine.test.ts` (16 testes, casos A–P).

Não alterado: Dashboard, `/products`, ingestão, provider Apify, migrations,
Dockerfile, mocks. Nenhum Viral Score, previsão ou coleta automática.

## Etapa 02B.4 — Dashboard com dados reais

Adicionado:

- `src/server/dashboard/`: `DashboardReadService` + tipos do read model.
- `ProductReadRepository.getDashboardSummary()` (Postgres agregado em uma
  query; Memory para sandbox/testes).
- `GET /api/dashboard` e `src/lib/dashboard-view-model.ts` (adaptador puro).
- `DashboardService` + `httpDashboardRepository` (UI nunca faz fetch direto).
- `RealProductCard` e `DataSourceBadge` (indicador contextual de fonte).
- `src/server/dashboard/dashboard-read.test.ts` (11 testes).

Alterado:

- `/` deixou de usar mocks: cards objetivos (produtos monitorados, produtos com
  histórico, snapshots coletados, última coleta) e quatro listagens reais.
- Selo global "dados mockados" removido do cabeçalho; telas ainda mockadas
  (Criativos, Análises, Biblioteca) exibem o selo localmente.

Não alterado: ingestão, provider Apify, migrations, Dockerfile, `/products`.
Nenhum Viral Score, Opportunity Score, tendência, aceleração ou previsão foi
introduzido.

## Etapa 02B.2 — Leitura real + métricas históricas básicas

Adicionado:

- `src/server/read/`: contrato `ProductReadRepository` e adapters Postgres
  (query única com window function, sem N+1) e Memory (dev/testes).
- `src/server/metrics/product-metrics.ts`: deltas brutos (`soldCountDelta`,
  `gmvDelta`, `priceDelta`, `reviewCountDelta`, `sellerVideoCountDelta`),
  `timeDeltaHours` e `salesVelocity`. NULL nunca vira zero.
- `GET /api/labs/products/metrics` (somente leitura).
- LAB `/labs/product-metrics` com tabela de métricas e histórico por produto.
- `src/server/read/product-read.test.ts` (10 testes).

Não alterado: Dashboard, `/products`, mocks, ingestão, provider Apify,
Dockerfile, migrations.

## Hotfix 02B.1B — Erro SSR `__exportAll is not a function`

Corrigido:

- `src/routes/api/labs/products/$productId.history.ts`: `snapshot-rules`
  (módulo puro, sem driver) passou a ser importado estaticamente; o `import()`
  dinâmico fazia o bundler SSR construir um objeto de namespace com o helper
  `__exportAll`, que quebrava no carregamento do chunk `_ssr/router-*.mjs`
  em produção (HTTP 500 em todas as rotas `/api/labs/*`).
- `src/routes/api/labs/products/ingest.ts`: `Promise.all` sobre `import()`
  dinâmicos substituído por `await` sequencial pelo mesmo motivo.
- Apenas `@/server/persistence/index.server` continua dinâmico — é o único
  caminho que pode carregar `pg`, mantendo o driver fora do bundle client.

Validado: `npm run build` OK, `npm test` 8/8, servidor Node local
`GET /api/labs/products` → `200 {"store":"memory","items":[]}`.

## Etapa 02A.3 — Ajuste do provider Apify real

Alterado:

- Timeout padrão do provider: 60000 → 120000 ms (`APIFY_TIMEOUT_MS`, `.env.example`).
- `normalizeProduct.ts`: mapeamento do schema real do Actor
  `lurkapi~tiktok-shop-scraper` (`currentPrice`, `mainImage`, `imageUrls[0]`,
  `categoryPath`, `sellerVideoCount`, `gmvContribution`, `brand`,
  `businessName`, `countryCode`, `discountPercent`, `commentRate`).
  `creatorCount` permanece `null`.
- Tipo `NormalizedProduct`: novos campos, nenhum removido.
- `/labs/product-data`: colunas Shop Videos e GMV no lugar de Criadores.
- Docs: PROVIDERS, API, CHANGELOG, NEXT_STEP.

Adicionado/Removido: nada.

## Etapa 02A.2 — Preparação para deploy Node 22 + Docker + EasyPanel

Adicionado:

- `docker/Dockerfile` (multi-stage, Node 22 alpine, runner com `NODE_ENV=production`,
  porta 3000, start `node .output/server/index.mjs`).
- `.dockerignore`.
- `engines.node: ">=22 <23"` e script `start` em `package.json`.
- `nitro: { preset: "node-server" }` em `vite.config.ts` (aplicado apenas fora do
  ambiente Lovable; o preview da plataforma segue inalterado).

Alterado: nenhuma funcionalidade, rota de negócio, provider, mock ou UI.

Removido: nada.

## Etapa 02A — Prova de aquisição de dados reais do TikTok Shop

Adicionado:

- `src/services/providers/product-data/` (contrato `ProductDataProvider`,
  tipos, normalizer e `ApifyProductDataProvider`).
- Endpoint server-side `GET /api/products/search`.
- Rota LAB `/labs/product-data` com estados de loading, erro, vazio e sucesso.
- `docs/PROVIDERS.md`; atualizações em ARCHITECTURE, API, SECURITY,
  INTEGRATIONS e NEXT_STEP.
- Variáveis `APIFY_API_TOKEN`, `APIFY_PRODUCT_ACTOR_ID`, `APIFY_TIMEOUT_MS`
  em `.env.example` (sem valores).

Alterado: nada da Etapa 01. Dashboard e `/products` seguem com mocks.

Removido: nada.

## Etapa 01 — Fundação, arquitetura e interface inicial

Adicionado:

- Design system escuro em `src/styles.css` (tokens oklch, cores semânticas
  growth/alert/opportunity/viral, fontes Space Grotesk + IBM Plex).
- Shell da aplicação com sidebar colapsável (`src/components/layout/`).
- Rotas: `/`, `/products`, `/products/$productId`, `/creatives`, `/analytics`,
  `/library`, `/settings`.
- Componentes de inteligência: MetricTile, ViralScore, ProductCard,
  ProductFilters, CreativeCard, CreativeDetailSheet.
- Tipos de domínio em `src/types/`.
- Mocks em `src/mocks/`.
- Camada de serviços e repositórios em `src/services/`.
- Documentação em `/docs` e README na raiz.
- `.env.example` sem valores reais.

Alterado:

- `src/routes/__root.tsx` (layout, metadados, fontes, Toaster).
- `src/routes/index.tsx` (placeholder substituído pelo Dashboard).
- `src/styles.css` (design system do produto).
- `README.md`.

Removido: nada.

## Etapa 02B.1 — Persistência de produtos e snapshots históricos

- **Banco**: PostgreSQL + driver `pg`, sem ORM (D-011). Migrations SQL em
  `db/migrations/` com runner `npm run migrate`.
- **Entidades**: `products` (identidade, `UNIQUE (source, source_product_id)`)
  e `product_snapshots` (observações, índice `(product_id, observed_at)`).
- **Adapters**: `PostgresProductStore` (produção) e `MemoryProductStore`
  (dev sem `DATABASE_URL` e testes).
- **Ingestão**: `ProductIngestionService` persiste produtos já normalizados;
  não conhece o provider. Upsert preserva valores válidos contra `null`.
- **Deduplicação**: janela de 5 min + comparação de campos monitorados (D-013).
- **Rotas LAB**: `POST /api/labs/products/ingest`,
  `GET /api/labs/products`, `GET /api/labs/products/:productId/history`.
- **Tela LAB**: `/labs/product-history` com resumo de ingestão e tabela de
  snapshots (inclui Δ vendas).
- **Métrica derivada**: apenas `soldCountDelta` (delta bruto).
- **Testes**: Vitest (`npm test`), 8 casos cobrindo upsert, null, unicidade,
  ordem cronológica, delta e deduplicação. Provider externo mockado.
- **Não alterado**: Dashboard, `/products`, mocks, provider Apify,
  `GET /api/products/search`.

## Etapa 02B.3 — `/products` com dados reais persistidos

- **View model**: `src/types/product-view.ts` + adaptador puro
  `src/lib/product-view-model.ts`. A UI nunca vê tipos de banco/repositório.
- **Repositório**: `ProductReadRepository.listProductsPage()` (Postgres e
  Memory). Postgres usa uma única query com window function + `COUNT` separado
  (sem N+1); NULLs sempre ordenados por último (`NULLS LAST`).
- **Endpoints**: `GET /api/products` (paginado/filtrado) e
  `GET /api/products/:productId` (detalhe + histórico cronológico).
- **UI**: `/products` e `/products/:id` passam a consumir dados reais via
  `RealProductService` → `httpRealProductRepository`. Estados de LOADING,
  EMPTY e ERROR explícitos; sem fallback silencioso para mocks.
- **Filtros**: nome, seller, categoria, faixa de preço, mínimos de vendas /
  reviews / rating e "somente com histórico". Ordenação por vendas, GMV,
  Δ vendas, Δ GMV, vendas/hora e última observação.
- **Paginação**: server-side, `limit` ∈ {10, 25, 50}, default `page=1&limit=25`.
- **Dados ausentes**: exibidos como `—`; NULL nunca vira 0.
- **Testes**: 19 novos casos (`src/server/read/product-list.test.ts`),
  total 37 passando.
- **Não alterado**: Dashboard (segue mockado), criativos, biblioteca, análises,
  provider Apify, ingestão, deduplicação, LABs, Docker e migrations.

## Etapa 02C.2 — Motor de descoberta e pesquisa

- **Catálogo de nichos**: `src/config/niches.ts` (estático, versionado, sem
  banco). Os termos são um ponto de partida editável, não uma cobertura total.
- **Persistência**: migration incremental
  `db/migrations/0002_discovery_searches_and_product_discoveries.sql` com
  `discovery_searches` (intenção de busca) e `product_discoveries` (origem da
  descoberta). Migration 0001 intocada.
- **Adaptadores**: `MemoryDiscoveryStore` e `PostgresDiscoveryStore` atrás da
  interface `DiscoveryStore` — mesmo padrão portátil das etapas anteriores.
- **Orquestração**: `DiscoveryService` executa
  `DiscoverySearch → Provider → Normalizer → Ingestão` reutilizando o
  `ProductIngestionService` (nenhuma lógica de ingestão duplicada) e o motor de
  tendência da Etapa 02C.1 (nenhuma métrica recalculada na UI).
- **Controle de custo**: execução sempre manual; termos processados em
  sequência; `maxTermsPerRun=5` e `maxProductsPerTerm=5` por padrão, com teto
  rígido de 10/20 aplicado no backend.
- **Resiliência**: falha em um termo não aborta a execução; mensagens de erro
  normalizadas, sem vazar vendor/token.
- **Endpoints**: `GET /api/discovery/niches`,
  `GET|POST /api/discovery/searches`,
  `GET|PATCH /api/discovery/searches/:id`,
  `POST /api/discovery/searches/:id/run`,
  `POST /api/discovery/quick-search`,
  `GET /api/discovery/products/:productId`.
- **Leitura**: `ProductReadRepository.listProductsByIds()` (Memory e Postgres)
  evita N+1 ao montar os cards do resultado.
- **UI**: nova rota `/discovery` (busca rápida, pesquisa por nicho, pesquisas
  salvas e resultado da execução) e seção "Descoberto por" em
  `/products/:id`. Item "Descoberta" adicionado à sidebar.
- **Testes**: 9 novos casos em `src/server/discovery/discovery.service.test.ts`
  (ingestão, deduplicação entre termos, limites, falha isolada, provider não
  configurado, validação). Total 73 passando.
- **Não alterado**: Dashboard, `/products` (listagem), ingestão, deduplicação
  de snapshots, motor de tendência, LABs, Docker e migration 0001.

## Microetapa 02C.2B — Discovery eficiente + país/mercado

- **Limite real do Actor**: o limite pedido na UI agora é enviado
  explicitamente como `maxProductsPerSource` no input do Actor. Antes o campo
  não era enviado e o Actor usava o default **50 produtos por keyword** (todos
  cobrados) enquanto líamos apenas os primeiros N. Diagnóstico exposto na
  resposta: `requestedLimit`, `providerLimit`, `receivedCount` (por termo e
  agregado em `diagnostics`).
- **Mercado/País**: inspecionado o input schema real do Actor
  `lurkapi~tiktok-shop-scraper` — o único parâmetro de mercado suportado é
  `country`, cujo enum contém **apenas `US`**. Catálogo em
  `src/config/markets.ts` espelha esse enum (nada inventado); valores fora do
  catálogo são rejeitados com erro de validação, sem fallback silencioso.
  **Limitação documentada**: outros mercados (UK/FR/SEA) constam apenas como
  roadmap do Actor e por isso não são selecionáveis.
- **Persistência**: migration `0003_discovery_market.sql` adiciona
  `discovery_searches.market` (default `'US'`). Uma pesquisa salva passa a
  lembrar query, tipo, nicho **e mercado**.
- **Qualidade comercial**: `keywordSortBy = "best_sellers"` enviado ao Actor e
  filtro local puro em `src/server/discovery/quality-filter.ts` aplicado
  **antes da persistência**: aceita quando `soldCount >= 100` **ou**
  `reviewCount >= 20` (configurável). Descartados não viram Product nem
  Snapshot — apenas log. Contadores `received`, `qualified`, `discarded`.
- **Add-ons/payload**: `includeCreatorCount = false` (add-on pago),
  `includeFirstSeen = true` (grátis) e desligamento dos campos `output*` que o
  normalizador nunca lê.
- **UI `/discovery`**: seletor de Mercado na busca rápida, no bloco de nichos e
  na criação de pesquisas salvas; coluna Mercado na tabela; resultado exibe
  Recebidos, Qualificados, Descartados, Únicos, Criados, Atualizados e
  Snapshots, além da linha de diagnóstico de custo. Spinner com a mensagem
  "Consultando mercado e analisando candidatos...".
- **Não alterado**: sobreamostragem automática (adiada), scores Viral/
  Opportunity, automações, motor de tendência, Dashboard, `/products`,
  migrations 0001/0002.
- **Testes**: 10 novos casos (limites propagados, mercado enviado/validado,
  ordenação best_sellers, descarte de candidatos fracos, regra customizada,
  ausência de credenciais no diagnóstico). Total **83 passando**. Build limpo.

> **Nota de nichos**: a execução de nicho continua fazendo 1 chamada por termo.
> O Actor aceita vários `keywords` num único run, mas isso removeria a
> atribuição termo→produto exigida por `ProductDiscovery`. Consolidação fica
> pendente para quando a atribuição por termo puder ser preservada.

## Etapa TikTok Oficial 01 — provider oficial em paralelo

- **Novo provider server-only** `TikTokShopOfficialProvider`
  (`src/services/providers/product-data/providers/tiktok-official/`),
  implementando a MESMA interface `ProductDataProvider`. O provider atual
  (Apify) continua sendo o padrão.
- **Feature flag** `DISCOVERY_PROVIDER` em `index.server.ts`
  (`apify` padrão | `tiktok_official` opt-in). Nada disso existe no frontend.
- **OAuth**: `GET /api/auth/tiktok/callback` recebe o `auth_code`, troca por
  token pelo adapter isolado `src/server/tiktok/oauth.server.ts` e persiste
  server-side com AES-256-GCM. Nenhum token vai para o navegador nem para logs.
- **LAB de prova**: `POST /api/labs/tiktok-official/product-search`
  (`pageSize <= 5`, sem persistência no banco principal).
- **Migration 0004** `tiktok_authorizations` (tabela isolada, tokens cifrados).
- **Normalização oficial**: `units_sold`, `sale_region`, `sales_price`,
  `original_price`, `commission.*`, `shop.name`, `category_chains`,
  `shop_ads_commission`. NULL nunca vira zero.
- **Testes**: 15 novos casos (normalização, units_sold, sale_region, preço,
  comissão, NULLs, limite 5, erro de autorização, token ausente, provider atual
  intacto, ausência de chamada TikTok sem opt-in, credenciais fora do client).
  Total **98 passando**. Build limpo.
- **Não alterado**: Dashboard, `/products`, snapshots, histórico, métricas,
  motor de tendência, Discovery, provider Apify, migrations 0001–0003.

## Correção — OAuth TikTok Creator

- `connect`/`callback` migrados de Seller Authorization para Creator Authorization.
- `state` anti-CSRF (aleatório, single-use, expirável, ligado a cookie HttpOnly).
- Validação `code === 0` + `user_type === 1`; persistência de open_id, user_type e granted_scopes (migration 0005).
- Refresh automático de token e novos endpoints `/api/integrations/tiktok/profile` e `/api/integrations/tiktok/showcase`.
- `/settings` passa a exibir Conectado / Scopes incompletos / Token expirado / Token inválido / Não conectado; removida a mensagem de `service_id`.
