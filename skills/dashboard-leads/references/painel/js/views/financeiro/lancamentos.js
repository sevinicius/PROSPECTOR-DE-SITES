// financeiro/lancamentos.js — filtros + tabela de transações + modal de lançamento (CRUD).
import { api } from '../../api.js';
import { ativos } from '../../estado.js';
import { fmt, esc } from '../../ui.js';
import { stFin, carregarFin, doMes, nomeCategoria, nomeCartao } from '../../fin.js';

const METODOS = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência', outro: 'Outro' };
const hoje = () => new Date().toISOString().slice(0, 10);

// filtro local da sub-aba (não vai pro stFin — só o mês é compartilhado com a Visão geral)
const filtro = { categoria: '', cartao: '', escopo: '', busca: '' };
let editandoId = null;

function transacoesFiltradas() {
  let lista = doMes(stFin.mes);
  if (filtro.categoria) lista = lista.filter((t) => String(t.categoria_id) === filtro.categoria);
  if (filtro.cartao) lista = lista.filter((t) => String(t.cartao_id) === filtro.cartao);
  if (filtro.escopo) lista = lista.filter((t) => t.escopo === filtro.escopo);
  if (filtro.busca) {
    const b = filtro.busca.toLowerCase();
    lista = lista.filter((t) => (t.descricao || '').toLowerCase().includes(b));
  }
  return lista;
}

export function vLancamentos() {
  const lista = transacoesFiltradas();

  let html = `<div class="painel" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <input type="month" class="cfg-input" style="width:150px" value="${esc(stFin.mes)}" onchange="finSetMes(this.value)">
    <select class="mini" onchange="finFiltro('categoria',this.value)">
      <option value="">Todas categorias</option>
      ${stFin.categorias.map((c) => `<option value="${c.id}"${filtro.categoria === String(c.id) ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
    </select>
    <select class="mini" onchange="finFiltro('cartao',this.value)">
      <option value="">Todos cartões</option>
      ${stFin.cartoes.map((c) => `<option value="${c.id}"${filtro.cartao === String(c.id) ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
    </select>
    <select class="mini" onchange="finFiltro('escopo',this.value)">
      <option value="">Todos escopos</option>
      <option value="pessoal"${filtro.escopo === 'pessoal' ? ' selected' : ''}>Pessoal</option>
      <option value="projeto"${filtro.escopo === 'projeto' ? ' selected' : ''}>Projeto</option>
    </select>
    <input class="busca" style="width:200px;margin-left:0" placeholder="Buscar na descrição…" value="${esc(filtro.busca)}" oninput="finFiltro('busca',this.value)">
    <button class="btn prim" style="margin-left:auto" onclick="finAbrirLancamento()">+ Lançamento</button>
  </div>`;

  html += '<div class="painel" style="overflow-x:auto"><h2>Lançamentos <span class="conta">' + lista.length + '</span></h2>'
    + (lista.length
      ? '<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th>Cartão</th><th>Valor</th><th></th></tr></thead><tbody>'
      + lista.map((t) => {
        const cor = t.tipo === 'entrada' ? 'pos' : 'neg';
        const sinal = t.tipo === 'entrada' ? '+ ' : '− ';
        return `<tr>
          <td>${esc(t.data)}</td>
          <td>${esc(t.descricao || '—')}${t.origem !== 'manual' ? ` <span class="tag svc">${esc(t.banco || t.origem)}</span>` : ''}</td>
          <td>${esc(nomeCategoria(t.categoria_id))}</td>
          <td>${esc(METODOS[t.metodo] || t.metodo || '—')}</td>
          <td>${t.cartao_id ? esc(nomeCartao(t.cartao_id)) : '—'}</td>
          <td><span class="din ${cor}">${sinal}${fmt(t.valor)}</span></td>
          <td><div class="acoes">
            <a href="#" onclick="finAbrirLancamento(${t.id});return false">editar</a>
            <a href="#" class="del" onclick="finApagarLancamento(${t.id});return false">excluir</a>
          </div></td>
        </tr>`;
      }).join('') + '</tbody></table>'
      : '<div class="vazio">Nenhum lançamento neste filtro.</div>')
    + '</div>';

  return html;
}

// ---------- filtros ----------
window.finFiltro = (campo, valor) => { filtro[campo] = valor; window.finRender(); };

// ---------- modal de lançamento ----------
window.finAbrirLancamento = (id) => {
  const t = id ? stFin.transacoes.find((x) => x.id === id) : null;
  editandoId = t ? t.id : null;
  const clientes = ativos();
  document.getElementById('modal2').innerHTML = `
    <h2>${t ? 'Editar lançamento' : 'Novo lançamento'}</h2>
    <div class="mrow">
      <div><label>Data</label><input id="fl-data" type="date" value="${t ? t.data : hoje()}"></div>
      <div><label>Tipo</label><select id="fl-tipo">
        <option value="saida"${!t || t.tipo === 'saida' ? ' selected' : ''}>Saída</option>
        <option value="entrada"${t && t.tipo === 'entrada' ? ' selected' : ''}>Entrada</option>
      </select></div>
    </div>
    <div class="mrow">
      <div><label>Valor (R$)</label><input id="fl-valor" type="number" step="0.01" value="${t ? t.valor : ''}"></div>
      <div><label>Descrição</label><input id="fl-descricao" value="${esc(t ? t.descricao : '')}"></div>
    </div>
    <div class="mrow">
      <div><label>Categoria</label><select id="fl-categoria">
        <option value="">sem categoria</option>
        ${stFin.categorias.map((c) => `<option value="${c.id}"${t && t.categoria_id === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
      </select></div>
      <div><label>Método</label><select id="fl-metodo" onchange="document.getElementById('fl-cartao-box').style.display=this.value==='cartao'?'block':'none'">
        ${Object.entries(METODOS).map(([k, n]) => `<option value="${k}"${(t ? t.metodo === k : k === 'outro') ? ' selected' : ''}>${n}</option>`).join('')}
      </select></div>
    </div>
    <div class="mrow">
      <div id="fl-cartao-box" style="display:${t && t.metodo === 'cartao' ? 'block' : 'none'}"><label>Cartão</label><select id="fl-cartao">
        <option value="">—</option>
        ${stFin.cartoes.map((c) => `<option value="${c.id}"${t && t.cartao_id === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
      </select></div>
      <div><label>Escopo</label><select id="fl-escopo" onchange="document.getElementById('fl-lead-box').style.display=this.value==='projeto'?'block':'none'">
        <option value="pessoal"${!t || t.escopo === 'pessoal' ? ' selected' : ''}>Pessoal</option>
        <option value="projeto"${t && t.escopo === 'projeto' ? ' selected' : ''}>Projeto</option>
      </select></div>
    </div>
    <div id="fl-lead-box" style="display:${t && t.escopo === 'projeto' ? 'block' : 'none'}">
      <label>Cliente</label><select id="fl-lead">
        <option value="">—</option>
        ${clientes.map((l) => `<option value="${l.slug}"${t && t.lead_slug === l.slug ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
      </select>
    </div>
    <div class="mbot">
      ${t ? `<button class="btn perigo" style="margin-right:auto" onclick="finApagarLancamento(${t.id})">Excluir</button>` : ''}
      <button class="cancelar" onclick="fecharModal2()">Cancelar</button>
      <button class="salvar" onclick="finSalvarLancamento()">Salvar</button>
    </div>`;
  document.getElementById('modal2-bg').classList.add('aberto');
};

window.finSalvarLancamento = () => {
  const g = (id) => document.getElementById(id);
  const metodo = g('fl-metodo').value;
  const escopo = g('fl-escopo').value;
  const valor = parseFloat(g('fl-valor').value);
  if (!g('fl-data').value || !valor || valor <= 0) { alert('Preencha data e um valor maior que zero.'); return; }
  const corpo = {
    data: g('fl-data').value,
    tipo: g('fl-tipo').value,
    valor,
    descricao: g('fl-descricao').value || null,
    categoria_id: g('fl-categoria').value ? parseInt(g('fl-categoria').value) : null,
    metodo,
    cartao_id: metodo === 'cartao' && g('fl-cartao').value ? parseInt(g('fl-cartao').value) : null,
    escopo,
    lead_slug: escopo === 'projeto' ? (g('fl-lead').value || null) : null,
  };
  const acao = editandoId ? api.editarTransacao(editandoId, corpo) : api.criarTransacao(corpo);
  acao.then(() => { window.fecharModal2(); return carregarFin(); }).then(() => window.finRender());
};

window.finApagarLancamento = (id) => {
  if (!confirm('Excluir este lançamento?')) return;
  api.apagarTransacao(id).then(() => { window.fecharModal2(); return carregarFin(); }).then(() => window.finRender());
};
