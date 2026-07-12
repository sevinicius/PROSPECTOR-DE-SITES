// financeiro/categorias.js — CRUD de categorias, regras palavra→categoria e limite global do mês.
import { api } from '../../api.js';
import { fmt, esc } from '../../ui.js';
import { stFin, carregarFin, nomeCategoria } from '../../fin.js';

let editandoCategoriaId = null;

function blocoLimiteGlobal() {
  return `<div class="painel">
    <h2>Limite global do mês</h2>
    <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
      <div style="width:220px"><label class="cfg-label">Limite (R$)</label>
        <input class="cfg-input" id="fin-limite-global" type="number" step="0.01" value="${stFin.limiteGlobal != null ? stFin.limiteGlobal : ''}"></div>
      <button class="btn prim" onclick="finSalvarLimiteGlobal()">Salvar limite</button>
    </div>
  </div>`;
}

function linhaCategoria(c) {
  return `<tr>
    <td><span style="display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:middle;margin-right:6px;border:1px solid var(--linha);background:${esc(c.cor || '#8C6A26')}"></span>${esc(c.nome)}${!c.ativo ? ' <span class="tag svc">inativa</span>' : ''}</td>
    <td>${c.limite_mensal ? fmt(c.limite_mensal) : '—'}</td>
    <td><div class="acoes">
      <a href="#" onclick="finAbrirCategoria(${c.id});return false">editar</a>
      ${c.ativo
        ? `<a href="#" class="del" onclick="finToggleCategoria(${c.id},0);return false">desativar</a>`
        : `<a href="#" onclick="finToggleCategoria(${c.id},1);return false">reativar</a>`}
      <a href="#" class="del" onclick="finApagarCategoria(${c.id});return false">apagar</a>
    </div></td>
  </tr>`;
}

function blocoRegras() {
  const regras = stFin.regras || [];
  const catsAtivas = stFin.categorias.filter((c) => c.ativo);
  return `<div class="painel">
    <h2>Regras de categorização <span class="conta">${regras.length}</span></h2>
    ${regras.length
      ? regras.map((r) => `<div class="fup-item"><b>${esc(r.palavra)}</b>
          <span style="color:var(--apagado)">→ ${esc(nomeCategoria(r.categoria_id))}</span>
          <a href="#" style="margin-left:auto;color:var(--ruim);font-weight:700;text-decoration:none" onclick="finRemoverRegra(${r.id});return false">×</a>
        </div>`).join('')
      : '<div class="vazio">Nenhuma regra cadastrada ainda.</div>'}
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <input class="busca" style="width:200px;margin-left:0" id="fin-regra-palavra" placeholder="Palavra-chave…">
      <select class="mini" id="fin-regra-categoria">
        ${catsAtivas.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}
      </select>
      <button class="btn sec" onclick="finAdicionarRegra()">+ Adicionar regra</button>
    </div>
  </div>`;
}

export function vCategorias() {
  const cats = stFin.categorias;

  let html = blocoLimiteGlobal();

  html += `<div class="painel" style="overflow-x:auto">
    <div style="display:flex;align-items:center">
      <h2 style="margin:0">Categorias <span class="conta">${cats.length}</span></h2>
      <button class="btn prim" style="margin-left:auto" onclick="finAbrirCategoria()">+ Categoria</button>
    </div>
    ${cats.length
      ? '<table style="margin-top:12px"><thead><tr><th>Categoria</th><th>Limite mensal</th><th></th></tr></thead><tbody>' + cats.map(linhaCategoria).join('') + '</tbody></table>'
      : '<div class="vazio">Nenhuma categoria cadastrada ainda.</div>'}
  </div>`;

  html += blocoRegras();

  return html;
}

// ---------- modal de categoria ----------
window.finAbrirCategoria = (id) => {
  const c = id ? stFin.categorias.find((x) => x.id === id) : null;
  editandoCategoriaId = c ? c.id : null;
  document.getElementById('modal2').innerHTML = `
    <h2>${c ? 'Editar categoria' : 'Nova categoria'}</h2>
    <div class="mrow">
      <div><label>Nome</label><input id="fcat-nome" value="${esc(c ? c.nome : '')}"></div>
      <div><label>Cor</label><input id="fcat-cor" type="color" value="${esc(c && c.cor ? c.cor : '#E0A83C')}"></div>
    </div>
    <div class="mrow">
      <div><label>Limite mensal (R$)</label><input id="fcat-limite" type="number" step="0.01" value="${c && c.limite_mensal != null ? c.limite_mensal : ''}"></div>
      <div></div>
    </div>
    <div class="mbot">
      <button class="cancelar" onclick="fecharModal2()">Cancelar</button>
      <button class="salvar" onclick="finSalvarCategoria()">Salvar</button>
    </div>`;
  document.getElementById('modal2-bg').classList.add('aberto');
};

window.finSalvarCategoria = () => {
  const g = (id) => document.getElementById(id);
  const nome = g('fcat-nome').value.trim();
  if (!nome) { alert('Preencha o nome da categoria.'); return; }
  const corpo = {
    nome,
    cor: g('fcat-cor').value || null,
    limite_mensal: g('fcat-limite').value ? parseFloat(g('fcat-limite').value) : null,
  };
  const acao = editandoCategoriaId ? api.editarCategoria(editandoCategoriaId, corpo) : api.salvarCategoria(corpo);
  acao.then(() => { window.fecharModal2(); return carregarFin(); }).then(() => window.finRender());
};

window.finToggleCategoria = (id, ativo) => {
  api.editarCategoria(id, { ativo }).then(() => carregarFin()).then(() => window.finRender());
};

window.finApagarCategoria = (id) => {
  if (!confirm('Apagar esta categoria? Essa ação não pode ser desfeita.')) return;
  api.apagarCategoria(id).then(() => carregarFin()).then(() => window.finRender());
};

// ---------- limite global ----------
window.finSalvarLimiteGlobal = () => {
  const v = document.getElementById('fin-limite-global').value;
  api.salvarConfigFin({ limite_global: v ? parseFloat(v) : null }).then(() => carregarFin()).then(() => window.finRender());
};

// ---------- regras ----------
window.finAdicionarRegra = () => {
  const palavra = document.getElementById('fin-regra-palavra').value.trim();
  const categoria_id = document.getElementById('fin-regra-categoria').value;
  if (!palavra || !categoria_id) { alert('Preencha a palavra-chave e escolha uma categoria.'); return; }
  api.salvarRegra({ palavra, categoria_id: parseInt(categoria_id) }).then(() => carregarFin()).then(() => window.finRender());
};

window.finRemoverRegra = (id) => {
  api.apagarRegra(id).then(() => carregarFin()).then(() => window.finRender());
};
