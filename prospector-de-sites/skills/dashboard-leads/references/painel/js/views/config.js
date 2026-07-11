// Configurações — dados do contratante e conexão de publicação (FTP/HostGator).
import { st } from '../estado.js';
import { esc } from '../ui.js';

const CFG_CAMPOS = [
  ['nome', 'Nome completo / razão social'], ['cpfCnpj', 'CPF ou CNPJ'],
  ['endereco', 'Endereço (rua, nº, bairro)'], ['cidadeUf', 'Cidade/UF'],
  ['email', 'E-mail'], ['whatsapp', 'WhatsApp (55DDDnúmero)'],
];

export function vConfig() {
  const db = st.conectado;
  const campos = CFG_CAMPOS.map(([k, rotulo]) =>
    `<div><label class="cfg-label">${rotulo}</label><input class="cfg-input" id="cfg-${k}" value="${esc(st.cfg[k])}" ${db ? '' : 'disabled'}></div>`).join('');

  let html = `<div class="painel" style="max-width:640px"><h2>Meus dados — quem assina os contratos</h2>
    <p class="nota-p" style="margin-bottom:6px">Preencha uma vez e todo contrato gerado pelo /contrato já sai com os seus dados de CONTRATADO(A). Fica salvo no prospector-config.json, no seu computador.</p>
    ${campos}
    <div style="margin-top:18px;display:flex;gap:10px;align-items:center">
      <button class="btn prim" ${db ? '' : 'disabled'} onclick="salvarCfg(${JSON.stringify(CFG_CAMPOS.map((c) => c[0])).replace(/"/g, '&quot;')})">Salvar meus dados</button>
      <span id="cfg-ok" class="salvo-ok">salvo ✓</span>
      ${db ? '' : '<span style="color:var(--ambar);font-size:12px;font-weight:600">abra pelo iniciar-dashboard.bat para editar</span>'}
    </div></div>`;

  const HG = st.hg || {};
  const hgCampos = [
    ['usuario', 'Usuário do cPanel/FTP', 'text'], ['dominio', 'Domínio principal', 'text'],
    ['servidor', 'Servidor FTP (ex.: br1024.hostgator.com.br)', 'text'],
    ['pastaBase', 'Pasta base (padrão: clientes)', 'text'], ['senha', 'Senha', 'password'],
  ].map(([k, rotulo, tipo]) => {
    const ph = k === 'senha' ? (HG.senhaDefinida ? '••••• salva — deixe em branco pra manter' : 'cole a senha') : '';
    return `<div><label class="cfg-label">${rotulo}</label><input class="cfg-input" id="hg-${k}" type="${tipo}" placeholder="${ph}" value="${k === 'senha' ? '' : esc(HG[k])}" ${db ? '' : 'disabled'}></div>`;
  }).join('');

  html += `<div class="painel" style="max-width:640px"><h2>Conexão de publicação — FTP</h2>
    <p class="nota-p" style="margin-bottom:6px">Serve pra HostGator ou qualquer hospedagem com FTP. Preencha uma vez e o /publicar sobe os sites sozinho. A senha vai deste painel DIRETO pro arquivo no seu computador — nunca passa pelo chat.</p>
    ${hgCampos}
    <div style="margin-top:18px;display:flex;gap:10px;align-items:center">
      <button class="btn prim" ${db ? '' : 'disabled'} onclick="salvarHG()">Salvar conexão</button>
      <span id="hg-ok" class="salvo-ok">salvo ✓</span>
      ${db ? (HG.senhaDefinida
        ? '<span style="color:var(--ok);font-size:12px;font-weight:600">✓ senha configurada</span>'
        : '<span style="color:var(--ambar);font-size:12px;font-weight:600">falta a senha pra publicação automática</span>')
        : '<span style="color:var(--ambar);font-size:12px;font-weight:600">abra pelo iniciar-dashboard.bat para editar</span>'}
    </div></div>`;

  html += `<div class="painel" style="max-width:640px"><h2>E os dados do cliente?</h2>
    <p class="nota-p">CPF/CNPJ e endereço do cliente entram quando ele fechar: peça pelo WhatsApp e (1) cole a resposta pro Claude no /contrato — ele extrai e salva sozinho — ou (2) preencha no "editar" do card. O que faltar sai como "preencher" na minuta.</p></div>`;

  return html;
}
