# NEXT_STEP

## Estado após a Etapa 02B.1

Camada persistente criada e validada: `products` + `product_snapshots` em
PostgreSQL (driver `pg`, migrations SQL próprias), `ProductIngestionService`,
rotas LAB de ingestão/histórico e tela `/labs/product-history`.
Dashboard, `/products` e os mocks permanecem intocados.

Pendências imediatas:

- Provisionar PostgreSQL no EasyPanel e definir `DATABASE_URL` (sem ela a
  aplicação usa o store volátil em memória).
- Rodar `npm run migrate` no ambiente de produção.
- Validar a ingestão com o provider real (Apify) fora do sandbox.

## Etapa 02B.2 — concluída

Camada de leitura (`src/server/read/`), métricas históricas puras
(`src/server/metrics/product-metrics.ts`), endpoint
`GET /api/labs/products/metrics` e LAB `/labs/product-metrics`.
Sem migration nova. Dashboard, `/products` e mocks intocados.

## Etapa 02B.3 — concluída

`/products` e `/products/:id` consomem dados reais persistidos via
`GET /api/products`. Filtros, ordenação e paginação server-side implementados.
O Dashboard continua mockado.

## Etapa 02B.4 sugerida (NÃO implementada)

Migrar o Dashboard para os dados reais após validação de `/products` em
produção; só depois discutir coleta agendada, percentuais, aceleração,
tendência e Viral Score.

## Pendências herdadas

- **Docker**: imagem existe (`docker/Dockerfile`); falta build validado no host.
- **Roteador**: confirmar a manutenção do TanStack Router (D-002).

## Etapa 02B.4 — concluída

Dashboard migrado para dados persistidos reais via `GET /api/dashboard`.
Produtos e Dashboard usam PostgreSQL; Criativos, Análises e Biblioteca
continuam mockados e sinalizados como demonstração.

Próxima etapa sugerida (não iniciada): camada de inteligência — Viral Score,
Opportunity Score, tendências 24h/7d/30d, aceleração e coleta automática.

## Etapa 02C.1 — concluída

Motor de tendência histórica puro em `src/server/intelligence/`, endpoints LAB
(`/api/labs/products/trends`, `/api/labs/products/:id/trend`) e tela
`/labs/product-trends`. Dashboard, `/products` e a ingestão não foram alterados.

Próximo passo sugerido (aguardando autorização): validar a engine com dados
reais em produção e só então decidir como expor tendência em `/products` e no
Dashboard. Viral Score, ranking de descoberta e coleta automática continuam
fora de escopo.
