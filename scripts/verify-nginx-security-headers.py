#!/usr/bin/env python3
"""Exercise real Nginx responses from the Dockerfile configuration."""
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]

def run(*args):
    return subprocess.check_output(args, text=True).strip()

def main():
    source = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    configs = re.findall(r"COPY <<EOF (/etc/nginx/[^\n]+)\n(.*?)\nEOF", source, re.S)
    assert len(configs) == 3, "Expected main, virtual host and security configuration"
    image = "waouh-nginx-header-contract"
    container = None
    with tempfile.TemporaryDirectory(prefix="waouh-nginx-") as directory:
        work = pathlib.Path(directory)
        for target, content in configs:
            relative = pathlib.PurePosixPath(target).relative_to("/etc/nginx")
            local = work / relative
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_text(content.replace("\\$", "$"), encoding="utf-8")
        (work / "Dockerfile").write_text(
            "FROM nginx:alpine\n"
            "COPY nginx.conf /etc/nginx/nginx.conf\n"
            "COPY conf.d/default.conf /etc/nginx/conf.d/default.conf\n"
            "COPY security-headers.conf /etc/nginx/security-headers.conf\n"
            "RUN mkdir -p /usr/share/nginx/html/fa /usr/share/nginx/html/apresbacia /usr/share/nginx/html/assets && "
            "printf '<!doctype html><title>QA</title>' > /usr/share/nginx/html/index.html && "
            "cp /usr/share/nginx/html/index.html /usr/share/nginx/html/fa/index.html && "
            "cp /usr/share/nginx/html/index.html /usr/share/nginx/html/apresbacia/index.html && "
            "printf 'console.log(1)' > /usr/share/nginx/html/fa/app.js && "
            "printf 'console.log(1)' > /usr/share/nginx/html/assets/test.js && "
            "printf 'console.log(1)' > /usr/share/nginx/html/sw.js && "
            "printf '{}' > /usr/share/nginx/html/waouh-release.json && nginx -t\n",
            encoding="utf-8",
        )
        subprocess.run(["docker", "build", "-t", image, str(work)], check=True)
        try:
            container = run("docker", "run", "-d", "--rm", "-p", "127.0.0.1::80", image)
            info = json.loads(run("docker", "inspect", container))[0]
            port = info["NetworkSettings"]["Ports"]["80/tcp"][0]["HostPort"]
            origin = "http://127.0.0.1:" + port
            for attempt in range(30):
                try:
                    urllib.request.urlopen(origin, timeout=2).close()
                    break
                except (OSError, urllib.error.URLError):
                    time.sleep(0.2)
            paths = ["/", "/app/chat", "/app/profile", "/index.html",
                     "/waouh-release.json", "/fa", "/fa/app.js", "/apresbacia",
                     "/assets/test.js", "/sw.js", "/missing.js"]
            for path in paths:
                try:
                    response = urllib.request.urlopen(origin + path, timeout=5)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    headers = response.headers
                    for name in ["Strict-Transport-Security", "X-Content-Type-Options",
                                 "Content-Security-Policy", "Permissions-Policy", "X-Frame-Options"]:
                        assert headers.get(name), (path, name, dict(headers))
                    assert headers["X-Content-Type-Options"] == "nosniff", path
                    assert "geolocation=(self)" in headers["Permissions-Policy"], path
                    if path in ["/", "/app/chat", "/app/profile", "/index.html", "/sw.js"]:
                        assert "no-cache" in ", ".join(headers.get_all("Cache-Control", [])), path
                    if path == "/assets/test.js":
                        assert "immutable" in ", ".join(headers.get_all("Cache-Control", [])), path
                    print(json.dumps({"path": path, "status": response.status, "security_headers": True}))
        finally:
            if container:
                subprocess.run(["docker", "rm", "-f", container], check=False)

if __name__ == "__main__":
    main()
