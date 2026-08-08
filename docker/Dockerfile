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

# Somente o output do servidor é necessário em runtime.
COPY --from=builder /app/.output ./.output

USER node
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
