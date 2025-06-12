
# Utilisation d'une image Node.js pour le build
FROM node:18-alpine as build

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --only=production

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# Utilisation d'une image Nginx pour servir l'application
FROM nginx:alpine

# Suppression de la configuration par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Configuration Nginx optimisée pour SPA React
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost bot.bj www.bot.bj;
    root /usr/share/nginx/html;
    index index.html;

    # Configuration pour SPA (Single Page Application)
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Headers pour éviter les problèmes de cache
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Cache optimisé pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }

    # Gestion des fichiers de build Vite
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gestion des erreurs
    error_page 404 /index.html;
    
    # Logs pour debugging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Copie des fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Permissions et exposition du port
RUN chmod -R 755 /usr/share/nginx/html
EXPOSE 80

# Démarrage de Nginx
CMD ["nginx", "-g", "daemon off;"]
