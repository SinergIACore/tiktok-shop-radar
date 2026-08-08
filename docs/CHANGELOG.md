# CHANGELOG

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
