# -*- coding: utf-8 -*-
"""Financeiro — schema, regras e helpers do livro-caixa universal.
Importado pelo dashboard-server.py. Só stdlib."""
import datetime, hashlib

CATEGORIAS_SEED = ['mercado', 'gasolina', 'alimentação', 'assinatura', 'saúde',
                   'lazer', 'moradia', 'outros', 'pagamento de fatura', 'sem categoria']

def garantir_schema(c):
    c.execute('''CREATE TABLE IF NOT EXISTS transacoes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('entrada','saida')),
        valor REAL NOT NULL,
        descricao TEXT DEFAULT '',
        categoria_id INTEGER, cartao_id INTEGER,
        metodo TEXT DEFAULT 'outro',
        escopo TEXT DEFAULT 'pessoal',
        lead_slug TEXT,
        origem TEXT DEFAULT 'manual',
        banco TEXT, fatura_comp TEXT,
        fingerprint TEXT UNIQUE,
        criado TEXT DEFAULT (datetime('now','localtime')),
        atualizado TEXT DEFAULT (datetime('now','localtime')))''')
    c.execute('''CREATE TABLE IF NOT EXISTS cartoes(
        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, banco TEXT,
        limite REAL DEFAULT 0, dia_fechamento INTEGER DEFAULT 1,
        dia_vencimento INTEGER DEFAULT 10, ativo INTEGER DEFAULT 1)''')
    c.execute('''CREATE TABLE IF NOT EXISTS categorias(
        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE NOT NULL,
        cor TEXT, limite_mensal REAL, ativo INTEGER DEFAULT 1)''')
    c.execute('''CREATE TABLE IF NOT EXISTS regras_categoria(
        id INTEGER PRIMARY KEY AUTOINCREMENT, palavra TEXT NOT NULL, categoria_id INTEGER NOT NULL)''')
    c.execute('CREATE TABLE IF NOT EXISTS config_fin(chave TEXT PRIMARY KEY, valor TEXT)')
    c.execute('''CREATE TABLE IF NOT EXISTS importacoes(
        id INTEGER PRIMARY KEY AUTOINCREMENT, arquivo TEXT, banco TEXT, tipo TEXT,
        hash TEXT UNIQUE, qtd_transacoes INTEGER DEFAULT 0,
        data_importacao TEXT DEFAULT (datetime('now','localtime')))''')
    if c.execute('SELECT COUNT(*) FROM categorias').fetchone()[0] == 0:
        c.executemany('INSERT INTO categorias(nome) VALUES (?)', [(n,) for n in CATEGORIAS_SEED])

def fingerprint(banco, data, valor, descricao):
    desc = ' '.join((descricao or '').lower().split())
    base = '%s|%s|%.2f|%s' % ((banco or '').lower(), data, float(valor), desc)
    return hashlib.sha1(base.encode('utf-8')).hexdigest()

def competencia_fatura(data_iso, dia_fechamento):
    """Gasto após o dia de fechamento cai na fatura do mês seguinte."""
    d = datetime.date.fromisoformat(data_iso)
    if d.day > int(dia_fechamento):
        return '%04d-%02d' % (d.year + (1 if d.month == 12 else 0), (d.month % 12) + 1)
    return '%04d-%02d' % (d.year, d.month)

def normalizar_valor(texto):
    t = str(texto).replace('R$', '').replace(' ', '').strip()
    if ',' in t:
        t = t.replace('.', '').replace(',', '.')
    return round(abs(float(t)), 2)

def aplicar_regras(descricao, regras):
    d = (descricao or '').lower()
    for palavra, categoria_id in regras:
        if palavra.lower() in d:
            return categoria_id
    return None
