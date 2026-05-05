# 🔧 Corrección de Problemas CORS - SENNOVA

## Resumen de Cambios Realizados

### 1. Frontend - API_URL ahora usa variable de entorno
**Archivo**: `frontend/src/api/config.js`
- Cambiado de hardcoded `'http://localhost:8000'` a `import.meta.env.VITE_API_URL || 'http://localhost:8000'`

### 2. Nginx - Configurado Proxy al Backend
**Archivo**: `frontend/nginx.conf`
- Agregado bloque `location /api/` que hace proxy a `http://backend:8000/`
- Esto permite que el frontend use rutas relativas `/api` en lugar de URLs completas
- **Elimina CORS** porque frontend y backend comparten el mismo origen

### 3. Docker Compose - Valores por defecto actualizados
**Archivo**: `docker-compose.yml`
- `VITE_API_URL` ahora tiene valor por defecto `/api` (ruta relativa)
- Agregado `depends_on` para asegurar orden de inicio

### 4. Coolify Config - Actualizado para proxy interno
**Archivo**: `coolify.json`
- Actualizado build args para incluir `VITE_API_URL`
- Actualizadas descripciones de variables de entorno

---

## 🚀 Pasos para Deploy en Coolify

### Paso 1: Actualizar Variables de Entorno en Coolify

Ve a tu recurso en Coolify → **Environment Variables** y configura:

| Variable | Valor Recomendado | Descripción |
|----------|-------------------|-------------|
| `VITE_API_URL` | `/api` | Usa proxy interno de nginx (recomendado) |
| `ALLOWED_ORIGINS` | `https://sennova.enlinea.sbs` | Solo el dominio del frontend |
| `JWT_SECRET` | *(ya configurado)* | Mínimo 32 caracteres |
| `DATABASE_URL` | *(ya configurado)* | URL de PostgreSQL |

**⚠️ Nota importante**: Ya no necesitas `http://localhost:8000` en `ALLOWED_ORIGINS` porque el proxy nginx maneja la comunicación internamente.

### Paso 2: Reconstruir y Redeployar

1. En Coolify, ve a tu proyecto
2. Haz clic en **"Redeploy"** o **"Restart"**
3. Esto reconstruirá el frontend con la nueva configuración

### Paso 3: Verificar Conectividad

Una vez desplegado, verifica en la consola del navegador:

1. Abre `https://sennova.enlinea.sbs`
2. Abre DevTools (F12) → Network tab
3. Intenta iniciar sesión
4. Deberías ver peticiones a `https://sennova.enlinea.sbs/api/...` (200 OK)
5. **No deberías ver** peticiones a `localhost:8000`

---

## 🔍 Diagnóstico Rápido

Si aún tienes problemas después del redeploy:

### Verificar que VITE_API_URL se inyectó correctamente:
```javascript
// En la consola del navegador en la página de SENNOVA:
console.log('API URL:', import.meta.env?.VITE_API_URL);
// Debería mostrar: "/api"
```

### Verificar que el proxy funciona:
```bash
# Desde tu máquina local (no desde el navegador):
curl https://sennova.enlinea.sbs/api/health
# Debería devolver: {"status":"healthy",...}
```

### Verificar logs del backend:
En Coolify → Logs del backend, busca:
- Errores de conexión a base de datos
- Mensajes de CORS (no deberían aparecer con el proxy)

---

## 🏗️ Arquitectura Resultante

```
Navegador del Cliente
    ↓ https://sennova.enlinea.sbs
    
Nginx (Frontend)
    ├── / → Sirve archivos estáticos de React
    └── /api/* → Proxy a Backend
                   ↓
              Backend FastAPI
                   ↓
              PostgreSQL
```

**Ventajas de esta arquitectura:**
1. ✅ No hay CORS - todo está en el mismo origen
2. ✅ Frontend usa rutas relativas - funciona en cualquier dominio
3. ✅ Backend solo necesita exponerse internamente
4. ✅ Más seguro - backend no es accesible directamente desde internet

---

## 🛠️ Alternativa: Sin Proxy (CORS Tradicional)

Si prefieres no usar el proxy (por ejemplo, si backend y frontend están en dominios completamente diferentes):

1. Cambia `VITE_API_URL` a la URL completa del backend, ej:
   ```
   VITE_API_URL=https://api-sennova.enlinea.sbs
   ```

2. Actualiza `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://sennova.enlinea.sbs
   ```

3. El backend FastAPI debe estar expuesto públicamente con su propio dominio

4. Asegúrate de que el backend tenga configurado CORS correctamente en `app/main.py`
