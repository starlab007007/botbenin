#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import shutil
import threading
import time
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HOST = "0.0.0.0"
PORT = int(os.getenv("PRIVATAI_DOWNLOAD_PORT", "8080"))
REFRESH_SECONDS = max(300, int(os.getenv("PRIVATAI_REFRESH_SECONDS", "3600")))
CACHE_DIR = Path(os.getenv("PRIVATAI_DOWNLOAD_CACHE", "/cache"))
APP_JS = Path(os.getenv("PRIVATAI_DOWNLOAD_APP_JS", "/app/privatai_download_app.js"))
RELEASE_BASE = "https://github.com/starlab007007/botbenin/releases/download/privatia-latest"

FILES = {
    "PrivatAI-Windows-x64-Setup.exe": "application/octet-stream",
    "PrivatAI-Windows-x64.msi": "application/octet-stream",
    "PrivatAI-Mac-Intel.dmg": "application/octet-stream",
}

CACHE_DIR.mkdir(parents=True, exist_ok=True)
_refresh_lock = threading.Lock()


def _remote_url(name: str) -> str:
    return f"{RELEASE_BASE}/{name}"


def refresh_file(name: str, force: bool = True) -> bool:
    if name not in FILES:
        return False

    destination = CACHE_DIR / name
    if destination.exists() and destination.stat().st_size > 1024 and not force:
        return True

    with _refresh_lock:
        if destination.exists() and destination.stat().st_size > 1024 and not force:
            return True

        temp = CACHE_DIR / f".{name}.part-{os.getpid()}-{threading.get_ident()}"
        request = urllib.request.Request(
            _remote_url(name),
            headers={
                "User-Agent": "PrivatAI-bot.bj-download-cache/1.0",
                "Accept": "application/octet-stream,*/*;q=0.8",
            },
            method="GET",
        )

        try:
            print(f"[privatai-download] Synchronisation {name}…", flush=True)
            with urllib.request.urlopen(request, timeout=180) as response, temp.open("wb") as output:
                shutil.copyfileobj(response, output, length=1024 * 1024)

            size = temp.stat().st_size
            if size <= 1024:
                raise RuntimeError(f"fichier trop petit ({size} octets)")

            os.replace(temp, destination)
            print(f"[privatai-download] {name} prêt ({size} octets)", flush=True)
            return True
        except Exception as exc:
            try:
                temp.unlink(missing_ok=True)
            except Exception:
                pass
            if destination.exists() and destination.stat().st_size > 1024:
                print(
                    f"[privatai-download] Mise à jour impossible pour {name}; cache existant conservé: {exc}",
                    flush=True,
                )
                return True
            print(f"[privatai-download] ERREUR {name}: {exc}", flush=True)
            return False


def refresh_all() -> None:
    for name in FILES:
        refresh_file(name, force=True)


def refresh_loop() -> None:
    # Le serveur démarre immédiatement. La synchronisation se fait en arrière-plan
    # pour que /privatia/app.js reste disponible même pendant un gros téléchargement.
    while True:
        refresh_all()
        time.sleep(REFRESH_SECONDS)


def parse_range(value: str | None, size: int) -> tuple[int, int] | None:
    if not value:
        return None
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", value.strip())
    if not match:
        return None

    first, last = match.groups()
    try:
        if first == "":
            suffix = int(last)
            if suffix <= 0:
                return None
            start = max(0, size - suffix)
            end = size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
            if start >= size:
                return (-1, -1)
            end = min(end, size - 1)
            if end < start:
                return None
        return start, end
    except ValueError:
        return None


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "PrivatAIDownload/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[privatai-download] {self.client_address[0]} - {fmt % args}", flush=True)

    def _common_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")

    def _send_text(self, status: int, text: str) -> None:
        data = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self._common_headers()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _serve_app_js(self) -> None:
        if not APP_JS.exists():
            self._send_text(HTTPStatus.SERVICE_UNAVAILABLE, "PrivatAI download controller unavailable")
            return
        data = APP_JS.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/javascript; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self._common_headers()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _serve_download(self, name: str) -> None:
        if name not in FILES:
            self._send_text(HTTPStatus.NOT_FOUND, "Fichier inconnu")
            return

        path = CACHE_DIR / name
        if not path.exists() or path.stat().st_size <= 1024:
            if not refresh_file(name, force=False):
                self._send_text(HTTPStatus.SERVICE_UNAVAILABLE, "Installateur momentanément indisponible")
                return

        size = path.stat().st_size
        byte_range = parse_range(self.headers.get("Range"), size)
        if byte_range == (-1, -1):
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self._common_headers()
            self.end_headers()
            return

        if byte_range:
            start, end = byte_range
            length = end - start + 1
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            start, end = 0, size - 1
            length = size
            self.send_response(HTTPStatus.OK)

        self.send_header("Content-Type", FILES[name])
        self.send_header("Content-Disposition", f'attachment; filename="{name}"')
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "public, max-age=3600")
        self._common_headers()
        self.end_headers()

        if self.command == "HEAD":
            return

        try:
            with path.open("rb") as source:
                source.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = source.read(min(1024 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _dispatch(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/healthz":
            ready = all((CACHE_DIR / name).exists() for name in FILES)
            self._send_text(HTTPStatus.OK, "ok" if ready else "warming")
            return

        if path == "/privatia/app.js":
            self._serve_app_js()
            return

        prefix = "/privatia/downloads/"
        if path.startswith(prefix):
            name = path[len(prefix):]
            if "/" in name or "\\" in name or not name:
                self._send_text(HTTPStatus.NOT_FOUND, "Fichier inconnu")
                return
            self._serve_download(name)
            return

        self._send_text(HTTPStatus.NOT_FOUND, "Not found")

    def do_GET(self) -> None:
        self._dispatch()

    def do_HEAD(self) -> None:
        self._dispatch()


if __name__ == "__main__":
    print(f"[privatai-download] Serveur bot.bj sur {HOST}:{PORT}", flush=True)
    print(f"[privatai-download] Cache: {CACHE_DIR}", flush=True)
    threading.Thread(target=refresh_loop, name="privatai-refresh", daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
