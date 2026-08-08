# TikRadar AI — imagem de produção (Node.js 22 / Nitro node-server)
# Build:  docker build -f docker/Dockerfile -t tikradar .
# Run:    docker run --rm -p 3000:3000 tikradar

# ---------- Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Dependências (não há package-lock.json no repositório; ver docs/DEPLOYMENT.md)
COPY package.json ./
RUN npm install --no-audit --no-fund

# Código-fonte e build (Nitro gera output Node em .output/)
COPY . .
RUN npm run build

# ---------- Runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# package.json + dependências de produção (inclui `pg`, usado pelo runner de migrations).
# Ver D-010: o repositório não versiona package-lock.json, por isso `npm install`.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Output do servidor (runtime da aplicação).
COPY --from=builder /app/.output ./.output

# Migrations explícitas: `npm run migrate` dentro do container.
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY db/migrations ./db/migrations

USER node
EXPOSE 3000

# Migration NUNCA roda no startup — é operação manual e explícita.
CMD ["node", ".output/server/index.mjs"]
