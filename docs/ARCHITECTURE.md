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
