# CHANGELOG

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
