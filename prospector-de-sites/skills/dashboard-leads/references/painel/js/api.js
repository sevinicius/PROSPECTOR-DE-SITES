// api.js — toda conversa com o dashboard-server.py passa por aqui.
const j = (r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

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
  config: () => fetch('/api/config', { cache: 'no-store' }).then(j),
  salvarConfig: (corpo) => fetch('/api/config', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  }).then(j),
};
