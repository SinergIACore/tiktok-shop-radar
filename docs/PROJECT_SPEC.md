# PROJECT_SPEC

## Objetivo

TikRadar AI é uma ferramenta de inteligência de produtos e criativos para
TikTok / TikTok Shop. O fluxo conceitual de longo prazo é:
DESCOBRIR → ANALISAR → IDENTIFICAR PRODUTO → ANALISAR CRIATIVO → GERAR NOVA
VERSÃO ORIGINAL → PUBLICAR → MEDIR → APRENDER.

## Escopo implementado (Etapa 01)

- Shell da aplicação com sidebar colapsável e header fixo.
- Navegação: Dashboard, Produtos, Criativos, Análises, Biblioteca, Configurações.
- Dashboard com 4 indicadores mockados (produtos monitorados, produtos em
  ascensão, criativos analisados, oportunidades detectadas) e seção
  "Produtos em Ascensão".
- Filtros visuais de período (24h / 3 dias / 7 dias / 30 dias), categoria e
  ordenação (Viral Score, Crescimento, Engajamento, Criadores).
- Página `/products` com alternância entre grade e tabela.
- Página `/products/:productId` com métricas do produto e seção "Top Criativos".
- Drawer de análise de criativo com métricas, gancho, CTA, legenda e hashtags,
  além dos botões "Analisar Criativo" e "Criar Minha Versão", que exibem
  a mensagem: "Funcionalidade será conectada em uma próxima etapa."
- Página `/settings` com as áreas TikTok, Inteligência Artificial, Storage,
  Publicação e Sistema, todas marcadas como "Não configurado".

## Fora do escopo desta etapa

Backend, banco de dados, autenticação, storage, scraping, APIs de TikTok,
provedores de IA, download/transcrição de vídeo, publicação automática,
pagamentos e multiusuário.

## Dados

Todos os dados exibidos vêm de `src/mocks/` através da camada de serviços.
Não há chamadas de rede a APIs externas.

## Viral Score

Indicador visual de 0 a 100. Nesta etapa é um valor mockado; nenhum algoritmo
de cálculo foi implementado.
