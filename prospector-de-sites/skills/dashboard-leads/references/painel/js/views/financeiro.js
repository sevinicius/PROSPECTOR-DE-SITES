// Financeiro — lucro de verdade: receita − custos, por cliente e no agregado.
import { ativos, finCliente, finGeral, mesesAtivo } from '../estado.js';
import { fmt, esc, stat, pillCt } from '../ui.js';

export function vFinanceiro() {
  const ls = ativos();
  const fin = finGeral();

  let html = '<div class="stats">'
    + stat('Recebido', fmt(fin.recebido), 'verde')
    + stat('A receber', fmt(fin.areceber), 'ambar')
    + stat('Renda mensal líquida', fmt(fin.mrrLiq) + '/mês', fin.mrrLiq >= 0 ? 'verde' : 'ruim', `${fmt(fin.mrrBruto)} mensalidades − ${fmt(fin.custoMensal)} custos`)
    + stat('Lucro em projetos', fmt(fin.lucroFechado), fin.lucroFechado >= 0 ? 'verde' : 'ruim', `custos de setup: ${fmt(fin.custoSetup)}`)
    + stat('Projeção 12 meses', fmt(fin.projecao12), 'ambar', 'recebíveis + 12× renda líquida')
    + '</div>';

  html += '<div class="painel" style="overflow-x:auto"><h2>Por cliente <span class="conta">' + ls.length + ' ativos</span></h2>'
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

  html += `<div class="painel"><h2>Como o financeiro se alimenta</h2>
    <p class="nota-p">Valor, mensalidade e custos entram quando você fecha (drag no kanban, botão "+ Cliente fechado" ou contando pro Claude).
    "Pago" você marca aqui com um clique. Lucro acumulado = (projeto − custo de setup) + meses ativo × (mensalidade − custo mensal).
    Cliente encerrado sai das contas mensais, mas o histórico fica na aba Clientes.</p></div>`;

  return html;
}
