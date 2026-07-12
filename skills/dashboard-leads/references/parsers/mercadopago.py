# -*- coding: utf-8 -*-
"""Parser Mercado Pago — fatura de cartão de crédito (texto extraído do PDF).

Layout: a seção "Movimentações na fatura" tem `Parcela da fatura ...` (saida)
e `Pagamento da fatura ...` (entrada); as seções `Cartão Visa [...]` têm gastos
de cartão (sempre saida). Linhas `Total R$ ...` e o restante do texto (resumo,
parcelamento, limites) são ignorados por não casarem o padrão de transação.

Ano da transação inferido do `Vencimento: DD/MM/YYYY` (primeira ocorrência):
mês da transação > mês do vencimento -> ano anterior; senão, ano do vencimento.
"""
import re

from financeiro_db import normalizar_valor

_RE_VENCIMENTO = re.compile(r'Vencimento:\s*(\d{2})/(\d{2})/(\d{4})')
_RE_TRANSACAO = re.compile(
    r'^(\d{2})/(\d{2}) (.+?)( Parcela (\d+) de (\d+))? R\$ ([\d.]+,\d{2})$'
)


def _extrair_vencimento(texto):
    m = _RE_VENCIMENTO.search(texto)
    if not m:
        raise ValueError('Vencimento: DD/MM/YYYY não encontrado no texto da fatura')
    return int(m.group(2)), int(m.group(3))


def _parsear_fatura(texto):
    mes_vencimento, ano_vencimento = _extrair_vencimento(texto)
    transacoes = []
    for linha in texto.splitlines():
        m = _RE_TRANSACAO.match(linha.strip())
        if not m:
            continue
        dia, mes, descricao_base, _grupo_parcela, parcela_num, parcela_den, valor_str = m.groups()
        mes_int = int(mes)
        ano = ano_vencimento - 1 if mes_int > mes_vencimento else ano_vencimento
        data = '%04d-%02d-%02d' % (ano, mes_int, int(dia))

        descricao_base = descricao_base.strip()
        tipo = 'entrada' if descricao_base.startswith('Pagamento da fatura') else 'saida'

        descricao = descricao_base
        if parcela_num:
            descricao = '%s - Parcela %s/%s' % (descricao_base, parcela_num, parcela_den)

        transacoes.append({
            'data': data,
            'tipo': tipo,
            'valor': normalizar_valor(valor_str),
            'descricao': descricao,
        })
    return transacoes


def parsear(tipo, texto):
    if tipo == 'fatura':
        return _parsear_fatura(texto)
    raise ValueError('tipo não suportado: %s' % tipo)
