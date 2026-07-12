// financeiro/index.js — sub-nav (visao|lancamentos|cartoes|importar|categorias) + dispatch + gráficos.
// Decisão de render (evita import circular app.js<->index.js): NÃO importamos `render` de app.js.
// index.js expõe window.finRender (própria função) que reinjeta só #view + gráficos — nav()/título
// do app.js não mudam entre sub-abas do financeiro, então não há perda funcional.
import { st } from '../../estado.js';
import { stFin, carregarFin, gastosPorMes, porCategoria, porCartao } from '../../fin.js';
import { criarGrafico, PALETA } from '../../graficos.js';
import { vVisao } from './visao.js';
import { vLancamentos } from './lancamentos.js';
import { vCartoes } from './cartoes.js';
import { vImportar } from './importar.js';
import { vCategorias } from './categorias.js';

const ABAS = [
  ['visao', 'Visão geral'], ['lancamentos', 'Lançamentos'], ['cartoes', 'Cartões'],
  ['importar', 'Importar'], ['categorias', 'Categorias'],
];

// dispara carregarFin() uma única vez no primeiro acesso à view (não depende do
// tamanho de stFin.transacoes — evita refetch infinito quando o usuário genuinamente
// não tem nenhum lançamento ainda).
let tentouCarregar = false;

export function vFinanceiro() {
  if (!tentouCarregar) {
    tentouCarregar = true;
    carregarFin().then(() => { if (st.view === 'financeiro') window.finRender(); });
  }

  const nav = '<div class="cmp-tabs">' + ABAS.map(([id, rotulo]) =>
    `<button class="${stFin.subAba === id ? 'on' : ''}" onclick="finSubAba('${id}')">${rotulo}</button>`).join('') + '</div>';

  let conteudo;
  switch (stFin.subAba) {
    case 'visao': conteudo = vVisao(); break;
    case 'lancamentos': conteudo = vLancamentos(); break;
    case 'cartoes': conteudo = vCartoes(); break;
    case 'importar': conteudo = vImportar(); break;
    case 'categorias': conteudo = vCategorias(); break;
    default: conteudo = '<div class="vazio">Sub-aba desconhecida.</div>';
  }
  return nav + conteudo;
}

export function renderGraficosFinanceiro() {
  if (stFin.subAba !== 'visao') return;
  requestAnimationFrame(() => {
    const meses = gastosPorMes(12);
    criarGrafico('graf-meses', {
      type: 'line',
      data: {
        labels: meses.map((m) => m.mes),
        datasets: [{ label: 'Gasto', data: meses.map((m) => m.total), borderColor: PALETA[0], backgroundColor: PALETA[0] + '33', tension: .3, fill: true }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });

    const cats = porCategoria(stFin.mes);
    criarGrafico('graf-categorias', {
      type: 'doughnut',
      data: { labels: cats.map((c) => c.nome), datasets: [{ data: cats.map((c) => c.total), backgroundColor: PALETA }] },
      options: { responsive: true, maintainAspectRatio: false },
    });

    const cts = porCartao(stFin.mes);
    criarGrafico('graf-cartoes', {
      type: 'bar',
      data: { labels: cts.map((c) => c.nome), datasets: [{ label: 'Gasto', data: cts.map((c) => c.total), backgroundColor: PALETA[0] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
  });
}

// ---------- handlers globais ----------
window.finRender = () => {
  document.getElementById('view').innerHTML = vFinanceiro();
  renderGraficosFinanceiro();
};
window.finSubAba = (aba) => { stFin.subAba = aba; window.finRender(); };
window.finMudarMes = (delta) => {
  const [ano, mes] = stFin.mes.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  stFin.mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  window.finRender();
};
window.finSetMes = (mes) => { stFin.mes = mes; window.finRender(); };
