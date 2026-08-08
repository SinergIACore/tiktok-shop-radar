# CHANGELOG

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
