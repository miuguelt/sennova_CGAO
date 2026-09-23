## 📋 Descripción del Cambio
<!-- Explica brevemente el objetivo de este Pull Request, qué problema resuelve o qué capacidad añade a SENNOVA. -->

## 🌿 Rama y Tipo de Cambio (GitFlow)
Marca con una `x` la opción que corresponda:

- [ ] `feature/*` -> Funcionalidad nueva (Destino obligatorio: `develop`)
- [ ] `bugfix/*` -> Corrección de error en desarrollo (Destino: `develop`)
- [ ] `hotfix/*` -> Parche crítico de producción (Destino: `main` y `develop`)
- [ ] `release/*` -> Preparación de versión candidata (Destino: `main` y `develop`)
- [ ] `chore/*` / `refactor/*` -> Mantenimiento o refactorización sin cambios funcionales

## 🧪 Pruebas y Validación (Quality Gate 100%)
Confirma que se han cumplido los criterios de aceptación:

- [ ] **Backend Pytest**: Ejecutado localmente y 100% aprobado (`python -m pytest backend/tests`).
- [ ] **Frontend Vitest**: Ejecutado localmente y 100% aprobado (`npm test` en `./frontend`).
- [ ] **Frontend Build**: Compilación exitosa sin errores (`npm run build` en `./frontend`).
- [ ] **Base de Datos**: No se rompen migraciones ni esquemas de SQLAlchemy / Alembic.

## 🔒 Política de Seguridad y Anti-Fugas
- [ ] No se incluyen contraseñas, tokens JWT, URLs de bases de datos de producción ni claves privadas.
- [ ] Los secretos residen únicamente en variables de entorno o gestores autorizados.
- [ ] Archivos de bases de datos (`*.db`, `*.sqlite`) están ignorados por `.gitignore`.

## 📸 Evidencia / Capturas de Pantalla (Opcional)
<!-- Si este cambio incluye interfaz de usuario o salidas de consola relevantes, añade capturas aquí. -->
