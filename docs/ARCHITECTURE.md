# ARCHITECTURE

## Visão geral

Aplicação frontend React + TypeScript, empacotada com Vite e roteada por
TanStack Router (file-based routing em `src/routes`).

## Camadas

```
UI (routes + components)
        │  consome
        ▼
Services (ProductService, CreativeService)
        │  depende de interfaces
        ▼
Repositories (ProductRepository, CreativeRepository)
        │  implementação atual
        ▼
Mock repositories → src/mocks
```

Regras:

- Componentes nunca importam `src/mocks` diretamente.
- Serviços recebem repositórios por injeção no construtor.
- Trocar mock por API significa criar uma nova implementação de repositório e
  alterar apenas a instância exportada em `src/services/*.service.ts`.

## Providers

`src/services/providers/product-data/` implementa a aquisição de dados
externos de produtos (Etapa 02A):

```
UI (/labs/product-data)
        │  fetch
        ▼
GET /api/products/search   (src/routes/api/products/search.ts — server-side)
        │
        ▼
ProductDataProvider (interface)
        │
        ▼
ApifyProductDataProvider  →  normalizeProduct  →  NormalizedProduct
```

Regras:

- Componentes nunca acessam o formato bruto do provider.
- Secrets são lidos apenas dentro do handler server-side.
- Trocar de fornecedor = nova classe + uma linha em
  `product-data/index.server.ts`. Ver `PROVIDERS.md`.

## Persistência (Etapa 02B.1)

```
POST /api/labs/products/ingest
        │
        ▼
ProductDataProvider → normalizeProduct → NormalizedProduct
        │
        ▼
ProductIngestionService  (src/server/ingestion/)
        │
        ▼
ProductStore  (src/server/persistence/index.server.ts)
        ├── PostgresProductStore  (DATABASE_URL definida)
        └── MemoryProductStore    (dev sem banco / testes)
        │
        ▼
products (identidade)  1 ── N  product_snapshots (observações)
```

Regras:

- O provider não conhece persistência; o serviço de ingestão não chama o
  provider. Ver D-012: consulta externa e ingestão histórica são operações
  separadas.
- `GET /api/products/search` continua sem gravar nada.
- Leitura histórica: `GET /api/labs/products/:productId/history`
  (`observedAt ASC`) e tela LAB `/labs/product-history`.
- Dashboard e `/products` continuam com mocks. Ver `DATABASE.md`.

## Leitura e métricas (Etapa 02B.2)

```
GET /api/labs/products/metrics
        │
        ▼
ProductReadRepository  (src/server/read/)
        ├── PostgresProductReadRepository (window function, sem N+1)
        └── MemoryProductReadRepository   (dev sem banco / testes)
        │
        ▼
computeProductMetrics  (src/server/metrics/product-metrics.ts — puro)
        │
        ▼
LAB /labs/product-metrics
```

Separação de responsabilidades:

- Provider → coleta externa
- IngestionService → escrita
- Repository → leitura (nunca chama provider, nunca grava)
- Metrics → cálculo puro

Dashboard e `/products` continuam mockados.

As demais integrações (AIProvider, StorageProvider, VideoProvider,
TranscriptionProvider) continuam não implementadas.

## Estado e leitura de dados

TanStack Query é usado para leitura assíncrona (cache, loading). Isso mantém o
mesmo padrão quando os repositórios passarem a fazer chamadas HTTP reais.

## Design system

Definido em `src/styles.css` com tokens `oklch` (tema escuro como padrão).
Cores semânticas dedicadas: `growth`, `alert`, `opportunity`, `viral`.
Componentes não usam cores literais.

## Runtime de produção

Build: Vite + TanStack Start, empacotado pelo Nitro com preset `node-server`.
Output em `.output/`, entrada `.output/server/index.mjs`, executado por Node 22
dentro de um container Docker (`docker/Dockerfile`), ouvindo em `0.0.0.0:3000`
(`PORT` respeitado). SSR e as rotas de servidor (`/api/products/search`)
executam nesse mesmo processo Node, onde `process.env` está disponível.

## Portabilidade

- Nenhum SDK, endpoint ou serviço proprietário de plataforma de
  desenvolvimento é utilizado.
- Toda a stack é open source e executável em qualquer host Node.
- O roteamento é fornecido por TanStack Router, que já acompanha o template
  base do projeto (ver DECISIONS.md).
- `@lovable.dev/vite-tanstack-config` é `devDependency` de build (pacote npm
  público, MIT). Não participa do runtime: a imagem final contém apenas
  `.output/`. Ver D-009.

## Etapa 02B.3 — leitura real na página `/products`

Fluxo de leitura:

```text
PostgreSQL / Memory
  → ProductReadRepository (listProductsPage / getProductWithMetrics / listHistory)
  → product-metrics (cálculo puro)
  → toProductListViewModel (adaptador puro)
  → GET /api/products (server-only)
  → RealProductService → httpRealProductRepository
  → UI /products e /products/:id
```

Regras mantidas: a UI não conhece tipos de banco; `pg` continua carregado
somente via `await import()` dentro do handler (um import dinâmico por
statement, sem `Promise.all`), portanto fora do bundle client.

O Dashboard continua usando `productService`/`creativeService` com mocks —
sua migração é uma etapa separada.

## Etapa 02B.4 — Dashboard com dados reais

```text
PostgreSQL / Memory
  → ProductReadRepository (getDashboardSummary + listProductsPage)
  → DashboardReadService (src/server/dashboard/)
  → toDashboardResponse (adaptador puro)
  → GET /api/dashboard
  → DashboardService → httpDashboardRepository
  → UI /
```

Regras: o Dashboard não consulta tabelas nem tipos de banco, não chama o
provider Apify, não grava e não recalcula métricas (elas vêm de
`src/server/metrics/product-metrics.ts`). O resumo é uma única query agregada
(sem N+1) e cada listagem é limitada a 6 itens.

Fonte de dados por tela (indicador contextual `DataSourceBadge`):

| Tela                            | Fonte                |
| ------------------------------- | -------------------- |
| `/` (Dashboard)                 | PostgreSQL real      |
| `/products`, `/products/:id`    | PostgreSQL real      |
| `/labs/*`                       | PostgreSQL real      |
| Criativos, Análises, Biblioteca | mocks / demonstração |

O selo global "dados mockados" do cabeçalho foi removido.

## Etapa 02C.1 — Motor de tendência histórica (LAB)

```
product_snapshots (ASC por observed_at)
  → src/server/intelligence/trend-metrics.ts    (puro: intervalos, velocidades)
  → src/server/intelligence/trend-classifier.ts (puro: TrendStatus, TrendEvidence)
  → src/server/intelligence/trend-explanation.ts(puro: texto determinístico)
  → src/server/intelligence/trend-engine.ts     (analyzeProductTrend)
  → src/server/intelligence/trend-read.service.ts (orquestra repositório)
  → GET /api/labs/products/trends
  → GET /api/labs/products/:productId/trend
  → LAB /labs/product-trends
```

A camada `intelligence` é pura: não faz `fetch`, não importa `pg`, não acessa o
banco e não grava. Recebe apenas uma lista de snapshots e devolve a análise.
Um teste automatizado (caso P) garante essa restrição lendo o código-fonte.

Fórmulas (NULL nunca vira zero; qualquer operando NULL ⇒ resultado NULL):

- `timeDeltaHours = (current.observedAt − previous.observedAt) / 1h`
- `salesVelocity = soldCountDelta / timeDeltaHours` (somente se > 0h)
- `gmvVelocity = gmvDelta / timeDeltaHours`
- `reviewVelocity = reviewCountDelta / timeDeltaHours`
- `sellerVideoVelocity = sellerVideoCountDelta / timeDeltaHours`
- `salesAcceleration = velocityCurrent − velocityPrevious` (diferença entre
  duas velocidades observadas; não é aceleração física normalizada por tempo)
- `velocityRatio = velocityCurrent / velocityPrevious` (somente se
  `velocityPrevious > 0`)
- `growthConsistency = positiveSalesIntervals / validSalesIntervals`

`TrendStatus` (ordem de avaliação): `insufficient_data` → `accelerating`
(`velocityCurrent > 0` e `acceleration > 0`, exige 3+ snapshots válidos) →
`decelerating` (`velocityCurrent >= 0` e `acceleration < 0`) → `declining`
(`delta < 0`) → `growing` (`delta > 0` e `velocity > 0`) → `stable`
(`delta = 0`).

`declining` significa "o contador observado de vendas diminuiu" — pode ser
correção do provider, não necessariamente demanda real negativa.

`TrendEvidence` descreve apenas quantidade/qualidade de observações válidas
(low < 3, medium 3–5, high 6+ snapshots válidos). **Não é probabilidade.**

Snapshots são ordenados ASC antes de qualquer cálculo; intervalos `<= 0h` não
produzem velocidade e não contam como observação válida de vendas.

Tendência observada ≠ previsão: esta etapa descreve o passado. Não há Viral
Score, ranking inteligente nem projeção futura.

## Camada de descoberta (Etapa 02C.2)

```
DiscoverySearch (intenção)
        ↓ execução manual
DiscoveryService
        ↓ um termo por vez (custo controlado)
ProductDataProvider → Normalizer → ProductIngestionService
        ↓                                     ↓
ProductDiscovery (origem)            Product + ProductSnapshot
        ↓
ProductReadRepository.listProductsByIds → trend-engine (02C.1) → UI
```

Regras que a etapa preserva:

- A descoberta **não** duplica ingestão: ela reutiliza o
  `ProductIngestionService` e a deduplicação de snapshots existente.
- A descoberta **não** calcula tendência: o status vem sempre do motor puro da
  Etapa 02C.1.
- Nenhuma execução é automática. Não existe scheduler, cron nem worker.
- Limites de custo (`maxTermsPerRun`, `maxProductsPerTerm`) são validados no
  backend, com teto rígido, e nunca confiados no cliente.
- Termos são executados em sequência; falha em um termo não aborta a execução.
- Nenhum segredo chega ao frontend: a UI fala apenas com `/api/discovery/*`.
