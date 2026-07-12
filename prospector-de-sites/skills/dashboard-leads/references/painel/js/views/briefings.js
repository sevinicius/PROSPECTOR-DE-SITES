// Briefings — solicitações de projeto: aguardando resposta, respondidos (não lidos) e lidos.
import { st, briefings, situacaoBriefing, parseBriefing, temRespostas, BRIEFING_NOMES, SERVICOS, PERGUNTAS_COMUNS, PERGUNTAS_BRIEFING } from '../estado.js';
import { esc, pillStatus } from '../ui.js';

const FILTROS = [
  ['todos', 'Todos'],
  ['aguardando', 'Aguardando resposta'],
  ['naolido', 'Respondidos — não lidos'],
  ['lido', 'Lidos'],
];

const pillBf = (l) => {
  const sit = situacaoBriefing(l);
  if (sit === 'naolido') return '<span class="pill bf-respondido">Respondido — novo</span>';
  if (sit === 'lido') return '<span class="pill bf-lido">Respondido — lido</span>';
  return `<span class="pill bf-${l.briefingStatus}">${BRIEFING_NOMES[l.briefingStatus] || l.briefingStatus}</span>`;
};

// prévia das respostas pra aparecer direto na listagem
function previaRespostas(l) {
  const d = parseBriefing(l);
  if (d.respostas && Object.keys(d.respostas).length) {
    const perguntas = PERGUNTAS_COMUNS.concat(PERGUNTAS_BRIEFING[d.tipo || l.servico || 'outro'] || []);
    return perguntas.filter(([id]) => d.respostas[id]).map(([id]) => d.respostas[id]).join(' · ');
  }
  return d.respostas_texto || '';
}

function cardBriefing(l) {
  const d = parseBriefing(l);
  const sit = situacaoBriefing(l);
  const previa = previaRespostas(l);
  const datas = [
    d.criadoEm ? 'criado ' + d.criadoEm : '',
    d.respondidoEm ? 'respondido ' + d.respondidoEm : '',
  ].filter(Boolean).join(' · ');

  const acoes = [
    `<a class="btn-ct baixar" href="/sites/${l.slug}/briefing-${l.slug}.html" target="_blank">Ver briefing</a>`,
    l.briefingStatus === 'criado' ? `<a class="btn-ct baixar" href="#" onclick="marcarBriefingEnviado('${l.slug}');return false" title="marque quando mandar o link/arquivo pro cliente">Marquei como enviado</a>` : '',
    `<a class="btn-ct ${sit === 'naolido' ? 'ver' : 'baixar'}" href="#" onclick="abrirRespostasModal('${l.slug}');return false">${temRespostas(l) ? 'Ver respostas' : 'Registrar respostas'}</a>`,
    sit !== 'aguardando' ? `<a class="btn-ct ${l.orcamentoEm ? 'baixar' : 'ass'}" href="#" onclick="abrirOrcamentoModal('${l.slug}');return false">${l.orcamentoEm ? 'Refazer orçamento' : 'Gerar orçamento'}</a>` : '',
    l.orcamentoEm ? `<a class="btn-ct baixar" href="/sites/${l.slug}/orcamento-${l.slug}.html" target="_blank">Ver orçamento</a>` : '',
  ].filter(Boolean).join('');

  return `<div class="bf-item${sit === 'naolido' ? ' novo' : ''}">
    <div class="bf-topo">
      <div><b>${esc(l.nome)}</b><span class="bf-meta">${SERVICOS[d.tipo || l.servico] || 'Site'}${datas ? ' · ' + datas : ''}</span></div>
      <div style="display:flex;gap:6px;align-items:center">${pillBf(l)}${pillStatus(l.status)}</div>
    </div>
    ${previa ? `<div class="bf-previa">${esc(previa.slice(0, 220))}${previa.length > 220 ? '…' : ''}</div>` : ''}
    <div class="acoes" style="margin-top:10px">${acoes}</div>
  </div>`;
}

export function vBriefings() {
  const todos = briefings();
  const conta = (f) => (f === 'todos' ? todos : todos.filter((l) => situacaoBriefing(l) === f)).length;
  const lista = st.filtroBf === 'todos' ? todos : todos.filter((l) => situacaoBriefing(l) === st.filtroBf);

  let html = `<div class="painel" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
    <div><b style="font-family:var(--display);font-size:15px">Briefings</b>
    <div style="color:var(--apagado);font-size:11.5px;margin-top:2px">o cliente conta o que precisa — daqui sai o orçamento</div></div>
    <button class="btn prim" style="margin-left:auto" onclick="abrirBriefingModal()">+ Briefing</button></div>`;

  html += `<div class="cmp-tabs">${FILTROS.map(([f, nome]) =>
    `<button class="${st.filtroBf === f ? 'on' : ''}" onclick="filtrarBriefings('${f}')">${nome} <span style="opacity:.6">${conta(f)}</span></button>`).join('')}</div>`;

  html += lista.length
    ? `<div class="painel" style="padding:6px 20px">${lista.map(cardBriefing).join('')}</div>`
    : '<div class="painel vazio">Nenhum briefing neste filtro. Crie um com o botão "+ Briefing" — o cliente responde e as respostas aparecem aqui.</div>';

  return html;
}
