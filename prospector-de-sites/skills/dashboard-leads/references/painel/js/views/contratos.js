// Contratos — briefings → orçamentos → contratos: o caminho comercial completo.
import { st, fil, ativos, BRIEFING_NOMES, SERVICOS, dias } from '../estado.js';
import { fmt, esc, pillStatus } from '../ui.js';

const pillBf = (bs) =>
  `<span class="pill bf-${bs}">${BRIEFING_NOMES[bs] || bs}</span>`;

function temRespostas(l) {
  try {
    const d = JSON.parse(l.briefing || '{}');
    return !!(d.respostas_texto || (d.respostas && Object.keys(d.respostas).length));
  } catch (e) { return false; }
}

function secaoBriefings() {
  const ls = fil().filter((l) => l.briefingStatus || l.orcamentoEm);
  const linhas = ls.map((l) => {
    const acoesBf = [
      `<a class="btn-ct baixar" href="/sites/${l.slug}/briefing-${l.slug}.html" target="_blank">Ver briefing</a>`,
      l.briefingStatus === 'criado' ? `<a class="btn-ct baixar" href="#" onclick="marcarBriefingEnviado('${l.slug}');return false" title="marque quando mandar o link/arquivo pro cliente">Marquei como enviado</a>` : '',
      `<a class="btn-ct ${temRespostas(l) ? 'ass' : 'baixar'}" href="#" onclick="abrirRespostasModal('${l.slug}');return false">${temRespostas(l) ? 'Ver respostas' : 'Registrar respostas'}</a>`,
    ].filter(Boolean).join('');
    const orc = l.orcamentoEm
      ? `<a class="btn-ct ver" href="/sites/${l.slug}/orcamento-${l.slug}.html" target="_blank">Ver orçamento</a><div class="sub-td">enviado em ${l.orcamentoEm}${l.valor ? ' · ' + fmt(l.valor) : ''}</div>`
      : (l.briefingStatus === 'respondido'
        ? `<a class="btn-ct ver" href="#" onclick="abrirOrcamentoModal('${l.slug}');return false">Gerar orçamento</a>`
        : '<span style="color:var(--apagado);font-size:11.5px">aguardando respostas</span>');
    return `<tr><td><b>${esc(l.nome)}</b><div class="sub-td">${SERVICOS[l.servico] || 'Site'}</div></td>
      <td>${pillBf(l.briefingStatus || 'criado')}</td>
      <td>${acoesBf}</td>
      <td>${orc}</td>
      <td>${pillStatus(l.status)}${l.status === 'proposta' && l.dataProposta ? `<div class="sub-td">há ${Math.max(0, dias(l.dataProposta))}d</div>` : ''}</td></tr>`;
  }).join('');

  return `<div class="painel" style="overflow-x:auto"><h2>Briefings &amp; orçamentos <span class="conta">${ls.length}</span></h2>
    ${ls.length
      ? `<table><thead><tr><th>Cliente</th><th>Briefing</th><th>Ações</th><th>Orçamento</th><th>Fluxo</th></tr></thead><tbody>${linhas}</tbody></table>`
      : '<div class="vazio">Nenhum briefing ainda. Crie um com o botão acima — o cliente responde, você gera o orçamento e o lead entra no fluxo de proposta sozinho.</div>'}</div>`;
}

function secaoContratos() {
  const ls = ativos().concat(fil().filter((l) => l.status === 'encerrado' && l.contratoStatus && l.contratoStatus !== 'pendente'));
  if (!ls.length) return '<div class="painel vazio">Nenhum cliente fechado ainda. Quando fechar, o contrato sai daqui — pelo botão "+ Contrato" ou pedindo /contrato ao Claude.</div>';

  return '<div class="painel" style="overflow-x:auto"><h2>Contratos <span class="conta">' + ls.length + '</span></h2><table><thead><tr><th>Cliente</th><th>Valor</th><th>Mensalidade</th><th>Contrato</th><th>Data</th><th>Pago</th><th>Ações</th></tr></thead><tbody>'
    + ls.map((l) => {
      const gerado = l.contratoStatus && l.contratoStatus !== 'pendente';
      const acao = [
        gerado ? `<a href="#" class="btn-ct ver" onclick="abrirContrato('${l.slug}','${(l.nome || '').replace(/'/g, '')}');return false" title="abrir a folha do contrato aqui no painel">Ver contrato</a>` : '',
        `<a href="#" class="btn-ct baixar" onclick="abrirContratoModal('${l.slug}');return false">${gerado ? 'Refazer' : 'Gerar contrato'}</a>`,
        ['enviado', 'assinado'].includes(l.contratoStatus) ? `<a href="/sites/${l.slug}/contrato-${l.slug}.docx" download class="btn-ct baixar" title="baixa o Word travado que vai pro cliente (gerado pelo /contrato)">.docx</a>` : '',
        l.contratoStatus === 'assinado' ? `<a href="/sites/${l.slug}/contrato-${l.slug}-assinado.docx" download class="btn-ct ass">✓ Assinado</a>` : '',
      ].filter(Boolean).join('');
      return `<tr><td><b>${esc(l.nome)}</b><div class="sub-td">${SERVICOS[l.servico] || 'Site'}</div></td>
        <td><span class="din">${l.valor ? fmt(l.valor) : '—'}</span></td>
        <td><span class="din">${l.manutencao ? fmt(l.manutencao) + '/mês' : '—'}</span></td>
        <td><select class="mini" onchange="salvarCampo('${l.slug}',{contratoStatus:this.value})">
          ${['pendente', 'gerado', 'enviado', 'assinado'].map((cs) => `<option value="${cs}"${(l.contratoStatus || 'pendente') === cs ? ' selected' : ''}>${cs}</option>`).join('')}</select></td>
        <td>${l.contratoEm || '—'}</td>
        <td><input type="checkbox" class="fin-check" ${l.pago ? 'checked' : ''} onchange="salvarCampo('${l.slug}',{pago:this.checked?1:0})"></td>
        <td>${acao}</td></tr>`;
    }).join('') + '</tbody></table></div>';
}

export function vContratos() {
  const cab = `<div class="painel" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
    <div><b style="font-family:var(--display);font-size:15px">Do briefing ao contrato</b>
    <div style="color:var(--apagado);font-size:11.5px;margin-top:2px">briefing → cliente responde → orçamento → proposta → fechou → contrato</div></div>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button class="btn sec" onclick="abrirBriefingModal()">+ Briefing</button>
      <button class="btn prim" onclick="abrirContratoModal('')">+ Contrato</button>
    </div></div>`;
  return cab + secaoBriefings() + secaoContratos();
}
