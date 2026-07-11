// Pipeline — kanban drag & drop da prospecção até fechar.
import { fil, ORDEM, NOMES } from '../estado.js';
import { card } from '../ui.js';

export function vPipeline() {
  const por = {};
  fil().forEach((l) => { (por[l.status] = por[l.status] || []).push(l); });
  return `<p class="dica-drag">Arraste um card para mudar o status — os automáticos (redesenhado, publicado, proposta) o plugin move sozinho; use o arrasto principalmente para <b>Respondeu</b> e <b>Cliente ativo</b>. Encerrar contrato é na aba Clientes.</p>
  <div class="board">` + ORDEM.concat(['descartado']).map((s) => {
    const arr = por[s] || [];
    return `<div class="col" data-st="${s}" ondragover="dragSobre(event)" ondragleave="dragSai(event)" ondrop="solta(event,'${s}')">
      <h3>${NOMES[s]}<span>${arr.length}</span></h3>
      <div class="cards">${arr.length ? arr.map(card).join('') : '<div class="vazio">solte aqui</div>'}</div></div>`;
  }).join('') + '</div>';
}
