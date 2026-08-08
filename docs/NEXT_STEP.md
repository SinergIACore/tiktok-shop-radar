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

## Etapa 02B.2 sugerida (NÃO implementada)

Repositório de leitura sobre os dados persistidos (`PostgresProductRepository`
implementando `ProductRepository`) e decisão de quando/como substituir os mocks
do Dashboard e de `/products`. Somente depois disso faz sentido discutir
coleta agendada e métricas derivadas (velocidade, aceleração, Viral Score).

## Pendências herdadas

- **Docker**: imagem existe (`docker/Dockerfile`); falta build validado no host.
- **Roteador**: confirmar a manutenção do TanStack Router (D-002).
