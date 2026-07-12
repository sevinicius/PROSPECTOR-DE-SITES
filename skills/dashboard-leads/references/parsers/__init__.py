# -*- coding: utf-8 -*-
"""Parsers determinísticos de fatura/extrato em PDF (pdfplumber)."""
class ErroDependencia(Exception):
    pass

def extrair_texto(caminho_pdf):
    try:
        import pdfplumber
    except ImportError:
        raise ErroDependencia('pdfplumber ausente — rode: py -3 -m pip install -r requirements.txt')
    with pdfplumber.open(caminho_pdf) as pdf:
        return '\n'.join((p.extract_text() or '') for p in pdf.pages)

_BANCOS_SUPORTADOS = ('nubank', 'itau', 'inter', 'mercadopago')

def parsear(banco, tipo, texto):
    import importlib
    if banco not in _BANCOS_SUPORTADOS:
        raise ValueError('banco não suportado: %s' % banco)
    try:
        mod = importlib.import_module('.' + banco, __package__)
    except ModuleNotFoundError:
        raise ValueError('parser de %s ainda não implementado' % banco)
    return mod.parsear(tipo, texto)
