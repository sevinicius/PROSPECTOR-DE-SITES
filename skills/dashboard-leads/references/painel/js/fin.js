// fin.js — store financeiro (transações, cartões, categorias, regras, limites) + derivações puras.
import { api } from './api.js';

function mesAtual() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export const stFin = {
  transacoes: [],
  cartoes: [],
  categorias: [],
  regras: [],
  limiteGlobal: null,
  importacoes: [],
  mes: mesAtual(),
  subAba: 'visao',
};

export function carregarFin() {
  return Promise.all([
    api.transacoes(),
    api.cartoes(),
    api.categorias(),
    api.regras(),
    api.configFin(),
    api.importacoes(),
  ]).then(([transacoes, cartoes, categorias, regras, configFin, importacoes]) => {
    stFin.transacoes = transacoes;
    stFin.cartoes = cartoes;
    stFin.categorias = categorias;
    stFin.regras = regras;
    stFin.limiteGlobal = configFin.limite_global;
    stFin.importacoes = importacoes;
    return stFin;
  });
}

// ---- nomes ----
export function nomeCategoria(id) {
  const c = stFin.categorias.find((x) => x.id === id);
  return c ? c.nome : 'sem categoria';
}
export function nomeCartao(id) {
  const c = stFin.cartoes.find((x) => x.id === id);
  return c ? c.nome : 'sem cartão';
}

// ---- derivações sobre stFin.transacoes ----
export function doMes(mes) {
  return stFin.transacoes.filter((t) => (t.data || '').startsWith(mes));
}

function ehGastoOuEntrada(t, tipo) {
  return t.tipo === tipo && nomeCategoria(t.categoria_id) !== 'pagamento de fatura';
}

export function gastoDoMes(mes) {
  return doMes(mes).filter((t) => ehGastoOuEntrada(t, 'saida')).reduce((a, t) => a + (t.valor || 0), 0);
}

export function entradaDoMes(mes) {
  return doMes(mes).filter((t) => ehGastoOuEntrada(t, 'entrada')).reduce((a, t) => a + (t.valor || 0), 0);
}

export function porCategoria(mes) {
  const gastos = doMes(mes).filter((t) => ehGastoOuEntrada(t, 'saida'));
  const mapa = new Map();
  for (const t of gastos) {
    const nome = nomeCategoria(t.categoria_id);
    mapa.set(nome, (mapa.get(nome) || 0) + (t.valor || 0));
  }
  return [...mapa.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

export function porCartao(mes) {
  const gastos = doMes(mes).filter((t) => ehGastoOuEntrada(t, 'saida'));
  const mapa = new Map();
  for (const t of gastos) {
    const nome = nomeCartao(t.cartao_id);
    mapa.set(nome, (mapa.get(nome) || 0) + (t.valor || 0));
  }
  return [...mapa.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
}

export function gastosPorMes(nMeses = 12) {
  const atual = mesAtual();
  const [anoAtual, mesAtualNum] = atual.split('-').map(Number);
  const buckets = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    let ano = anoAtual;
    let m = mesAtualNum - i;
    while (m <= 0) { m += 12; ano -= 1; }
    buckets.push(ano + '-' + String(m).padStart(2, '0'));
  }
  return buckets.map((mes) => ({ mes, total: gastoDoMes(mes) }));
}

// ---- cartões / fatura por competência (espelho de financeiro_db.competencia_fatura) ----
export function competenciaCartao(cartao) {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1; // 1-12
  const ano = hoje.getFullYear();
  if (dia > Number(cartao.dia_fechamento)) {
    const anoProx = ano + (mes === 12 ? 1 : 0);
    const mesProx = (mes % 12) + 1;
    return anoProx + '-' + String(mesProx).padStart(2, '0');
  }
  return ano + '-' + String(mes).padStart(2, '0');
}

export function faturaAberta(cartao) {
  const comp = competenciaCartao(cartao);
  return stFin.transacoes
    .filter((t) => t.tipo === 'saida' && t.cartao_id === cartao.id && t.fatura_comp === comp)
    .reduce((a, t) => a + (t.valor || 0), 0);
}

// ---- limites ----
export function consumoLimites(mes) {
  const gastosMes = doMes(mes).filter((t) => t.tipo === 'saida');
  const global = stFin.limiteGlobal != null
    ? { limite: stFin.limiteGlobal, gasto: gastoDoMes(mes) }
    : null;
  const categorias = stFin.categorias
    .filter((c) => (c.limite_mensal || 0) > 0 && c.ativo)
    .map((c) => ({
      nome: c.nome,
      limite: c.limite_mensal,
      gasto: gastosMes.filter((t) => t.categoria_id === c.id).reduce((a, t) => a + (t.valor || 0), 0),
    }));
  return { global, categorias };
}
