// financeiro/cartoes.js — grid de cartões (fatura aberta, % do limite, fecha/vence) + modal de cartão.
import { api } from '../../api.js';
import { fmt, esc } from '../../ui.js';
import { stFin, carregarFin, faturaAberta, competenciaCartao } from '../../fin.js';

let editandoCartaoId = null;

function cardCartao(c) {
  const aberta = faturaAberta(c);
  const comp = competenciaCartao(c);
  const limite = c.limite || 0;
  const pct = limite ? (aberta / limite * 100) : 0;
  const cor = pct > 100 ? 'var(--ruim)' : 'var(--ambar)';
  return `<div class="cli-card">
    <div class="nm">${esc(c.nome)}${!c.ativo ? ' <span class="tag svc">inativo</span>' : ''}</div>
    <div class="desde">${esc(c.banco || 'sem banco')} · fecha dia ${esc(String(c.dia_fechamento))} · vence dia ${esc(String(c.dia_vencimento))}</div>
    <div class="funil"><div class="linha"><span>Fatura ${esc(comp)}</span><div class="barra"><div class="fill" style="width:${Math.min(pct, 100)}%;background:${cor}"></div></div><b>${fmt(aberta)}</b></div></div>
    <div class="cli-linhas">
      <div class="li"><span>Limite</span><b>${limite ? fmt(limite) : '—'}</b></div>
    </div>
    <div class="acoes">
      <a href="#" onclick="finAbrirCartao(${c.id});return false">editar</a>
      ${c.ativo
        ? `<a href="#" class="del" onclick="finDesativarCartao(${c.id},0);return false">desativar</a>`
        : `<a href="#" onclick="finDesativarCartao(${c.id},1);return false">reativar</a>`}
    </div>
  </div>`;
}

export function vCartoes() {
  const cartoes = [...stFin.cartoes].sort((a, b) => (b.ativo - a.ativo));

  let html = `<div class="painel" style="display:flex;align-items:center">
    <h2 style="margin:0">Cartões <span class="conta">${cartoes.length}</span></h2>
    <button class="btn prim" style="margin-left:auto" onclick="finAbrirCartao()">+ Cartão</button>
  </div>`;

  html += cartoes.length
    ? '<div class="carteira">' + cartoes.map(cardCartao).join('') + '</div>'
    : '<div class="painel"><div class="vazio">Nenhum cartão cadastrado ainda.</div></div>';

  return html;
}

// ---------- modal de cartão ----------
window.finAbrirCartao = (id) => {
  const c = id ? stFin.cartoes.find((x) => x.id === id) : null;
  editandoCartaoId = c ? c.id : null;
  document.getElementById('modal2').innerHTML = `
    <h2>${c ? 'Editar cartão' : 'Novo cartão'}</h2>
    <div class="mrow">
      <div><label>Nome</label><input id="fc-nome" value="${esc(c ? c.nome : '')}"></div>
      <div><label>Banco</label><input id="fc-banco" value="${esc(c ? c.banco : '')}"></div>
    </div>
    <div class="mrow">
      <div><label>Limite (R$)</label><input id="fc-limite" type="number" step="0.01" value="${c && c.limite != null ? c.limite : ''}"></div>
      <div></div>
    </div>
    <div class="mrow">
      <div><label>Dia de fechamento</label><input id="fc-fechamento" type="number" min="1" max="31" value="${c ? c.dia_fechamento : ''}"></div>
      <div><label>Dia de vencimento</label><input id="fc-vencimento" type="number" min="1" max="31" value="${c ? c.dia_vencimento : ''}"></div>
    </div>
    <div class="mbot">
      <button class="cancelar" onclick="fecharModal2()">Cancelar</button>
      <button class="salvar" onclick="finSalvarCartao()">Salvar</button>
    </div>`;
  document.getElementById('modal2-bg').classList.add('aberto');
};

window.finSalvarCartao = () => {
  const g = (id) => document.getElementById(id);
  const nome = g('fc-nome').value.trim();
  const fechamento = parseInt(g('fc-fechamento').value);
  const vencimento = parseInt(g('fc-vencimento').value);
  if (!nome || !fechamento || !vencimento) { alert('Preencha nome, dia de fechamento e dia de vencimento.'); return; }
  const corpo = {
    nome,
    banco: g('fc-banco').value || null,
    limite: g('fc-limite').value ? parseFloat(g('fc-limite').value) : null,
    dia_fechamento: fechamento,
    dia_vencimento: vencimento,
  };
  const acao = editandoCartaoId ? api.editarCartao(editandoCartaoId, corpo) : api.salvarCartao(corpo);
  acao.then(() => { window.fecharModal2(); return carregarFin(); }).then(() => window.finRender());
};

window.finDesativarCartao = (id, ativo) => {
  api.editarCartao(id, { ativo }).then(() => carregarFin()).then(() => window.finRender());
};
