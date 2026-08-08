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
