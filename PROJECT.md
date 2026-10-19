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
  - `src/components/projects/`: `ProyectosModule.jsx`, `ProjectDocumentationEditor.jsx`, `ProjectFormulationWizard.jsx`, `ProjectFormulationStep.jsx`, `ProjectEvidenceFile.jsx`, `ProjectFileImport.jsx`, `ProjectFileImportReview.jsx`, `ProjectDeliverableCard.jsx`.
  - `src/components/calls/`: `ConvocatoriasModule.jsx`.
  - `src/components/seedbeds/`: `SemillerosModule.jsx`.
  - `src/components/groups/`: `GrupoModule.jsx`.
  - `src/components/messages/`: `MensajeriaModule.jsx`, `MessageComposer.jsx`.
  - `src/components/reports/`: `ReportesModule.jsx`.
- **Infraestructura de Pruebas**: Vitest 4.1.6 con `@testing-library/react` y JSDOM. 93 archivos de prueba y 834 pruebas pasando al 100% en frontend; 678 pruebas pasando al 100% en backend (Pytest). Compuerta estricta DevBrain: 100% de cobertura de funciones.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Accesibilidad Global y Preferencias de Movimiento | Agregar soporte para `@media (prefers-reduced-motion: reduce)` y reglas `:focus-visible` en `index.css`. | M1 | Survey (Spec Miner / Explorer M1-1) |
| F2 | Contraste de Colores Accesible WCAG 2.2 AA | Corregir textos con `amber-600` / `orange-600` de bajo contraste (< 3:1) hacia `amber-800` / `amber-900` (ratio > 4.5:1) y eliminar tamaños inferiores a 12px. | M1 | Survey (Spec Miner / Explorer M1-1) |
| F3 | Primitiva Button con Prop Loading | Incorporar prop `loading` en `Button.tsx` (Contrato C2), spinner `Loader2` accesible (`aria-hidden="true"`), `aria-busy="true"` y deshabilitación no destructiva. | M1 | Survey (Explorer M1-2) |
| F4 | Componente ErrorBanner Accesible | Crear `ErrorBanner.jsx` (Contrato C1) con variantes `danger`/`warning`, semántica `role="alert"` y botón de reintento (`onRetry`). | M1 | Survey (Explorer M1-3) |
| F5 | Pruebas Unitarias de Fundamentos | Pruebas de `ErrorBanner` (`error-banner.test.jsx`) y `Button loading` (`ui-components.test.jsx`). | M1 | Survey (Explorers M1-2 & M1-3) |
| F6 | Stepper Horizontal Accesible de Formulación | Agregar Stepper horizontal interactivo en `ProjectFormulationWizard.jsx` con indicador visual de etapas (`aria-current="step"`) y salto directo. | M2 | Survey (Spec Miner Wizard R1) |
| F7 | Badge de Estado de Guardado de Borrador | Indicador persistente en el asistente ("Borrador guardado", "Guardando...", "Cambios pendientes por guardar"). | M2 | Survey (Spec Miner Wizard R1) |
| F8 | Tarjetas Didácticas Contextuales SENA CGAO | Orientación pedagógica contextual visible en cada etapa con terminología del Centro de Gestión Agroempresarial del Oriente. | M2 | Survey (Spec Miner Wizard R1) |
| F9 | Alertas Didácticas Preventivas en Vivo | Sugerencias pedagógicas en tiempo real (`liveHints`) para presupuesto, vigencia anual y formulación del problema. | M2 | Survey (Spec Miner Wizard R1) |
| F10 | Pruebas Automatizadas de Formulación Guiada | Pruebas con aserciones observables sobre el Stepper, badge de guardado y orientaciones didácticas en `project-formulation-wizard.test.jsx`. | M2 | Survey (Spec Miner Wizard R1) |
| F11 | Salvaguarda Preventiva isDirty en Importación | Integrar `ProjectFileImport.jsx` con `useUnsavedChangesGuard` y diálogo `ConfirmDialog` al pulsar "Limpiar selección" o cerrar el Drawer. | M3 | Survey (Explorer Dossier R2) |
| F12 | Previsualización Estructurada de Entregables | Crear `ProjectDeliverableCard.jsx` (< 140 líneas) con iconografía por extensión, badges por tipo documental y metadatos legibles. | M3 | Survey (Explorer Dossier R2) |
| F13 | Barra de KPIs y Acciones Masivas en Revisión | Barra de resumen con conteo dinámico, peso acumulado en es-CO y botones "Seleccionar todos" / "Deseleccionar todos" en `ProjectFileImportReview.jsx`. | M3 | Survey (Explorer Dossier R2) |
| F14 | Estados de Carga y Error en Expediente | Integración de `Button.tsx` (`loading`) y `ErrorBanner.jsx` en `ProjectEvidenceFile.jsx` y `ProjectEvidenceStage.jsx`. | M3 | Survey (Explorer Dossier R2) |
| F15 | Pruebas Automatizadas de Expediente Documental | Suite de pruebas observables en `src/test/project-dossier-ergonomics.test.jsx`. | M3 | Survey (Explorer Dossier R2) |
| F16 | Estandarización de EmptyState en Módulos | Adopción de `EmptyState.jsx` en Dashboard, Convocatorias, Semilleros, Grupos, Mensajería, Reportes y Proyectos. | M4 | Survey (Explorer Transversal R3) |
| F17 | Adopción de ErrorBanner y Reintento Asíncrono | Sustitución de bloqueos silenciosos por `ErrorBanner` con botón de reintento en módulos principales. | M4 | Survey (Explorer Transversal R3) |
| F18 | Migración de Botones Asíncronos a Button Loading | Reemplazo de spinners ad-hoc por `Button` con prop `loading` en formularios y modales interactivos. | M4 | Survey (Explorer Transversal R3) |
| F19 | Pruebas Unitarias de EmptyState | Creación de `src/test/empty-state.test.jsx` cubriendo todas las variantes, títulos y acciones observables. | M4 | Survey (Explorer Transversal R3) |
| F20 | Verificación y Blindaje de Suite Frontend | Ejecución integral de Vitest certificando >= 834 pruebas (meta proyectada >= 860 pruebas con 100% de éxito). | M5 | Survey (Explorer Transversal R4) |
| F21 | Verificación de Suite Backend | Ejecución de Pytest backend certificando 678 pruebas aprobadas al 100% sin regresiones. | M5 | Survey (Explorer Transversal R4) |
| F22 | Compilación Limpia de Producción | Verificación de `npm run build` en `frontend/` sin advertencias críticas ni errores. | M5 | Project Acceptance Criteria |
| F23 | Blindaje Adversarial y Auditoría Forense | Verificación de integridad con `teamwork_preview_auditor` y compuerta binaria de autenticidad. | M5 | DevBrain & Forensic Audit Protocol |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fundamentos UI/UX, Accesibilidad Global y Componentes Base | F1, F2, F3, F4, F5 (`index.css`, `Button.tsx`, `ErrorBanner.jsx`, pruebas unitarias). | none | DONE |
| M2 | Formulación Guiada y Comprensible de Proyectos (R1) | F6, F7, F8, F9, F10 (Stepper horizontal, badge de guardado, didáctica SENA CGAO, liveHints, tests). | M1 | DONE |
| M3 | Gestión Guiada y Accesible del Expediente Documental (R2) | F11, F12, F13, F14, F15 (Salvaguarda isDirty, `ProjectDeliverableCard`, KPIs, tests). | M1 | DONE |
| M4 | Usabilidad Transversal y Retroalimentación Interactiva (R3) | F16, F17, F18, F19 (`EmptyState`, `ErrorBanner` en módulos, `empty-state.test.jsx`). | M1 | DONE |
| M5 | Hito Final: Certificación Integral E2E, Cobertura y Auditoría (R4) | F20, F21, F22, F23 (Vitest >= 834 pruebas, Pytest backend, build de producción y auditoría limpia). | M2, M3, M4 | DONE |

---

## Interface Contracts

### Contrato C1: Componente `ErrorBanner`
- **Ubicación**: `src/components/ui/ErrorBanner.jsx`
- **Props**:
  - `title` (string, opcional, default: "No fue posible cargar la información"): Título accesible del mensaje.
  - `message` (string, requerido): Detalle o causa amigable del error.
  - `onRetry` (función, opcional): Callback para reintentar la acción asíncrona.
  - `variant` (string: `'warning'` | `'danger'`, default: `'danger'`).
  - `retryText` (string, opcional, default: "Reintentar").
  - `className` (string, opcional).
- **Semántica**: Contenedor con `role="alert"`, `aria-live="assertive"` (danger) / `aria-live="polite"` (warning), icono correspondiente y botón de reintento accesible.

### Contrato C2: Componente `Button` con Estado `loading`
- **Ubicación**: `src/components/ui/Button.tsx`
- **Props extendidas**:
  - `loading` (boolean, opcional, default: `false`): Si es `true`, deshabilita el botón, muestra spinner `Loader2` accesible (`aria-hidden="true"`), añade `aria-busy="true"` y preserva las variantes y tamaños existentes sin emitir advertencias en el DOM.
  - `icon` (ReactNode, opcional): Icono que acompaña el texto y es sustituido por el spinner en modo `loading`.

### Contrato C3: Salvaguarda de Cambios Sucios e Importación Documental
- **Integración**: `ProjectFileImport.jsx` con `useUnsavedChangesGuard` (`registerSession`).
- **Comportamiento**:
  - Sesión activa `project-file-import:${projectId}` mientras `files.length > 0 || result !== null`.
  - Diálogo `ConfirmDialog` al pulsar "Limpiar selección" para evitar descarte accidental.
  - Intercepción al cerrar el Drawer de proyectos si hay archivos analizados sin guardar.

### Contrato C4: Componente `ProjectDeliverableCard`
- **Ubicación**: `src/components/projects/ProjectDeliverableCard.jsx`
- **Props**:
  - `file`: Objeto del archivo analizado.
  - `deliverable`: Metadatos del entregable detectado (nombre, tipo, bimestre, campos).
  - `selected`: Booleano de selección para importación.
  - `onToggleSelect`: Callback para alternar selección.
  - `onBimesterChange`: Callback para ajustar bimestre propuesto.
- **Límite**: Menos de 140 líneas por archivo.

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
│   │   ├── projects/            # ProyectosModule.jsx, ProjectDocumentationEditor.jsx,
│   │   │                        # ProjectFormulationWizard.jsx, ProjectFormulationStep.jsx,
│   │   │                        # ProjectEvidenceFile.jsx, ProjectFileImport.jsx,
│   │   │                        # ProjectFileImportReview.jsx, ProjectDeliverableCard.jsx
│   │   ├── reports/             # ReportesModule.jsx
│   │   ├── seedbeds/            # SemillerosModule.jsx
│   │   └── ui/                  # Componentes reutilizables: Button, Modal, Drawer, EmptyState, ErrorBanner, etc.
│   ├── context/                 # UnsavedChangesContext.jsx, AuthContext.jsx
│   ├── store/                   # useAppStore.js (Zustand)
│   ├── test/                    # Suite de pruebas en Vitest (>= 834 pruebas)
│   ├── index.css                # Estilos base de Tailwind, animaciones y tokens accesibles
│   └── App.tsx                  # Enrutamiento y contenedor raíz de la aplicación
```
