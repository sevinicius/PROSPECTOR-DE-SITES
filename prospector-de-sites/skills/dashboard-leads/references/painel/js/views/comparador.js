// Comparador — antes/depois dos sites redesenhados.
import { st, fil, COM_PAGINA } from '../estado.js';
import { esc } from '../ui.js';

export function vComparador() {
  const ls = fil().filter((l) => l.slug && COM_PAGINA.includes(l.status) && (l.servico || 'site') === 'site');
  if (!ls.length) return '<div class="painel"><div class="vazio">Sem sites redesenhados ainda — rode /redesenhar no Claude e o antes/depois aparece aqui.</div></div>';
  if (!st.cmpSel || !ls.some((l) => l.slug === st.cmpSel)) st.cmpSel = ls[0].slug;
  const l = ls.find((x) => x.slug === st.cmpSel);
  const antiga = l.siteAntigo ? (l.siteAntigo.indexOf('http') === 0 ? l.siteAntigo : 'https://' + l.siteAntigo) : null;
  const nova = `/sites/${l.slug}/${l.slug}.html`;

  return `<div class="cmp-tabs">${ls.map((x) =>
      `<button class="${x.slug === st.cmpSel ? 'on' : ''}" onclick="cmpSelecao('${x.slug}')">${esc(x.nome)}</button>`).join('')}</div>
    <div class="cmp-grid">
      <div class="cmp-col"><div class="cab antes">Antes — site atual${antiga ? ` · <a href="${esc(antiga)}" target="_blank">abrir ↗</a>` : ''}</div>
        ${antiga ? `<iframe src="${esc(antiga)}" loading="lazy"></iframe>` : '<div class="vazio" style="padding:30px">Sem URL do site antigo registrada.</div>'}</div>
      <div class="cmp-col"><div class="cab depois">Depois — nova versão · <a href="${nova}" target="_blank">abrir ↗</a></div><iframe src="${nova}"></iframe></div>
    </div>
    <div style="font-size:11px;color:var(--apagado);margin-top:8px">Alguns sites antigos bloqueiam visualização embutida — se o lado "Antes" ficar em branco, use o link "abrir ↗".</div>`;
}
