# Etapa 1: Construcción
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Argumentos de construcción para variables de entorno (Vite necesita VITE_ al inicio).
# Son las únicas dos que el código lee vía import.meta.env; quedan horneadas en el
# bundle, así que cambiarlas exige reconstruir la imagen del frontend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_CVLAC_BASE_URL=https://scienti.minciencias.gov.co
ENV VITE_CVLAC_BASE_URL=$VITE_CVLAC_BASE_URL

# Construir la aplicación
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:stable-alpine AS production-stage

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx si es necesario para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
