#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prospector — servidor local do dashboard (SQLite). Sem dependências: só Python padrão.
Uso: python dashboard-server.py  (ou duplo clique em iniciar-dashboard.bat)
Abre em http://localhost:8765 — edições, exclusões e drag&drop salvam no prospector.db"""
import base64, datetime, hashlib, json, sqlite3, os, re, shutil, subprocess, sys, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import financeiro_db as fin
import parsers
from parsers import detector as fin_detector

PASTA = os.path.dirname(os.path.abspath(__file__))
os.chdir(PASTA)
DB = os.path.join(PASTA, 'prospector.db')
CONFIG = os.path.join(PASTA, 'prospector-config.json')

def ler_config():
    try: return json.load(open(CONFIG, encoding='utf-8'))
    except Exception: return {}
PORTA = 8765

# ---- PDF por cliente: renderiza o doc via Edge/Chrome headless em clientes/<nome>/<tipo>/ ----
_NAV_CANDIDATOS = [
    os.path.expandvars(r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe'),
    os.path.expandvars(r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe'),
    os.path.expandvars(r'%ProgramFiles%\Google\Chrome\Application\chrome.exe'),
    os.path.expandvars(r'%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe'),
]
TIPO_PASTA = {'orcamento': 'orçamento', 'briefing': 'briefing', 'contrato': 'contrato'}

def achar_navegador():
    for c in _NAV_CANDIDATOS:
        if os.path.isfile(c): return c
    return shutil.which('msedge') or shutil.which('chrome') or shutil.which('chromium')

def sanit_pasta(nome):
    nome = re.sub(r'[\\/:*?"<>|]+', '-', (nome or '').strip()).strip('. ')
    return nome or None

def gerar_pdf(slug, arquivo, nome):
    """Imprime sites/<slug>/<arquivo>-<slug>.html em clientes/<nome>/<tipo>/<arquivo>-<slug>.pdf.
    Retorna o caminho relativo do PDF, ou None se não houver navegador headless."""
    nav = achar_navegador()
    if not nav: return None
    nome_pasta = sanit_pasta(nome) or slug
    subpasta = TIPO_PASTA.get(arquivo, arquivo)
    destino = os.path.join(PASTA, 'clientes', nome_pasta, subpasta)
    os.makedirs(destino, exist_ok=True)
    out = os.path.join(destino, '%s-%s.pdf' % (arquivo, slug))
    url = 'http://127.0.0.1:%d/sites/%s/%s-%s.html' % (PORTA, slug, arquivo, slug)
    try:
        subprocess.run([nav, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                        '--no-margins', '--print-to-pdf=%s' % out, url],
                       timeout=40, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        return None
    if os.path.isfile(out):
        return os.path.relpath(out, PASTA).replace('\\', '/')
    return None
CAMPOS = ['slug','nome','nicho','cidade','nota','avaliacoes','email','telefone','whatsapp',
          'siteAntigo','motivo','status','urlNova','dataProposta','valor','obs',
          'contratoStatus','contratoEm','manutencao','pago','docCliente','endCliente',
          'servico','origem','custoSetup','custoMensal',
          'briefingStatus','briefing','orcamentoEm']

def conexao():
    c = sqlite3.connect(DB)
    c.execute('''CREATE TABLE IF NOT EXISTS leads(
        slug TEXT PRIMARY KEY, nome TEXT, nicho TEXT, cidade TEXT, nota REAL, avaliacoes INTEGER,
        email TEXT, telefone TEXT, whatsapp TEXT, siteAntigo TEXT, motivo TEXT,
        status TEXT DEFAULT 'novo', urlNova TEXT, dataProposta TEXT, valor REAL, obs TEXT,
        contratoStatus TEXT DEFAULT 'pendente', contratoEm TEXT, manutencao REAL, pago INTEGER DEFAULT 0,
        atualizado TEXT DEFAULT (datetime('now','localtime')))''')
    for col, tipo in [('contratoStatus',"TEXT DEFAULT 'pendente'"),('contratoEm','TEXT'),('manutencao','REAL'),('pago','INTEGER DEFAULT 0'),('docCliente','TEXT'),('endCliente','TEXT'),
                      ('servico',"TEXT DEFAULT 'site'"),('origem',"TEXT DEFAULT 'prospeccao'"),('custoSetup','REAL DEFAULT 0'),('custoMensal','REAL DEFAULT 0'),
                      ('briefingStatus','TEXT'),('briefing','TEXT'),('orcamentoEm','TEXT')]:
        try: c.execute('ALTER TABLE leads ADD COLUMN %s %s' % (col, tipo))
        except sqlite3.OperationalError: pass
    fin.garantir_schema(c)
    return c

def importar_snapshot():
    """Primeira execução sem banco: importa os leads embutidos no dashboard.html."""
    try:
        html = open(os.path.join(PASTA, 'dashboard.html'), encoding='utf-8').read()
        ini = html.index('<script id="dados" type="application/json">') + len('<script id="dados" type="application/json">')
        fim = html.index('</script>', ini)
        dados = json.loads(html[ini:fim])
        c = conexao()
        for l in dados.get('leads', []):
            c.execute('INSERT OR IGNORE INTO leads (%s) VALUES (%s)' % (','.join(CAMPOS), ','.join('?'*len(CAMPOS))),
                      [l.get(k) for k in CAMPOS])
        c.commit(); c.close()
        print('Snapshot importado do dashboard.html para o prospector.db')
    except Exception as e:
        print('(sem snapshot para importar: %s)' % e)

class App(SimpleHTTPRequestHandler):
    def end_headers(self):
        # sem cache pra HTML/CSS/JS: toda regeneração (orçamento, briefing, painel) aparece
        # no reload normal, sem o navegador servir a versão velha do cache.
        p = self.path.split('?')[0].lower()
        if p.endswith(('.html', '.css', '.js', '/')) or p in ('/painel', ''):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
        SimpleHTTPRequestHandler.end_headers(self)
    def _json(self, code, obj):
        corpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers(); self.wfile.write(corpo)
    def _corpo(self):
        n = int(self.headers.get('Content-Length', 0))
        if not n: return {}
        try: return json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception: return None  # handlers respondem 400
    def do_GET(self):
        if self.path.split('?')[0] == '/api/config':
            cfg = ler_config()
            hg = dict(cfg.get('hostgator', {}))
            hg['senhaDefinida'] = bool(hg.get('senha'))
            hg.pop('senha', None)  # a senha NUNCA sai do arquivo
            return self._json(200, {'contratante': cfg.get('contratante', {}), 'hostgator': hg,
                                    'assinatura': cfg.get('assinatura', {})})
        if self.path.split('?')[0] == '/api/leads':
            c = conexao(); c.row_factory = sqlite3.Row
            rows = [dict(r) for r in c.execute('SELECT * FROM leads').fetchall()]; c.close()
            return self._json(200, rows)
        rota = self.path.split('?')[0]
        if rota == '/api/transacoes':
            q = parse_qs(urlparse(self.path).query)
            sql, args = 'SELECT * FROM transacoes', []
            conds = []
            if q.get('mes'): conds.append("substr(data,1,7)=?"); args.append(q['mes'][0])
            if q.get('categoria'): conds.append('categoria_id=?'); args.append(int(q['categoria'][0]))
            if q.get('cartao'): conds.append('cartao_id=?'); args.append(int(q['cartao'][0]))
            if q.get('escopo'): conds.append('escopo=?'); args.append(q['escopo'][0])
            if conds: sql += ' WHERE ' + ' AND '.join(conds)
            sql += ' ORDER BY data DESC, id DESC'
            c = conexao(); c.row_factory = sqlite3.Row
            rows = [dict(r) for r in c.execute(sql, args)]; c.close()
            return self._json(200, rows)
        if rota in ('/api/cartoes', '/api/categorias', '/api/regras'):
            tabela = {'/api/cartoes': 'cartoes', '/api/categorias': 'categorias', '/api/regras': 'regras_categoria'}[rota]
            c = conexao(); c.row_factory = sqlite3.Row
            rows = [dict(r) for r in c.execute('SELECT * FROM %s' % tabela)]; c.close()
            return self._json(200, rows)
        if rota == '/api/config-fin':
            c = conexao()
            row = c.execute("SELECT valor FROM config_fin WHERE chave='limite_global'").fetchone(); c.close()
            return self._json(200, {'limite_global': float(row[0]) if row else None})
        if rota == '/api/importacoes':
            c = conexao(); c.row_factory = sqlite3.Row
            rows = [dict(r) for r in c.execute('SELECT * FROM importacoes')]; c.close()
            return self._json(200, rows)
        if self.path in ('/', '', '/dashboard.html'):
            if os.path.isdir(os.path.join(PASTA, 'painel')):
                # redireciona pra /painel/ — assim os links relativos (css/, js/) resolvem certo
                self.send_response(301)
                self.send_header('Location', '/painel/')
                self.end_headers()
                return
            self.path = '/dashboard.html'
        # allowlist de estáticos: config (senha!) e .db NUNCA saem pelo HTTP
        caminho = self.path.split('?')[0]
        if not (caminho.startswith('/painel/') or caminho.startswith('/sites/')
                or caminho in ('/manual.html', '/favicon.ico', '/dashboard.html')):
            return self._json(404, {'erro': 'rota'})
        return SimpleHTTPRequestHandler.do_GET(self)
    def _briefing_rmw(self, slug, mudar):
        """read-modify-write do JSON briefing DENTRO do servidor (evita lost-update do painel stale)."""
        c = conexao()
        atual = c.execute('SELECT briefing, briefingStatus FROM leads WHERE slug=?', (slug,)).fetchone()
        if atual is None:
            c.close(); return self._json(404, {'erro': 'lead não encontrado'})
        try: dados = json.loads(atual[0]) if atual[0] else {}
        except Exception: dados = {}
        status = mudar(dados) or atual[1]
        c.execute('UPDATE leads SET briefing=?, briefingStatus=?, atualizado=datetime("now","localtime") WHERE slug=?',
                  (json.dumps(dados, ensure_ascii=False), status, slug))
        c.commit(); c.close()
        return self._json(200, {'ok': True})

    def do_POST(self):
        partes = self.path.split('?')[0].split('/')
        corpo = self._corpo()
        if corpo is None:
            return self._json(400, {'erro': 'JSON inválido'})
        if self.path.split('?')[0] == '/api/leads':
            l = corpo
            if not l.get('slug'):
                return self._json(400, {'erro': 'slug obrigatório'})
            fornecidos = [k for k in CAMPOS if k in l]
            c = conexao()
            existe = c.execute('SELECT 1 FROM leads WHERE slug=?', (l['slug'],)).fetchone()
            if existe:  # merge: só atualiza os campos enviados — nunca zera o resto (briefing, orçamento...)
                sets = [k for k in fornecidos if k != 'slug']
                if sets:
                    c.execute('UPDATE leads SET %s, atualizado=datetime("now","localtime") WHERE slug=?' %
                              ','.join('%s=?' % k for k in sets), [l[k] for k in sets] + [l['slug']])
            else:
                c.execute('INSERT INTO leads (%s) VALUES (%s)' % (','.join(fornecidos), ','.join('?'*len(fornecidos))),
                          [l[k] for k in fornecidos])
            c.commit(); c.close(); return self._json(200, {'ok': True})
        # POST /api/gerar/<slug>  {arquivo: contrato|briefing|orcamento, html} -> grava sites/<slug>/<arquivo>-<slug>.html
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'gerar':
            slug = partes[3]
            arquivo = corpo.get('arquivo', '')
            html = corpo.get('html', '')
            if not re.fullmatch(r'[a-z0-9-]{1,60}', slug or ''):
                return self._json(400, {'erro': 'slug inválido'})
            if arquivo not in ('contrato', 'briefing', 'orcamento') or not html:
                return self._json(400, {'erro': 'arquivo deve ser contrato|briefing|orcamento e html não pode ser vazio'})
            c = conexao()
            row = c.execute('SELECT nome FROM leads WHERE slug=?', (slug,)).fetchone()
            c.close()
            if row is None:
                return self._json(404, {'erro': 'lead não encontrado'})
            pasta = os.path.join(PASTA, 'sites', slug)
            os.makedirs(pasta, exist_ok=True)
            caminho = os.path.join(pasta, '%s-%s.html' % (arquivo, slug))
            open(caminho, 'w', encoding='utf-8').write(html)
            # auto-salva o PDF na pasta do cliente (clientes/<nome>/<tipo>/) via navegador headless
            pdf_rel = gerar_pdf(slug, arquivo, row[0])
            return self._json(200, {'ok': True, 'url': '/sites/%s/%s-%s.html' % (slug, arquivo, slug), 'pdf': pdf_rel})
        # POST /api/briefing/<slug>/respostas  {respostas:{...}} -> salva no lead e marca respondido (não lido)
        if len(partes) == 5 and partes[1] == 'api' and partes[2] == 'briefing' and partes[4] == 'respostas':
            respostas = corpo.get('respostas', {})
            if not isinstance(respostas, dict) or not any(str(v or '').strip() for v in respostas.values()):
                return self._json(400, {'erro': 'nenhuma resposta preenchida'})
            def mudar(dados):
                dados['respostas'] = respostas
                dados['respondidoEm'] = datetime.date.today().isoformat()
                dados.pop('vistoEm', None)  # resposta nova (ou atualizada) volta pro filtro "não lidos"
                return 'respondido'
            return self._briefing_rmw(partes[3], mudar)
        # POST /api/briefing/<slug>/visto -> marca lido (read-modify-write no servidor)
        if len(partes) == 5 and partes[1] == 'api' and partes[2] == 'briefing' and partes[4] == 'visto':
            def mudar(dados):
                dados['vistoEm'] = datetime.date.today().isoformat()
                return None
            return self._briefing_rmw(partes[3], mudar)
        # POST /api/briefing/<slug>/registrar {respostas_texto} -> dono cola as respostas (já conta como lido)
        if len(partes) == 5 and partes[1] == 'api' and partes[2] == 'briefing' and partes[4] == 'registrar':
            texto = str(corpo.get('respostas_texto', '') or '').strip()
            if not texto:
                return self._json(400, {'erro': 'respostas_texto vazio'})
            def mudar(dados):
                dados['respostas_texto'] = texto
                dados.setdefault('respondidoEm', datetime.date.today().isoformat())
                dados['vistoEm'] = datetime.date.today().isoformat()
                return 'respondido'
            return self._briefing_rmw(partes[3], mudar)
        # POST /api/transacoes {data,tipo,valor,descricao?,categoria_id?,cartao_id?,metodo?,escopo?,lead_slug?,origem?,banco?}
        if self.path.split('?')[0] == '/api/transacoes':
            try:
                datetime.date.fromisoformat(str(corpo.get('data', '')))
            except (ValueError, TypeError):
                return self._json(400, {'erro': 'data inválida'})
            if corpo.get('tipo') not in ('entrada', 'saida'):
                return self._json(400, {'erro': 'tipo deve ser entrada ou saida'})
            try:
                valor = float(corpo.get('valor'))
            except (TypeError, ValueError):
                return self._json(400, {'erro': 'valor inválido'})
            if valor <= 0:
                return self._json(400, {'erro': 'valor deve ser maior que zero'})
            campos_transacao = ['data', 'tipo', 'valor', 'descricao', 'categoria_id', 'cartao_id',
                                 'metodo', 'escopo', 'lead_slug', 'origem', 'banco']
            dados = {k: corpo[k] for k in campos_transacao if k in corpo}
            dados['valor'] = valor
            c = conexao()
            if corpo.get('metodo') == 'cartao' and corpo.get('cartao_id'):
                cartao = c.execute('SELECT dia_fechamento FROM cartoes WHERE id=?', (corpo['cartao_id'],)).fetchone()
                if cartao:
                    dados['fatura_comp'] = fin.competencia_fatura(dados['data'], cartao[0])
            if corpo.get('origem', 'manual') != 'manual':
                dados['fingerprint'] = fin.fingerprint(dados.get('banco'), dados['data'], valor, dados.get('descricao'))
            campos = list(dados.keys())
            cur = c.execute('INSERT INTO transacoes (%s) VALUES (%s)' % (','.join(campos), ','.join('?' * len(campos))),
                             [dados[k] for k in campos])
            c.commit(); novo_id = cur.lastrowid; c.close()
            return self._json(200, {'ok': True, 'id': novo_id})
        # POST /api/cartoes | /api/categorias | /api/regras — allowlist de campos por tabela
        if self.path.split('?')[0] in ('/api/cartoes', '/api/categorias', '/api/regras'):
            rota = self.path.split('?')[0]
            tabela, campos_permitidos, obrigatorio = {
                '/api/cartoes': ('cartoes', ['nome', 'banco', 'limite', 'dia_fechamento', 'dia_vencimento', 'ativo'], 'nome'),
                '/api/categorias': ('categorias', ['nome', 'cor', 'limite_mensal', 'ativo'], 'nome'),
                '/api/regras': ('regras_categoria', ['palavra', 'categoria_id'], 'palavra'),
            }[rota]
            if not corpo.get(obrigatorio):
                return self._json(400, {'erro': '%s obrigatório' % obrigatorio})
            fornecidos = [k for k in campos_permitidos if k in corpo]
            c = conexao()
            cur = c.execute('INSERT INTO %s (%s) VALUES (%s)' % (tabela, ','.join(fornecidos), ','.join('?' * len(fornecidos))),
                             [corpo[k] for k in fornecidos])
            c.commit(); novo_id = cur.lastrowid; c.close()
            return self._json(200, {'ok': True, 'id': novo_id})
        # POST /api/importar-fatura {nome, conteudo_b64} -> preview (não grava transação): detecta banco/tipo
        # (PDF via extrair_texto+detectar; CSV via detectar_csv) e devolve as transações com fingerprint/categoria/dedup.
        if self.path.split('?')[0] == '/api/importar-fatura':
            nome = corpo.get('nome')
            conteudo_b64 = corpo.get('conteudo_b64')
            if not nome or not conteudo_b64:
                return self._json(400, {'erro': 'nome e conteudo_b64 obrigatórios'})
            try:
                bruto = base64.b64decode(conteudo_b64)
            except Exception:
                return self._json(400, {'erro': 'conteudo_b64 inválido'})
            sha256 = hashlib.sha256(bruto).hexdigest()
            ext = '.csv' if nome.lower().endswith('.csv') else '.pdf'
            pasta_imp = os.path.join(PASTA, 'importacoes-pdf')
            os.makedirs(pasta_imp, exist_ok=True)
            caminho = os.path.join(pasta_imp, sha256 + ext)
            with open(caminho, 'wb') as f:
                f.write(bruto)
            if ext == '.csv':
                texto = bruto.decode('utf-8-sig', errors='replace')
                banco, tipo = fin_detector.detectar_csv(nome, texto)
            else:
                try:
                    texto = parsers.extrair_texto(caminho)
                except parsers.ErroDependencia:
                    return self._json(200, {'ok': False, 'erro': 'dependencia',
                                             'hint': 'py -3 -m pip install -r requirements.txt'})
                except Exception:
                    return self._json(200, {'ok': False, 'erro': 'pdf_ilegivel'})
                banco, tipo = fin_detector.detectar(texto)
            if not banco:
                return self._json(200, {'ok': False, 'erro': 'banco_nao_reconhecido', 'bancos': ['nubank', 'mercadopago']})
            transacoes = parsers.parsear(banco, tipo, texto)
            c = conexao()
            regras = c.execute('SELECT palavra, categoria_id FROM regras_categoria').fetchall()
            ja_importado = c.execute('SELECT 1 FROM importacoes WHERE hash=?', (sha256,)).fetchone() is not None
            saida = []
            for t in transacoes:
                fp = fin.fingerprint(banco, t['data'], t['valor'], t.get('descricao'))
                categoria_id = fin.aplicar_regras(t.get('descricao'), regras)
                ja_existe = c.execute('SELECT 1 FROM transacoes WHERE fingerprint=?', (fp,)).fetchone() is not None
                saida.append({**t, 'categoria_id': categoria_id, 'fingerprint': fp, 'ja_existe': ja_existe})
            c.close()
            return self._json(200, {'ok': True, 'hash': sha256, 'banco': banco, 'tipo': tipo,
                                     'ja_importado': ja_importado, 'transacoes': saida})
        # POST /api/importar-fatura/confirmar {hash, arquivo, banco, tipo, cartao_id?, transacoes} -> grava
        # com INSERT OR IGNORE por fingerprint (dedup) e registra a importação (hash único).
        if self.path.split('?')[0] == '/api/importar-fatura/confirmar':
            hash_ = corpo.get('hash')
            transacoes = corpo.get('transacoes')
            if not hash_ or not transacoes:
                return self._json(400, {'erro': 'hash e transacoes obrigatórios'})
            banco = corpo.get('banco')
            tipo = corpo.get('tipo')
            arquivo = corpo.get('arquivo')
            cartao_id = corpo.get('cartao_id') or None
            origem = 'fatura' if tipo in ('fatura', 'csv') else 'extrato'
            metodo = 'cartao' if cartao_id else ('pix' if tipo == 'extrato' else 'outro')
            c = conexao()
            dia_fechamento = None
            if cartao_id:
                cartao = c.execute('SELECT dia_fechamento FROM cartoes WHERE id=?', (cartao_id,)).fetchone()
                if cartao:
                    dia_fechamento = cartao[0]
            novas = 0
            for t in transacoes:
                fp = t.get('fingerprint') or fin.fingerprint(banco, t.get('data'), t.get('valor'), t.get('descricao'))
                fatura_comp = fin.competencia_fatura(t['data'], dia_fechamento) if dia_fechamento is not None else None
                c.execute('''INSERT OR IGNORE INTO transacoes
                    (data, tipo, valor, descricao, categoria_id, cartao_id, metodo, escopo, origem, banco, fatura_comp, fingerprint)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (t.get('data'), t.get('tipo'), t.get('valor'), t.get('descricao'), t.get('categoria_id'), cartao_id,
                     metodo, 'pessoal', origem, banco, fatura_comp, fp))
                if c.execute('SELECT changes()').fetchone()[0]:
                    novas += 1
            puladas = len(transacoes) - novas
            c.execute('INSERT OR IGNORE INTO importacoes (arquivo, banco, tipo, hash, qtd_transacoes) VALUES (?,?,?,?,?)',
                      (arquivo, banco, tipo, hash_, novas))
            c.commit(); c.close()
            return self._json(200, {'ok': True, 'novas': novas, 'puladas': puladas})
        return self._json(404, {'erro': 'rota'})
    def do_PUT(self):
        corpo_put = self._corpo()
        if corpo_put is None:
            return self._json(400, {'erro': 'JSON inválido'})
        if self.path.split('?')[0] == '/api/config':
            cfg = ler_config(); corpo = corpo_put
            if 'contratante' in corpo or 'hostgator' in corpo:
                if 'contratante' in corpo:
                    ct = cfg.get('contratante', {})
                    ct.update({k: v for k, v in corpo['contratante'].items() if isinstance(v, str)})
                    cfg['contratante'] = ct
                if 'hostgator' in corpo:
                    hg = cfg.get('hostgator', {})
                    for k, v in corpo['hostgator'].items():
                        if not isinstance(v, str): continue
                        if k == 'senha' and v == '': continue  # em branco = mantém a atual
                        hg[k] = v
                    cfg['hostgator'] = hg
            else:  # compatibilidade: corpo plano = contratante
                ct = cfg.get('contratante', {})
                ct.update({k: v for k, v in corpo.items() if isinstance(v, str)})
                cfg['contratante'] = ct
            json.dump(cfg, open(CONFIG, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            return self._json(200, {'ok': True})
        partes = self.path.split('?')[0].split('/')
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'leads':
            slug, ch = partes[3], corpo_put
            sets = [k for k in ch if k in CAMPOS and k != 'slug']
            if sets:
                c = conexao()
                c.execute('UPDATE leads SET %s, atualizado=datetime("now","localtime") WHERE slug=?' %
                          ','.join('%s=?' % k for k in sets), [ch[k] for k in sets] + [slug])
                c.commit(); c.close()
            return self._json(200, {'ok': True})
        # PUT /api/transacoes/<id> — parcial, allowlist da tabela
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'transacoes':
            campos_transacao = ['data', 'tipo', 'valor', 'descricao', 'categoria_id', 'cartao_id',
                                 'metodo', 'escopo', 'lead_slug', 'origem', 'banco', 'fatura_comp', 'fingerprint']
            sets = [k for k in campos_transacao if k in corpo_put]
            if sets:
                c = conexao()
                c.execute('UPDATE transacoes SET %s, atualizado=datetime("now","localtime") WHERE id=?' %
                          ','.join('%s=?' % k for k in sets), [corpo_put[k] for k in sets] + [partes[3]])
                c.commit(); c.close()
            return self._json(200, {'ok': True})
        # PUT /api/cartoes/<id> | /api/categorias/<id> — parcial, allowlist da tabela
        if len(partes) == 4 and partes[1] == 'api' and partes[2] in ('cartoes', 'categorias'):
            tabela = 'cartoes' if partes[2] == 'cartoes' else 'categorias'
            campos_permitidos = {'cartoes': ['nome', 'banco', 'limite', 'dia_fechamento', 'dia_vencimento', 'ativo'],
                                  'categorias': ['nome', 'cor', 'limite_mensal', 'ativo']}[partes[2]]
            sets = [k for k in campos_permitidos if k in corpo_put]
            if sets:
                c = conexao()
                c.execute('UPDATE %s SET %s WHERE id=?' % (tabela, ','.join('%s=?' % k for k in sets)),
                          [corpo_put[k] for k in sets] + [partes[3]])
                c.commit(); c.close()
            return self._json(200, {'ok': True})
        # PUT /api/config-fin {limite_global}
        if self.path.split('?')[0] == '/api/config-fin':
            c = conexao()
            c.execute("INSERT OR REPLACE INTO config_fin(chave, valor) VALUES ('limite_global', ?)",
                      (corpo_put.get('limite_global'),))
            c.commit(); c.close()
            return self._json(200, {'ok': True})
        return self._json(404, {'erro': 'rota'})
    def do_DELETE(self):
        partes = self.path.split('?')[0].split('/')
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'leads':
            c = conexao(); c.execute('DELETE FROM leads WHERE slug=?', (partes[3],)); c.commit(); c.close()
            return self._json(200, {'ok': True})
        if len(partes) == 4 and partes[1] == 'api' and partes[2] in ('transacoes', 'cartoes', 'categorias', 'regras'):
            tabela = {'transacoes': 'transacoes', 'cartoes': 'cartoes', 'categorias': 'categorias',
                      'regras': 'regras_categoria'}[partes[2]]
            c = conexao(); c.execute('DELETE FROM %s WHERE id=?' % tabela, (partes[3],)); c.commit(); c.close()
            return self._json(200, {'ok': True})
        return self._json(404, {'erro': 'rota'})
    def log_message(self, *a): pass

if __name__ == '__main__':
    novo = not os.path.exists(DB)
    conexao().close()
    if novo: importar_snapshot()
    print('Prospector rodando em http://localhost:%d  (Ctrl+C para parar)' % PORTA)
    try: webbrowser.open('http://localhost:%d' % PORTA)
    except Exception: pass
    try: ThreadingHTTPServer(('127.0.0.1', PORTA), App).serve_forever()
    except KeyboardInterrupt: print('\nEncerrado.')
