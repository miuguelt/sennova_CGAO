# Protocolo de Ingeniería DevBrain - SENNOVA CGAO

Este documento define los estándares de arquitectura, desarrollo y despliegue para el sistema.

## 📁 Estructura del Proyecto
- `backend/`: API FastAPI (Python 3.11).
- `frontend/`: Aplicación React + Vite (TypeScript).
- `docs/`: Documentación técnica y del negocio.
- `scripts/`: Automatización y utilidades de mantenimiento.
- `maintenance/`: Logs, bases de datos SQLite temporales y configuraciones de entorno.

## 🚀 Despliegue (Coolify Ready)
El sistema está diseñado para ser desplegado en Coolify usando Docker Compose.
- **Producción**: Utiliza PostgreSQL y Nginx optimizado con Gzip.
- **Persistencia**: Los volúmenes `postgres_data` y `sennova_storage` garantizan que no se pierdan datos ni documentos.

## 🛠️ Estándares del Backend
1. **Patrón Repository**: Toda interacción con la base de datos debe pasar por un Repositorio que herede de `BaseRepository`.
2. **Auditoría**: Todas las mutaciones (POST, PUT, DELETE) son registradas automáticamente por el `AuditMiddleware`.
3. **Validación**: Uso estricto de Pydantic para esquemas de entrada y salida.

## 🎨 Estándares del Frontend
1. **Estado Global**: Uso de **Zustand** para persistencia de sesión y UI state.
2. **UI Components**: Componentes basados en **Radix UI** (Headless) y **Tailwind CSS**.
3. **Seguridad Tipográfica**: Migración progresiva a **TypeScript**.

## 🔄 Pipeline CI/CD
Cada push a `main` dispara:
1. Validación de tipos y construcción en Frontend.
2. Ejecución de tests unitarios en Backend.
3. (Próximamente) Despliegue automático vía Webhook.
