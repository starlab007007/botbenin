import hmac
import importlib.metadata
import json
import os
from pathlib import Path
import signal
import socketserver
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler

ROOT = Path(__file__).resolve().parent
ENGINES = {'cheerio', 'crawlee', 'playwright', 'scrapy', 'beautifulsoup', 'crawl4ai'}
LOCK = threading.BoundedSemaphore(1)
MAX_BYTES = 1_500_000


def versions():
    packages = {'beautifulsoup': 'beautifulsoup4', 'scrapy': 'Scrapy',
                'playwright': 'playwright', 'crawl4ai': 'crawl4ai'}
    result = {key: importlib.metadata.version(package) for key, package in packages.items()}
    lock = json.loads((ROOT / 'package-lock.json').read_text())['packages']
    for key in ('cheerio', 'crawlee'):
        result[key] = lock['node_modules/' + key]['version']
    return result


def execute(data):
    engine = data.get('engine')
    html = data.get('html')
    if engine not in ENGINES or not isinstance(html, str) or len(html.encode()) > 1_200_000:
        raise ValueError('invalid_engine_document')
    timeout = data.get('timeout_seconds', 20)
    if type(timeout) is not int or not 5 <= timeout <= 30:
        raise ValueError('invalid_engine_timeout')
    # The URL is provenance only; none of the adapters acquires remote documents.
    if not isinstance(data.get('url'), str) or not data['url'].startswith('https://') or len(data['url']) > 2048:
        raise ValueError('invalid_engine_url')
    command = ['node', str(ROOT / 'node-engine.mjs')] if engine in ('cheerio', 'crawlee') else [sys.executable, str(ROOT / 'engine.py')]
    started = time.monotonic()
    child = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, start_new_session=True, cwd=ROOT)
    try:
        output, _ = child.communicate(json.dumps(data).encode(), timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(child.pid, signal.SIGKILL)
        child.communicate()
        raise ValueError('engine_timeout')
    if child.returncode or len(output) > 2_000_000:
        raise ValueError('engine_execution_failed')
    parsed = json.loads(output)
    if not isinstance(parsed.get('html'), str) or len(parsed['html'].encode()) > 1_500_000:
        raise ValueError('engine_output_invalid')
    return {'ok': True, 'engine': engine, 'html': parsed['html'],
            'duration_ms': round((time.monotonic() - started) * 1000)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log supplied HTML or authentication headers.

    def reply(self, code, body):
        output = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(output)))
        self.end_headers()
        self.wfile.write(output)

    def do_POST(self):
        secret = Path(os.environ.get('ENGINE_TOKEN_FILE', '/run/secrets/runtime_token')).read_text().strip()
        if len(secret) < 32 or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + secret):
            return self.reply(401, {'ok': False, 'code': 'unauthorized'})
        if self.path == '/health':
            return self.reply(200, {'ok': True, 'versions': versions(), 'network': 'disabled', 'protocol': 1})
        if self.path != '/execute':
            return self.reply(404, {'ok': False, 'code': 'not_found'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= MAX_BYTES:
                return self.reply(413, {'ok': False, 'code': 'document_too_large'})
            self.connection.settimeout(10)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('invalid_engine_document')
            if not LOCK.acquire(blocking=False):
                return self.reply(429, {'ok': False, 'code': 'engine_busy'})
            try:
                return self.reply(200, execute(data))
            finally:
                LOCK.release()
        except (ValueError, KeyError, TypeError) as error:
            code = str(error) if str(error) in {'engine_timeout', 'invalid_engine_timeout', 'invalid_engine_url', 'invalid_engine_document'} else 'engine_execution_failed'
            return self.reply(503 if code.startswith('engine_') else 400, {'ok': False, 'code': code})


class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


if __name__ == '__main__':
    path = Path(os.environ.get('ENGINE_SOCKET', '/run/waouh-engines/runner.sock'))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    server = Server(str(path), Handler)
    path.chmod(0o666)
    server.serve_forever()
