# =========================================================
# BUILD STAGE
# =========================================================
FROM node:22-alpine AS build

WORKDIR /app

# Copie des dépendances
COPY package.json package-lock.json ./

# Installation propre des dépendances
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Copie du projet
COPY . .

# Build production
RUN npm run build

# Vérification du build
RUN ls -lah /app/dist && test -f /app/dist/index.html

# =========================================================
# NGINX STAGE
# =========================================================
FROM nginx:1.28-alpine

# Suppression des configs par défaut
RUN rm -f /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/nginx.conf

# =========================================================
# CONFIGURATION NGINX PRINCIPALE
# =========================================================
COPY <<EOF /etc/nginx/nginx.conf
user nginx;
worker_processes auto;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Optimisations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout 65;
    types_hash_max_size 4096;

    client_max_body_size 20M;

    # Compression gzip
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_proxied any;

    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
EOF

# =========================================================
# CONFIGURATION SERVEUR SPA VITE / REACT
# =========================================================
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost bot.bj www.bot.bj;

    root /usr/share/nginx/html;
    index index.html;

    # =====================================================
    # HEADERS SECURITE
    # =====================================================

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CSP simplifiée pour éviter les erreurs JS
    add_header Content-Security-Policy "
        default-src 'self' data: blob: https:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com data:;
        img-src 'self' data: blob: https:;
        connect-src 'self' https: ws: wss:;
    " always;

    # =====================================================
    # SPA ROUTING
    # =====================================================

    location / {
        try_files \$uri \$uri/ /index.html;

        add_header Cache-Control "no-cache";
    }

    # =====================================================
    # ASSETS VITE
    # =====================================================

    location /assets/ {
        expires 1y;
        access_log off;

        add_header Cache-Control "public, immutable";

        try_files \$uri =404;
    }

    # =====================================================
    # IMAGES / ICONS
    # =====================================================

    location ~* \.(png|jpg|jpeg|gif|svg|ico|webp|avif)$ {
        expires 30d;
        access_log off;

        add_header Cache-Control "public";

        try_files \$uri =404;
    }

    # =====================================================
    # FONTS
    # =====================================================

    location ~* \.(woff|woff2|ttf|eot|otf)$ {
        expires 30d;
        access_log off;

        add_header Cache-Control "public";

        try_files \$uri =404;
    }

    # =====================================================
    # JS / CSS
    # =====================================================

    location ~* \.(js|css)$ {
        expires 1y;
        access_log off;

        add_header Cache-Control "public, immutable";

        try_files \$uri =404;
    }

    # =====================================================
    # API
    # =====================================================

    location /api/ {

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if (\$request_method = OPTIONS) {
            return 204;
        }

        proxy_pass http://backend;
    }

    # =====================================================
    # LOGS
    # =====================================================

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
EOF

# =========================================================
# COPIE DU BUILD
# =========================================================
COPY --from=build /app/dist /usr/share/nginx/html

# =========================================================
# VERIFICATIONS
# =========================================================
RUN test -f /usr/share/nginx/html/index.html

RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# Test configuration nginx
RUN nginx -t

# =========================================================
# SCRIPT DE DEMARRAGE
# =========================================================
COPY <<EOF /docker-entrypoint.sh
#!/bin/sh
set -e

echo "========================================="
echo "📦 Vérification du contenu déployé"
echo "========================================="

ls -lah /usr/share/nginx/html

echo ""
echo "========================================="
echo "📄 Vérification index.html"
echo "========================================="

test -f /usr/share/nginx/html/index.html

echo ""
echo "========================================="
echo "🧪 Test configuration Nginx"
echo "========================================="

nginx -t

echo ""
echo "========================================="
echo "🚀 Démarrage Nginx"
echo "========================================="

exec nginx -g "daemon off;"
EOF

RUN chmod +x /docker-entrypoint.sh

# =========================================================
# PORT
# =========================================================
EXPOSE 80

# =========================================================
# START
# =========================================================
CMD ["/docker-entrypoint.sh"]