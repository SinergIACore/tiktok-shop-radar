# DATABASE

**Não existe banco de dados implementado.**

Nenhuma tabela, migration, ORM ou conexão foi criada na Etapa 01.

## Modelo de domínio atual (apenas em memória)

Definido em `src/types/`:

### Product

`id`, `name`, `thumbnail`, `category`, `viralScore`, `growthRate`,
`engagementRate`, `videoCount`, `creatorCount`, `saturation`,
`firstDetectedAt`, `lastUpdatedAt`.

### Creative

`id`, `productId`, `thumbnail`, `creator`, `views`, `likes`, `comments`,
`engagementRate`, `durationSeconds`, `analysis` (hook, cta, caption, hashtags),
`publishedAt`.

Esses tipos servirão de base para o futuro esquema relacional. Qualquer criação
de tabela deverá vir acompanhada de migration versionada e registro neste
documento.
