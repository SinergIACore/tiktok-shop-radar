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
