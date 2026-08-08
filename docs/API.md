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
      "creatorCount": null,
      "source": "apify",
      "sourceProductId": "..."
    }
  ]
}
```

Campos não retornados pelo provider vêm como `null`.

### Erros

| Status | code             | Situação                          |
| ------ | ---------------- | --------------------------------- |
| 400    | `invalid_params` | keyword ausente                   |
| 503    | `not_configured` | token/Actor não configurados      |
| 504    | `timeout`        | provider não respondeu a tempo    |
| 502    | `provider_error` | erro retornado pelo provider      |
| 502    | `invalid_response` | formato inesperado do provider  |

Formato: `{ "error": { "code": "...", "message": "..." } }`.
Mensagens nunca contêm token ou headers de autenticação.

Nenhuma autenticação é exigida nesta etapa.
