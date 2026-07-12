# -*- coding: utf-8 -*-
ASSINATURAS_BANCO = [
    ('nubank', ['nu pagamentos', 'nubank']),
    ('itau', ['itaú unibanco', 'itau unibanco', 'banco itaú', 'banco itau']),
    ('inter', ['banco inter']),
    ('mercadopago', ['mercado pago', 'mercadopago']),
]
ASSINATURAS_TIPO = [
    ('fatura', ['fatura', 'total a pagar', 'vencimento da fatura']),
    ('extrato', ['extrato', 'saldo disponível', 'saldo do dia']),
]

def detectar(texto):
    t = (texto or '').lower()
    banco = next((b for b, chaves in ASSINATURAS_BANCO if any(k in t for k in chaves)), None)
    tipo = next((tp for tp, chaves in ASSINATURAS_TIPO if any(k in t for k in chaves)), None)
    return (banco, tipo) if banco else (None, None)

def detectar_csv(nome_arquivo, texto):
    primeira_linha = (texto or '').split('\n', 1)[0].strip().lower()
    if primeira_linha == 'date,title,amount':
        return ('nubank', 'csv')
    return (None, None)
