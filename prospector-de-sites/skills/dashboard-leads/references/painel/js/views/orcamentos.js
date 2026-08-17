// Orçamentos — propostas formalizadas geradas dos briefings, no fluxo comercial.
import { st, orcamentos, briefings, situacaoBriefing, parseBriefing, SERVICOS, dias } from '../estado.js';
import { fmt, esc, pillStatus } from '../ui.js';

export function vOrcamentos() {
  const ls = orcamentos().slice().sort((a, b) => (b.orcamentoEm || '').localeCompare(a.orcamentoEm || ''));
  const prontos = briefings().filter((l) => situacaoBriefing(l) !== 'aguardando' && !l.orcamentoEm);

  let html = `<div class="painel" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
    <div><b style="font-family:var(--display);font-size:15px">Orçamentos</b>
    <div style="color:var(--apagado);font-size:11.5px;margin-top:2px">documento formal gerado do briefing — enviar move o cliente pra proposta</div></div>
    <button class="btn prim" style="margin-left:auto" onclick="abrirOrcamentoModal('')">+ Orçamento</button></div>`;

  if (prontos.length) {
    html += `<div class="painel" style="padding:12px 20px"><b style="font-size:12.5px;color:var(--ambar)">Briefings respondidos aguardando orçamento</b>
      <div style="margin-top:8px">${prontos.map((l) =>
        `<a class="btn-ct ver" href="#" onclick="abrirOrcamentoModal('${l.slug}');return false">Orçar ${esc(l.nome)}</a>`).join('')}</div></div>`;
  }

  if (!ls.length && !prontos.length) {
    html += '<div class="painel vazio">Nenhum orçamento ainda. O caminho natural: crie um briefing, o cliente responde, e o botão "Gerar orçamento" aparece — ou use "+ Orçamento" pra orçar direto.</div>';
    return html;
  }

  html += `<div class="painel" style="overflow-x:auto"><h2>Enviados <span class="conta">${ls.length}</span></h2>
    ${ls.length ? `<table><thead><tr><th>Cliente</th><th>Valor</th><th>Mensalidade</th><th>Enviado em</th><th>Briefing vinculado</th><th>Fluxo</th><th>Ações</th></tr></thead><tbody>`
      + ls.map((l) => {
        const d = parseBriefing(l);
        const vinculo = l.briefingStatus
          ? `<a class="btn-ct baixar" href="#" onclick="abrirRespostasModal('${l.slug}');return false">Ver respostas</a>${d.respondidoEm ? `<div class="sub-td">respondido em ${d.respondidoEm}</div>` : ''}`
          : '<span style="color:var(--apagado);font-size:11.5px">sem briefing</span>';
        return `<tr><td><b>${esc(l.nome)}</b><div class="sub-td">${SERVICOS[l.servico] || 'Site'}</div></td>
          <td><span class="din">${l.valor ? fmt(l.valor) : '—'}</span></td>
          <td><span class="din">${l.manutencao ? fmt(l.manutencao) + '/mês' : '—'}</span></td>
          <td>${l.orcamentoEm || '—'}</td>
          <td>${vinculo}</td>
          <td>${pillStatus(l.status)}${l.status === 'proposta' && l.dataProposta ? `<div class="sub-td">há ${Math.max(0, dias(l.dataProposta))}d</div>` : ''}</td>
          <td><a class="btn-ct ver" href="/sites/${l.slug}/orcamento-${l.slug}.html" target="_blank">Ver orçamento</a>
              <a class="btn-ct baixar" href="#" onclick="abrirOrcamentoModal('${l.slug}');return false">Refazer</a></td></tr>`;
      }).join('') + '</tbody></table>' : '<div class="vazio">Nenhum orçamento enviado ainda.</div>'}</div>`;

  return html;
}
