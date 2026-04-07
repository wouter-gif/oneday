#!/usr/bin/env python3
"""
Local dev server for dashboard.html.

Serves static files and proxies API calls:
  POST /api/messages  →  api.anthropic.com  (Claude)
  GET  /api/data      →  Supabase REST API
  GET  /api/widgets   →  Supabase REST API
  POST /api/widgets   →  Supabase REST API

Credentials are read from a .env file in the same folder (if present).
Create one like this:
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_ANON_KEY=eyJ...
"""
import http.server, json, urllib.request, urllib.error, os, sys

PORT = 8000

# ── Load .env if present ────────────────────────────────────────────────────
def load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

load_dotenv()

SUPABASE_URL      = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

# ── Supabase helper ─────────────────────────────────────────────────────────
def supabase_request(path, method='GET', body=None):
    """Make a request to the Supabase REST API and return (status, bytes)."""
    url = SUPABASE_URL.rstrip('/') + path
    headers = {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

# ── HTTP Handler ────────────────────────────────────────────────────────────
class Handler(http.server.SimpleHTTPRequestHandler):

    # ── POST ──────────────────────────────────────────────────────────────
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)

        # /api/messages → Claude (Anthropic)
        if self.path == '/api/messages':
            api_key = self.headers.get('x-api-key', '')
            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages',
                data=body,
                headers={
                    'Content-Type':    'application/json',
                    'x-api-key':       api_key,
                    'anthropic-version': '2023-06-01',
                },
                method='POST',
            )
            try:
                with urllib.request.urlopen(req) as resp:
                    self._send(200, resp.read())
            except urllib.error.HTTPError as e:
                self._send(e.code, e.read())

        # /api/widgets → Supabase upsert
        elif self.path == '/api/widgets':
            self._handle_widgets_post(body)

        else:
            self._send(404, b'Not Found')

    # ── GET ───────────────────────────────────────────────────────────────
    def do_GET(self):
        # /api/data → Supabase dashboard_data table
        if self.path == '/api/data':
            self._handle_data_get()
        # /api/widgets → Supabase widgets table
        elif self.path == '/api/widgets':
            self._handle_widgets_get()
        else:
            # Fall through to static file serving
            super().do_GET()

    # ── /api/data ─────────────────────────────────────────────────────────
    def _handle_data_get(self):
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            err = json.dumps({'error': (
                'Supabase credentials not set. '
                'Create a .env file next to server.py with:\n'
                '  SUPABASE_URL=https://xxxx.supabase.co\n'
                '  SUPABASE_ANON_KEY=eyJ...'
            )}).encode()
            self._send(500, err)
            return

        status, data = supabase_request(
            '/rest/v1/dashboard_data?select=module,data'
        )
        if status != 200:
            self._send(status, data)
            return

        rows = json.loads(data)
        result = {row['module']: row['data'] for row in rows}
        self._send(200, json.dumps(result).encode())

    # ── /api/widgets GET ──────────────────────────────────────────────────
    def _handle_widgets_get(self):
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            self._send(200, json.dumps({'widgets': []}).encode())
            return

        status, data = supabase_request(
            '/rest/v1/widgets?user_id=eq.default&select=widgets'
        )
        if status != 200:
            self._send(status, data)
            return

        rows = json.loads(data)
        widgets = rows[0]['widgets'] if rows else []
        self._send(200, json.dumps({'widgets': widgets}).encode())

    # ── /api/widgets POST ─────────────────────────────────────────────────
    def _handle_widgets_post(self, raw_body):
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            # No Supabase → localStorage in browser is source of truth; silently OK
            self._send(200, json.dumps({'ok': True}).encode())
            return

        try:
            payload = json.loads(raw_body)
        except Exception:
            self._send(400, b'Bad JSON')
            return

        body = {
            'user_id':    'default',
            'widgets':    payload.get('widgets', []),
            'updated_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
        }

        # Use Supabase upsert (merge-duplicates on primary key)
        url  = SUPABASE_URL.rstrip('/') + '/rest/v1/widgets'
        hdrs = {
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type':  'application/json',
            'Prefer':        'resolution=merge-duplicates,return=minimal',
        }
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=hdrs, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                self._send(200, json.dumps({'ok': True}).encode())
        except urllib.error.HTTPError as e:
            self._send(e.code, e.read())

    # ── Shared response helper ────────────────────────────────────────────
    def _send(self, status, body: bytes):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Show API calls, suppress static-file noise
        if any(p in args[0] for p in ['/api/', 'Error', '404', '500']):
            print(f'  {args[0]}  →  {args[1]}')


# ── Entry point ─────────────────────────────────────────────────────────────
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print('─' * 55)
print(f'  Dashboard  →  http://localhost:{PORT}/dashboard.html')
if SUPABASE_URL:
    print(f'  Supabase   →  {SUPABASE_URL[:40]}…')
else:
    print('  Supabase   →  ⚠  not configured (.env missing)')
print('─' * 55)

http.server.HTTPServer(('', PORT), Handler).serve_forever()
