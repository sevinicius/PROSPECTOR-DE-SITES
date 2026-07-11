// Clientes — a carteira: ativos no topo (com lucro e mensalidade), todos embaixo.
import { st, fil, ativos, finCliente, mesesAtivo, SERVICOS, ORIGENS } from '../estado.js';
import { fmt, esc, pillStatus, acoes, paginacao, pagSize } from '../ui.js';

function cardAtivo(l) {
  const f = finCliente(l);
  const desde = l.contratoEm || l.dataProposta;
  return `<div class="cli-card">
    <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
      <div><div class="nm">${esc(l.nome)}</div>
      <div class="desde">${SERVICOS[l.servico] || 'Site'} · ${ORIGENS[l.origem] || 'Prospecção'}${desde ? ' · desde ' + desde : ''} · ${mesesAtivo(l)} ${mesesAtivo(l) === 1 ? 'mês' : 'meses'}</div></div>
      ${l.pago ? '<span class="pill" style="background:var(--ok-fundo);color:var(--ok)">pago</span>' : '<span class="pill" style="background:var(--ambar-fundo);color:var(--ambar)">a receber</span>'}
    </div>
    <div class="cli-linhas">
      <div class="li"><span>Projeto</span><b>${fmt(f.valor)}${f.custoSetup ? ` <span style="color:var(--apagado)">− ${fmt(f.custoSetup)} custo</span>` : ''}</b></div>
      <div class="li"><span>Mensalidade líquida</span><b class="${f.mensalLiq > 0 ? 'pos' : f.mensalLiq < 0 ? 'neg' : ''}">${fmt(f.mensalLiq)}/mês</b></div>
      <div class="li"><span>Lucro acumulado</span><b class="amb">${fmt(f.lucro)}</b></div>
    </div>
    <div class="acoes" style="margin-top:11px">
      ${l.whatsapp ? `<a href="https://wa.me/${l.whatsapp}" target="_blank">whatsapp</a>` : ''}
      ${l.email && l.email.indexOf('@') > 0 ? `<a href="mailto:${esc(l.email)}">e-mail</a>` : ''}
      ${l.urlNova ? `<a href="${esc(l.urlNova)}" target="_blank">no ar ↗</a>` : ''}
      <a href="#" onclick="abrirEdit('${l.slug}');return false">editar</a>
      <a href="#" class="del" onclick="encerrar('${l.slug}');return false">encerrar contrato</a>
    </div></div>`;
}

export function vClientes() {
  const at = ativos();
  let html = `<div class="painel" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
    <div><b style="font-family:var(--display);font-size:15px">Minha carteira</b>
    <div style="color:var(--apagado);font-size:11.5px;margin-top:2px">${at.length} ${at.length === 1 ? 'cliente ativo' : 'clientes ativos'} — quem fecha entra aqui sozinho</div></div>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button class="btn sec" onclick="abrirNovo('proposta')">+ Potencial</button>
      <button class="btn prim" onclick="abrirNovo('fechado')">+ Cliente fechado</button>
    </div></div>`;

  html += at.length
    ? `<div class="carteira">${at.map(cardAtivo).join('')}</div>`
    : '<div class="painel vazio">Nenhum cliente ativo ainda — arraste um card para "Cliente ativo" no pipeline, ou cadastre um fechado aqui em cima.</div>';

  // tabela de todos (inclusive encerrados e descartados)
  let ls = fil().slice().sort((a, b) => {
    const x = a[st.sortCol] || '', y = b[st.sortCol] || '';
    return (x < y ? -1 : x > y ? 1 : 0) * (st.sortAsc ? 1 : -1);
  });
  const pp = pagSize();
  const pg = paginacao(ls.length, pp);
  ls = ls.slice(pg.ini, pg.fim);

  const ths = [['nome', 'Cliente'], ['servico', 'Serviço'], ['origem', 'Origem'], ['cidade', 'Cidade'], ['status', 'Status'], ['valor', 'Valor'], ['x', 'Contato / ações']]
    .map(([c, r]) => `<th onclick="ordenar('${c}')">${r}${st.sortCol === c ? (st.sortAsc ? ' ↑' : ' ↓') : ''}</th>`).join('');

  html += `<div class="painel tab"><h2>Todos os registros <span class="conta">${fil().length}</span></h2><div class="twrap"><table><thead><tr>${ths}</tr></thead><tbody>`
    + ls.map((l) => `<tr>
      <td><b>${esc(l.nome)}</b><div class="sub-td">${esc(l.email) || 'sem e-mail'}</div></td>
      <td>${SERVICOS[l.servico] || 'Site'}</td>
      <td>${ORIGENS[l.origem] || 'Prospecção'}</td>
      <td>${esc(l.cidade) || '—'}</td>
      <td>${pillStatus(l.status)}</td>
      <td><span class="din">${l.valor ? fmt(l.valor) : '—'}</span>${l.manutencao ? `<div class="sub-td">+ ${fmt(l.manutencao)}/mês</div>` : ''}</td>
      <td>${acoes(l)}</td></tr>`).join('')
    + `</tbody></table></div>${pg.html}</div>`;

  return html;
}
