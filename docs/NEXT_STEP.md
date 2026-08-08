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

## Etapa 02B.3 sugerida (NÃO implementada)

Decidir quando/como substituir os mocks do Dashboard e de `/products` pelos
dados reais já legíveis, e só então discutir coleta agendada, percentuais,
aceleração e Viral Score.

## Pendências herdadas

- **Docker**: imagem existe (`docker/Dockerfile`); falta build validado no host.
- **Roteador**: confirmar a manutenção do TanStack Router (D-002).
