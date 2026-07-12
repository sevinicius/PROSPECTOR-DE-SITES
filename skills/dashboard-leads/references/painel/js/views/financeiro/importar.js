// financeiro/importar.js — upload de fatura/extrato PDF (preview em 2 fases) + histórico de importações.
import { api } from '../../api.js';
import { fmt, esc } from '../../ui.js';
import { stFin, carregarFin } from '../../fin.js';

function bannerErro(p) {
  if (p.erro === 'banco_nao_reconhecido') {
    return `<div class="painel"><h2>Banco não reconhecido</h2>
      <p class="nota-p">Não foi possível identificar o banco/formato deste PDF. Bancos suportados: <b>${esc((p.bancos || []).join(', ') || '—')}</b>.</p>
      <div class="mbot" style="margin-top:12px;justify-content:flex-start"><button class="cancelar" onclick="finCancelarImportacao()">Fechar</button></div>
    </div>`;
  }
  if (p.erro === 'dependencia') {
    return `<div class="painel"><h2>Dependência ausente no servidor</h2>
      <p class="nota-p">${esc(p.hint || 'Instale a dependência necessária para processar PDFs e tente novamente.')}</p>
      <div class="mbot" style="margin-top:12px;justify-content:flex-start"><button class="cancelar" onclick="finCancelarImportacao()">Fechar</button></div>
    </div>`;
  }
  return `<div class="painel"><h2>Erro na importação</h2>
    <p class="nota-p">${esc(p.erro || 'Falha desconhecida ao processar o arquivo.')}</p>
    <div class="mbot" style="margin-top:12px;justify-content:flex-start"><button class="cancelar" onclick="finCancelarImportacao()">Fechar</button></div>
  </div>`;
}

function linhaPreview(t, i) {
  const marcado = !t.ja_existe;
  return `<tr>
    <td><input type="checkbox" class="fin-check" id="imp-linha-${i}" ${marcado ? 'checked' : ''}></td>
    <td>${esc(t.data)}</td>
    <td>${esc(t.descricao || '—')}${t.ja_existe ? ' <span class="tag svc">duplicada</span>' : ''}</td>
    <td><span class="din ${t.tipo === 'entrada' ? 'pos' : 'neg'}">${fmt(t.valor)}</span></td>
    <td>${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
    <td><select class="mini" id="imp-cat-${i}">
      <option value="">sem categoria</option>
      ${stFin.categorias.map((c) => `<option value="${c.id}"${t.categoria_id === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
    </select></td>
  </tr>`;
}

function bannerPreview(p) {
  if (!p.ok) return bannerErro(p);

  const cartaoSelect = p.tipo === 'fatura'
    ? `<div style="max-width:260px;margin-top:10px">
        <label class="cfg-label">Cartão da fatura</label>
        <select class="cfg-input" id="imp-cartao">
          ${stFin.cartoes.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}
        </select>
      </div>`
    : '';

  return `<div class="painel">
    <h2>Prévia da importação</h2>
    <p class="nota-p">Banco detectado: <b>${esc(p.banco)}</b> · Tipo: <b>${esc(p.tipo === 'fatura' ? 'Fatura de cartão' : 'Extrato de conta')}</b> · ${p.transacoes.length} transações encontradas.${p.ja_importado ? ' <span class="tag fup">já importado antes</span>' : ''}</p>
    ${cartaoSelect}
    <div style="overflow-x:auto;margin-top:12px">
      <table><thead><tr><th></th><th>Data</th><th>Descrição</th><th>Valor</th><th>Tipo</th><th>Categoria</th></tr></thead>
        <tbody>${p.transacoes.map(linhaPreview).join('')}</tbody></table>
    </div>
    <div class="mbot" style="margin-top:14px">
      <button class="cancelar" onclick="finCancelarImportacao()">Cancelar</button>
      <button class="salvar" onclick="finConfirmarImportacao()">Confirmar importação</button>
    </div>
  </div>`;
}

export function vImportar() {
  let html = `<div class="painel">
    <h2>Importar fatura/extrato (PDF)</h2>
    <p class="nota-p">Selecione o PDF da fatura do cartão ou do extrato da conta — o banco é detectado automaticamente.</p>
    <input type="file" accept=".pdf,.csv" id="imp-arquivo" onchange="finImportarPdf(this)">
  </div>`;

  if (stFin.previewImportacao) html += bannerPreview(stFin.previewImportacao);

  const imps = stFin.importacoes || [];
  html += '<div class="painel" style="overflow-x:auto"><h2>Histórico de importações <span class="conta">' + imps.length + '</span></h2>'
    + (imps.length
      ? '<table><thead><tr><th>Arquivo</th><th>Banco</th><th>Tipo</th><th>Transações</th><th>Data</th></tr></thead><tbody>'
      + imps.map((imp) => `<tr>
          <td>${esc(imp.arquivo)}</td>
          <td>${esc(imp.banco)}</td>
          <td>${esc(imp.tipo === 'fatura' ? 'Fatura' : 'Extrato')}</td>
          <td>${imp.qtd_transacoes != null ? imp.qtd_transacoes : '—'}</td>
          <td>${esc(imp.data_importacao || '—')}</td>
        </tr>`).join('') + '</tbody></table>'
      : '<div class="vazio">Nenhuma importação realizada ainda.</div>')
    + '</div>';

  return html;
}

// ---------- upload + preview ----------
window.finImportarPdf = (input) => {
  const arquivo = input.files && input.files[0];
  if (!arquivo) return;
  const nome = arquivo.name;
  const leitor = new FileReader();
  leitor.onload = () => {
    const b64 = String(leitor.result).split(',').pop();
    // resposta sem ok:true (em qualquer status HTTP, via jCorpo) cai no bannerErro
    // do preview, que já trata banco_nao_reconhecido/dependencia; catch = corpo não-JSON.
    api.importarFatura(nome, b64).then((r) => {
      // 404 de rota inexistente devolve {"erro":"rota"} SEM campo ok → mensagem amigável
      if (r.ok !== true && r.erro === 'rota') r = { erro: 'Importação ainda não disponível no servidor.' };
      if (r.ok !== true) r.ok = false;
      r.arquivo = nome;
      stFin.previewImportacao = r;
      window.finRender();
    }).catch((e) => {
      const msg = String(e && e.message || '').indexOf('404') >= 0
        ? 'Importação ainda não disponível no servidor.'
        : 'Falha ao processar o PDF.';
      stFin.previewImportacao = { ok: false, erro: msg };
      window.finRender();
    });
  };
  leitor.readAsDataURL(arquivo);
  input.value = '';
};

window.finCancelarImportacao = () => {
  stFin.previewImportacao = null;
  window.finRender();
};

window.finConfirmarImportacao = () => {
  const p = stFin.previewImportacao;
  if (!p || !p.ok) return;

  const transacoes = [];
  p.transacoes.forEach((t, i) => {
    const chk = document.getElementById('imp-linha-' + i);
    if (!chk || !chk.checked) return;
    const sel = document.getElementById('imp-cat-' + i);
    const categoria_id = sel && sel.value ? parseInt(sel.value) : null;
    transacoes.push({ ...t, categoria_id });
  });
  if (!transacoes.length) { alert('Selecione ao menos uma transação para confirmar.'); return; }

  let cartao_id = null;
  if (p.tipo === 'fatura') {
    const selCartao = document.getElementById('imp-cartao');
    cartao_id = selCartao && selCartao.value ? parseInt(selCartao.value) : null;
    if (!cartao_id) { alert('Selecione o cartão da fatura.'); return; }
  }

  const payload = { hash: p.hash, arquivo: p.arquivo, banco: p.banco, tipo: p.tipo, cartao_id, transacoes };
  api.confirmarImportacao(payload).then((r) => {
    // jCorpo resolve mesmo em status ≠2xx: qualquer resposta sem ok truthy é falha
    // (inclui o 404 de rota inexistente: {"erro":"rota"} SEM campo ok). Só avisa,
    // sem re-render — preserva as marcações do preview.
    if (!r.ok) {
      const msg = r.erro === 'rota' ? 'Importação ainda não disponível no servidor.' : 'Falha ao confirmar: ' + (r.erro || 'erro desconhecido');
      window.toast(msg); return;
    }
    window.toast(r.novas + ' novas, ' + r.puladas + ' duplicadas ignoradas');
    stFin.previewImportacao = null;
    return carregarFin().then(() => window.finRender());
  })
    .catch((e) => {
      const msg = String(e && e.message || '').indexOf('404') >= 0
        ? 'Importação ainda não disponível no servidor.'
        : 'Falha ao confirmar a importação.';
      window.toast(msg);
    });
};
