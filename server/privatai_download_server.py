#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HOST = "0.0.0.0"
PORT = int(os.getenv("PRIVATAI_DOWNLOAD_PORT", "8080"))
REFRESH_SECONDS = max(300, int(os.getenv("PRIVATAI_REFRESH_SECONDS", "3600")))
CACHE_DIR = Path(os.getenv("PRIVATAI_DOWNLOAD_CACHE", "/cache"))
APP_JS = Path(os.getenv("PRIVATAI_DOWNLOAD_APP_JS", "/app/privatai_download_app.js"))
SUPABASE_URL = os.getenv("PRIVATAI_SUPABASE_URL", "https://mvynepqulhflxtyymtzs.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("PRIVATAI_SUPABASE_ANON_KEY", "")
RELEASE_BASE = "https://github.com/starlab007007/botbenin/releases/download/privatia-latest"
MANIFEST_FILE = CACHE_DIR / "privatai-download-manifest.json"
HISTORY_DIR = CACHE_DIR / "history"
MAX_UPLOAD_BYTES = int(os.getenv("PRIVATAI_MAX_UPLOAD_BYTES", str(2 * 1024 * 1024 * 1024)))
MIN_UPLOAD_BYTES = 1024 * 1024

FILES = {
    "PrivatAI-Windows-x64-Setup.exe": {
        "content_type": "application/vnd.microsoft.portable-executable",
        "platform": "Windows x64",
        "kind": "exe",
    },
    "PrivatAI-Windows-x64.msi": {
        "content_type": "application/x-msi",
        "platform": "Windows x64",
        "kind": "msi",
    },
    "PrivatAI-Mac-Intel.dmg": {
        "content_type": "application/x-apple-diskimage",
        "platform": "macOS Intel",
        "kind": "dmg",
    },
}

CACHE_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_DIR.mkdir(parents=True, exist_ok=True)
_refresh_lock = threading.Lock()
_manifest_lock = threading.Lock()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def safe_header(value: str | None, max_len: int = 400) -> str:
    value = (value or "").replace("\r", " ").replace("\n", " ").strip()
    return value[:max_len]


def load_manifest() -> dict:
    with _manifest_lock:
        if not MANIFEST_FILE.exists():
            return {"schema": 2, "updated_at": None, "artifacts": {}, "history": []}
        try:
            data = json.loads(MANIFEST_FILE.read_text("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("manifest invalide")
            data.setdefault("schema", 2)
            data.setdefault("updated_at", None)
            data.setdefault("artifacts", {})
            data.setdefault("history", [])
            return data
        except Exception as exc:
            print(f"[privatai-download] Manifest illisible, reconstruction: {exc}", flush=True)
            return {"schema": 2, "updated_at": None, "artifacts": {}, "history": []}


def save_manifest(data: dict) -> None:
    with _manifest_lock:
        temp = MANIFEST_FILE.with_suffix(".json.tmp")
        data["schema"] = 2
        data["updated_at"] = utc_now()
        temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
        os.replace(temp, MANIFEST_FILE)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while True:
            chunk = source.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def metadata_for(name: str, source: str = "cache") -> dict | None:
    path = CACHE_DIR / name
    if name not in FILES or not path.exists() or path.stat().st_size <= 1024:
        return None
    stat = path.stat()
    manifest = load_manifest()
    existing = dict(manifest.get("artifacts", {}).get(name, {}))
    existing.update({
        "filename": name,
        "platform": FILES[name]["platform"],
        "kind": FILES[name]["kind"],
        "size": stat.st_size,
        "download_url": f"/privatia/downloads/{name}",
        "available": True,
    })
    existing.setdefault("source", source)
    existing.setdefault("version", "non renseignée")
    existing.setdefault("notes", "")
    existing.setdefault("uploaded_at", datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat().replace("+00:00", "Z"))
    existing.setdefault("uploaded_by", None)
    existing.setdefault("sha256", None)
    return existing


def public_manifest() -> dict:
    manifest = load_manifest()
    artifacts = []
    for name in FILES:
        meta = metadata_for(name)
        if meta:
            artifacts.append({
                "filename": meta["filename"],
                "platform": meta["platform"],
                "kind": meta["kind"],
                "version": meta.get("version"),
                "size": meta.get("size"),
                "sha256": meta.get("sha256"),
                "uploaded_at": meta.get("uploaded_at"),
                "download_url": meta["download_url"],
                "available": True,
            })
        else:
            artifacts.append({
                "filename": name,
                "platform": FILES[name]["platform"],
                "kind": FILES[name]["kind"],
                "download_url": f"/privatia/downloads/{name}",
                "available": False,
            })
    return {"updated_at": manifest.get("updated_at"), "artifacts": artifacts}


def _remote_url(name: str) -> str:
    return f"{RELEASE_BASE}/{name}"


def refresh_file(name: str, force: bool = False) -> bool:
    """Fallback historique GitHub uniquement si aucun fichier administrateur n'est publié."""
    if name not in FILES:
        return False
    destination = CACHE_DIR / name
    manifest = load_manifest()
    current = manifest.get("artifacts", {}).get(name, {})
    if destination.exists() and destination.stat().st_size > 1024:
        if current.get("source") == "admin":
            return True
        if not force:
            return True
    with _refresh_lock:
        if destination.exists() and destination.stat().st_size > 1024 and not force:
            return True
        temp = CACHE_DIR / f".{name}.part-{os.getpid()}-{threading.get_ident()}"
        request = urllib.request.Request(
            _remote_url(name),
            headers={"User-Agent": "PrivatAI-bot.bj-download-cache/2.0", "Accept": "application/octet-stream,*/*;q=0.8"},
            method="GET",
        )
        try:
            print(f"[privatai-download] Fallback release -> {name}…", flush=True)
            with urllib.request.urlopen(request, timeout=180) as response, temp.open("wb") as output:
                shutil.copyfileobj(response, output, length=1024 * 1024)
            size = temp.stat().st_size
            if size <= 1024:
                raise RuntimeError(f"fichier trop petit ({size} octets)")
            os.replace(temp, destination)
            manifest = load_manifest()
            manifest.setdefault("artifacts", {})[name] = {
                "filename": name,
                "platform": FILES[name]["platform"],
                "kind": FILES[name]["kind"],
                "version": "release historique",
                "notes": "Synchronisé automatiquement depuis la release publique historique.",
                "source": "release_fallback",
                "size": size,
                "sha256": sha256_file(destination),
                "uploaded_at": utc_now(),
                "uploaded_by": None,
                "download_url": f"/privatia/downloads/{name}",
                "available": True,
            }
            save_manifest(manifest)
            print(f"[privatai-download] {name} prêt ({size} octets)", flush=True)
            return True
        except Exception as exc:
            try:
                temp.unlink(missing_ok=True)
            except Exception:
                pass
            if destination.exists() and destination.stat().st_size > 1024:
                print(f"[privatai-download] Fallback impossible; cache conservé: {exc}", flush=True)
                return True
            print(f"[privatai-download] ERREUR {name}: {exc}", flush=True)
            return False


def refresh_missing() -> None:
    for name in FILES:
        refresh_file(name, force=False)


def refresh_loop() -> None:
    while True:
        refresh_missing()
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


def request_json(url: str, method: str, headers: dict[str, str], payload: dict | None = None) -> tuple[int, dict]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8", "replace")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"error": raw}
        return exc.code, parsed


def verify_admin(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise PermissionError("AUTH_REQUIRED")
    if not SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_ANON_KEY_MISSING")
    headers = {"Authorization": authorization, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    status, user_data = request_json(f"{SUPABASE_URL}/auth/v1/user", "GET", headers)
    user = user_data if isinstance(user_data, dict) else {}
    user_id = user.get("id")
    if status != 200 or not user_id:
        raise PermissionError("AUTH_INVALID")
    status, allowed = request_json(
        f"{SUPABASE_URL}/rest/v1/rpc/has_role",
        "POST",
        headers,
        {"_user_id": user_id, "_role_name": "admin"},
    )
    if status != 200 or allowed is not True:
        raise PermissionError("ADMIN_REQUIRED")
    return {"id": user_id, "email": user.get("email")}


def validate_uploaded_file(name: str, path: Path) -> None:
    if path.stat().st_size < MIN_UPLOAD_BYTES:
        raise ValueError("Fichier trop petit pour être un installateur PrivatAI valide")
    with path.open("rb") as source:
        head = source.read(16)
        if FILES[name]["kind"] == "dmg":
            source.seek(max(0, path.stat().st_size - 512))
            tail = source.read(512)
            if len(tail) < 4 or tail[:4] != b"koly":
                raise ValueError("DMG invalide: signature UDIF 'koly' absente")
        elif FILES[name]["kind"] == "exe" and not head.startswith(b"MZ"):
            raise ValueError("EXE invalide: signature MZ absente")
        elif FILES[name]["kind"] == "msi" and head[:8] != bytes.fromhex("D0CF11E0A1B11AE1"):
            raise ValueError("MSI invalide: signature OLE absente")


def archive_previous(name: str) -> None:
    current = CACHE_DIR / name
    if not current.exists() or current.stat().st_size <= 1024:
        return
    target_dir = HISTORY_DIR / name
    target_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = target_dir / f"{stamp}-{name}"
    shutil.copy2(current, backup)
    backups = sorted(target_dir.glob(f"*-{name}"), key=lambda p: p.stat().st_mtime, reverse=True)
    for stale in backups[2:]:
        stale.unlink(missing_ok=True)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "PrivatAIDownload/2.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[privatai-download] {self.client_address[0]} - {fmt % args}", flush=True)

    def _common_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")

    def _send_bytes(self, status: int, data: bytes, content_type: str, cache_control: str = "no-store") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache_control)
        self._common_headers()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _send_text(self, status: int, text: str) -> None:
        self._send_bytes(status, text.encode("utf-8"), "text/plain; charset=utf-8")

    def _send_json(self, status: int, body: dict) -> None:
        self._send_bytes(status, json.dumps(body, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

    def _serve_app_js(self) -> None:
        if not APP_JS.exists():
            self._send_text(HTTPStatus.SERVICE_UNAVAILABLE, "PrivatAI download controller unavailable")
            return
        self._send_bytes(HTTPStatus.OK, APP_JS.read_bytes(), "application/javascript; charset=utf-8")

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
        self.send_header("Content-Type", FILES[name]["content_type"])
        self.send_header("Content-Disposition", f'attachment; filename="{name}"')
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "public, max-age=300")
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

    def _admin_user(self) -> dict | None:
        try:
            return verify_admin(self.headers.get("Authorization"))
        except PermissionError as exc:
            code = str(exc)
            self._send_json(HTTPStatus.UNAUTHORIZED if code != "ADMIN_REQUIRED" else HTTPStatus.FORBIDDEN, {"error": code})
        except Exception as exc:
            self._send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "ADMIN_AUTH_UNAVAILABLE", "detail": str(exc)})
        return None

    def _admin_overview(self) -> None:
        user = self._admin_user()
        if not user:
            return
        manifest = load_manifest()
        artifacts = []
        for name in FILES:
            meta = metadata_for(name)
            if meta:
                artifacts.append(meta)
            else:
                artifacts.append({"filename": name, "platform": FILES[name]["platform"], "kind": FILES[name]["kind"], "available": False, "download_url": f"/privatia/downloads/{name}"})
        self._send_json(HTTPStatus.OK, {"artifacts": artifacts, "history": manifest.get("history", [])[:50], "updated_at": manifest.get("updated_at"), "admin": {"id": user.get("id"), "email": user.get("email")}})

    def _admin_upload(self, name: str) -> None:
        if name not in FILES:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "UNKNOWN_ARTIFACT"})
            return
        user = self._admin_user()
        if not user:
            return
        length_raw = self.headers.get("Content-Length")
        transfer_encoding = (self.headers.get("Transfer-Encoding") or "").lower()
        try:
            declared_length = int(length_raw) if length_raw else None
        except ValueError:
            declared_length = None
        if declared_length is not None and declared_length > MAX_UPLOAD_BYTES:
            self._send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "FILE_TOO_LARGE", "max_bytes": MAX_UPLOAD_BYTES})
            return
        if declared_length is None and "chunked" not in transfer_encoding:
            self._send_json(HTTPStatus.LENGTH_REQUIRED, {"error": "CONTENT_LENGTH_REQUIRED"})
            return
        version = safe_header(self.headers.get("X-PrivatAI-Version"), 64) or "non renseignée"
        notes = safe_header(self.headers.get("X-PrivatAI-Notes"), 400)
        temp = CACHE_DIR / f".{name}.upload-{os.getpid()}-{threading.get_ident()}"
        digest = hashlib.sha256()
        received = 0

        def write_chunk(output, chunk: bytes) -> None:
            nonlocal received
            received += len(chunk)
            if received > MAX_UPLOAD_BYTES:
                raise OverflowError("FILE_TOO_LARGE")
            output.write(chunk)
            digest.update(chunk)

        try:
            with temp.open("wb") as output:
                if declared_length is not None:
                    remaining = declared_length
                    while remaining > 0:
                        chunk = self.rfile.read(min(1024 * 1024, remaining))
                        if not chunk:
                            raise ConnectionError("Upload interrompu avant la fin du fichier")
                        write_chunk(output, chunk)
                        remaining -= len(chunk)
                else:
                    while True:
                        size_line = self.rfile.readline(128).strip().split(b";", 1)[0]
                        if not size_line:
                            raise ConnectionError("Flux chunked invalide")
                        chunk_size = int(size_line, 16)
                        if chunk_size == 0:
                            while True:
                                trailer = self.rfile.readline(8192)
                                if trailer in (b"\r\n", b"\n", b""):
                                    break
                            break
                        chunk = self.rfile.read(chunk_size)
                        if len(chunk) != chunk_size:
                            raise ConnectionError("Chunk incomplet")
                        write_chunk(output, chunk)
                        if self.rfile.read(2) != b"\r\n":
                            raise ConnectionError("Terminaison chunk invalide")
            if received < MIN_UPLOAD_BYTES:
                raise ValueError("Fichier trop petit pour être un installateur PrivatAI valide")
            validate_uploaded_file(name, temp)
            archive_previous(name)
            destination = CACHE_DIR / name
            os.replace(temp, destination)
            now = utc_now()
            entry = {
                "filename": name,
                "platform": FILES[name]["platform"],
                "kind": FILES[name]["kind"],
                "version": version,
                "notes": notes,
                "source": "admin",
                "size": received,
                "sha256": digest.hexdigest(),
                "uploaded_at": now,
                "uploaded_by": user.get("email") or user.get("id"),
                "download_url": f"/privatia/downloads/{name}",
                "available": True,
            }
            manifest = load_manifest()
            manifest.setdefault("artifacts", {})[name] = entry
            history = manifest.setdefault("history", [])
            history.insert(0, {"action": "published", "filename": name, "version": version, "size": received, "sha256": digest.hexdigest(), "at": now, "by": user.get("email") or user.get("id"), "notes": notes})
            del history[100:]
            save_manifest(manifest)
            self._send_json(HTTPStatus.OK, {"ok": True, "artifact": entry})
        except OverflowError:
            temp.unlink(missing_ok=True)
            self._send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "FILE_TOO_LARGE", "max_bytes": MAX_UPLOAD_BYTES})
        except ValueError as exc:
            temp.unlink(missing_ok=True)
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "INVALID_INSTALLER", "detail": str(exc)})
        except Exception as exc:
            temp.unlink(missing_ok=True)
            print(f"[privatai-download] upload error {name}: {exc}", flush=True)
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "UPLOAD_FAILED", "detail": str(exc)})

    def _dispatch_read(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/healthz":
            ready = all((CACHE_DIR / name).exists() for name in FILES)
            self._send_text(HTTPStatus.OK, "ok" if ready else "warming")
            return
        if path == "/privatia/app.js":
            self._serve_app_js()
            return
        if path == "/privatia/downloads/manifest.json":
            self._send_json(HTTPStatus.OK, public_manifest())
            return
        if path == "/privatia/admin/downloads":
            self._admin_overview()
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
        self._dispatch_read()

    def do_HEAD(self) -> None:
        self._dispatch_read()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        prefix = "/privatia/admin/downloads/"
        if not path.startswith(prefix):
            self._send_text(HTTPStatus.NOT_FOUND, "Not found")
            return
        name = path[len(prefix):]
        if "/" in name or "\\" in name or not name:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "UNKNOWN_ARTIFACT"})
            return
        self._admin_upload(name)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, HEAD, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-PrivatAI-Version, X-PrivatAI-Notes")
        self.send_header("Content-Length", "0")
        self._common_headers()
        self.end_headers()


if __name__ == "__main__":
    print(f"[privatai-download] Serveur bot.bj sur {HOST}:{PORT}", flush=True)
    print(f"[privatai-download] Cache persistant: {CACHE_DIR}", flush=True)
    print("[privatai-download] Mode: publication administrateur prioritaire; release GitHub = fallback initial uniquement", flush=True)
    threading.Thread(target=refresh_loop, name="privatai-refresh", daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
