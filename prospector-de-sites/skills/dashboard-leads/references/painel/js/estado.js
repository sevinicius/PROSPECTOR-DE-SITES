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

export const st = {
  leads: [],
  view: 'geral',
  busca: '',
  sortCol: 'nome',
  sortAsc: true,
  pag: 1,
  porPag: 'auto',
  cfg: {},        // contratante
  hg: {},         // hostgator (sem senha)
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
