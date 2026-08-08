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

## Leitura (Etapa 02B.2)

`src/server/read/` contém a camada de leitura, separada da ingestão:

| Arquivo                        | Papel                                              |
| ------------------------------ | -------------------------------------------------- |
| `types.ts`                     | contrato `ProductReadRepository` (somente leitura)  |
| `postgres-read-repository.ts`  | SELECT com window function (sem N+1)                |
| `memory-read-repository.ts`    | equivalente sobre o store em memória (dev/testes)   |
| `index.server.ts`              | escolha do adapter por `DATABASE_URL`               |

Query principal (uma única ida ao banco):

```sql
WITH ranked AS (
  SELECT s.*, row_number() OVER (PARTITION BY s.product_id
                                 ORDER BY s.observed_at DESC, s.id DESC) AS rn,
         count(*) OVER (PARTITION BY s.product_id) AS snapshot_count
    FROM product_snapshots s
)
SELECT ... FROM products p
  LEFT JOIN ranked l ON l.product_id = p.id AND l.rn = 1
  LEFT JOIN ranked v ON v.product_id = p.id AND v.rn = 2
 ORDER BY p.last_seen_at DESC LIMIT $1;
```

O índice `(product_id, observed_at)` da migration 0001 já atende essa consulta;
**nenhuma migration nova foi criada** na Etapa 02B.2.

## Métricas históricas (Etapa 02B.2)

Calculadas em `src/server/metrics/product-metrics.ts` (módulo puro) entre os
dois snapshots mais recentes:

| Métrica                 | Fórmula                                        |
| ----------------------- | ---------------------------------------------- |
| `soldCountDelta`        | último − anterior (`sold_count`)               |
| `gmvDelta`              | último − anterior (`gmv_contribution`)         |
| `priceDelta`            | último − anterior (`price`)                    |
| `reviewCountDelta`      | último − anterior (`review_count`)             |
| `sellerVideoCountDelta` | último − anterior (`seller_video_count`)       |
| `timeDeltaHours`        | diferença de `observed_at` em horas            |
| `salesVelocity`         | `soldCountDelta / timeDeltaHours`              |

Regras de null: `NULL` nunca vira `0`; se um dos dois valores for `NULL` a
métrica derivada é `NULL`; `timeDeltaHours <= 0` ⇒ `salesVelocity = NULL`;
produto com um único snapshot ⇒ todas as métricas `NULL`. Nenhum percentual,
tendência, aceleração, saturação ou Viral Score é calculado nesta etapa.

## Consultas de listagem (Etapa 02B.3)

`listProductsPage` usa uma CTE `ranked` com
`row_number() OVER (PARTITION BY product_id ORDER BY observed_at DESC)` para
obter os dois snapshots mais recentes, filtra sobre o snapshot atual (`rn = 1`)
e pagina com `LIMIT/OFFSET`. O total vem de uma query `COUNT` com os mesmos
filtros. Ordenações por delta são calculadas em SQL
(`l.sold_count - v.sold_count`), sempre com `NULLS LAST`.

Nenhuma migration nova foi necessária: os índices de 0001 atendem as consultas.
