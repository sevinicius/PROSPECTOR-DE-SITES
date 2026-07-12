# dashboard-leads — Skill de Gestão de Clientes e Financeiro

## O que é
Skill especializada em gestão de clientes/leads e análise financeira, integrada ao prospector-de-sites.
Responsável por sincronizar dados operacionais com a Mente Global (memória semântica).

## Módulo financeiro (v2026-07)

### Banco de dados
- **Tabela `leads`**: clientes e leads com campos estendidos
  - `id`, `nome`, `email`, `telefone`, `status` (novo → redesenhado → publicado → proposta → respondeu → fechado → encerrado)
  - `servico` (site|automacao|sistema|outro), `origem` (prospeccao|indicacao|externo)
  - `valor` (proposta/contrato), `manutencao` (mensalidade), `custoSetup`, `custoMensal`
  - `data_criacao`, `data_atualizacao`, `observacoes`

- **Tabela `lancamentos`**: registros de receita/despesa
  - `id`, `cliente_id`, `tipo` (receita|despesa), `categoria`, `valor`, `data`
  - `descricao`, `metodo_pagamento`, `confirmado`

- **Tabela `cartoes`**: cartões de crédito monitorados
  - `id`, `instituicao`, `ultimos_digitos`, `saldo`, `limite`
  - `vencimento`, `banco_api_token` (criptografado)

### API REST
- `GET /api/leads` — lista clientes com filtro por status
- `POST /api/leads` — cadastra novo cliente
- `PUT /api/leads/<id>` — atualiza cliente (status, valores, observações)
- `GET /api/lancamentos?cliente_id=<id>` — extrato financeiro
- `POST /api/lancamentos` — registra transação (manual ou importada)
- `GET /api/resumo-financeiro` — lucro mensal, receita acumulada, custos
- `GET /api/cartoes` — saldo de cartões sincronizados
- `POST /api/importar-extrato` — integração bancária (NuBank, MercadoPago, arquivo OFX)

### Parsers (módulo `parsers/`)
- `__init__.py` — orchestração de imports
- `detector.py` — detecta tipo de arquivo de entrada (OFX, CSV, PDF de extrato)
- `nubank.py` — parser de extrato NuBank (web scraping ou API)
- `mercadopago.py` — integração com API MercadoPago para movimentações

### Dependências Python
- `pdfplumber` — extração de texto de PDFs (extratos, notas fiscais)
- `sqlite3` — persistência local (nativo)
- `flask` — servidor HTTP (já no prospector)
- `requests` — chamadas HTTP (integrações bancárias)

### Painel multi-página (pasta `painel/`)
- **index.html** — shell principal
- **css/tokens.css** — identidade visual (cores, tipografia, spacing)
- **js/fin.js** — lógica de financeiro (cálculos, filtros, agregações)
- **Sub-abas do painel**:
  - Financeiro › Visão Geral (resumo lucro mensal, tendências)
  - Financeiro › Lançamentos (CRUD manual, importação)
  - Financeiro › Cartões (saldos, limite, vencimentos)
  - Financeiro › Categorias (agrupamento de despesas)
  - Financeiro › Importar (detecta tipo arquivo → parser → popula banco)

### Integração Mente
- Ao registrar cliente novo (status=fechado): `memory_upsert_entity` (tipo `cliente`, atributos financeiros)
- Ao alterar valores: `memory_record_event` com categoria `decision` ou `update`
- Relação cliente ↔ projeto da esteira quando aplicável: `memory_add_relation`

## Recursos adicionais
- Design spec: `docs/superpowers/specs/2026-07-10-remodelagem-prospector-design.md` (no fork)
- Dashboard-server: porta 8765 (Python puro, sem deps pesadas)
- Startup: `iniciar-dashboard.bat` (Windows) ou `python dashboard-server.py` (Unix)
