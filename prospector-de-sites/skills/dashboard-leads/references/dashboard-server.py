#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prospector — servidor local do dashboard (SQLite). Sem dependências: só Python padrão.
Uso: python dashboard-server.py  (ou duplo clique em iniciar-dashboard.bat)
Abre em http://localhost:8765 — edições, exclusões e drag&drop salvam no prospector.db"""
import datetime, json, sqlite3, os, re, sys, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PASTA = os.path.dirname(os.path.abspath(__file__))
os.chdir(PASTA)
DB = os.path.join(PASTA, 'prospector.db')
CONFIG = os.path.join(PASTA, 'prospector-config.json')

def ler_config():
    try: return json.load(open(CONFIG, encoding='utf-8'))
    except Exception: return {}
PORTA = 8765
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
            existe = c.execute('SELECT 1 FROM leads WHERE slug=?', (slug,)).fetchone()
            c.close()
            if not existe:
                return self._json(404, {'erro': 'lead não encontrado'})
            pasta = os.path.join(PASTA, 'sites', slug)
            os.makedirs(pasta, exist_ok=True)
            caminho = os.path.join(pasta, '%s-%s.html' % (arquivo, slug))
            open(caminho, 'w', encoding='utf-8').write(html)
            return self._json(200, {'ok': True, 'url': '/sites/%s/%s-%s.html' % (slug, arquivo, slug)})
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
        return self._json(404, {'erro': 'rota'})
    def do_DELETE(self):
        partes = self.path.split('?')[0].split('/')
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'leads':
            c = conexao(); c.execute('DELETE FROM leads WHERE slug=?', (partes[3],)); c.commit(); c.close()
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
