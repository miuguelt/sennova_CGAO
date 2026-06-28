# Informe de Auditoría y Pruebas Cruzadas por Rol - SENNOVA CGAO

**Fecha y Hora:** 2026-06-19 16:09:47
**Área Auditoría:** Control de Acceso basado en Roles (RBAC) para Formularios de Entrada

## 📊 Matriz de Resultados de Formularios

| Formulario / Módulo | Administrador (status / exp) | Investigador (status / exp) | Aprendiz (status / exp) | Estado final |
| :--- | :---: | :---: | :---: | :---: |
| **Formulario Convocatoria (Crear)** | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Grupo (Crear)** | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Proyecto (Crear)** | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Semillero (Crear)** | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Vincular Aprendiz** | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Producto (Crear)** | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Cronograma (Generar)** | ✅ 200 (Exp: 200) | ✅ 200 (Exp: 200) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Presupuesto (Generar)** | ✅ 200 (Exp: 200) | ✅ 200 (Exp: 200) | ✅ 403 (Exp: 403) | 🟢 APROBADO |
| **Formulario Bitácora (Crear)** | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | ✅ 201 (Exp: 201) | 🟢 APROBADO |
| **Formulario Firma Bitácora** | ✅ 200 (Exp: 200) | ✅ 200 (Exp: 200) | ✅ 200 (Exp: 200) | 🟢 APROBADO |

## 📈 Resumen de Métricas de Seguridad (RBAC)

- **Total de Evaluaciones Individuales:** 30
- **Evaluaciones Exitosas:** 30
- **Grado de Cumplimiento Normativo (RBAC):** **100.0%**

> [!NOTE]
> **CONFORMIDAD TOTAL:** El sistema cumple al 100% con las políticas de control de acceso. Los perfiles restrictivos (Investigador y Aprendiz) tienen bloqueados de forma segura los formularios administrativos, mientras que las operaciones colaborativas (como bitácoras y firmas digitales) funcionan perfectamente para los roles correspondientes.
