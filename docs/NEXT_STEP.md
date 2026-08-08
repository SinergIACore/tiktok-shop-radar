# NEXT_STEP

Sugestão de próxima etapa (NÃO implementada):

## Etapa 02 — Contrato de dados e camada de API própria (ainda sem provedores externos)

Escopo sugerido:

1. Definir o contrato de leitura (`GET /products`, `GET /products/:id`,
   `GET /products/:id/creatives`) em `/docs/API.md`.
2. Criar `HttpProductRepository` / `HttpCreativeRepository` consumindo
   `VITE_API_BASE_URL`, mantendo o repositório mockado como fallback
   controlado por `appConfig.dataSource`.
3. Definir se o backend será API Node própria ou Supabase externo
   (decisão pendente, ver DECISIONS.md).

## Pendências herdadas da Etapa 01

- **Docker**: `Dockerfile` e `.dockerignore` não foram criados. Isso depende de
  decidir o modo de execução em produção (build estático servido por Nginx vs.
  servidor Node com SSR). Assim que essa decisão for tomada, a etapa de
  containerização pode ser executada com segurança.
- **Roteador**: confirmar a manutenção do TanStack Router (D-002).
