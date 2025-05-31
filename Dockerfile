

# Utilisation d'une image Node.js pour le build
FROM node:18 as build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install  --legacy-peer-deps
COPY . .
RUN npm run build

# Utilisation d'une image Nginx pour servir l'application
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
