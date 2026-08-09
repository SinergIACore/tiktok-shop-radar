# PROVIDERS

## ProductDataProvider

Contrato em `src/services/providers/product-data/ProductDataProvider.ts`:

```ts
interface ProductDataProvider {
  readonly name: string;
  isConfigured(): boolean;
  searchProducts(params: ProductSearchParams): Promise<ProductSearchResult>;
}
```

A escolha do provider ativo acontece em um único lugar:
`src/services/providers/product-data/index.server.ts`.

## Provider atual: Apify

**Por que:** é a forma mais rápida de obter dados reais de TikTok Shop sem
scraping próprio, sem OAuth e sem aprovação da API oficial.

**Endpoint oficial (Apify REST API v2):**

```
POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items?limit=N
Authorization: Bearer <APIFY_API_TOKEN>
Content-Type: application/json
```

Resposta: array JSON com os itens do dataset do Actor.
Documentação: https://docs.apify.com/api/v2

**Actor:** NÃO é fixado em código. É lido de `APIFY_PRODUCT_ACTOR_ID`
(formato `username~actor-name`). Actor validado em uso:
`lurkapi~tiktok-shop-scraper`.

**Input enviado:** shape conservador e comum entre Actors de TikTok Shop
(`keyword`, `keywords`, `searchQueries`, `maxItems`, `country`). Actors ignoram
chaves desconhecidas.

**Mapeamento do schema real (Etapa 02A.3):**

| Campo do Actor     | Campo normalizado      |
| ------------------ | ---------------------- |
| `id` / `productId` | `id`                   |
| `title`            | `name`                 |
| `mainImage`        | `thumbnail`            |
| `imageUrls[0]`     | `thumbnail` (fallback) |
| `productUrl`       | `productUrl`           |
| `categoryPath`     | `category`             |
| `currentPrice`     | `price`                |
| `currency`         | `currency`             |
| `soldCount`        | `soldCount`            |
| `rating`           | `rating`               |
| `reviewCount`      | `reviewCount`          |
| `sellerName`       | `sellerName`           |
| `sellerVideoCount` | `sellerVideoCount`     |
| `gmvContribution`  | `gmvContribution`      |
| `brand`            | `brand`                |
| `businessName`     | `businessName`         |
| `countryCode`      | `countryCode`          |
| `discountPercent`  | `discountPercent`      |
| `commentRate`      | `commentRate`          |

`creatorCount` permanece `null`: o Actor não expõe contagem real de criadores
e `sellerVideoCount` NÃO é usado como substituto.

**Risco de schema:** cada Actor do marketplace tem output próprio e pode mudar
sem aviso. Por isso a normalização (`normalizers/normalizeProduct.ts`) é
defensiva: testa múltiplos nomes de campo e devolve `null` quando o dado não
existe. Nenhum valor é inventado.

**PENDÊNCIA DE VALIDAÇÃO HUMANA:** o Actor concreto (e portanto o schema e o
custo exatos) precisa ser escolhido pelo responsável do projeto. Enquanto
`APIFY_PRODUCT_ACTOR_ID` não estiver definido, a rota LAB responde
"Provider de dados não configurado.".

## Custo e limitações

- Custo depende do Actor escolhido (modelo pay-per-event ou por compute unit)
  somado ao plano Apify. Não há custo enquanto não houver token/Actor.
- `run-sync-get-dataset-items` é síncrono; Actors lentos podem estourar o
  timeout (`APIFY_TIMEOUT_MS`, padrão 120000 ms).
- Limite de itens desta etapa: 1 a 50.

## Lock-in

Baixo: a aplicação depende apenas da interface e do modelo normalizado.
Trocar por `OfficialTikTokProductProvider` ou `CustomProductDataProvider`
exige apenas uma nova classe e uma linha em `index.server.ts` — o frontend
não muda.

## Variáveis de ambiente (server-side)

| Variável                 | Obrigatória | Descrição                          |
| ------------------------ | ----------- | ---------------------------------- |
| `APIFY_API_TOKEN`        | sim         | Token da conta Apify               |
| `APIFY_PRODUCT_ACTOR_ID` | sim         | Actor, ex. `username~actor-name`   |
| `APIFY_TIMEOUT_MS`       | não         | Timeout da chamada (padrão 120000) |

## Input real enviado ao Actor (02C.2B)

```json
{
  "keywords": ["women dress"],
  "keywordSortBy": "best_sellers",
  "maxProductsPerSource": 5,
  "country": "US",
  "includeCreatorCount": false,
  "includeFirstSeen": true,
  "outputDescription": false,
  "outputVariants": false,
  "outputSeller*": false
}
```

- `maxProductsPerSource` é obrigatório: sem ele o Actor coleta 50 produtos por
  keyword e cobra por todos.
- `keywordSortBy` aceita `default | best_sellers | newest | price_asc |
  price_desc`. Usamos `best_sellers` na Discovery.
- **Mercado**: o Actor expõe somente `country`, com enum `["US"]`. Não existe
  `region`/`market`. Nenhum workaround é aplicado — mercados não suportados são
  rejeitados na validação.
- **Não existem** filtros de origem `minSold`, `minReviews` ou `minRating`: o
  corte comercial é local, em `src/server/discovery/quality-filter.ts`.

## TikTokShopOfficialProvider (Etapa TikTok Oficial 01)

Provider paralelo, server-only, selecionado apenas por `DISCOVERY_PROVIDER=tiktok_official`.

**Endpoint documentado** (scope `creator.affiliate_collaboration.read`):

```
POST /affiliate_creator/202405/open_collaborations/products/search
Host: https://open-api.tiktokglobalshop.com
x-tts-access-token: <access token do criador autorizado>
```

Ordenação suportada: `units_sold | commission | commission_rate | product_sales_price`.

**Mapeamento oficial → modelo interno:**

| Campo oficial        | Campo normalizado    |
| -------------------- | -------------------- |
| `id`                 | `id`, `sourceProductId` |
| `title`              | `name`               |
| `main_image_url`     | `thumbnail`          |
| `detail_link`        | `productUrl`         |
| `category_chains[]`  | `category`           |
| `sales_price`        | `price`              |
| `original_price`     | `originalPrice`      |
| `units_sold`         | `soldCount`          |
| `sale_region`        | `saleRegion`, `countryCode` |
| `shop.name`          | `sellerName`, `businessName` |
| `commission.rate`    | `commissionRate`     |
| `commission.amount`  | `commissionAmount`   |
| `commission.currency`| `commissionCurrency` |
| `shop_ads_commission`| `shopAdsCommission`  |
| `has_inventory`      | `hasInventory`       |

Campos sem equivalente (`rating`, `reviewCount`, `gmvContribution`,
`creatorCount`) permanecem `null` — nada é inventado.

**PENDÊNCIAS NÃO COMPROVADAS** (isoladas em `signature.ts`, `oauth.server.ts`
e `TikTokShopOfficialProvider.ts`):

1. Algoritmo exato de assinatura (`sign`) — só é validável com um 200 real.
2. Nomes exatos dos campos do body de busca (`keyword`/`keywords`, `page_size`,
   `sort_field`, `sort_order`).
3. Formato da resposta de token (`access_token_expire_in` etc.).
4. Disponibilidade real do mercado BR (`sale_region = BR`) — precisa de
   resposta real da API para ser considerada aprovada.
