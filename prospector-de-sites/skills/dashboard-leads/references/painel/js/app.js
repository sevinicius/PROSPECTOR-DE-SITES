// app.js — bootstrap, navegação e handlers globais (drag&drop, modal, doc).
import { api } from './api.js';
import { st, NOMES, ORDEM, fil, emAndamento, ativos, followups, COM_PAGINA, briefings, orcamentos, situacaoBriefing } from './estado.js';
import { esc } from './ui.js';
import { vGeral } from './views/geral.js';
import { vPipeline } from './views/pipeline.js';
import { vClientes } from './views/clientes.js';
import { vProjetos } from './views/projetos.js';
import { vComparador } from './views/comparador.js';
import { vFollowup } from './views/followup.js';
import { vContratos } from './views/contratos.js';
import { vBriefings } from './views/briefings.js';
import { vOrcamentos } from './views/orcamentos.js';
import { vFinanceiro } from './views/financeiro.js';
import { vConfig } from './views/config.js';
import './fluxos.js';

const VIEWS = {
  geral: ['Visão geral', vGeral], pipeline: ['Pipeline', vPipeline], followup: ['Follow-ups', vFollowup],
  clientes: ['Clientes', vClientes], projetos: ['Projetos', vProjetos], briefings: ['Briefings', vBriefings],
  orcamentos: ['Orçamentos', vOrcamentos], contratos: ['Contratos', vContratos],
  financeiro: ['Financeiro', vFinanceiro], comparador: ['Comparador', vComparador], config: ['Configurações', vConfig],
};
const GRUPOS = [
  ['Operação', ['geral', 'pipeline', 'followup']],
  ['Carteira', ['clientes', 'projetos', 'briefings', 'orcamentos', 'contratos', 'financeiro']],
  ['Ferramentas', ['comparador', 'config']],
];

function contagem(v) {
  const comPagina = fil().filter((l) => COM_PAGINA.includes(l.status));
  switch (v) {
    case 'pipeline': return emAndamento().length;
    case 'followup': return followups().length;
    case 'clientes': return ativos().length;
    case 'projetos': return comPagina.length;
    case 'briefings': return briefings().filter((l) => situacaoBriefing(l) === 'naolido').length;
    case 'orcamentos': return orcamentos().length;
    case 'comparador': return comPagina.filter((l) => l.slug).length;
    case 'contratos': return ativos().length;
    default: return null;
  }
}

function nav() {
  document.getElementById('nav').innerHTML = GRUPOS.map(([grupo, itens]) =>
    `<div class="grupo">${grupo}</div>` + itens.map((v) => {
      const n = contagem(v);
      return `<button class="${st.view === v ? 'on' : ''}" onclick="setView('${v}')">${VIEWS[v][0]}${n !== null ? `<span class="qt">${n}</span>` : ''}</button>`;
    }).join('')).join('');
  document.getElementById('titulo').textContent = VIEWS[st.view][0];
}

export function render() {
  nav();
  document.getElementById('view').innerHTML = VIEWS[st.view][1]();
}

export function recarrega() {
  return api.leads().then((j) => { st.leads = j; render(); });
}
window.__recarrega = recarrega;

function salvar(slug, mudancas) { api.patch(slug, mudancas).then(recarrega); }

// ---------- handlers globais (referenciados por onclick="" nas views) ----------
window.setView = (v) => { st.view = v; st.pag = 1; location.hash = v; render(); };
window.filtrarBriefings = (f) => { st.filtroBf = f; render(); };
window.irPag = (n) => { st.pag = n; render(); };
window.mudaPorPag = (v) => { st.porPag = v === 'auto' ? 'auto' : parseInt(v); st.pag = 1; render(); };
window.ordenar = (c) => {
  if (c === 'x') return;
  if (st.sortCol === c) st.sortAsc = !st.sortAsc; else { st.sortCol = c; st.sortAsc = true; }
  st.pag = 1; render();
};
window.salvarCampo = salvar;
window.deletar = (slug) => {
  if (!confirm('Excluir este cliente do painel?')) return;
  api.del(slug).then(recarrega);
};
window.encerrar = (slug) => {
  const l = st.leads.find((x) => x.slug === slug) || {};
  if (!confirm(`Encerrar o contrato de ${l.nome || slug}? Ele sai dos clientes ativos (o histórico fica).`)) return;
  salvar(slug, { status: 'encerrado' });
};

// ---------- drag & drop ----------
let dragSlug = null;
window.dragIni = (e, slug) => { dragSlug = slug; e.target.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; };
window.dragFim = (e) => e.target.classList.remove('arrastando');
window.dragSobre = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('alvo'); };
window.dragSai = (e) => e.currentTarget.classList.remove('alvo');
window.solta = (e, status) => {
  e.preventDefault(); e.currentTarget.classList.remove('alvo');
  if (!dragSlug) return;
  const mudancas = { status };
  if (status === 'fechado') {
    const v = prompt('Fechou! Valor cobrado (R$):', '700');
    if (v !== null && v !== '' && !isNaN(parseFloat(v))) mudancas.valor = parseFloat(v);
  }
  const lead = st.leads.find((l) => l.slug === dragSlug);
  if (status === 'proposta' && lead && !lead.dataProposta) mudancas.dataProposta = new Date().toISOString().slice(0, 10);
  salvar(dragSlug, mudancas);
  dragSlug = null;
};

// ---------- modal de edição / novo cliente ----------
const CAMPOS_TXT = ['nome', 'email', 'telefone', 'whatsapp', 'cidade', 'nicho', 'urlNova', 'obs', 'dataProposta', 'docCliente', 'endCliente'];
const CAMPOS_NUM = ['valor', 'manutencao', 'custoSetup', 'custoMensal'];
let editSlug = null;
let novoCliente = false;

function preencherModal(l) {
  document.getElementById('m-status').innerHTML = Object.keys(NOMES)
    .map((s) => `<option value="${s}"${l.status === s ? ' selected' : ''}>${NOMES[s]}</option>`).join('');
  CAMPOS_TXT.concat(CAMPOS_NUM).forEach((k) => { document.getElementById('m-' + k).value = l[k] == null ? '' : l[k]; });
  document.getElementById('m-pago').value = l.pago ? 1 : 0;
  document.getElementById('m-contratoStatus').value = l.contratoStatus || 'pendente';
  document.getElementById('m-servico').value = l.servico || 'site';
  document.getElementById('m-origem').value = l.origem || 'prospeccao';
  document.getElementById('modal-bg').classList.add('aberto');
}

window.abrirEdit = (slug) => {
  editSlug = slug; novoCliente = false;
  const l = st.leads.find((x) => x.slug === slug) || {};
  document.getElementById('m-titulo').textContent = 'Editar — ' + (l.nome || slug);
  preencherModal(l);
};

window.abrirNovo = (statusInicial) => {
  editSlug = null; novoCliente = true;
  document.getElementById('m-titulo').textContent = 'Novo cliente';
  preencherModal({ status: statusInicial || 'proposta', origem: 'externo', servico: 'site' });
};

window.fecharEdit = () => { document.getElementById('modal-bg').classList.remove('aberto'); editSlug = null; novoCliente = false; };

window.salvarEdit = () => {
  const ch = {};
  CAMPOS_TXT.forEach((k) => { ch[k] = document.getElementById('m-' + k).value || null; });
  CAMPOS_NUM.forEach((k) => {
    const v = document.getElementById('m-' + k).value;
    ch[k] = v === '' ? null : parseFloat(v);
  });
  ch.status = document.getElementById('m-status').value;
  ch.pago = parseInt(document.getElementById('m-pago').value);
  ch.contratoStatus = document.getElementById('m-contratoStatus').value;
  ch.servico = document.getElementById('m-servico').value;
  ch.origem = document.getElementById('m-origem').value;
  if (novoCliente) {
    if (!ch.nome) { alert('Dê um nome ao cliente.'); return; }
    ch.slug = ch.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cliente-' + Date.now();
    if (st.leads.some((l) => l.slug === ch.slug)) ch.slug += '-' + String(Date.now()).slice(-4);
    window.fecharEdit();
    api.upsert(ch).then(recarrega);
    return;
  }
  const slug = editSlug;
  window.fecharEdit();
  salvar(slug, ch);
};

// ---------- visor de contrato ----------
window.abrirContrato = (slug) => {
  const l = st.leads.find((x) => x.slug === slug) || {};
  document.getElementById('doc-titulo').textContent = 'Contrato — ' + (l.nome || slug);
  document.getElementById('doc-frame').src = `/sites/${slug}/contrato-${slug}.html`;
  document.getElementById('doc-bg').classList.add('aberto');
};
window.fecharDoc = () => {
  document.getElementById('doc-bg').classList.remove('aberto');
  document.getElementById('doc-frame').src = 'about:blank';
};
window.printDoc = () => {
  const f = document.getElementById('doc-frame');
  try { f.contentWindow.focus(); f.contentWindow.print(); }
  catch (e) { window.open(f.src, '_blank'); alert('Abri o contrato em nova aba — use Ctrl+P para imprimir/salvar PDF.'); }
};

// comparador guarda seleção aqui pra sobreviver ao render
window.cmpSelecao = (slug) => { st.cmpSel = slug; render(); };

// ---------- config (salvar contratante / hostgator) ----------
window.salvarCfg = (campos) => {
  const body = {};
  campos.forEach((c) => { body[c] = document.getElementById('cfg-' + c).value || ''; });
  api.salvarConfig({ contratante: body }).then(() => {
    st.cfg = body;
    const ok = document.getElementById('cfg-ok');
    ok.style.display = 'inline'; setTimeout(() => { ok.style.display = 'none'; }, 2000);
  });
};
window.salvarHG = () => {
  const body = {};
  ['usuario', 'dominio', 'servidor', 'pastaBase', 'senha'].forEach((k) => {
    const el = document.getElementById('hg-' + k);
    if (el) body[k] = el.value || '';
  });
  api.salvarConfig({ hostgator: body }).then(() => {
    if (body.senha) st.hg.senhaDefinida = true;
    ['usuario', 'dominio', 'servidor', 'pastaBase'].forEach((k) => { if (body[k] !== undefined) st.hg[k] = body[k]; });
    const ok = document.getElementById('hg-ok');
    ok.style.display = 'inline'; setTimeout(() => { ok.style.display = 'none'; render(); }, 1200);
  });
};

// ---------- boot ----------
document.getElementById('busca').addEventListener('input', function () { st.busca = this.value; st.pag = 1; render(); });
let rsz; window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(render, 150); });

const hash = location.hash.replace('#', '');
if (VIEWS[hash]) st.view = hash;
window.addEventListener('hashchange', () => {
  const v = location.hash.replace('#', '');
  if (VIEWS[v] && st.view !== v) { st.view = v; st.pag = 1; render(); }
});

const modo = document.getElementById('modo');
api.leads().then((leads) => {
  st.leads = leads; st.conectado = true;
  modo.textContent = 'banco conectado'; modo.className = 'modo db';
  modo.title = 'Alterações salvas no prospector.db';
  return api.config();
}).then((c) => {
  st.cfg = (c && c.contratante) || {};
  st.hg = (c && c.hostgator) || {};
  st.assinatura = (c && c.assinatura) || {};
  if (st.cfg.nome) document.getElementById('marca-nome').textContent = st.cfg.nome.split(' ').slice(0, 2).join(' ');
  render();
}).catch(() => {
  modo.textContent = 'sem conexão — abra pelo iniciar-dashboard.bat';
  modo.className = 'modo off';
  render();
});
render();
