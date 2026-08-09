# API

## GET /api/products/search

Endpoint próprio da aplicação (Etapa 02A). Executa no servidor, protege o
token do provider e devolve dados já normalizados.

**Decisão de formato:** `GET`. A operação é leitura pura, com parâmetros
escalares simples, cacheável e fácil de testar via navegador/curl.

### Parâmetros (query string)

| Parâmetro | Tipo   | Obrigatório | Observação                        |
| --------- | ------ | ----------- | --------------------------------- |
| `keyword` | string | sim         | Palavra-chave da busca            |
| `limit`   | number | não         | 1–50, padrão 10                   |
| `country` | string | não         | Mercado, quando o provider aceita |

### Resposta 200

```json
{
  "source": "apify",
  "query": { "keyword": "women dress", "limit": 10 },
  "count": 10,
  "durationMs": 8421,
  "items": [
    {
      "id": "...",
      "name": "...",
      "thumbnail": "...",
      "productUrl": "...",
      "category": null,
      "price": 19.9,
      "currency": "USD",
      "soldCount": 1200,
      "rating": 4.8,
      "reviewCount": 320,
      "sellerName": "...",
      "sellerVideoCount": 42,
      "gmvContribution": 1234.5,
      "brand": null,
      "businessName": null,
      "countryCode": "US",
      "discountPercent": 30,
      "commentRate": null,
      "creatorCount": null,
      "source": "apify",
      "sourceProductId": "..."
    }
  ]
}
```

Campos não retornados pelo provider vêm como `null`.
`creatorCount` é sempre `null` nesta etapa (não há campo real equivalente;
`sellerVideoCount` não é usado como substituto).
Timeout máximo do provider: 120s (`APIFY_TIMEOUT_MS`).

### Erros

| Status | code               | Situação                       |
| ------ | ------------------ | ------------------------------ |
| 400    | `invalid_params`   | keyword ausente                |
| 503    | `not_configured`   | token/Actor não configurados   |
| 504    | `timeout`          | provider não respondeu a tempo |
| 502    | `provider_error`   | erro retornado pelo provider   |
| 502    | `invalid_response` | formato inesperado do provider |

Formato: `{ "error": { "code": "...", "message": "..." } }`.
Mensagens nunca contêm token ou headers de autenticação.

Nenhuma autenticação é exigida nesta etapa.

---

## POST /api/labs/products/ingest

Rota **LAB** (Etapa 02B.1). Executa o provider externo uma única vez, por ação
explícita do usuário, e persiste `Product` + `ProductSnapshot`.
Não há execução automática, polling, loop ou scheduler.

### Corpo

```json
{ "keyword": "women dress", "limit": 5 }
```

`limit`: 1–20 (limite conservador do LAB, pois o provider é pago).

### Resposta 200

```json
{
  "ok": true,
  "source": "apify",
  "store": "postgres",
  "query": { "keyword": "women dress", "limit": 5 },
  "ingestion": {
    "received": 5,
    "productsCreated": 5,
    "productsUpdated": 0,
    "snapshotsCreated": 5,
    "snapshotsSkipped": 0
  },
  "productIds": ["..."]
}
```

### Erros

| Status | code               | Situação                         |
| ------ | ------------------ | -------------------------------- |
| 400    | `validation_error` | JSON inválido ou keyword ausente |
| 503    | `not_configured`   | provider sem token/Actor         |
| 504    | `provider_timeout` | provider não respondeu a tempo   |
| 502    | `provider_error`   | erro do provider                 |
| 500    | `database_error`   | falha na persistência            |

Todas as respostas são JSON. Nenhum segredo, credencial ou stack trace é
exposto.

## GET /api/labs/products

Lista os produtos persistidos (máx. 50). Não chama o provider externo.

## GET /api/labs/products/:productId/history

Retorna o produto persistido e seus snapshots ordenados por `observedAt ASC`.

```json
{
  "product": { "id": "...", "name": "...", "firstSeenAt": "...", "lastSeenAt": "..." },
  "snapshots": [
    {
      "observedAt": "2026-08-08T10:00:00.000Z",
      "price": 57.99,
      "soldCount": 9548,
      "rating": 4.7,
      "reviewCount": 1200,
      "sellerVideoCount": 3041,
      "gmvContribution": 553688.52
    }
  ],
  "metrics": { "soldCountDelta": 242 }
}
```

`soldCountDelta` é a diferença bruta entre os dois snapshots mais recentes;
`null` quando algum dos valores é desconhecido. Erros: 404 `not_found`,
500 `database_error`.

> `GET /api/products/search` permanece inalterado: consulta externa sem
> persistência (ver D-012).

## GET /api/labs/products/metrics

Leitura real (somente SELECT) de `products` + `product_snapshots`. Não chama o
provider externo e nunca grava. Parâmetro opcional `limit` (1–200, padrão 50).

```json
{
  "store": "postgres",
  "items": [
    {
      "id": "...",
      "source": "apify",
      "sourceProductId": "...",
      "name": "...",
      "thumbnail": "...",
      "productUrl": "...",
      "sellerName": "...",
      "snapshotCount": 2,
      "latest": {
        "observedAt": "...",
        "price": 57.99,
        "soldCount": 9551,
        "rating": 4.7,
        "reviewCount": 1206,
        "sellerVideoCount": 3041,
        "gmvContribution": 553862.49
      },
      "previous": { "observedAt": "...", "price": 57.99, "soldCount": 9548, "reviewCount": 1200 },
      "metrics": {
        "soldCountDelta": 3,
        "gmvDelta": 173.97,
        "priceDelta": 0,
        "reviewCountDelta": 6,
        "sellerVideoCountDelta": 0,
        "timeDeltaHours": 2,
        "salesVelocity": 1.5
      }
    }
  ]
}
```

Produtos com apenas 1 snapshot aparecem normalmente com `previous: null` e
todas as métricas `null`. Erros: 500 `database_error`.

## GET /api/products (Etapa 02B.3)

Listagem paginada dos produtos persistidos. Somente leitura: nunca chama o
provider e nunca grava.

Parâmetros: `page` (default 1), `limit` (10 | 25 | 50, default 25), `search`,
`seller`, `category`, `minPrice`, `maxPrice`, `minSold`, `minReviews`,
`minRating`, `hasHistory` (`true`), `sort`
(`soldCount` | `gmv` | `soldCountDelta` | `gmvDelta` | `salesVelocity` |
`lastObservedAt`, default `lastObservedAt`), `direction` (`asc` | `desc`).
Valores inválidos caem no default; nada é lançado.

```json
{
  "store": "postgres",
  "page": 1,
  "limit": 25,
  "total": 123,
  "totalPages": 5,
  "items": [{ "id": "…", "name": "…", "latest": {}, "metrics": {}, "snapshotCount": 2 }]
}
```

Erro de banco: HTTP 500 `{ "error": { "code": "database_error", … } }`.
Não há fallback para mocks.

## GET /api/products/:productId

Retorna `{ store, product, history }`, onde `history` são os snapshots em ordem
cronológica (`observedAt` ASC). Produto inexistente: HTTP 404 `not_found`.

## GET /api/dashboard (Etapa 02B.4)

Read model do Dashboard. Somente leitura: nunca chama o provider, nunca grava
e nunca carrega histórico completo. Todas as listagens têm `LIMIT 6`.

```json
{
  "store": "postgres",
  "summary": {
    "productsMonitored": 14,
    "productsWithHistory": 5,
    "snapshotsCollected": 19,
    "lastObservationAt": "2026-08-08T22:10:00.000Z",
    "newProducts24h": 3,
    "snapshots24h": 7
  },
  "mostSold": [],
  "highestGmv": [],
  "biggestSoldDelta": [],
  "recentlyObserved": []
}
```

Listagens: `mostSold` (`latest.soldCount` DESC), `highestGmv`
(`latest.gmvContribution` DESC), `biggestSoldDelta` (`soldCountDelta` DESC,
somente produtos com 2+ snapshots) e `recentlyObserved` (`latest.observedAt`
DESC). Os itens usam o mesmo `ProductListViewModel` de `/api/products`.

Erro de banco: HTTP 500 `{ "error": { "code": "database_error", … } }`.
Sem fallback para mocks.

## GET /api/labs/products/trends (Etapa 02C.1 — LAB)

Parâmetros: `limit` (1–100, default 25), `historyLimit` (2–200, default 20),
`status` (`accelerating|growing|stable|decelerating|declining|insufficient_data`),
`minSnapshots`.

```json
{
  "store": "postgres",
  "generatedAt": "2026-08-08T23:00:00.000Z",
  "query": { "limit": 25, "historyLimit": 20, "status": null, "minSnapshots": null },
  "items": [
    {
      "id": "…", "name": "…", "thumbnail": null, "sellerName": "…",
      "snapshotCount": 5,
      "trend": {
        "status": "accelerating", "evidence": "medium",
        "validIntervals": 4,
        "latest": { "observedAt": "…", "soldCount": 140, "gmv": null, "reviews": null,
                    "sellerVideoCount": null, "price": null },
        "sales": { "delta": 30, "velocity": 15, "previousVelocity": 5,
                   "acceleration": 10, "velocityRatio": 3,
                   "positiveIntervals": 3, "negativeIntervals": 0,
                   "neutralIntervals": 1, "consistency": 0.75 },
        "gmv": { "delta": null, "velocity": null },
        "reviews": { "delta": null, "velocity": null },
        "sellerVideos": { "delta": null, "velocity": null },
        "intervals": [],
        "explanation": "Produto acelerando: …"
      }
    }
  ]
}
```

Leitura em massa sem N+1: uma query com window function busca os últimos
`historyLimit` snapshots de todos os produtos da página.

## GET /api/labs/products/:productId/trend (Etapa 02C.1 — LAB)

Retorna `{ store, generatedAt, item, snapshots }` — a análise completa e os
snapshots utilizados. 404 quando o produto não existe.

## Descoberta (Etapa 02C.2)

Todas as execuções são **manuais**: não há scheduler, cron ou worker.
Os limites de custo são validados no backend e nunca confiados no cliente
(`DEFAULT: maxTermsPerRun=5, maxProductsPerTerm=5`; teto rígido `10` / `20`).

### GET /api/discovery/niches

Catálogo estático de nichos (`src/config/niches.ts`) e os limites vigentes.

```json
{
  "niches": [
    { "key": "beauty", "name": "Beleza", "description": "…",
      "termCount": 8, "terms": ["…"] }
  ],
  "limits": {
    "defaults": { "maxTermsPerRun": 5, "maxProductsPerTerm": 5 },
    "max": { "maxTermsPerRun": 10, "maxProductsPerTerm": 20 }
  }
}
```

### GET /api/discovery/searches

Lista paginada de pesquisas salvas: `page` (default 1), `limit` (1–100),
`includeInactive`. Retorna `{ store, page, limit, total, totalPages, items }`.

### POST /api/discovery/searches

Corpo: `{ name, type, query?, nicheKey?, terms? }` com
`type ∈ { keyword, product_name, niche }`.
`keyword`/`product_name` exigem `query`; `niche` exige `nicheKey` existente no
catálogo (os termos são resolvidos no servidor). Retorna `{ search }`.
Erros: `validation_error` (400).

### GET/PATCH /api/discovery/searches/:searchId

`GET` retorna `{ search }` (404 quando inexistente).
`PATCH` aceita `{ name?, query?, terms?, active? }` — desativar é um arquivamento
lógico; nada é apagado.

### POST /api/discovery/searches/:searchId/run

Executa a pesquisa salva. Corpo opcional:
`{ maxTermsPerRun?, maxProductsPerTerm? }` (sempre limitado pelo teto rígido).
Os termos são processados **sequencialmente**, um provider call por termo.

```json
{
  "search": { "…": "…", "runCount": 3, "lastRunAt": "…" },
  "run": {
    "startedAt": "…", "finishedAt": "…", "termsExecuted": 5,
    "received": 25, "uniqueProducts": 21,
    "productsCreated": 12, "productsUpdated": 9,
    "snapshotsCreated": 18, "snapshotsSkipped": 3,
    "discoveriesCreated": 21, "discoveriesSkipped": 0
  },
  "limits": { "maxTermsPerRun": 5, "maxProductsPerTerm": 5 },
  "terms": [{ "term": "…", "status": "ok", "received": 5, "productIds": ["…"] }],
  "errors": [{ "term": "…", "status": "failed", "message": "provider_timeout" }],
  "products": [
    { "id": "…", "name": "…", "thumbnail": null, "productUrl": null,
      "sellerName": "…", "currency": "USD", "price": 19.9,
      "soldCount": 140, "gmv": null,
      "trendStatus": "insufficient_data", "trendEvidence": "low",
      "snapshotCount": 1 }
  ]
}
```

Um termo com falha **não aborta a execução**: ele entra em `errors` com uma
mensagem normalizada (`provider_timeout`, `provider_not_configured`,
`provider_invalid_response`, `provider_error`) — detalhes de vendor/token nunca
vazam para o cliente. `503 not_configured` quando o provider não está
configurado.

### POST /api/discovery/quick-search

Execução avulsa (sem persistir a pesquisa).
Corpo: `{ query, type, maxProductsPerTerm? }`. Mesma resposta do `/run`, com
`search: null` e `quick: { type, query }`.

### GET /api/discovery/products/:productId

Origem da descoberta ("Descoberto por"). Somente leitura — o provider externo
nunca é chamado aqui. `limit` 1–100 (default 50).

```json
{ "store": "postgres",
  "discoveries": [
    { "id": "…", "productId": "…", "searchId": "…", "searchName": "Beleza",
      "searchType": "niche", "term": "lip gloss", "discoveredAt": "…" }
  ] }
```

## Etapa TikTok Oficial 01

### `GET /api/auth/tiktok/callback`

Recebe `code`/`auth_code` do TikTok, troca por token server-side, persiste
cifrado e redireciona para `/settings?tiktok=connected` ou
`/settings?tiktok=error&reason=...`. Nunca retorna token.

### `POST /api/labs/tiktok-official/product-search`

Prova controlada, sem persistência.

```json
{ "keywords": ["vestido feminino"], "pageSize": 5, "sortField": "units_sold", "sortOrder": "DESC" }
```

`pageSize` é limitado a 5. Resposta inclui `items` normalizados e
`diagnostics.saleRegions` (usado para comprovar o mercado BR).
Erros: 400 validação, 503 sem credenciais/autorização, 401 autorização recusada,
504 timeout, 502 falha do provider.
