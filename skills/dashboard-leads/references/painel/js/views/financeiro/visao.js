// financeiro/visao.js — seletor de mês, stat cards, gráficos, limites, próximas faturas
// e "Projetos & clientes" (tabela migrada intacta de financeiro.js).
import { ativos, finCliente, finGeral, mesesAtivo } from '../../estado.js';
import { fmt, esc, stat, pillCt } from '../../ui.js';
import { stFin, gastoDoMes, entradaDoMes, consumoLimites, faturaAberta } from '../../fin.js';

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function rotuloMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return NOMES_MES[m - 1] + '/' + ano;
}

function barraLimite(rotulo, gasto, limite) {
  const pct = limite ? (gasto / limite * 100) : 0;
  const cor = pct > 100 ? 'var(--ruim)' : 'var(--ambar)';
  return `<div class="linha"><span>${esc(rotulo)}</span><div class="barra"><div class="fill" style="width:${Math.min(pct, 100)}%;background:${cor}"></div></div><b>${fmt(gasto)} / ${fmt(limite)}</b></div>`;
}

export function vVisao() {
  const mes = stFin.mes;
  const gasto = gastoDoMes(mes);
  const entrada = entradaDoMes(mes);
  const saldo = entrada - gasto;
  const fin = finGeral();
  const consolidado = saldo + fin.mrrLiq;
  const limites = consumoLimites(mes);

  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
    <button class="btn sec" onclick="finMudarMes(-1)">‹</button>
    <b style="font-family:var(--display);font-size:15px;text-transform:capitalize">${esc(rotuloMes(mes))}</b>
    <button class="btn sec" onclick="finMudarMes(1)">›</button>
  </div>`;

  html += '<div class="stats">'
    + stat('Gasto do mês', fmt(gasto), (limites.global && gasto > limites.global.limite) ? 'ruim' : '', limites.global ? `limite ${fmt(limites.global.limite)}` : '')
    + stat('Entradas', fmt(entrada), 'verde')
    + stat('Saldo do mês', fmt(saldo), saldo >= 0 ? 'verde' : 'ruim')
    + stat('Renda mensal líquida (clientes)', fmt(fin.mrrLiq) + '/mês', fin.mrrLiq >= 0 ? 'verde' : 'ruim', `${fmt(fin.mrrBruto)} mensalidades − ${fmt(fin.custoMensal)} custos`)
    + stat('Consolidado', fmt(consolidado), consolidado >= 0 ? 'verde' : 'ruim', 'saldo do mês + renda líquida')
    + '</div>';

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:16px">
    <div class="painel"><h2>Gastos — últimos 12 meses</h2><div style="position:relative;height:220px"><canvas id="graf-meses"></canvas></div></div>
    <div class="painel"><h2>Por categoria</h2><div style="position:relative;height:220px"><canvas id="graf-categorias"></canvas></div></div>
    <div class="painel"><h2>Por cartão</h2><div style="position:relative;height:220px"><canvas id="graf-cartoes"></canvas></div></div>
  </div>`;

  html += '<div class="painel funil"><h2>Limites do mês</h2>'
    + (limites.global ? barraLimite('Global', limites.global.gasto, limites.global.limite) : '')
    + limites.categorias.map((c) => barraLimite(c.nome, c.gasto, c.limite)).join('')
    + (!limites.global && !limites.categorias.length ? '<div class="vazio">Nenhum limite configurado ainda.</div>' : '')
    + '</div>';

  const cartoesAtivos = stFin.cartoes.filter((c) => c.ativo);
  html += '<div class="painel"><h2>Próximas faturas</h2>'
    + (cartoesAtivos.length
      ? cartoesAtivos.map((c) => `<div class="fup-item"><b>${esc(c.nome)}</b>
          <span style="font-family:var(--mono);font-weight:600">${fmt(faturaAberta(c))}</span>
          <span style="color:var(--apagado);font-size:11.5px;margin-left:auto">fecha dia ${c.dia_fechamento} · vence dia ${c.dia_vencimento}</span></div>`).join('')
      : '<div class="vazio">Nenhum cartão cadastrado ainda.</div>')
    + '</div>';

  // ---- Projetos & clientes (migrado INTACTO das linhas 17-33 de financeiro.js) ----
  const ls = ativos();
  html += '<div class="painel" style="overflow-x:auto"><h2>Projetos & clientes <span class="conta">' + ls.length + ' ativos</span></h2>'
    + (ls.length
      ? '<table><thead><tr><th>Cliente</th><th>Projeto</th><th>Custo setup</th><th>Mensalidade</th><th>Custo mensal</th><th>Meses</th><th>Lucro acum.</th><th>Pago</th><th>Contrato</th></tr></thead><tbody>'
      + ls.map((l) => {
        const f = finCliente(l);
        return `<tr><td><b>${esc(l.nome)}</b></td>
          <td><span class="din">${l.valor ? fmt(l.valor) : '—'}</span></td>
          <td><span class="din ${f.custoSetup ? 'neg' : ''}">${f.custoSetup ? '− ' + fmt(f.custoSetup) : '—'}</span></td>
          <td><span class="din">${l.manutencao ? fmt(l.manutencao) + '/mês' : '—'}</span></td>
          <td><span class="din ${l.custoMensal ? 'neg' : ''}">${l.custoMensal ? '− ' + fmt(l.custoMensal) + '/mês' : '—'}</span></td>
          <td><span class="din">${mesesAtivo(l)}</span></td>
          <td><span class="din ${f.lucro >= 0 ? 'pos' : 'neg'}">${fmt(f.lucro)}</span></td>
          <td><input type="checkbox" class="fin-check" ${l.pago ? 'checked' : ''} onchange="salvarCampo('${l.slug}',{pago:this.checked?1:0})"></td>
          <td>${pillCt(l.contratoStatus)}</td></tr>`;
      }).join('') + '</tbody></table>'
      : '<div class="vazio">Sem clientes ativos ainda — o financeiro nasce no primeiro fechamento.</div>')
    + '</div>';

  return html;
}
