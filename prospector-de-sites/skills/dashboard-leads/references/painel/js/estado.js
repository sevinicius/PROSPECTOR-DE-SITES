// estado.js — store em memória + constantes de domínio + derivações.
export const CORES = {
  novo: 'var(--st-novo)', redesenhado: 'var(--st-redesenhado)', publicado: 'var(--st-publicado)',
  proposta: 'var(--st-proposta)', respondeu: 'var(--st-respondeu)', fechado: 'var(--st-fechado)',
  encerrado: 'var(--st-encerrado)', descartado: 'var(--st-descartado)',
};
export const NOMES = {
  novo: 'Novo', redesenhado: 'Redesenhado', publicado: 'Publicado', proposta: 'Proposta enviada',
  respondeu: 'Respondeu', fechado: 'Cliente ativo', encerrado: 'Encerrado', descartado: 'Descartado',
};
export const ORDEM = ['novo', 'redesenhado', 'publicado', 'proposta', 'respondeu', 'fechado'];
export const SERVICOS = { site: 'Site', automacao: 'Automação', sistema: 'Sistema', outro: 'Outro' };
export const ORIGENS = { prospeccao: 'Prospecção', indicacao: 'Indicação', externo: 'Externo' };
// status em que existe página local produzida (sites/<slug>/)
export const COM_PAGINA = ['redesenhado', 'publicado', 'proposta', 'respondeu', 'fechado'];

// ---- briefing / orçamento / contrato ----
export const BRIEFING_NOMES = { criado: 'Briefing criado', enviado: 'Briefing enviado', respondido: 'Briefing respondido' };

export function parseBriefing(l) {
  try { return JSON.parse(l.briefing || '{}'); } catch (e) { return {}; }
}
export function temRespostas(l) {
  const d = parseBriefing(l);
  return !!(d.respostas_texto || (d.respostas && Object.keys(d.respostas).length));
}
// situação do briefing pro filtro: aguardando | naolido | lido
export function situacaoBriefing(l) {
  if (!temRespostas(l)) return 'aguardando';
  return parseBriefing(l).vistoEm ? 'lido' : 'naolido';
}
export const briefings = () => fil().filter((l) => l.briefingStatus && l.status !== 'descartado');
export const orcamentos = () => fil().filter((l) => l.orcamentoEm && l.status !== 'descartado');

export const PERGUNTAS_COMUNS = [
  ['negocio', 'Qual é o nome do seu negócio e o que ele faz?'],
  ['publico', 'Quem é o seu público? (quem compra/usa seus serviços)'],
  ['objetivo', 'Qual é o objetivo principal deste projeto? (o que precisa acontecer pra você considerar que valeu a pena)'],
  ['prazo', 'Existe um prazo desejado ou uma data-limite?'],
  ['referencias', 'Tem referências ou exemplos que gosta? (links, prints, concorrentes)'],
];

export const PERGUNTAS_BRIEFING = {
  site: [
    ['site_atual', 'Você já tem site? Se sim, qual o endereço e o que mais te incomoda nele?'],
    ['paginas', 'Quais páginas/seções o site precisa ter? (ex.: início, serviços, sobre, contato)'],
    ['conteudo', 'Você já tem textos, fotos e logotipo prontos, ou precisa de ajuda com isso?'],
    ['funcionalidades', 'O site precisa de algo além de apresentar o negócio? (agendamento, WhatsApp, formulário, pagamentos...)'],
    ['dominio', 'Já tem domínio próprio (www.seunegocio.com.br)?'],
  ],
  sistema: [
    ['processo', 'Qual processo do seu negócio o sistema deve resolver? Descreva como ele funciona HOJE.'],
    ['usuarios', 'Quem vai usar o sistema e quantas pessoas aproximadamente?'],
    ['funcionalidades', 'Quais funcionalidades são essenciais? (o mínimo pra começar a usar)'],
    ['integracoes', 'Precisa conversar com algo que você já usa? (planilhas, WhatsApp, sistema fiscal, pagamento...)'],
    ['acesso', 'Precisa de login com perfis diferentes? Uso no computador, no celular ou ambos?'],
    ['dados', 'Existem dados atuais (planilhas, outro sistema) que precisam ser importados?'],
  ],
  automacao: [
    ['tarefa', 'Qual tarefa repetitiva você quer automatizar? Descreva o passo a passo de como ela é feita hoje.'],
    ['ferramentas', 'Quais ferramentas estão envolvidas? (WhatsApp, e-mail, planilhas, sistemas...)'],
    ['volume', 'Com que frequência isso acontece? (vezes por dia/semana)'],
    ['gatilho', 'O que dispara a tarefa? (chegou mensagem, virou o mês, novo pedido...)'],
    ['resultado', 'Qual o resultado esperado quando a automação rodar?'],
  ],
  outro: [
    ['descricao', 'Descreva o que você precisa desenvolver, do seu jeito.'],
    ['dor', 'Qual problema isso resolve no seu dia a dia?'],
    ['exemplos', 'Conhece algo parecido que sirva de exemplo?'],
  ],
};

export const OBJETO_CONTRATO = {
  site: 'O presente contrato tem por objeto a criação de página na internet para o CONTRATANTE, incluindo: design do layout com identidade visual própria (logotipo, cores e imagens fornecidas ou aprovadas), redação e organização do conteúdo, adaptação para dispositivos móveis e publicação da página.',
  sistema: 'O presente contrato tem por objeto o desenvolvimento de sistema sob medida para o CONTRATANTE, incluindo: levantamento e validação dos requisitos, desenvolvimento das funcionalidades acordadas no escopo, testes, implantação e orientação básica de uso.',
  automacao: 'O presente contrato tem por objeto o desenvolvimento e a implantação de automação de processos para o CONTRATANTE, incluindo: mapeamento do processo atual, configuração e integração das ferramentas envolvidas, testes com dados reais e orientação básica de uso.',
  outro: 'O presente contrato tem por objeto a prestação de serviços de desenvolvimento pelo CONTRATADO(A) ao CONTRATANTE, conforme escopo descrito a seguir.',
};

export const st = {
  leads: [],
  view: 'geral',
  busca: '',
  sortCol: 'nome',
  sortAsc: true,
  pag: 1,
  porPag: 'auto',
  filtroBf: 'todos', // todos | aguardando | naolido | lido
  cfg: {},        // contratante
  hg: {},         // hostgator (sem senha)
  assinatura: {}, // assinatura da proposta (nome, apresentacao, whatsapp)
  conectado: false,
};

export function dias(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso + 'T12:00:00')) / 864e5);
}

export function fil() {
  const b = st.busca.toLowerCase();
  return st.leads.filter((l) => !b ||
    ((l.nome || '') + (l.nicho || '') + (l.cidade || '') + (l.status || '') + (l.servico || '') + (l.origem || ''))
      .toLowerCase().includes(b));
}

export const emAndamento = () => fil().filter((l) => !['descartado', 'encerrado'].includes(l.status));
export const ativos = () => fil().filter((l) => l.status === 'fechado');
export const followups = () => fil().filter((l) => l.status === 'proposta' && dias(l.dataProposta) >= 4);

export function mesesAtivo(l) {
  const ref = l.contratoEm || l.dataProposta || (l.atualizado || '').slice(0, 10);
  return Math.max(1, Math.floor(dias(ref) / 30) || 1);
}

// ---- financeiro ----
export function finCliente(l) {
  const mensalLiq = (l.manutencao || 0) - (l.custoMensal || 0);
  return {
    valor: l.valor || 0,
    custoSetup: l.custoSetup || 0,
    mensalLiq,
    lucro: (l.valor || 0) - (l.custoSetup || 0) + mesesAtivo(l) * mensalLiq,
  };
}

export function finGeral() {
  const at = ativos();
  const recebido = at.filter((l) => l.pago).reduce((a, l) => a + (l.valor || 0), 0);
  const areceber = at.filter((l) => !l.pago).reduce((a, l) => a + (l.valor || 0), 0);
  const mrrBruto = at.reduce((a, l) => a + (l.manutencao || 0), 0);
  const custoMensal = at.reduce((a, l) => a + (l.custoMensal || 0), 0);
  const custoSetup = at.reduce((a, l) => a + (l.custoSetup || 0), 0);
  const mrrLiq = mrrBruto - custoMensal;
  return {
    recebido, areceber, mrrBruto, custoMensal, custoSetup, mrrLiq,
    lucroFechado: recebido - custoSetup,
    projecao12: recebido + areceber - custoSetup + mrrLiq * 12,
  };
}
