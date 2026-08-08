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

## Estado atual

Nenhum segredo é necessário ou utilizado na Etapa 01. Não há autenticação,
sessão, cookie ou armazenamento de credenciais.
