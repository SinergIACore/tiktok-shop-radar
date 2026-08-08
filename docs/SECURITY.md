# SECURITY

## Regras permanentes

1. Chaves privadas nunca são enviadas ao browser quando a chamada puder ocorrer
   no servidor.
2. Segredos ficam no ambiente do servidor/container, nunca no código.
3. Nunca commitar `.env`, `.env.local`, `.env.production`, tokens, API keys,
   senhas ou credenciais. Apenas `.env.example` (somente nomes) é versionado.
4. `client_secret` nunca é exposto ao frontend.
5. Tokens OAuth são tratados exclusivamente no backend.
6. Segredos jamais aparecem em logs.
7. Tokens sensíveis não são armazenados em `localStorage`.
8. Apenas variáveis com prefixo `VITE_` são consideradas públicas.

## Estado atual (Etapa 02A)

- O token do provider de dados (`APIFY_API_TOKEN`) existe **somente** no
  ambiente server-side e é lido dentro do handler de
  `GET /api/products/search`. Não há variável `VITE_APIFY_*`.
- O navegador nunca chama a API do provider diretamente; sempre passa pelo
  endpoint próprio da aplicação.
- Logs registram apenas provider, status, duração e quantidade de resultados —
  nunca token, credenciais, headers de autenticação ou payload completo.
- Mensagens de erro repassam o texto do provider truncado (500 chars) e não
  incluem credenciais.
- Não há autenticação, sessão, cookie ou armazenamento de credenciais.
