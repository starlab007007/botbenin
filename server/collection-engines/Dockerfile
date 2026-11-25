FROM node:22-bookworm-slim AS node
FROM python:3.12-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers PYTHONUNBUFFERED=1 \
    CRAWL4AI_DB_PATH=/tmp/crawl4ai HF_HUB_OFFLINE=1 LITELLM_LOG=ERROR
COPY requirements.txt package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends chromium && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir -r requirements.txt && \
    python -c "from playwright.sync_api import sync_playwright; from pathlib import Path; p=Path(sync_playwright().start().chromium.executable_path); p.parent.mkdir(parents=True,exist_ok=True); p.symlink_to('/usr/bin/chromium')" && \
    npm ci --ignore-scripts --no-audit --no-fund && \
    groupadd -g 10001 engines && useradd -u 10001 -g engines -m engines && \
    mkdir -p /run/waouh-engines && chmod 777 /run/waouh-engines
COPY engine.py node-engine.mjs server.py test_runtime.py ./
USER engines
CMD ["python","server.py"]
