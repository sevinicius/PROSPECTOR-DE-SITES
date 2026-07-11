// ui.js — formatadores e pedaços de HTML compartilhados.
import { CORES, NOMES, SERVICOS, COM_PAGINA, dias, st } from './estado.js';

export const fmt = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR');
export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function pillStatus(s) {
  return `<span class="pill" style="background:color-mix(in srgb,${CORES[s]} 16%,transparent);color:${CORES[s]}">${NOMES[s] || s}</span>`;
}
export function tagServico(l) {
  return l.servico && l.servico !== 'site' ? `<span class="tag svc">${SERVICOS[l.servico] || l.servico}</span>` : '';
}
export function pillCt(ct) {
  ct = ct || 'pendente';
  return `<span class="pill ct-${ct}">${ct.charAt(0).toUpperCase() + ct.slice(1)}</span>`;
}

export function acoes(l) {
  const a = [];
  if (l.siteAntigo) a.push(`<a href="${esc(l.siteAntigo)}" target="_blank">antigo</a>`);
  if (l.slug && COM_PAGINA.includes(l.status) && (l.servico || 'site') === 'site') {
    a.push(`<a href="/sites/${l.slug}/${l.slug}.html" target="_blank">página</a>`);
    a.push(`<a href="/sites/${l.slug}/${l.slug}-editor.html" target="_blank">editar site</a>`);
  }
  if (l.urlNova) a.push(`<a href="${esc(l.urlNova)}" target="_blank">no ar ↗</a>`);
  if (l.whatsapp) a.push(`<a href="https://wa.me/${l.whatsapp}" target="_blank">whatsapp</a>`);
  if (l.email && l.email.indexOf('@') > 0) a.push(`<a href="mailto:${esc(l.email)}">e-mail</a>`);
  a.push(`<a href="#" onclick="abrirEdit('${l.slug}');return false">editar</a>`);
  a.push(`<a href="#" class="del" onclick="deletar('${l.slug}');return false">excluir</a>`);
  return `<div class="acoes">${a.join('')}</div>`;
}

export function card(l) {
  const f = l.status === 'proposta' && dias(l.dataProposta) >= 4
    ? `<span class="tag fup">follow-up ${dias(l.dataProposta)}d</span>` : '';
  return `<div class="card" draggable="true" ondragstart="dragIni(event,'${l.slug}')" ondragend="dragFim(event)" style="--cor:${CORES[l.status]}">
    <div class="nm">${esc(l.nome)}${tagServico(l)}${f}</div>
    <div class="mt">${l.nota ? '★ ' + l.nota + ' (' + l.avaliacoes + ')' : ''}${l.cidade ? ' · ' + esc(l.cidade) : ''}</div>
    ${l.motivo ? `<div class="motivo">${esc(l.motivo)}</div>` : ''}
    ${l.obs ? `<div class="mt">${esc(l.obs)}</div>` : ''}
    ${l.valor ? `<div class="valor">${fmt(l.valor)}${l.manutencao ? ` <span class="mes">+ ${fmt(l.manutencao)}/mês</span>` : ''}</div>` : ''}
    ${acoes(l)}</div>`;
}

export function pagSize() {
  if (st.porPag !== 'auto') return st.porPag;
  const v = document.getElementById('view');
  const h = v ? v.clientHeight : 600;
  return Math.max(4, Math.floor((h - 165) / 59));
}

export function paginacao(total, pp) {
  const paginas = Math.max(1, Math.ceil(total / pp));
  if (st.pag > paginas) st.pag = paginas;
  const ini = (st.pag - 1) * pp;
  const fim = Math.min(ini + pp, total);
  const html = `<div class="pagin"><span class="info">${total ? ini + 1 : 0}–${fim} de ${total}</span>
    <select onchange="mudaPorPag(this.value)"><option value="auto"${st.porPag === 'auto' ? ' selected' : ''}>Auto (${pp}/pág)</option>
    ${[10, 25, 50].map((n) => `<option value="${n}"${st.porPag === n ? ' selected' : ''}>${n}/pág</option>`).join('')}</select>
    <button onclick="irPag(${st.pag - 1})"${st.pag <= 1 ? ' disabled' : ''}>‹</button>
    ${Array.from({ length: paginas }, (_, i) =>
      `<button class="${st.pag === i + 1 ? 'on' : ''}" onclick="irPag(${i + 1})">${i + 1}</button>`).join('')}
    <button onclick="irPag(${st.pag + 1})"${st.pag >= paginas ? ' disabled' : ''}>›</button></div>`;
  return { ini, fim, html };
}

export const stat = (rotulo, valor, classe = '', sub = '') =>
  `<div class="stat ${classe}"><div class="n">${valor}</div><div class="l">${rotulo}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
