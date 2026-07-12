// fluxos.js — briefing → orçamento → contrato: modais e geração de documentos.
import { api } from './api.js';
import { st, SERVICOS, PERGUNTAS_COMUNS, PERGUNTAS_BRIEFING, OBJETO_CONTRATO, parseBriefing, temRespostas } from './estado.js';
import { fmt, esc } from './ui.js';

const TITULO_SERVICO = {
  site: 'Criação e Publicação de Página na Internet',
  sistema: 'Desenvolvimento de Sistema Sob Medida',
  automacao: 'Desenvolvimento e Implantação de Automação',
  outro: 'Serviços de Desenvolvimento',
};

const hoje = () => new Date().toISOString().slice(0, 10);
const dataExtenso = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const lead = (slug) => st.leads.find((l) => l.slug === slug) || {};
const perguntasDe = (tipo) => PERGUNTAS_COMUNS.concat(PERGUNTAS_BRIEFING[tipo] || PERGUNTAS_BRIEFING.outro);

const briefingDados = parseBriefing;

// ---- valor por extenso (reais, até milhões) ----
const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100;
  const dez = r < 20 ? UNI[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNI[r % 10] : '');
  return [c ? CEN[c] : '', dez].filter(Boolean).join(' e ');
}
export function valorExtenso(v) {
  v = Math.round((parseFloat(v) || 0) * 100) / 100;
  const int = Math.floor(v), cent = Math.round((v - int) * 100);
  const mi = Math.floor(int / 1e6), milhar = Math.floor((int % 1e6) / 1000), resto = int % 1000;
  const grupos = [];
  if (mi) grupos.push(mi === 1 ? 'um milhão' : ate999(mi) + ' milhões');
  if (milhar) grupos.push(milhar === 1 ? 'mil' : ate999(milhar) + ' mil');
  let inteiro;
  if (resto) {
    // regra pt-BR: "e" antes do último grupo quando < 100 ou centena exata (mil e quinhentos)
    const conector = grupos.length ? ((resto < 100 || resto % 100 === 0) ? ' e ' : ' ') : '';
    inteiro = grupos.join(' ') + conector + ate999(resto);
  } else inteiro = grupos.join(' ');
  let out = int === 0 ? '' : inteiro + (int === 1 ? ' real' : ' reais');
  if (cent) out += (out ? ' e ' : '') + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos');
  return out || 'zero reais';
}

// ---- modal genérico ----
function abrirModal2(html) {
  document.getElementById('modal2').innerHTML = html;
  document.getElementById('modal2-bg').classList.add('aberto');
}
window.fecharModal2 = () => document.getElementById('modal2-bg').classList.remove('aberto');

const campo = (id, rotulo, valor = '', tipo = 'text', ph = '') =>
  `<div><label>${rotulo}</label><input id="${id}" type="${tipo}" value="${esc(valor)}" placeholder="${esc(ph)}"></div>`;
const areaTxt = (id, rotulo, valor = '', linhas = 4, ph = '') =>
  `<div><label>${rotulo}</label><textarea id="${id}" rows="${linhas}" placeholder="${esc(ph)}">${esc(valor)}</textarea></div>`;
const v2 = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');

function selectClientes(id, slugSel) {
  const ls = st.leads.filter((l) => !['descartado', 'encerrado'].includes(l.status));
  return `<div><label>Cliente</label><select id="${id}" onchange="document.getElementById('caixa-novo-nome').style.display=this.value==='__novo__'?'block':'none'">
    <option value="__novo__">— novo cliente —</option>
    ${ls.map((l) => `<option value="${l.slug}"${l.slug === slugSel ? ' selected' : ''}>${esc(l.nome)}</option>`).join('')}
  </select></div>
  <div id="caixa-novo-nome" style="display:${slugSel ? 'none' : 'block'}"><label>Nome do novo cliente</label><input id="f-novo-nome" placeholder="ex.: Clínica Boa Vista"></div>`;
}

// select que REABRE o modal com o cliente escolhido (pré-preenche objeto/escopo/valores dele)
function selectClienteReabre(reabreFn) {
  const ls = st.leads.filter((l) => !['descartado', 'encerrado'].includes(l.status));
  return `<div><label>Cliente</label><select id="f-cliente" onchange="if(this.value!=='__novo__')${reabreFn}(this.value);else document.getElementById('caixa-novo-nome').style.display='block'">
      <option value="__novo__">— novo cliente —</option>
      ${ls.map((x) => `<option value="${x.slug}">${esc(x.nome)}${x.briefingStatus === 'respondido' ? ' (briefing respondido)' : ''}</option>`).join('')}
    </select></div>
    <div id="caixa-novo-nome"><label>Nome do novo cliente</label><input id="f-novo-nome" placeholder="ex.: Clínica Boa Vista"></div>`;
}

const selectTipo = (id, sel) =>
  `<div><label>Tipo de projeto</label><select id="${id}">${Object.entries(SERVICOS)
    .map(([k, n]) => `<option value="${k}"${k === (sel || 'site') ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;

async function resolverCliente(selId, tipo) {
  const sel = v2(selId);
  if (sel !== '__novo__') return lead(sel);
  const nome = v2('f-novo-nome');
  if (!nome) { alert('Dê um nome ao cliente.'); return null; }
  let slug = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cliente-' + Date.now();
  if (st.leads.some((l) => l.slug === slug)) slug += '-' + String(Date.now()).slice(-4);
  await api.upsert({ slug, nome, status: 'novo', origem: 'externo', servico: tipo });
  await window.__recarrega();
  return lead(slug);
}

// ══════════════════════════ BRIEFING ══════════════════════════

window.abrirBriefingModal = (slug) => {
  const l = lead(slug);
  abrirModal2(`<h2>Novo briefing</h2>
    <p class="nota-p" style="margin-bottom:8px">Gera uma página de perguntas pro cliente responder — do briefing sai o orçamento.</p>
    ${selectClientes('f-cliente', slug)}
    ${selectTipo('f-tipo', l.servico)}
    <div class="mbot"><button class="cancelar" onclick="fecharModal2()">Cancelar</button>
    <button class="salvar" onclick="gerarBriefing()">Gerar briefing</button></div>`);
};

window.gerarBriefing = async () => {
  const tipo = v2('f-tipo');
  const sel = v2('f-cliente');
  // cliente existente que já respondeu: regerar apaga as respostas — confirmar
  if (sel && sel !== '__novo__' && temRespostas(lead(sel))
      && !confirm('Este cliente já tem respostas de briefing registradas. Gerar um briefing novo vai apagá-las. Continuar?')) return;
  const l = await resolverCliente('f-cliente', tipo);
  if (!l) return;
  const perguntas = perguntasDe(tipo);
  const tpl = await fetch('/painel/templates/briefing.html').then((r) => r.text());
  const campos = perguntas.map(([id, texto]) =>
    `<label for="q-${id}">${texto}</label><textarea id="q-${id}"></textarea>`).join('\n');
  const meta = {
    slug: l.slug, nome: l.nome, tipo, tipoNome: SERVICOS[tipo],
    perguntas, whatsapp: (st.assinatura.whatsapp || '').replace(/\D/g, ''),
    nomePrestador: st.assinatura.nome || st.cfg.nome || 'o desenvolvedor',
  };
  const html = tpl
    .replaceAll('{{NOME_CLIENTE}}', esc(l.nome))
    .replaceAll('{{NOME_PRESTADOR}}', esc(meta.nomePrestador))
    .replace('{{CAMPOS}}', campos)
    .replace('{{META}}', JSON.stringify(meta));
  const r = await api.gerar(l.slug, 'briefing', html);
  await api.patch(l.slug, { briefingStatus: 'criado', servico: tipo, briefing: JSON.stringify({ tipo, criadoEm: hoje() }) });
  window.fecharModal2();
  await window.__recarrega();
  window.open(r.url, '_blank');
};

window.marcarBriefingEnviado = (slug) => api.patch(slug, { briefingStatus: 'enviado' }).then(window.__recarrega);

window.abrirRespostasModal = (slug) => {
  const l = lead(slug);
  const dados = briefingDados(l);
  const jaTem = dados.respostas && Object.keys(dados.respostas).length;
  const texto = jaTem
    ? perguntasDe(dados.tipo || l.servico || 'outro')
        .map(([id, p]) => `${p}\n${dados.respostas[id] || '(sem resposta)'}`).join('\n\n')
    : (dados.respostas_texto || '');
  // respostas de formulário (do cliente) são somente-leitura; texto colado à mão é editável
  const soLeitura = !!jaTem;
  abrirModal2(`<h2>Respostas do briefing — ${esc(l.nome)}</h2>
    <p class="nota-p" style="margin-bottom:8px">${jaTem ? 'Respondido pela página do briefing (somente leitura).' : 'Cole aqui o que o cliente mandou (WhatsApp/e-mail).'}</p>
    ${areaTxt('f-respostas', 'Respostas', texto, 12)}
    <div class="mbot"><button class="cancelar" onclick="fecharModal2()">Fechar</button>
    ${soLeitura ? '' : `<button class="salvar" onclick="salvarRespostas('${slug}')">Salvar respostas</button>`}</div>`);
  if (soLeitura) document.getElementById('f-respostas').readOnly = true;
  // abrir as respostas do cliente = lido — RMW no servidor (não regrava o blob stale)
  if (temRespostas(l) && !dados.vistoEm) {
    api.marcarVisto(slug).then(window.__recarrega).catch(() => {});
  }
};

window.salvarRespostas = async (slug) => {
  const texto = v2('f-respostas');
  if (!texto) { alert('Cole as respostas do cliente antes de salvar.'); return; }
  await api.registrarRespostas(slug, texto); // RMW no servidor
  window.fecharModal2();
  window.__recarrega();
};

// ══════════════════════════ ORÇAMENTO ══════════════════════════

window.abrirOrcamentoModal = (slug) => {
  const l = lead(slug);
  const dados = briefingDados(l);
  let escopo = '';
  if (dados.respostas && Object.keys(dados.respostas).length) {
    escopo = perguntasDe(dados.tipo || l.servico || 'outro')
      .filter(([id]) => dados.respostas[id])
      .map(([id, p]) => `• ${dados.respostas[id]}`).join('\n');
  } else if (dados.respostas_texto) escopo = dados.respostas_texto;
  // sem cliente definido: seletor (escolher um existente reabre o modal já pré-preenchido)
  const seletor = slug ? '' : selectClienteReabre('abrirOrcamentoModal') + selectTipo('f-tipo', l.servico || 'site');
  abrirModal2(`<h2>Gerar orçamento${l.nome ? ' — ' + esc(l.nome) : ''}</h2>
    ${seletor}
    ${areaTxt('f-escopo', 'O que será desenvolvido (aparece na proposta)', escopo, 7, 'descreva as entregas com base no briefing')}
    <div class="mrow">${campo('f-valor', 'Valor do projeto (R$)', l.valor || '', 'number')}${campo('f-mensal', 'Mensalidade (R$, 0 = sem)', l.manutencao || 0, 'number')}</div>
    <div class="mrow">${campo('f-servidor', 'Servidor/hospedagem (R$/ano, 0 = sem)', 0, 'number', 'ex.: 600')}${campo('f-mensal-inicio', 'Mensalidade começa', 'no mês seguinte à entrega')}</div>
    <div class="mrow">${campo('f-prazo', 'Prazo de entrega', '15 dias úteis')}${campo('f-validade', 'Validade da proposta', '7 dias')}</div>
    <div class="mrow">${campo('f-pagamento', 'Forma de pagamento', 'Cartão de crédito ou Pix')}${campo('f-ajustes', 'Ajustes inclusos', '2 rodadas de ajustes')}</div>
    <div class="mbot"><button class="cancelar" onclick="fecharModal2()">Cancelar</button>
    <button class="salvar" onclick="gerarOrcamento('${slug}')">Gerar e mover pra proposta</button></div>`);
};

window.gerarOrcamento = async (slug) => {
  const valor = parseFloat(v2('f-valor')) || 0;
  const mensal = parseFloat(v2('f-mensal')) || 0;
  if (!valor) { alert('Informe o valor do projeto.'); return; } // valida ANTES de criar o lead
  const l = slug ? lead(slug) : await resolverCliente('f-cliente', v2('f-tipo') || 'site');
  if (!l) return;
  // linhas de condições — só entram as preenchidas (ex.: sem "ajustes" a linha some)
  const servidorAno = parseFloat(v2('f-servidor')) || 0;
  const mensalInicio = v2('f-mensal-inicio');
  const linhas = [
    ['Prazo de entrega', v2('f-prazo')],
    ['Forma de pagamento', v2('f-pagamento')],
    ['Início da mensalidade', mensal ? mensalInicio : ''],
    ['Servidor/hospedagem', servidorAno ? `R$ ${servidorAno.toLocaleString('pt-BR')}/ano (pago pelo cliente à hospedagem)` : ''],
    ['Validade desta proposta', v2('f-validade') || '7 dias'],
    ['Ajustes inclusos', v2('f-ajustes')],
  ].filter(([, val]) => val)
    .map(([rot, val]) => `<tr><td>${rot}</td><td>${esc(val)}</td></tr>`).join('');
  const caixaMensal = mensal
    ? `<div class="valor-caixa"><div class="v">R$ ${mensal.toLocaleString('pt-BR')}/mês</div><div class="l">manutenção e suporte${mensalInicio ? ' · ' + esc(mensalInicio) : ''}</div></div>` : '';
  const caixaServidor = servidorAno
    ? `<div class="valor-caixa"><div class="v">R$ ${servidorAno.toLocaleString('pt-BR')}/ano</div><div class="l">servidor/hospedagem (pago à hospedagem)</div></div>` : '';
  const tpl = await fetch('/painel/templates/orcamento.html').then((r) => r.text());
  const html = tpl
    .replaceAll('{{NOME_CLIENTE}}', esc(l.nome))
    .replaceAll('{{TIPO_SERVICO}}', SERVICOS[l.servico] || 'Projeto')
    .replaceAll('{{DATA}}', new Date().toLocaleDateString('pt-BR'))
    .replaceAll('{{VALIDADE}}', esc(v2('f-validade') || '7 dias'))
    .replace('{{ESCOPO}}', esc(v2('f-escopo')))
    .replace('{{VALOR}}', valor.toLocaleString('pt-BR'))
    .replace('{{FORMA_PAGAMENTO_NOTA}}', '')
    .replace('{{CAIXA_MENSALIDADE}}', caixaMensal)
    .replace('{{CAIXA_SERVIDOR}}', caixaServidor)
    .replace('{{LINHAS_CONDICOES}}', linhas)
    .replaceAll('{{NOME_PRESTADOR}}', esc(st.assinatura.nome || st.cfg.nome || ''))
    .replace('{{APRESENTACAO}}', esc(st.assinatura.apresentacao || ''))
    .replace('{{WHATSAPP}}', esc(st.assinatura.whatsapp || ''));
  const r = await api.gerar(l.slug, 'orcamento', html);
  // só move pra "proposta" quem está em PRÉ-VENDA. Cliente fechado/encerrado (ou status
  // desconhecido por race de carregamento) só registra o documento — não mexe em
  // valor/manutencao/status, senão corrompe o Financeiro do cliente ativo.
  const PRE_VENDA = ['novo', 'redesenhado', 'publicado', 'proposta', 'respondeu'];
  const mudancas = { orcamentoEm: hoje() };
  if (PRE_VENDA.includes(l.status)) {
    mudancas.valor = valor;
    mudancas.manutencao = mensal || null;
    mudancas.status = 'proposta';
    mudancas.dataProposta = hoje();
  }
  await api.patch(l.slug, mudancas);
  window.fecharModal2();
  await window.__recarrega();
  window.open(r.url, '_blank');
};

// ══════════════════════════ CONTRATO ══════════════════════════

window.abrirContratoModal = (slug) => {
  const l = lead(slug);
  const tipo = l.servico || 'site';
  const dados = briefingDados(l);
  let objeto = OBJETO_CONTRATO[tipo];
  // pré-preenche o escopo detalhado com o que veio do briefing (respostas do formulário ou texto colado)
  let escopoBriefing = '';
  if (dados.respostas && Object.keys(dados.respostas).length) {
    escopoBriefing = perguntasDe(dados.tipo || tipo)
      .filter(([id]) => dados.respostas[id]).map(([id]) => dados.respostas[id]).join('; ');
  } else if (dados.respostas_texto) escopoBriefing = dados.respostas_texto;
  abrirModal2(`<h2>Novo contrato${l.nome ? ' — ' + esc(l.nome) : ''}</h2>
    ${slug ? '' : selectClienteReabre('abrirContratoModal')}
    ${selectTipo('f-tipo', tipo)}
    ${areaTxt('f-objeto', 'Cláusula do objeto (edite à vontade)', objeto, 5)}
    ${areaTxt('f-escopo-extra', 'Escopo detalhado (opcional — vira parágrafo do objeto)', escopoBriefing, 3, 'ex.: páginas incluídas, funcionalidades acordadas')}
    <div class="mrow">${campo('f-valor', 'Valor (R$)', l.valor || '', 'number')}${campo('f-mensal', 'Manutenção mensal (R$, 0 = sem cláusula)', l.manutencao || 0, 'number')}</div>
    <div class="mrow">${campo('f-pagamento', 'Forma de pagamento', '50% na assinatura e 50% na entrega')}${campo('f-prazo', 'Prazo de entrega', '15 (quinze) dias úteis')}</div>
    <div class="mrow">${campo('f-doc', 'CPF/CNPJ do cliente', l.docCliente || '', 'text', 'só números ou formatado')}${campo('f-end', 'Endereço do cliente', l.endCliente || '', 'text', 'rua, nº, bairro, cidade/UF')}</div>
    <div class="mrow">${campo('f-ajustes', 'Rodadas de ajustes', '1 (uma)')}${campo('f-foro', 'Cidade do foro', (st.cfg.cidadeUf || l.cidade || '').split('/')[0])}</div>
    ${areaTxt('f-extras', 'Cláusulas adicionais (opcional, uma por linha)', '', 3, 'ex.: O código-fonte será entregue ao CONTRATANTE ao final.')}
    <div class="mbot"><button class="cancelar" onclick="fecharModal2()">Cancelar</button>
    <button class="salvar" onclick="gerarContrato('${slug || ''}')">Gerar contrato</button></div>`);
  const selTipo = document.getElementById('f-tipo');
  selTipo.addEventListener('change', () => { document.getElementById('f-objeto').value = OBJETO_CONTRATO[selTipo.value]; });
};

const docLabel = (doc) => ((doc || '').replace(/\D/g, '').length > 11 ? 'inscrita no CNPJ' : 'inscrito(a) no CPF');

window.gerarContrato = async (slug) => {
  const tipo = v2('f-tipo');
  const valor = parseFloat(v2('f-valor')) || 0;
  const mensal = parseFloat(v2('f-mensal')) || 0;
  if (!valor) { alert('Informe o valor do contrato.'); return; } // valida ANTES de criar o lead
  const l = slug ? lead(slug) : await resolverCliente('f-cliente', tipo);
  if (!l) return;

  let n = 0;
  const clausulas = [];
  const add = (titulo, corpo) => { n++; clausulas.push(`<h2>Cláusula ${n}ª — ${titulo}</h2><p>${corpo}</p>`); };
  const escopoExtra = v2('f-escopo-extra');
  add('Do objeto', esc(v2('f-objeto')) + (escopoExtra ? `</p><p><b>Escopo detalhado:</b> ${esc(escopoExtra)}` : ''));
  add('Do valor e forma de pagamento',
    `Pelos serviços descritos na Cláusula 1ª, o CONTRATANTE pagará ao CONTRATADO(A) o valor total de <b>R$ ${valor.toLocaleString('pt-BR')} (${valorExtenso(valor)})</b>, na seguinte forma: ${esc(v2('f-pagamento'))}.`);
  add('Do prazo de entrega',
    `O objeto deste contrato será entregue em até ${esc(v2('f-prazo'))} a contar da assinatura deste contrato e do fornecimento, pelo CONTRATANTE, dos materiais e aprovações necessários. Está incluída ${esc(v2('f-ajustes'))} rodada(s) de ajustes após a entrega.`);
  if (mensal) add('Da manutenção mensal',
    `O CONTRATANTE contrata ainda o serviço de manutenção mensal (infraestrutura, pequenas atualizações e suporte), pelo valor de <b>R$ ${mensal.toLocaleString('pt-BR')} (${valorExtenso(mensal)})</b> mensais, com vigência a partir da entrega e renovação automática mensal.`);
  add('Do conteúdo e responsabilidades',
    'O CONTRATANTE declara ser titular ou possuir autorização de uso de todos os textos, imagens, logotipos, dados e informações fornecidos, responsabilizando-se pela veracidade das informações divulgadas. O CONTRATADO(A) compromete-se a não utilizar informações não fornecidas ou não aprovadas pelo CONTRATANTE.');
  add('Da infraestrutura', mensal
    ? 'A solução permanecerá hospedada e operante em infraestrutura administrada pelo CONTRATADO(A) enquanto vigorar o serviço de manutenção mensal.'
    : 'A solução será entregue em funcionamento; a partir da entrega, a contratação e renovação de infraestrutura própria (hospedagem, domínio, servidores) são de responsabilidade do CONTRATANTE, com suporte do CONTRATADO(A) na migração, se solicitado.');
  v2('f-extras').split('\n').map((s) => s.trim()).filter(Boolean)
    .forEach((extra, i, arr) => { if (i === 0) add('Das disposições adicionais', arr.map(esc).join('</p><p>')); });
  add('Da rescisão',
    'Este contrato poderá ser rescindido por qualquer das partes mediante comunicação por escrito. Em caso de rescisão pelo CONTRATANTE após o início dos trabalhos, será devido o valor proporcional aos serviços já executados. Serviços de manutenção mensal, quando contratados, podem ser cancelados por qualquer parte com aviso prévio de 30 (trinta) dias.');
  add('Do foro',
    `Fica eleito o foro da comarca de ${esc(v2('f-foro') || '(preencher)')} para dirimir quaisquer controvérsias oriundas deste contrato.`);

  const doc = v2('f-doc'), end = v2('f-end');
  const tpl = await fetch('/painel/templates/contrato.html').then((r) => r.text());
  const html = tpl
    .replaceAll('{{NOME_CLIENTE}}', esc(l.nome))
    .replace('{{TITULO_SERVICO}}', TITULO_SERVICO[tipo])
    .replace('{{CPF_CNPJ_CLIENTE_LABEL}}', docLabel(doc))
    .replace('{{CPF_CNPJ_CLIENTE}}', esc(doc || '(preencher)'))
    .replace('{{ENDERECO_CLIENTE}}', esc(end || '(preencher)'))
    .replaceAll('{{NOME_PRESTADOR}}', esc(st.cfg.nome || st.assinatura.nome || '(preencher)'))
    .replace('{{CPF_CNPJ_PRESTADOR_LABEL}}', docLabel(st.cfg.cpfCnpj))
    .replace('{{CPF_CNPJ_PRESTADOR}}', esc(st.cfg.cpfCnpj || '(preencher)'))
    .replace('{{ENDERECO_PRESTADOR}}', esc([st.cfg.endereco, st.cfg.cidadeUf].filter(Boolean).join(', ') || '(preencher)'))
    .replace('{{CLAUSULAS}}', clausulas.join('\n'))
    .replace('{{CIDADE_ASSINATURA}}', esc(v2('f-foro') || (st.cfg.cidadeUf || '').split('/')[0] || ''))
    .replace('{{DATA_EXTENSO}}', dataExtenso());
  const r = await api.gerar(l.slug, 'contrato', html);
  await api.patch(l.slug, { docCliente: doc || null, endCliente: end || null, servico: tipo, contratoStatus: 'gerado', contratoEm: hoje() });
  window.fecharModal2();
  await window.__recarrega();
  window.open(r.url, '_blank');
};
