# Remodelagem do Prospector — fork sevinicius

**Data:** 2026-07-10 · **Autor:** Vinicius Fernandes de Jesus (com Claude)
**Repo:** https://github.com/sevinicius/PROSPECTOR-DE-SITES (fork de ArrecheNeto/PROSPECTOR-DE-SITES, upstream preservado)

## Objetivo

Transformar o plugin num sistema pessoal de gestão de prospecção, clientes e renda:

1. Dashboard deixa de ser HTML único de 43KB → estrutura multi-arquivo organizada
2. Design próprio, identidade "VF" — não parecer sistema genérico gerado por IA
3. Aba "Sites" → **"Projetos"** (vende site, automação, sistema etc.)
4. **Clientes ativos**: quem fecha vira cliente ativo automaticamente; sai só quando "encerrado"
5. Financeiro com **lucro real**: receita − custos por cliente (setup e mensal)
6. Clientes de fora entram pelo botão **+ Cliente** no painel ou via chat com o Claude
   (fechado direto, ou "cliente em potencial" com dados iniciais + proposta)
7. Espelho na **Mente Global**: eventos de cliente viram conhecimento consultável em qualquer sessão

## Arquitetura do painel (multi-arquivo, sem build)

O `dashboard-server.py` já serve arquivos estáticos + API REST (`/api/leads`, `/api/config`).
A remodelagem troca o HTML único por uma pasta `painel/` servida por ele:

```
skills/dashboard-leads/references/painel/
  index.html            shell: sidebar + <main>
  css/tokens.css        design tokens (cores, tipografia, espaçamento)
  css/base.css          reset, layout, componentes (tabela, card, modal, form)
  js/api.js             fetch da API (listar, upsert, patch, delete, config)
  js/estado.js          store em memória, filtros, derivações financeiras
  js/ui.js              helpers de render, modal, toast, formatadores (R$, data)
  js/app.js             router por hash + navegação
  js/views/geral.js     visão geral (resumo, funil, alertas)
  js/views/pipeline.js  kanban drag & drop
  js/views/projetos.js  ex-"Sites": entregas por cliente (qualquer serviço)
  js/views/clientes.js  carteira: ativos, potenciais, form + Cliente
  js/views/financeiro.js lucro, renda mensal líquida, projeção
  js/views/contratos.js
  js/views/config.js
```

- **Sem framework e sem build**: JS vanilla em ES modules, servidos por HTTP. Roda com duplo
  clique no `iniciar-dashboard.bat` como sempre.
- **Modo file:// (abrir o HTML sem servidor) é descontinuado** — era só-leitura e o Python já
  era requisito de fato. O servidor passa a ser o único modo. Fallback de importação de
  snapshot antigo é mantido no server para migração.
- Setup copia a pasta `painel/` inteira + `dashboard-server.py` + `iniciar-dashboard.bat`.
- Skills passam a atualizar **apenas o banco** — sem regenerar HTML com snapshot embutido.

### Mudanças no dashboard-server.py

- `/` → serve `painel/index.html`
- Novas colunas em `CAMPOS` + ALTERs idempotentes (migração automática de bancos existentes)
- Resto da API inalterada (compatível com o que já existe)

## Banco (SQLite `prospector.db`)

Novas colunas na tabela `leads`:

| Coluna | Tipo | Uso |
|---|---|---|
| `servico` | TEXT DEFAULT 'site' | site · automacao · sistema · outro |
| `origem` | TEXT DEFAULT 'prospeccao' | prospeccao · indicacao · externo |
| `custoSetup` | REAL DEFAULT 0 | custo único do projeto (terceiros, APIs, setup) |
| `custoMensal` | REAL DEFAULT 0 | custo recorrente (hospedagem, ferramentas) |

Status: `novo → redesenhado → publicado → proposta → respondeu → fechado` (+ `descartado`).
**Novo status terminal: `encerrado`.**

- **Cliente ativo = status `fechado`** (fechou → entrou na carteira automaticamente)
- Encerrar contrato → `encerrado` (sai dos ativos, histórico preservado)

## Financeiro (derivações, calculadas no front)

- **Lucro por cliente** = (valor − custoSetup) + meses ativos × (manutencao − custoMensal)
- **Renda mensal líquida (MRR líquido)** = Σ ativos (manutencao − custoMensal)
- **Recebido / a receber** = como hoje, via flag `pago`
- **Projeção 12 meses** = MRR líquido × 12 + pipeline ponderado

## Identidade visual (anti-genérico)

Referência: ferramenta de mesa profissional — "ledger de estúdio", não SaaS template.

- **Layout:** sidebar vertical fixa à esquerda (marca "VF" + navegação com contadores),
  conteúdo denso à direita. Nada de tabs-pílula no topo.
- **Cores:** grafite profundo (#151714 fundo, #1D201C painéis), tinta clara (#E9E6DD),
  acento único **âmbar** (#E0A83C) para números-chave e ações. Verde/vermelho discretos
  só para dinheiro (positivo/negativo). Sem gradientes, sem glassmorphism, sem emoji.
- **Tipografia:** Fraunces (display, números grandes e títulos — via Google Fonts com
  fallback Georgia), Inter (UI), IBM Plex Mono (valores, tabelas, datas).
- **Componentes:** tabelas densas com linhas finas, cards de kanban chapados com borda,
  modais secos, microcopy em primeira pessoa ("minha carteira", "meu mês").

## Cadastro via chat (skills do plugin)

`dashboard-leads/SKILL.md` atualizado com:

- "fechei um cliente X por N" → upsert `status='fechado'`, `origem` conforme contexto,
  `servico`, `valor`, e pergunta custos/manutenção se não informados
- "tenho um cliente em potencial X, proposta Y" → upsert `status='proposta'` com dados
  iniciais + proposta em `obs`, `origem='indicacao'|'externo'`
- "encerrei o contrato do X" → `status='encerrado'`
- Toda mudança de dado ≙ upsert no banco (o painel lê ao vivo — sem snapshot)

## Integração Mente Global

- Registrar `F:\FREELAS\Gestão pessoal` na Mente (`project-resolve --register` via init-esteira)
- Cada cliente vira **entidade** (`memory_upsert_entity`, tipo `cliente`) e cada evento
  relevante (fechou, proposta, encerrou, valores) vira `memory_record_event` — consultável
  de qualquer sessão/projeto
- Cliente com projeto registrado na esteira (ex. Comanda Fácil) ganha relação entidade↔projeto
  (`memory_add_relation`)
- Gatilho: as mesmas instruções de skill que fazem o upsert no SQLite instruem o espelho
  na Mente (SQLite = fonte operacional; Mente = memória semântica)

## Distribuição

- `.claude-plugin/marketplace.json` do fork renomeado para `sevinicius-plugins`
- Instalação local passa a vir de `sevinicius/PROSPECTOR-DE-SITES`
- Upstream fica como remote para puxar melhorias do autor original via merge

## Fora de escopo (por enquanto)

- Publicação/deploy de sites (usuário decidiu deixar por último; publicador FTP já instalado e inerte)
- Multi-usuário, auth, sync em nuvem do banco
- Reescrita dos fluxos de prospecção/redesign/proposta (continuam como no upstream)

## Testes / verificação

- Migração: banco existente ganha colunas novas sem perder dados (ALTERs idempotentes)
- API: CRUD de leads inalterado + campos novos persistindo
- Painel: cada view renderiza com banco vazio e com dados; kanban salva status via PUT
- Fluxo ponta a ponta: cadastrar cliente externo pelo form → aparece em Ativos → lucro calculado
