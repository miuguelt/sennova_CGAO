# 📋 BITÁCORA DE DESARROLLO - SENNOVA

Esta bitácora es la fuente de verdad (SSoT) para la IA y los desarrolladores sobre el estado técnico, configuración, y soluciones de problemas aplicadas a este proyecto.

---

## 🛠️ Ficha Técnica

- **Estatus:** Activo / Desarrollo
- **Tecnologías:** FastAPI (Python) + React + PostgreSQL (Docker, WSL) / SQLite fallback
- **Puertos de Red:** Frontend: `3006`, Backend: `8000`
- **Base de Datos:** PostgreSQL en host/WSL (Puerto 5434) / SQLite local fallback (`sennova.db`)
- **Entorno de Ejecución:** Nativo Windows (PowerShell) con base de datos en Docker

---

## 🎯 Directrices de Arquitectura y Estilo

1. **Separación de Responsabilidades:** Arquitectura limpia con lógica en `app/` dividida en controladores y utilidades de base de datos.
2. **Seguridad Obligatoria:** Uso estricto de `.env` para credenciales y JWT_SECRET. No exponer passwords en git.
3. **Optimización de Recursos:** Evitar correr múltiples contenedores frontend/backend. Correr nativo en Windows para ahorrar ~670MB de RAM.
4. **Diseño Visual:** Interfaz premium SENA, transiciones suaves y temas dinámicos.

---

## 🏥 Historial de Incidencias y Soluciones

### 📝 Incidencia - 2026-06-28 09:53:56
- **Problema Detectado:** ConnectionTimeout al conectar a PostgreSQL (`psycopg.errors.ConnectionTimeout`).
- **Causa Raíz:** El script global `DEVBRAIN_REPAIR.ps1` reiniciaba incondicionalmente el contenedor `postgres_prod_central_v18` para refrescar puertos, apagando la base de datos por ~30 segundos justo cuando el backend hacía peticiones.
- **Solución Aplicada:** Se modificó `DEVBRAIN_REPAIR.ps1` para verificar el estado de salud con `pg_isready` antes de reiniciar. Si responde, no se reinicia el contenedor, manteniendo la disponibilidad siempre activa.
- **Estado:** Solucionado 🟢
