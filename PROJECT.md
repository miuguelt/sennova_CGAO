# Project: Auditoría Integral y Optimización UI/UX Sistema Sennova CGAO

## Architecture
- **Framework & Runtime**: React 18.3.1, React-DOM 18.3.1, Vite 5.4.10, Tailwind CSS 3.4.14, Lucide React 0.454.0.
- **Estado Global & Persistencia**: Zustand 5.0.0 (`useAppStore.js`), Context API (`UnsavedChangesContext.jsx`, `AuthContext.jsx`).
- **Enrutamiento**: SPA en memoria gestionado en `src/App.tsx` (`currentView`), validado con `src/lib/roleAccess.js`.
- **Estructura Modular**:
  - `src/components/layout/`: `Navbar.jsx`, navegación responsiva y drawer móvil.
  - `src/components/ui/`: `Button.tsx`, `Modal.jsx`, `Drawer.jsx`, `ScrollableTabs.jsx`, `Input.jsx`, `EmptyState.jsx`, `ConfirmDialog.jsx`, `Badge.jsx`, `ErrorBanner.jsx`.
  - `src/components/common/`: `GlobalSearch.jsx`, `QuickActionHub.jsx`, `UserInsightPanel.jsx`.
  - `src/components/dashboard/`: `DashboardModule.jsx` (Admin, Investigador, Aprendiz).
  - `src/components/projects/`: `ProyectosModule.jsx`, `ProjectDocumentationEditor.jsx`, `ProjectFormulationWizard.jsx`, `ProjectEvidenceFile.jsx`.
  - `src/components/calls/`: `ConvocatoriasModule.jsx`.
  - `src/components/seedbeds/`: `SemillerosModule.jsx`.
  - `src/components/groups/`: `GrupoModule.jsx`.
  - `src/components/messages/`: `MensajeriaModule.jsx`, `MessageComposer.jsx`.
  - `src/components/reports/`: `ReportesModule.jsx`.
- **Infraestructura de Pruebas**: Vitest 4.1.6 con `@testing-library/react` y JSDOM. 92 archivos de prueba y 818 pruebas pasando al 100%. Compuerta estricta DevBrain: 100% de cobertura de funciones.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Accesibilidad Global y Preferencias de Movimiento | Agregar soporte para `@media (prefers-reduced-motion: reduce)` y reglas `:focus-visible` en `index.css`. | M1 | Survey (Spec Miner) |
| F2 | Contraste de Colores Accesible WCAG 2.2 AA | Corregir textos con `amber-600` / `orange-600` de bajo contraste (< 3:1) hacia `amber-800` / `amber-900` (ratio > 4.5:1) y eliminar tamaños inferiores a 12px. | M1 | Survey (Spec Miner) |
| F3 | Componentes Base de Interacción y Feedback | Incorporar estado de carga (`loading`) en `Button.tsx`, estandarizar `EmptyState.jsx` y crear `ErrorBanner.jsx` accesible con botón de reintento. | M1 | Survey (Explorer 1 & Spec Miner) |
| F4 | Salvaguarda contra Pérdida Accidental de Datos | Integrar `useUnsavedChangesGuard` o confirmación de descarte en formularios modales clave (Proyectos, Convocatorias, Semilleros, Productos, Retos, Grupo). Evitar cierre abrupto por clic en backdrop si hay cambios sin guardar. | M2 | Survey (Spec Miner) |
| F5 | Ergonomía y Validación Preventiva en Formularios | Validaciones de fecha en Convocatorias (`fecha_cierre >= fecha_inicio`), formato de correo en Retos, validación de DOI/URL en Productos, y feedback visible a nivel de campo con `aria-invalid`. | M2 | Survey (Spec Miner) |
| F6 | Operabilidad por Teclado y Semántica HTML | Corregir elementos interactivos en `UserInsightPanel` para que sean botones o incluyan `role="button"` con soporte de teclado; corregir etiquetas `<textarea>` autocontenidas. | M2 | Survey (Spec Miner) |
| F7 | Estados de Carga y Manejo de Errores en Paneles | Incorporar estados de carga visibles (`loading` / skeletons) y banderas de error en `DashboardModule` y `ReportesModule`, eliminando bloqueos silenciosos en `catch`. | M3 | Survey (Spec Miner) |
| F8 | Corrección Estructural en Tablas y Estados Vacíos | Reemplazar celdas desalineadas (`colSpan=5` frente a 6 columnas) en tabla de Proyectos por `EmptyState.jsx` accesible; estandarizar vistas vacías en todos los módulos. | M3 | Survey (Explorer 1 & Spec Miner) |
| F9 | Ergonomía de Paneles Deslizantes (Drawers) y Navegación | Optimizar barra superior del Drawer de Proyectos para evitar saturación de botones en pantallas medianas; asegurar transiciones y navegación fluidas entre módulos. | M3 | Survey (Explorer 1) |
| F10 | Suite de Pruebas E2E Requisito-Céntrica | Diseñar arnés y conjunto completo de pruebas E2E opacas en 4 niveles (Tier 1 a 4) según `ORIGINAL_REQUEST.md`, publicando `TEST_READY.md`. | E2E-Track | Dual Track Protocol |
| F11 | Validación E2E al 100% y Blindaje Adversarial (Tier 5) | Ejecución integral de la suite E2E hasta lograr 100% de aprobación, pruebas adversariales de cobertura con Challengers y resolución de casos límite. | M4 | Dual Track Final Milestone |
| F12 | Auditoría Forense de Integridad y Empaquetado Limpio | Verificación estricta de autenticidad con `teamwork_preview_auditor`, verificación de cobertura 100% de funciones y empaquetado de producción limpio con Vite (`npm run build`). | M4 | Project Architecture & Governance |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fundamentos de Accesibilidad, Estilos y Componentes Base | F1, F2, F3 (`index.css`, `Button.tsx`, `ErrorBanner.jsx`, tokens de contraste accesible). | none | PLANNED |
| M2 | Salvaguarda contra Pérdida de Datos y Ergonomía en Formularios | F4, F5, F6 (Protección `isDirty` en modales, validaciones preventivas, corrección de accesibilidad por teclado y semántica HTML). | M1 | PLANNED |
| M3 | Estados Interactivos y Ergonomía en Módulos Principales | F7, F8, F9 (Skeletons/carga y errores en Dashboard y Reportes, corrección de tablas y EmptyState, optimización de Drawer de Proyectos). | M1, M2 | PLANNED |
| E2E | E2E Testing Track | F10 (Diseño de infraestructura de pruebas E2E, Tiers 1 a 4, publicación de `TEST_READY.md`). | none | PLANNED |
| M4 | Hito Final: Verificación E2E 100%, Blindaje Adversarial y Auditoría | F11, F12 (Ejecución 100% de suite E2E, blindaje adversarial Tier 5, auditoría forense de integridad limpia, build de producción y reporte). | M3, E2E | PLANNED |

---

## Interface Contracts

### Contrato C1: Componente `ErrorBanner`
- **Ubicación**: `src/components/ui/ErrorBanner.jsx`
- **Props**:
  - `title` (string, opcional, default: "No fue posible cargar la información"): Título accesible del mensaje.
  - `message` (string, requerido): Detalle o causa amigable del error.
  - `onRetry` (función, opcional): Callback para reintentar la acción asíncrona.
  - `variant` (string: `'warning'` | `'danger'`, default: `'danger'`).
- **Semántica**: Contenedor con `role="alert"`, icono correspondiente y botón de reintento accesible.

### Contrato C2: Componente `Button` con Estado `loading`
- **Ubicación**: `src/components/ui/Button.tsx`
- **Props extendidas**:
  - `loading` (boolean, opcional, default: `false`): Si es `true`, deshabilita el botón, muestra spinner accesible y oculta o acompaña el icono sin romper las variantes ni las clases existentes.

### Contrato C3: Salvaguarda de Cambios Sucios en Modales
- **Integración**: Modales de creación/edición en `ProyectosModule`, `ConvocatoriasModule`, `SemillerosModule`, `ProductosModule`, `RetosModule`, `GrupoModule`.
- **Comportamiento**:
  - Cuando el usuario ha modificado campos y presiona `Cancelar`, tecla `ESC` o clic en backdrop, se activa un diálogo de confirmación (`ConfirmDialog`) con las opciones: "Descartar cambios" o "Continuar editando".
  - Si el formulario no tiene cambios sucios (`!isDirty`), el cierre es inmediato sin fricción.

---

## Code Layout
```
frontend/
├── src/
│   ├── api/                     # Servicios y clientes de API HTTP
│   ├── components/
│   │   ├── calls/               # ConvocatoriasModule.jsx
│   │   ├── common/              # GlobalSearch, QuickActionHub, UserInsightPanel
│   │   ├── dashboard/           # DashboardModule.jsx (Admin, Investigador, Aprendiz)
│   │   ├── groups/              # GrupoModule.jsx
│   │   ├── layout/              # Navbar.jsx
│   │   ├── messages/            # MensajeriaModule.jsx, MessageComposer.jsx
│   │   ├── products/            # ProductosModule.jsx
│   │   ├── projects/            # ProyectosModule.jsx, ProjectDocumentationEditor.jsx, etc.
│   │   ├── reports/             # ReportesModule.jsx
│   │   ├── seedbeds/            # SemillerosModule.jsx
│   │   └── ui/                  # Componentes reutilizables: Button, Modal, Drawer, EmptyState, ErrorBanner, etc.
│   ├── context/                 # UnsavedChangesContext.jsx, AuthContext.jsx
│   ├── store/                   # useAppStore.js (Zustand)
│   ├── test/                    # Suite de 92 archivos de prueba en Vitest
│   ├── index.css                # Estilos base de Tailwind, animaciones y tokens
│   └── App.tsx                  # Enrutamiento y contenedor raíz de la aplicación
```
