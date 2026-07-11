// Contratos — status e documentos de quem fechou.
import { ativos, fil } from '../estado.js';
import { fmt, esc } from '../ui.js';

export function vContratos() {
  const ls = ativos().concat(fil().filter((l) => l.status === 'encerrado' && l.contratoStatus && l.contratoStatus !== 'pendente'));
  if (!ls.length) return '<div class="painel vazio">Nenhum cliente fechado ainda. Quando fechar, arraste o card pra "Cliente ativo" e peça ao Claude: /contrato [cliente].</div>';

  return '<div class="painel" style="overflow-x:auto"><table><thead><tr><th>Cliente</th><th>Valor</th><th>Mensalidade</th><th>Contrato</th><th>Data</th><th>Pago</th><th>Ações</th></tr></thead><tbody>'
    + ls.map((l) => {
      const acao = (l.contratoStatus && l.contratoStatus !== 'pendente')
        ? `<a href="#" class="btn-ct ver" onclick="abrirContrato('${l.slug}','${(l.nome || '').replace(/'/g, '')}');return false" title="abrir a folha do contrato aqui no painel">Ver contrato</a>
           <a href="/sites/${l.slug}/contrato-${l.slug}.docx" download class="btn-ct baixar" title="baixa o Word travado que vai pro cliente">Baixar .docx</a>`
          + (l.contratoStatus === 'assinado' ? `<a href="/sites/${l.slug}/contrato-${l.slug}-assinado.docx" download class="btn-ct ass">✓ Assinado</a>` : '')
        : '<span style="color:var(--apagado);font-size:12px">peça /contrato ao Claude</span>';
      return `<tr><td><b>${esc(l.nome)}</b></td>
        <td><span class="din">${l.valor ? fmt(l.valor) : '—'}</span></td>
        <td><span class="din">${l.manutencao ? fmt(l.manutencao) + '/mês' : '—'}</span></td>
        <td><select class="mini" onchange="salvarCampo('${l.slug}',{contratoStatus:this.value})">
          ${['pendente', 'enviado', 'assinado'].map((cs) => `<option value="${cs}"${(l.contratoStatus || 'pendente') === cs ? ' selected' : ''}>${cs}</option>`).join('')}</select></td>
        <td>${l.contratoEm || '—'}</td>
        <td><input type="checkbox" class="fin-check" ${l.pago ? 'checked' : ''} onchange="salvarCampo('${l.slug}',{pago:this.checked?1:0})"></td>
        <td>${acao}</td></tr>`;
    }).join('') + '</tbody></table></div>';
}
