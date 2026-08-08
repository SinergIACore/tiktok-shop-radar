# DEPLOYMENT

## Estado atual

Aplicação frontend sem backend. Executa localmente com Node.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run preview  # validação local do build
```

## Fonte de verdade

O repositório GitHub é a fonte de verdade do código. Nenhum segredo é
commitado; `.env*` está no `.gitignore` e apenas `.env.example` é versionado.

## Infraestrutura prevista

```
GitHub → build → Docker → EasyPanel (VPS/Hostinger) → Cloudflare (DNS/SSL/cache)
```

Banco (Supabase externo ou PostgreSQL próprio) e storage S3/R2 serão adicionados
somente quando houver backend.

## Containerização

Ainda não implementada — ver `NEXT_STEP.md`. Depende de definir se a produção
servirá build estático (Nginx) ou um servidor Node com SSR.

## Variáveis de ambiente

Somente variáveis `VITE_*` chegam ao navegador. Chaves privadas devem ser
configuradas no ambiente do servidor/container, nunca no build do frontend.
