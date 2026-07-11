---
name: dashboard-leads
description: Esta skill deve ser usada para criar e ATUALIZAR o dashboard de clientes — o painel de controle local (SQLite + painel web multi-arquivo) onde o usuário administra prospecções, projetos, clientes ativos, propostas e renda. Acione sempre que qualquer comando do plugin mudar dados de leads (/prospectar, /redesenhar, /publicar, /proposta), quando o usuário contar que fechou/encerrou/tem um cliente em potencial, ou quando disser "dashboard", "painel", "meus leads", "meus clientes", "carteira", "banco de dados de leads".
---

# Dashboard de clientes (SQLite + painel VF)

Arquitetura na RAIZ da pasta conectada:

- **`prospector.db`** — banco SQLite, a FONTE DA VERDADE.
- **`dashboard-server.py` + `iniciar-dashboard.bat`** — mini-servidor local (Python padrão, sem
  dependências). Duplo clique no .bat → `http://localhost:8765`. O painel lê o banco AO VIVO
  pela API — não existe mais snapshot embutido em HTML.
- **`painel/`** — o painel web (multi-arquivo): `index.html`, `css/` (tokens + base) e `js/`
  (api, estado, ui, app e uma view por aba). Identidade visual "VF" (grafite + âmbar,
  Fraunces/Inter/IBM Plex Mono). Para customizar o design, edite `css/tokens.css`.

## Setup (uma vez, no /setup ou no primeiro uso)

1. Copie desta skill para a raiz da pasta conectada: `references/dashboard-server.py`,
   `references/iniciar-dashboard.bat` e a pasta `references/painel/` INTEIRA.
2. Crie o `prospector.db` com o schema abaixo (via python3/sqlite3 no bash).
3. Diga ao usuário: "duplo clique em `iniciar-dashboard.bat` abre o painel" (requer Python).
4. Usuário antigo (tinha `dashboard.html` com snapshot): o server importa o snapshot pro banco
   na primeira execução automaticamente; depois o dashboard.html pode ser apagado.

## Schema do banco

```sql
CREATE TABLE IF NOT EXISTS leads(
  slug TEXT PRIMARY KEY, nome TEXT, nicho TEXT, cidade TEXT, nota REAL, avaliacoes INTEGER,
  email TEXT, telefone TEXT, whatsapp TEXT, siteAntigo TEXT, motivo TEXT,
  status TEXT DEFAULT 'novo', urlNova TEXT, dataProposta TEXT, valor REAL, obs TEXT,
  contratoStatus TEXT DEFAULT 'pendente', contratoEm TEXT, manutencao REAL, pago INTEGER DEFAULT 0,
  docCliente TEXT, endCliente TEXT,
  servico TEXT DEFAULT 'site', origem TEXT DEFAULT 'prospeccao',
  custoSetup REAL DEFAULT 0, custoMensal REAL DEFAULT 0,
  atualizado TEXT DEFAULT (datetime('now','localtime')));
```

- Status: `novo | redesenhado | publicado | proposta | respondeu | fechado | encerrado | descartado`.
  **`fechado` = CLIENTE ATIVO** (entrou na carteira). `encerrado` = contrato terminado (histórico).
- `servico`: `site | automacao | sistema | outro` · `origem`: `prospeccao | indicacao | externo`.
- `custoSetup` (custo único do projeto) e `custoMensal` (hospedagem/ferramentas) alimentam o
  LUCRO: o painel calcula lucro = (valor − custoSetup) + meses × (manutencao − custoMensal).
- O server adiciona colunas novas sozinho (ALTERs idempotentes) — migração é automática.

## Como os comandos e conversas atualizam (upsert direto no banco)

Upsert via bash (o painel lê ao vivo — NÃO gere HTML):
```bash
python3 - <<'EOF'
import sqlite3
c = sqlite3.connect('CAMINHO/prospector.db')
c.execute("INSERT INTO leads (slug,nome,status,servico,origem,valor) VALUES (?,?,?,?,?,?) "
          "ON CONFLICT(slug) DO UPDATE SET status=excluded.status, atualizado=datetime('now','localtime')",
          ('clinica-x','Clínica X','fechado','sistema','indicacao',5000))
c.commit()
EOF
```

- `/prospectar` → insere leads (`novo`, `origem='prospeccao'`) e descartados (`descartado`, motivo em `obs`).
  NUNCA sobrescreva um lead cujo status já avançou.
- `/redesenhar` → `status='redesenhado'` · `/publicar` → `status='publicado'`, `urlNova`
- `/proposta` → `status='proposta'`, `dataProposta`
- **Usuário conta "fechei um cliente"** (mesmo de fora da prospecção) → upsert com
  `status='fechado'`, `origem='indicacao'|'externo'`, `servico`, `valor`; pergunte mensalidade
  e custos se não informou (pode deixar 0). Slug: nome slugificado.
- **"tenho um cliente em potencial"** → upsert `status='proposta'` (ou `novo` se ainda nem
  propôs), dados iniciais + proposta do projeto em `obs`.
- **"encerrei o contrato do X"** → `status='encerrado'`.
- `/contrato` → `contratoStatus='enviado'` + `contratoEm`. Assinou → `'assinado'`. Pagou → `pago=1`.

## Espelho na Mente Global (se o projeto estiver registrado na esteira)

Depois de todo upsert relevante (fechou, encerrou, proposta, mudança de valor), espelhe na
Mente via MCP `saam-esteira-memory` (ou `mente-bridge.cjs`):

1. Cliente novo/fechado → `memory_upsert_entity` (tipo `cliente`, nome, atributos: serviço,
   valor, mensalidade, origem, status).
2. Evento → `memory_record_event` ("Fechou Clínica X: sistema, R$ 5.000 + R$ 200/mês, indicação").
3. Cliente com projeto próprio registrado na esteira → `memory_add_relation` (cliente ↔ projeto).

SQLite = operacional (painel). Mente = memória semântica (qualquer sessão sabe quem são os clientes).
Se a Mente estiver offline, siga o fallback do CLAUDE.md global (acumule e deposite depois).

## O que o painel faz sozinho (não reimplementar)

Kanban drag & drop, edição em modal, botão "+ Cliente" (fechado ou potencial), exclusão, busca,
paginação, funil, follow-ups (proposta 4+ dias), carteira de clientes ativos com lucro por
cliente, encerrar contrato, vista Projetos (sites com preview; automação/sistema sem), vista
Contratos, vista Financeiro (recebido, a receber, renda mensal líquida, lucro, projeção 12
meses) — tudo nas views de `painel/js/views/`. O plugin só mantém o BANCO correto.
