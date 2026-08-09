# INTEGRATIONS

## Existentes

| Integração                    | Finalidade                          | Status                                                    |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Apify (`ProductDataProvider`) | consulta de produtos do TikTok Shop | prova técnica (Etapa 02A), apenas em `/labs/product-data` |

Detalhes de endpoint, Actor, custo e substituição: `PROVIDERS.md`.

## Planejadas (não implementadas)

| Integração           | Finalidade                               | Status       |
| -------------------- | ---------------------------------------- | ------------ |
| TikTok / TikTok Shop | descoberta de produtos, vídeos, métricas | não iniciado |
| Provedor de IA       | análise e geração de criativos           | não iniciado |
| Storage S3/R2        | mídias e arquivos                        | não iniciado |
| Transcrição          | áudio → texto                            | não iniciado |
| Publicação           | distribuição de conteúdo                 | não iniciado |

Cada integração será acessada por meio de um provider em
`src/services/providers/`, nunca diretamente por componentes. Chamadas que
exijam segredos deverão ocorrer no servidor.

## TikTok Shop Open API (oficial) — Etapa TikTok Oficial 01

| Integração              | Finalidade                                   | Status |
| ----------------------- | -------------------------------------------- | ------ |
| TikTok Shop Open API    | Open Collaboration Products (scope creator)  | prova controlada, opt-in por `DISCOVERY_PROVIDER=tiktok_official` |

Adicionada em paralelo: o provider Apify continua sendo o padrão da aplicação.
