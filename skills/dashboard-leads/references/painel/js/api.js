// api.js — toda conversa com o dashboard-server.py passa por aqui.
const j = (r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
// jCorpo: parseia o corpo JSON em QUALQUER status (o servidor responde erros de negócio
// como banco_nao_reconhecido/dependencia com corpo JSON e status ≠2xx); só lança quando
// o corpo não é JSON (ex.: 404 de rota inexistente enquanto a Task 7 não está no servidor).
const jCorpo = (r) => r.json().catch(() => { throw new Error('HTTP ' + r.status); });

export const api = {
  leads: () => fetch('/api/leads', { cache: 'no-store' }).then(j),
  upsert: (lead) => fetch('/api/leads', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead),
  }).then(j),
  patch: (slug, mudancas) => fetch('/api/leads/' + encodeURIComponent(slug), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mudancas),
  }).then(j),
  del: (slug) => fetch('/api/leads/' + encodeURIComponent(slug), { method: 'DELETE' }).then(j),
  gerar: (slug, arquivo, html) => fetch('/api/gerar/' + encodeURIComponent(slug), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arquivo, html }),
  }).then(j),
  // briefing: read-modify-write no servidor (evita lost-update do painel stale)
  marcarVisto: (slug) => fetch('/api/briefing/' + encodeURIComponent(slug) + '/visto', { method: 'POST' }).then(j),
  registrarRespostas: (slug, respostas_texto) => fetch('/api/briefing/' + encodeURIComponent(slug) + '/registrar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respostas_texto }),
  }).then(j),
  config: () => fetch('/api/config', { cache: 'no-store' }).then(j),
  salvarConfig: (corpo) => fetch('/api/config', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  }).then(j),

  // ---- financeiro (transações, cartões, categorias, regras, config) ----
  transacoes: (qs) => fetch('/api/transacoes' + (qs ? '?' + qs : ''), { cache: 'no-store' }).then(j),
  criarTransacao: (t) => fetch('/api/transacoes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t),
  }).then(j),
  editarTransacao: (id, ch) => fetch('/api/transacoes/' + encodeURIComponent(id), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ch),
  }).then(j),
  apagarTransacao: (id) => fetch('/api/transacoes/' + encodeURIComponent(id), { method: 'DELETE' }).then(j),

  cartoes: () => fetch('/api/cartoes', { cache: 'no-store' }).then(j),
  salvarCartao: (c) => fetch('/api/cartoes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c),
  }).then(j),
  editarCartao: (id, ch) => fetch('/api/cartoes/' + encodeURIComponent(id), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ch),
  }).then(j),
  apagarCartao: (id) => fetch('/api/cartoes/' + encodeURIComponent(id), { method: 'DELETE' }).then(j),

  categorias: () => fetch('/api/categorias', { cache: 'no-store' }).then(j),
  salvarCategoria: (cat) => fetch('/api/categorias', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cat),
  }).then(j),
  editarCategoria: (id, ch) => fetch('/api/categorias/' + encodeURIComponent(id), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ch),
  }).then(j),
  apagarCategoria: (id) => fetch('/api/categorias/' + encodeURIComponent(id), { method: 'DELETE' }).then(j),

  regras: () => fetch('/api/regras', { cache: 'no-store' }).then(j),
  salvarRegra: (r) => fetch('/api/regras', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r),
  }).then(j),
  apagarRegra: (id) => fetch('/api/regras/' + encodeURIComponent(id), { method: 'DELETE' }).then(j),

  configFin: () => fetch('/api/config-fin', { cache: 'no-store' }).then(j),
  salvarConfigFin: (cfg) => fetch('/api/config-fin', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg),
  }).then(j),

  importacoes: () => fetch('/api/importacoes', { cache: 'no-store' }).then(j),
  importarFatura: (nome, b64) => fetch('/api/importar-fatura', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, conteudo_b64: b64 }),
  }).then(jCorpo),
  confirmarImportacao: (payload) => fetch('/api/importar-fatura/confirmar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(jCorpo),
};
