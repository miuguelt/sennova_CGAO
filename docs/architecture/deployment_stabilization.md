# 🧠 Lecciones Aprendidas: Estabilización de Despliegue en Coolify

Este documento resume los patrones de diseño y correcciones críticas implementadas para asegurar despliegues exitosos y resilientes en entornos Docker/Coolify.

## 1. 🌐 Networking y Resolución DNS
*   **Resolver Dinámico**: En Docker, si un contenedor (Nginx) intenta conectar a otro (Backend) antes de que el Backend esté listo, Nginx fallará al arrancar.
    *   **Solución**: Usar `resolver 127.0.0.11` y variables en `proxy_pass`.
*   **Sensibilidad de Barras (Trailing Slashes)**: Las rutas de Nginx son sensibles a la barra final.
    *   **Solución**: Usar `location /api` (sin barra) para capturar tanto `/api` como `/api/` y redirigir correctamente al backend.

## 2. 🛡️ Regla Anti-Hardcoding (Frontend)
*   **Fallback de API**: Nunca usar `localhost:8000` como fallback en el código de producción.
    *   **Solución**: Usar `/api` como valor por defecto (`import.meta.env.VITE_API_URL || '/api'`). Esto permite que el navegador use el mismo dominio que el frontend y aproveche el proxy de Nginx.
*   **Build-time Variables**: Recordar que Vite inyecta las variables en el momento del `build`. Si se cambia la URL en Coolify, se debe reconstruir la imagen.

## 3. 🏗️ Orquestación Docker Compose
*   **Healthchecks Consistentes**: Asegurar que el healthcheck del backend use la variable `${PORT}` para evitar falsos negativos si se cambia el puerto.
*   **Dependencia con Condición**: Usar `depends_on: { postgres: { condition: service_healthy } }` para asegurar que el backend no intente conectar hasta que la DB esté lista.

## 4. 📝 TypeScript y Configuración
*   **Composite Mode**: Si se usa `composite: true` en `tsconfig.node.json`, NO se debe desactivar `noEmit`. TypeScript necesita emitir metadatos de compilación incluso si un bundler (Vite) hace la transpilación final.

## 5. 🔗 Integraciones Externas (CVLAC)
*   **URL Oficial**: La dirección `colciencias.gov.co:8084` es legacy. La URL oficial y estable es `https://scienti.minciencias.gov.co`.

---
*Documento generado por Antigravity tras la sesión de estabilización SENNOVA.*
