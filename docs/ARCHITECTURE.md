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

As demais integrações (AIProvider, StorageProvider, VideoProvider,
TranscriptionProvider) continuam não implementadas.

## Estado e leitura de dados

TanStack Query é usado para leitura assíncrona (cache, loading). Isso mantém o
mesmo padrão quando os repositórios passarem a fazer chamadas HTTP reais.

## Design system

Definido em `src/styles.css` com tokens `oklch` (tema escuro como padrão).
Cores semânticas dedicadas: `growth`, `alert`, `opportunity`, `viral`.
Componentes não usam cores literais.

## Portabilidade

- Nenhum SDK, endpoint ou serviço proprietário de plataforma de
  desenvolvimento é utilizado.
- Toda a stack é open source e executável em qualquer host Node.
- O roteamento é fornecido por TanStack Router, que já acompanha o template
  base do projeto (ver DECISIONS.md).
