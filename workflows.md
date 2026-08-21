# DevBrain Workflows & SDLC Quality Gates

## 1. Ciclo de Desarrollo de Software (SDLC)

Para garantizar la estabilidad institucional y el funcionamiento de extremo a extremo de todas las funciones y tablas del sistema SENNOVA, se establece la siguiente compuerta de calidad obligatoria antes de realizar commits, merges o despliegues:

### Compuerta Obligatoria: Auditoría E2E de Todas las Tablas
Ejecutar el script estandarizado:
```powershell
.\scripts\audit_e2e_all_tables.ps1
```

Este paso automatizado valida:
1. **Backend E2E (`tests/test_e2e_all_tables_audit.py`)**: 17 casos de prueba integrales que cubren todas las tablas de base de datos (`Users`, `Grupos`, `Semilleros`, `Aprendices`, `Convocatorias`, `Proyectos`, `Productos`, `Entregables`, `Documentos`, `Bitacora`, `Retos`, `Notificaciones`, `Mensajes`, `CVLaC`, `Reportes`, `Plantillas`, `Stats/Audit`).
2. **Backend Regression (`pytest tests/`)**: 36+ pruebas unitarias, de roles y lógica de negocio.
3. **Frontend E2E & Contratos (`npm test`)**: 150+ pruebas de integración de clientes API, modales, componentes UI y perspectivas de roles.

## 2. Flujo Operativo Estándar
1. **Desarrollo**: Modificar componentes o endpoints manteniendo contratos alineados.
2. **Auditoría Local**: Ejecutar `.\scripts\audit_e2e_all_tables.ps1` y confirmar estado 100% verde.
3. **Deploy**: Despliegue con Docker Compose / Coolify tras pasar la compuerta.
4. **Fix / Resiliencia**: Utilizar el orquestador de recuperación de servicios en caso de incidencias.
