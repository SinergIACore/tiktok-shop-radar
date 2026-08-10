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

## Estado atual (Etapa 02A.2 — Node/Docker)

- Segredos (`APIFY_API_TOKEN`, `APIFY_PRODUCT_ACTOR_ID`, `APIFY_TIMEOUT_MS`) são
  variáveis de ambiente do container, injetadas pelo EasyPanel em runtime. Não
  entram no build nem na imagem.
- Nenhuma variável sensível usa prefixo `VITE_`, portanto nada disso chega ao
  bundle do navegador; a leitura ocorre apenas dentro do handler server-side.
- `.dockerignore` exclui `.env` e `.env.*` (mantendo apenas `.env.example`), de
  modo que arquivos de segredo nunca entram no contexto de build.
- A imagem final copia somente `.output/`; código-fonte, `node_modules` de
  desenvolvimento e histórico Git ficam fora do runtime, e o processo roda com o
  usuário não-root `node`.

## Estado atual (Etapa TikTok Oficial 01)

- `TIKTOK_SHOP_APP_KEY`, `TIKTOK_SHOP_APP_SECRET`, `TIKTOK_SHOP_REDIRECT_URI` e
  `TIKTOK_TOKEN_ENCRYPTION_KEY` são lidas apenas dentro de handlers/módulos
  server-only. Nenhuma variável `VITE_TIKTOK*` existe (teste automatizado L).
- O App Secret nunca é devolvido ao frontend nem aparece em log; a URL de troca
  de token (que o contém) nunca é logada.
- Access/refresh tokens são gravados na tabela `tiktok_authorizations` sempre
  cifrados com AES-256-GCM; nunca em `localStorage`, nunca em resposta HTTP.
- Logs do OAuth registram apenas status, store e identidade autorizada.

## Estado atual (Correção Creator OAuth)

- Fluxo oficial: CREATOR AUTHORIZATION (`https://shop.tiktok.com/alliance/creator/auth`).
  `TIKTOK_SHOP_SERVICE_ID` e o fluxo de Seller Authorization foram removidos.
- `state` gerado com `crypto.randomBytes(32)`, guardado em registro server-side
  single-use com TTL de 10 min e amarrado ao navegador por cookie HttpOnly
  (`SameSite=Lax`, `Secure` em HTTPS). Callback só troca o code após validar.
- Resposta de token só é aceita com `code === 0` e `user_type === 1` (Creator).
- `access_token`, `refresh_token`, `open_id`, `user_type`, `granted_scopes` e
  expirações são persistidos; tokens sempre cifrados com AES-256-GCM.
- Refresh automático em `/api/v2/token/refresh`, revalidando user_type/open_id.
- Chamadas Affiliate Creator (`/affiliate_creator/202508/profiles`,
  `/affiliate_creator/202405/showcases/products`) são exclusivamente
  server-side, assinadas e com header `x-tts-access-token`.
