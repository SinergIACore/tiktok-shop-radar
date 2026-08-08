# DEPLOYMENT

## Runtime alvo

Node.js **22** (`engines: ">=22 <23"`). Node 18 é EOL e não deve ser usado.

O build de produção é gerado pelo Nitro com preset **`node-server`**, definido em
`vite.config.ts`. O output fica em `.output/`, com entrada de servidor em
`.output/server/index.mjs`. Nenhum runtime Cloudflare Worker, Deno ou serverless
proprietário é usado em produção.

> Dentro do ambiente Lovable o preset é forçado pela plataforma (o override é
> ignorado); fora dele — GitHub Actions, Docker, VPS — vale `node-server`.

## Comandos

```bash
npm install      # instala dependências (não há package-lock.json; ver abaixo)
npm run build    # gera .output/ (preset node-server)
npm run start    # node .output/server/index.mjs
npm run dev      # desenvolvimento
```

O repositório versiona `bun.lock` e não `package-lock.json`, por isso o
Dockerfile usa `npm install` em vez de `npm ci`.

## Porta e host

O servidor Nitro ouve em `0.0.0.0` e respeita `PORT` (padrão `3000`) e `HOST`.
Nenhum `localhost` é fixado no código.

## Docker

Arquivo: `docker/Dockerfile` (multi-stage).

- **builder**: `node:22-alpine`, `npm install`, `npm run build`.
- **runner**: `node:22-alpine`, `NODE_ENV=production`, `npm install --omit=dev`
  (inclui `pg`), copia `.output/`, `package.json`, `scripts/migrate.mjs` e
  `db/migrations/`; usuário `node`, `EXPOSE 3000`,
  `CMD ["node", ".output/server/index.mjs"]`. Nenhum `src/` nem `.env` entra na
  imagem final, e a migration **não** roda no startup.

```bash
docker build -f docker/Dockerfile -t tikradar-test .
docker run --rm -p 3000:3000 tikradar-test
```

## Migrations em produção

Operação explícita, executada no terminal/console do container do serviço app
no EasyPanel (com `DATABASE_URL` já definida no serviço):

```bash
npm run migrate
```


`.dockerignore` exclui `node_modules`, `.git`, `.env`, `.env.*` (mantendo
`.env.example`), `dist`, `.output`, `.wrangler`, `coverage`, logs e temporários.

## EasyPanel

| Item | Valor |
| --- | --- |
| Fonte | Git SSH |
| Repositório | `git@github.com:SinergIACore/tiktok-shop-radar.git` |
| Branch | `main` |
| Build path | `/` |
| Build method | Dockerfile |
| Dockerfile | `docker/Dockerfile` |
| Porta | `3000` |

Variáveis de ambiente server-side (sem valores reais no repositório):

```
APIFY_API_TOKEN=
APIFY_PRODUCT_ACTOR_ID=
APIFY_TIMEOUT_MS=
```

Nixpacks não deve ser usado — o build method é Dockerfile.

## Fonte de verdade

O repositório GitHub é a fonte de verdade. Nenhum segredo é commitado; `.env*`
está no `.gitignore` e apenas `.env.example` é versionado.

## Infraestrutura

```
GitHub → Docker (Node 22) → EasyPanel (VPS/Hostinger) → Cloudflare (DNS/SSL/cache)
```

Cloudflare é usado apenas como DNS/CDN na borda, nunca como runtime da aplicação.

## Variáveis de ambiente

Somente variáveis `VITE_*` chegam ao navegador. Chaves privadas são configuradas
no ambiente do container (EasyPanel), nunca no build do frontend.
