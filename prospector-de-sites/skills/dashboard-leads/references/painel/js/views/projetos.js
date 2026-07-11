// Projetos — toda entrega em produção ou entregue: sites, automações, sistemas.
import { fil, COM_PAGINA, SERVICOS } from '../estado.js';
import { esc, pillStatus, tagServico } from '../ui.js';

export function vProjetos() {
  const ls = fil().filter((l) => COM_PAGINA.includes(l.status) || (l.servico && l.servico !== 'site' && l.status !== 'descartado'));
  if (!ls.length) return '<div class="painel vazio">Nenhum projeto ainda — rode /redesenhar para sites, ou cadastre um cliente de automação/sistema na aba Clientes.</div>';

  return '<div class="grade-projetos">' + ls.map((l) => {
    const temPagina = l.slug && COM_PAGINA.includes(l.status) && (l.servico || 'site') === 'site';
    const pg = `/sites/${l.slug}/${l.slug}.html`;
    const prev = temPagina
      ? `<div class="prev"><iframe src="${pg}" loading="lazy"></iframe></div>`
      : `<div class="prev sem">${(SERVICOS[l.servico] || 'Projeto')}</div>`;
    const prim = l.urlNova
      ? `<a class="prim" href="${esc(l.urlNova)}" target="_blank">Ver no ar ↗</a>`
      : (temPagina ? `<a class="prim" href="${pg}" target="_blank">Ver página</a>` : `<a class="prim" href="#" onclick="abrirEdit('${l.slug}');return false">Detalhes</a>`);
    const seg = temPagina
      ? `<a class="sec" href="/sites/${l.slug}/${l.slug}-editor.html" target="_blank">Editar site</a>`
      : `<a class="sec" href="#" onclick="abrirEdit('${l.slug}');return false">Editar dados</a>`;

    const ic = [];
    if (l.siteAntigo) ic.push(`<a href="${esc(l.siteAntigo)}" target="_blank" title="site antigo do cliente">antigo</a>`);
    if (l.urlNova && temPagina) ic.push(`<a href="${pg}" target="_blank" title="versão local">local</a>`);
    if (l.whatsapp) ic.push(`<a href="https://wa.me/${l.whatsapp}" target="_blank">whatsapp</a>`);
    if (l.email && l.email.indexOf('@') > 0) ic.push(`<a href="mailto:${esc(l.email)}">e-mail</a>`);
    ic.push(`<a href="#" onclick="abrirEdit('${l.slug}');return false">editar</a>`);
    ic.push(`<a href="#" class="del" onclick="deletar('${l.slug}');return false">excluir</a>`);

    return `<div class="proj-card">${prev}<div class="info">
      <div class="p-head"><span class="p-nm">${esc(l.nome)}${tagServico(l)}</span>${pillStatus(l.status)}</div>
      <div class="p-sub">${[l.nicho, l.cidade, l.nota ? '★ ' + l.nota + ' (' + l.avaliacoes + ')' : null].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="p-main">${prim}${seg}</div>
      <div class="p-icons">${ic.join('')}</div></div></div>`;
  }).join('') + '</div>';
}
