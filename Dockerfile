# =========================================================
# BUILD STAGE
# =========================================================
FROM node:22-alpine AS build

WORKDIR /app

# Copie des dépendances
COPY package.json package-lock.json ./

# Installation
RUN npm ci --legacy-peer-deps --no-audit --no-fund || \
    (echo "⚠️ npm ci failed — fallback npm install" && \
    npm install --legacy-peer-deps --no-audit --no-fund)

# Copie du projet
COPY . .

# Build production
RUN npm run build

# =========================================================
# NGINX STAGE
# =========================================================
FROM nginx:alpine

# Nettoyage config par défaut
RUN rm -f /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/nginx.conf

# Copie des fichiers nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copie du build React/Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Permissions
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# Vérification build
RUN test -f /usr/share/nginx/html/index.html

# Vérification nginx
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]