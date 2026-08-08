# TikRadar AI

Ferramenta de **Product Intelligence + Creative Intelligence** para TikTok / TikTok Shop.

## Status atual

**Etapa 01 — Fundação, arquitetura e interface inicial.**
Aplicação 100% frontend, com dados mockados. Não existe backend, banco de dados,
autenticação ou integração externa neste momento.

## Tecnologias

- React 19 + TypeScript
- Vite
- TanStack Router / TanStack Start (roteamento file-based)
- TanStack Query (camada de leitura de dados)
- Tailwind CSS v4
- shadcn/ui + Lucide Icons

## Como executar localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha conforme necessário.
Nenhuma variável é obrigatória na Etapa 01. Segredos nunca são commitados
nem expostos no bundle do navegador (somente `VITE_*` chega ao browser).

## Estrutura do projeto

```
src/
  assets/       imagens usadas na interface
  components/   componentes de UI (layout, intelligence, ui/shadcn)
  config/       configuração da aplicação (sem segredos)
  hooks/        hooks reutilizáveis
  lib/          utilitários e formatadores
  mocks/        dados mockados de desenvolvimento
  routes/       rotas file-based
  services/     serviços e repositórios (camada de acesso a dados)
    providers/  reservado para integrações externas futuras
  types/        tipos de domínio
docs/           documentação viva do projeto
```

## Comandos

| Comando           | Descrição                  |
| ----------------- | -------------------------- |
| `npm run dev`     | ambiente de desenvolvimento |
| `npm run build`   | build de produção           |
| `npm run preview` | pré-visualização do build   |
| `npm run lint`    | análise estática            |
| `npm run format`  | formatação com Prettier     |

## Arquitetura resumida

A UI nunca acessa dados diretamente: ela consome `services`, que dependem de
interfaces de `repositories`. Hoje o repositório é mockado; futuramente pode ser
substituído por uma API própria ou Supabase externo sem alterar componentes.

Nenhum recurso proprietário de plataforma é utilizado. O projeto roda com
`npm install` / `npm run dev` em qualquer ambiente Node.

## Documentação

Ver a pasta [`/docs`](./docs).
