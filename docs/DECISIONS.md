# DECISIONS

## D-001 — Sem backend proprietário de plataforma

Nenhum recurso de backend gerenciado pelo ambiente de desenvolvimento foi
ativado: sem banco, sem autenticação, sem storage, sem funções serverless.
A aplicação é 100% frontend nesta etapa.

## D-002 — Roteador: TanStack Router em vez de React Router DOM

O prompt sugeriu React Router. O template base do projeto já utiliza TanStack
Router / TanStack Start, e trocar de roteador exigiria reescrever a estrutura
de rotas e a inicialização do app. TanStack Router é open source, roda em
qualquer host Node e não gera vendor lock-in, portanto o requisito de
portabilidade é preservado. **Ponto aberto para validação humana**: se a
padronização em React Router for obrigatória, isso deve virar uma etapa própria
de migração.

## D-003 — Camada services + repositories

A UI depende de serviços; serviços dependem de interfaces de repositório. Isso
permite substituir mocks por API/Supabase externo sem tocar em componentes.

## D-004 — TanStack Query para leitura

Já presente no template. Padroniza estados de carregamento e cache desde os
mocks, evitando refatoração quando houver rede.

## D-005 — Tema escuro único

Dark mode é o visual principal, sem alternância clara/escura, para reduzir
complexidade nesta etapa.

## D-006 — Docker adiado

Ver `NEXT_STEP.md`. Decisões de runtime de produção (Node adapter, porta,
processo de start) ainda não foram definidas.

## D-007 — Imagens locais

Miniaturas de produtos são imagens geradas e versionadas em `src/assets`, para
evitar dependência de URLs externas.

## D-008 — Runtime de produção: Node 22 + Nitro `node-server`

O deploy via Nixpacks falhou por detectar Node 18 (EOL). A produção passa a ser
Docker com `node:22-alpine` e build Nitro com preset `node-server`, iniciado por
`node .output/server/index.mjs`. Cloudflare Workers, Deno e serverless
proprietário estão descartados como runtime. `vite preview` não é servidor de
produção.

## D-009 — `@lovable.dev/vite-tanstack-config` mantida (build-time)

Auditoria: o pacote é uma `devDependency` que apenas compõe plugins Vite
(TanStack Start, React, Tailwind, tsconfig-paths, Nitro) durante o build. Não há
importação em runtime — o output `.output/server/index.mjs` não a referencia.
Ele força preset Cloudflare **somente** quando detecta o sandbox da plataforma
(`LOVABLE_SANDBOX` / `DEV_SERVER__PROJECT_PATH`); fora dele, o override
`nitro: { preset: "node-server" }` do `vite.config.ts` prevalece — verificado no
build (`.output/nitro.json` → `"preset": "node-server"`).

Decisão: **não substituir agora**. É pacote npm público (MIT), presente apenas
no estágio builder do Docker e ausente da imagem final. Substituí-lo por config
Vite/TanStack/Nitro manual continua possível a qualquer momento, sem impacto no
runtime, e fica registrado como opção futura.

## D-010 — `npm install` no Dockerfile

O repositório versiona `bun.lock` e não `package-lock.json`, portanto `npm ci`
não é aplicável. Se builds determinísticos se tornarem requisito, gerar e
versionar `package-lock.json` (ou usar imagem com Bun) em etapa própria.
