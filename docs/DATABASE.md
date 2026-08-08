# DATABASE

## Tecnologia

PostgreSQL puro (sem ORM), acessado pelo driver open source `pg`
(node-postgres). Nenhum backend gerenciado de plataforma é utilizado — o banco
é provisionado pelo próprio EasyPanel/VPS e configurado por `DATABASE_URL`.

Adapters (`src/server/persistence/`):

| Adapter                | Quando é usado                       |
| ---------------------- | ------------------------------------ |
| `PostgresProductStore` | `DATABASE_URL` definida (produção)   |
| `MemoryProductStore`   | sem `DATABASE_URL` (dev sandbox/LAB) e testes automatizados |

A escolha acontece em um único lugar: `src/server/persistence/index.server.ts`.
O store em memória é **volátil** e existe apenas para não bloquear o LAB em
ambientes sem banco.

## Migrations

Mecanismo próprio, SQL versionado em `db/migrations/`, aplicado por
`npm run migrate` (`scripts/migrate.mjs`). Arquivos aplicados são registrados na
tabela `schema_migrations`. Migrations são incrementais (`IF NOT EXISTS`) e não
destrutivas; o `.down.sql` correspondente existe para reversão manual fora de
produção.

| Migration                          | Conteúdo                          |
| ---------------------------------- | --------------------------------- |
| `0001_products_and_snapshots.sql`  | `products`, `product_snapshots`   |

## Tabela `products` (identidade)

`id` (uuid), `source`, `source_product_id`, `name`, `thumbnail`,
`product_url`, `category`, `currency`, `seller_name`, `brand`,
`business_name`, `country_code`, `created_at`, `updated_at`, `first_seen_at`,
`last_seen_at`.

- Chave única: `UNIQUE (source, source_product_id)` — o nome nunca identifica
  o produto.
- `source_product_id` é sempre `text`.
- Campos opcionais aceitam `NULL`.
- `first_seen_at`: primeira observação do TikRadar. `last_seen_at`: mais recente.

**Upsert:** valores novos válidos sobrescrevem os antigos; um `null` vindo de
uma nova coleta **não apaga** um valor válido já persistido
(`mergeIdentity` em `snapshot-rules.ts`).

## Tabela `product_snapshots` (observações no tempo)

`id`, `product_id` (FK → `products.id`, `ON DELETE CASCADE`), `observed_at`,
`price`, `sold_count`, `rating`, `review_count`, `seller_video_count`,
`gmv_contribution`, `discount_percent`, `comment_rate`, `created_at`.

- Índice: `(product_id, observed_at)`.
- Política de null: ausência de dado permanece `NULL`. `0` real e desconhecido
  são semanticamente diferentes e nunca são convertidos entre si.
- Relacionamento: `Product 1 ---- N ProductSnapshot`.

## Deduplicação de snapshots

Regra única e simples: um novo snapshot é **ignorado** apenas quando o snapshot
anterior do mesmo produto ocorreu dentro da janela de **5 minutos**
(`DEFAULT_DEDUP_WINDOW_MS`) **e** todos os campos monitorados são idênticos
(`price`, `soldCount`, `rating`, `reviewCount`, `sellerVideoCount`,
`gmvContribution`, `discountPercent`, `commentRate`).

Qualquer mudança real é sempre registrada, mesmo dentro da janela. Fora da
janela, todo snapshot é gravado.

## Transações

No adapter Postgres, o upsert do produto e a inserção do snapshot ocorrem na
mesma transação (`BEGIN` / `COMMIT` / `ROLLBACK`), com `SELECT ... FOR UPDATE`
no produto. O store em memória é single-process e sequencial.

## Métrica derivada disponível

Somente `soldCountDelta`: diferença bruta de `soldCount` entre os dois
snapshots mais recentes. Retorna `null` se algum dos valores for `null`.
Nenhum percentual, velocidade, aceleração ou Viral Score foi implementado.

## Modelo de domínio da UI (mocks)

O Dashboard e `/products` continuam usando os tipos de `src/types/`
(`Product`, `Creative`) alimentados por mocks. A camada persistente descrita
acima ainda **não** alimenta a interface principal.
