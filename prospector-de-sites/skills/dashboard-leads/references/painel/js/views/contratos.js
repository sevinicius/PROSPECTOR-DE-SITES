// Contratos — formalização de quem fechou. Briefings e orçamentos têm abas próprias.
import { fil, ativos, SERVICOS } from '../estado.js';
import { fmt, esc } from '../ui.js';

export function vContratos() {
  const cab = `<div class="painel" style="display:flex;align-items:center;gap:12px;padding:14px 20px">
    <div><b style="font-family:var(--display);font-size:15px">Contratos</b>
    <div style="color:var(--apagado);font-size:11.5px;margin-top:2px">minuta pelo template — objeto por tipo de projeto, editável antes de gerar · briefings e orçamentos têm abas próprias</div></div>
    <button class="btn prim" style="margin-left:auto" onclick="abrirContratoModal('')">+ Contrato</button></div>`;

  const ls = ativos().concat(fil().filter((l) => l.status === 'encerrado' && l.contratoStatus && l.contratoStatus !== 'pendente'));
  if (!ls.length) return cab + '<div class="painel vazio">Nenhum cliente fechado ainda. Quando fechar, o contrato sai daqui — pelo botão "+ Contrato" ou pedindo /contrato ao Claude.</div>';

  return cab + '<div class="painel" style="overflow-x:auto"><h2>Clientes fechados <span class="conta">' + ls.length + '</span></h2><table><thead><tr><th>Cliente</th><th>Valor</th><th>Mensalidade</th><th>Contrato</th><th>Data</th><th>Pago</th><th>Ações</th></tr></thead><tbody>'
    + ls.map((l) => {
      const gerado = l.contratoStatus && l.contratoStatus !== 'pendente';
      const acao = [
        gerado ? `<a href="#" class="btn-ct ver" onclick="abrirContrato('${l.slug}');return false" title="abrir a folha do contrato aqui no painel">Ver contrato</a>` : '',
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
