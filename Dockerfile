# Utilisation d'une image Node.js pour le build
FROM node:20-alpine AS build

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund || (echo "⚠️ npm ci failed (lockfile drift) — falling back to npm install" && npm install --legacy-peer-deps --no-audit --no-fund)

# Copie du code source
COPY . .

# Build de l'application en mode production
RUN npm run build

# Utilisation d'une image Nginx pour servir l'application
FROM nginx:alpine

# Suppression de la configuration par défaut
RUN rm /etc/nginx/conf.d/default.conf
RUN rm /etc/nginx/nginx.conf

# Configuration Nginx principale optimisée
COPY <<EOF /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 8192;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    server_tokens off;

    # Logs format
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance et capacité de connexions
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 10000;
    reset_timedout_connection on;
    types_hash_max_size 4096;
    client_max_body_size 16M;

    open_file_cache max=10000 inactive=60s;
    open_file_cache_valid 120s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
EOF

# Configuration du serveur optimisée pour React SPA
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost bot.bj www.bot.bj;
    root /usr/share/nginx/html;
    index index.html;

    # En-têtes de sécurité
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://unpkg.com https://cdn.jsdelivr.net https://*.elevenlabs.io https://cdn.gpteng.co https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-src https://*.elevenlabs.io; worker-src 'self' blob:; media-src 'self' data: blob:;" always;

    # URL publique canonique AprèsBac IA
    location = /apresbacia/ {
        return 308 https://bot.bj/apresbacia;
    }

    location = /apresbacia/index.html {
        return 308 https://bot.bj/apresbacia;
    }

    location = /apresbacia {
        if (\$args != "") {
            return 308 https://bot.bj/apresbacia;
        }
        try_files /apresbacia/index.html =404;
        expires -1;
    }

    # URL publique canonique FA IA V5.2
    location = /fa/ {
        return 308 https://bot.bj/fa;
    }

    location = /fa/index.html {
        return 308 https://bot.bj/fa;
    }

    location = /fa {
        if (\$args != "") {
            return 308 https://bot.bj/fa;
        }
        try_files /fa/index.html =404;
        expires -1;
    }

    # Gestion optimale pour SPA (Single Page Application)
    location / {
        try_files \$uri \$uri/ @fallback;

        # Headers anti-cache pour l'HTML
        location ~* \.html\$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate" always;
            add_header Pragma "no-cache" always;
            add_header Expires "0" always;
            expires -1;
        }
    }

    # Fallback pour le routing React
    location @fallback {
        rewrite ^.*\$ /index.html last;
    }

    # Cache optimisé pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|otf|webp|avif)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        add_header Access-Control-Allow-Origin "*" always;

        # Gestion des erreurs pour les assets manquants
        try_files \$uri =404;
    }

    # Cache spécifique pour les fichiers Vite
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        try_files \$uri =404;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        try_files \$uri =404;
    }

    # Route API (si nécessaire pour le futur)
    location /api/ {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Gestion des erreurs personnalisées
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;

    # Logs détaillés pour le debugging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Optimisations de performance
    location ~* \.(js|css)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }
}
EOF

# Copie des fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Vérification que les modules publics existent et permissions
RUN ls -la /usr/share/nginx/html/ && \
    test -f /usr/share/nginx/html/index.html && \
    test -f /usr/share/nginx/html/apresbacia/index.html && \
    test -f /usr/share/nginx/html/fa/index.html && \
    test -f /usr/share/nginx/html/fa/app.js && \
    test -f /usr/share/nginx/html/fa/auth-bridge.js && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# Test de la configuration Nginx
RUN nginx -t

# Exposition du port
EXPOSE 80

# Script de démarrage avec vérifications
COPY <<EOF /docker-entrypoint.sh
#!/bin/sh
set -e

echo "🔍 Vérification des fichiers..."
ls -la /usr/share/nginx/html/
test -f /usr/share/nginx/html/apresbacia/index.html
test -f /usr/share/nginx/html/fa/index.html
test -f /usr/share/nginx/html/fa/app.js
echo "📄 Contenu de index.html:"
head -10 /usr/share/nginx/html/index.html

echo "🧪 Test de la configuration Nginx..."
nginx -t

echo "🚀 Démarrage de Nginx..."
exec nginx -g "daemon off;"
EOF

RUN chmod +x /docker-entrypoint.sh

# Démarrage avec script personnalisé
CMD ["/docker-entrypoint.sh"]
