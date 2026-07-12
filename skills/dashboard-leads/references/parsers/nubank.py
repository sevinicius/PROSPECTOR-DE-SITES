# -*- coding: utf-8 -*-
"""Parser Nubank — CSV de fatura (header date,title,amount).

PDF de fatura/extrato Nubank fica pra quando o usuário fornecer (task futura,
mesmo padrão de ramo 'csv' abaixo).
"""
import csv
import io

from financeiro_db import normalizar_valor


def _parsear_csv(texto):
    transacoes = []
    leitor = csv.reader(io.StringIO(texto))
    linhas = list(leitor)
    for linha in linhas[1:]:  # pula o header date,title,amount
        if len(linha) < 3:
            continue
        data, titulo, amount = linha[0], linha[1], linha[2]
        try:
            valor = normalizar_valor(amount)
        except (ValueError, TypeError):
            continue
        tipo = 'entrada' if amount.strip().startswith('-') else 'saida'
        transacoes.append({
            'data': data,
            'tipo': tipo,
            'valor': valor,
            'descricao': titulo,
        })
    return transacoes


def parsear(tipo, texto):
    if tipo == 'csv':
        return _parsear_csv(texto)
    raise ValueError('tipo não suportado: %s' % tipo)
