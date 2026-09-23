# 🌿 Estrategia GitFlow — SENNOVA CGAO

Esta guía define la arquitectura de control de versiones y el ciclo de vida de desarrollo de ramas para el ecosistema **SENNOVA CGAO**, alineado con la integración continua (CI) y despliegue continuo (CD) mediante **GitHub Actions**.

---

## 1. Arquitectura de Ramas

```
          [hotfix/v1.0.1]
          /            \
[main] --*--------------*-----------------------*----> (Producción / Coolify)
          \                                    /
           \         [release/v1.1.0]        /
            \        /               \      /
[develop] ---*------*-----------------*----*---------> (Integración activa)
              \    /                   \  /
               *--*                     *
          [feature/bitacora-firma]
```

### Ramas Principales (Infraestructura Permanente)

| Rama | Propósito | Despliegue | Calidad Requerida |
|---|---|---|---|
| **`main`** | Código en producción. Siempre estable y listo para usuarios finales. | Despliegue continuo a **Coolify** | 100% pruebas aprobadas, sin excepciones. |
| **`develop`** | Rama troncal de integración diaria. Contiene las últimas características terminadas. | Entorno de desarrollo / staging | 100% pruebas de backend y frontend aprobadas. |

### Ramas Auxiliares (Temporales)

| Tipo de Rama | Prefijo | Se origina en | Se integra en (Merge) | Propósito |
|---|---|---|---|---|
| **Feature** | `feature/<modulo>-<nombre>` | `develop` | `develop` | Desarrollo de nuevas capacidades (ej. `feature/dual-signature`). |
| **Bugfix** | `bugfix/<modulo>-<nombre>` | `develop` | `develop` | Correcciones de errores detectados en desarrollo. |
| **Release** | `release/vX.Y.Z` | `develop` | `main` y `develop` | Congelamiento y preparación de versión para producción. |
| **Hotfix** | `hotfix/<nombre>` | `main` | `main` y `develop` | Correcciones críticas e inmediatas en producción. |

---

## 2. Flujo de Trabajo Paso a Paso (Developer Workflow)

### Caso A: Desarrollar una Nueva Característica (`feature`)

1. **Sincronizar `develop`**:
   ```powershell
   git checkout develop
   git pull origin develop
   ```

2. **Crear la rama de la característica**:
   ```powershell
   git checkout -b feature/convocatorias-filtros
   ```

3. **Desarrollar y validar pruebas localmente**:
   ```powershell
   # Backend (86 pruebas herméticas)
   python -m pytest backend/tests

   # Frontend (226 pruebas y build)
   cd frontend
   npm test
   npm run build
   ```

4. **Publicar rama y abrir Pull Request**:
   ```powershell
   git add .
   git commit -m "feat(convocatorias): agregar filtros por año y estado"
   git push -u origin feature/convocatorias-filtros
   ```
   - Abre el Pull Request en GitHub seleccionando como destino: **`base: develop`**.
   - GitHub Actions ejecutará automáticamente el workflow `DevBrain CI`.

---

### Caso B: Preparar un Despliegue a Producción (`release`)

1. **Crear rama de release desde `develop`**:
   ```powershell
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.1.0
   ```

2. **Ajustes finales** (incremento de versión en `package.json`, documentación, notas de versión).
3. **Abrir PR hacia `main`**:
   - Una vez aprobado y con CI en verde, se fusiona a `main`.
   - Inmediatamente se fusiona también de regreso a `develop` para sincronizar cambios.
4. **Etiquetar la versión en `main`**:
   ```powershell
   git checkout main
   git pull origin main
   git tag -a v1.1.0 -m "Release v1.1.0: Módulos de auditoría y mensajería en tiempo real"
   git push origin v1.1.0
   ```

---

### Caso C: Solucionar un Error Crítico en Producción (`hotfix`)

1. **Crear rama de hotfix directamente desde `main`**:
   ```powershell
   git checkout main
   git pull origin main
   git checkout -b hotfix/reparar-login-token
   ```

2. **Corregir el bug y verificar el 100% de pruebas**:
   ```powershell
   python -m pytest backend/tests
   ```

3. **Publicar y abrir PR simultáneo hacia `main` y hacia `develop`**:
   - Una vez aprobado el PR a `main`, el pipeline `DevBrain CD` desplegará el parche a Coolify.
   - La fusión hacia `develop` garantiza que el error no vuelva a reaparecer en futuras versiones.

---

## 3. Integración con GitHub Actions

El repositorio cuenta con 3 workflows coordinados:

1. **`ci.yml` (GitFlow CI)**:
   - Se ejecuta en **todo Pull Request** hacia `develop` o `main` y en pushes a ramas `feature/**`, `release/**`, `hotfix/**`.
   - Ejecuta las **86 pruebas de Backend** (FastAPI + SQLAlchemy en base SQLite aislada).
   - Ejecuta las **226 pruebas de Frontend** (Vitest + React Testing Library).
   - Valida la **compilación de producción** (`npm run build`).

2. **`deploy.yml` (GitFlow CD)**:
   - Se ejecuta automáticamente ante pushes directos o fusiones hacia la rama **`main`** o ante la publicación de tags **`v*.*.*`**.
   - Evalúa el Quality Gate: si una sola prueba falla, cancela el despliegue.
   - Invoca el Webhook seguro de **Coolify** (`COOLIFY_WEBHOOK`) para desplegar los contenedores en producción.

3. **`security.yml` (DevSecOps)**:
   - Detección proactiva de fugas de credenciales (Gitleaks).
   - Auditoría de dependencias (`npm audit` y `pip-audit`).

---

## 4. Reglas de Protección Recomendadas en GitHub (Branch Protection)

Para blindar la integridad del proyecto, configura en GitHub (`Settings` -> `Branches`):

### Para la rama `main`:
- ✅ **Require a pull request before merging** (mínimo 1 aprobación).
- ✅ **Require status checks to pass before merging**:
  - `Backend Pytest Suite (100% Tests)`
  - `Frontend Vitest & Production Build`
- ✅ **Require branches to be up to date before merging**.
- ❌ **Do not allow force pushes**.
- ❌ **Do not allow deletions**.

### Para la rama `develop`:
- ✅ **Require a pull request before merging**.
- ✅ **Require status checks to pass before merging** (CI verde).
- ❌ **Do not allow force pushes**.
