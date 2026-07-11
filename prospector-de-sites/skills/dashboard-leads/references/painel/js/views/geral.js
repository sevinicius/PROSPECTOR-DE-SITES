// Visão geral — o resumo do negócio: carteira, renda, funil e pendências.
import { fil, emAndamento, ativos, followups, finGeral, dias, ORDEM, NOMES, CORES } from '../estado.js';
import { fmt, esc, stat } from '../ui.js';

export function vGeral() {
  const ls = fil();
  const at = ativos();
  const fin = finGeral();
  const props = ls.filter((l) => l.status === 'proposta');
  const fu = followups();

  let html = '<div class="stats">'
    + stat('Clientes ativos', at.length, 'ambar')
    + stat('Renda mensal líquida', fmt(fin.mrrLiq), fin.mrrLiq >= 0 ? 'verde' : 'ruim', `${fmt(fin.mrrBruto)} bruto − ${fmt(fin.custoMensal)} custos`)
    + stat('Lucro em projetos', fmt(fin.lucroFechado), fin.lucroFechado >= 0 ? 'verde' : 'ruim', `${fmt(fin.recebido)} recebido − ${fmt(fin.custoSetup)} custos`)
    + stat('A receber', fmt(fin.areceber), 'ambar')
    + stat('Leads em andamento', emAndamento().length - at.length)
    + stat('Propostas na rua', props.length, fu.length ? 'ambar' : '', fu.length ? fu.length + ' precisando de follow-up' : '')
    + '</div>';

  const max = Math.max(...ORDEM.map((s) => ls.filter((l) => l.status === s).length), 1);
  html += '<div class="painel funil"><h2>Funil do pipeline</h2>'
    + ORDEM.map((s) => {
      const n = ls.filter((l) => l.status === s).length;
      return `<div class="linha"><span>${NOMES[s]}</span><div class="barra"><div class="fill" style="width:${n / max * 100}%;background:${CORES[s]}"></div></div><b>${n}</b></div>`;
    }).join('') + '</div>';

  html += '<div class="painel"><h2>Follow-ups pendentes <span class="conta">4+ dias sem resposta</span></h2>'
    + (fu.length ? fu.map((l) =>
      `<div class="fup-item"><b>${esc(l.nome)}</b><span class="dias">${dias(l.dataProposta)} dias</span>
       <span style="color:var(--apagado);font-size:11.5px">proposta em ${l.dataProposta}</span>
       ${l.whatsapp ? `<a style="margin-left:auto;font-size:12px;font-weight:700;color:var(--ambar)" href="https://wa.me/${l.whatsapp}" target="_blank">chamar no WhatsApp →</a>` : ''}</div>`).join('')
      : '<div class="vazio">Nenhum follow-up pendente.</div>') + '</div>';

  return html;
}
