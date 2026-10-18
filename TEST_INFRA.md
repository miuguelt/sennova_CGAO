# Infraestructura y Estrategia de Pruebas E2E: Sistema Sennova CGAO

## 1. Propósito y Visión General
Este documento establece la infraestructura, metodología y arquitectura de pruebas de extremo a extremo (E2E) para la auditoría integral y optimización de experiencia de usuario (UI/UX) del Sistema Sennova CGAO.

El objetivo principal es garantizar que todas las interacciones de usuario en los 7 módulos funcionales (Dashboard, Proyectos, Convocatorias, Semilleros, Grupos, Mensajería y Reportes) preserven su integridad operativa, cumplan con los estándares de ergonomía, accesibilidad visual (WCAG 2.2 AA) y salvaguarda contra pérdida de datos, asegurando cero regresiones mediante una suite automatizada en Vitest.

---

## 2. Arquitectura del Arnés de Pruebas

### 2.1 Stack Tecnológico y Entorno de Ejecución
- **Test Runner**: Vitest 4.1.6 con entorno `jsdom` (JSDOM 29.1.1).
- **Librerías de Aserción y Renderizado**: `@testing-library/react` (v16.3.2), `@testing-library/jest-dom` (v6.9.1), `@testing-library/user-event` (v14.6.1).
- **Gestión de Estado y Contextos**: React Context (`AuthProvider`, `UnsavedChangesProvider`), Zustand 5.0.0 (`useAppStore`).
- **Aislamiento Determinista**: Mocks a nivel de API HTTP (`src/api/*`) manteniendo los componentes de interfaz, stores y contextos 100% reales para certificar la interacción observable en el DOM.

### 2.2 Principios de Integridad de Pruebas
1. **Aserciones sobre Comportamiento Observable**: Cada prueba verifica elementos interactivos, textos, atributos de accesibilidad (`aria-invalid`, `role`, `aria-valuenow`), diálogos y transiciones presentes en el DOM.
2. **Prohibición de Pruebas Fachada**: Ninguna prueba utiliza mocks vacíos que simulen éxito sin ejecutar la lógica del componente.
3. **Independencia y Aislamiento**: Cada caso de prueba limpia su estado (`cleanup()`, `vi.clearAllMocks()`), establece sus fixtures de datos y se ejecuta de forma autónoma sin depender del orden de la suite.

---

## 3. Metodología en 4 Niveles (Tiers 1 a 4)

La suite de pruebas E2E implementa una taxonomía de 4 niveles rigurosos:

```
┌─────────────────────────────────────────────────────────────────┐
│        Tier 4: Cargas de Trabajo Reales (Real-World Workloads)  │
│        Flujos E2E de ciclo de vida completo y auditoría UX       │
├─────────────────────────────────────────────────────────────────┤
│        Tier 3: Pruebas Combinatorias por Pares (Pairwise)       │
│        Navegación intermodular, retención de estado y guardas   │
├─────────────────────────────────────────────────────────────────┤
│        Tier 2: Análisis de Valores Límite (BVA & Defensivo)     │
│        Entradas extremas, errores de red y validaciones campo   │
├─────────────────────────────────────────────────────────────────┤
│        Tier 1: Partición de Equivalencia (Category-Partition)   │
│        Rutas principales y verificación funcional de 7 módulos │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Tier 1: Category-Partition (Partición de Equivalencia y Rutas Principales)
- **Criterio de Cobertura**: Mínimo 5 pruebas por cada uno de los 7 módulos principales (>= 35 pruebas).
- **Alcance**:
  - **Dashboard**: Carga de métricas institucionales, tarjeta de avance documental, segmentación de roles (admin, investigador, aprendiz), renderizado de compromisos y entregables.
  - **Proyectos**: Listado de proyectos con presupuesto y códigos SGPS, filtrado por estado y tipología, visualización de fichas y drawer de detalles.
  - **Convocatorias**: Listado de convocatorias activas y cerradas, visualización de número de OE y año, filtrado en tiempo real y consulta de proyectos asociados.
  - **Semilleros**: Visualización de semilleros y líneas de investigación, listado de aprendices vinculados, generación de certificados y métricas de impacto.
  - **Grupos**: Renderizado del Grupo CGAO, clasificación Minciencias, plan operativo, líneas de investigación y proyectos adscritos.
  - **Mensajería**: Bandeja de entrada con conversaciones, indicador de mensajes no leídos, renderizado de burbujas de chat y remitentes.
  - **Reportes**: Pestañas de Analítica y Catálogo de Consolidados, métricas de cartera, proyectos de mayor impacto y opciones de generación en Excel/CSV.

### 3.2 Tier 2: Boundary Value Analysis (BVA & Casos Límite Defensivos)
- **Criterio de Cobertura**: Mínimo 5 pruebas especializadas en límites de datos y respuestas adversas.
- **Alcance**:
  - **BVA-1 (Búsquedas Vacías / Sin Coincidencias)**: Búsquedas con caracteres especiales y términos inexistentes que deben mostrar `EmptyState` amigable sin romper la tabla.
  - **BVA-2 (Límites de Presupuesto y Cero)**: Formateo de moneda con valores extremos ($0, $1.000.000.000), valores nulos y redondeo numérico correcto.
  - **BVA-3 (Validaciones de Fecha y Cronología)**: Formularios de convocatorias y cronogramas con fechas límite, fechas vacías y restricciones temporales.
  - **BVA-4 (Tolerancia a Fallos de Red / 500)**: Fallas asíncronas de la API manejadas limpiamente mediante banners de error accesibles (`role="alert"`) o estados de recuperación sin colapsar la aplicación.
  - **BVA-5 (Entradas de Texto con Caracteres Especiales y Espacios)**: Prevención de fallos por inyección de etiquetas, cadenas con espacios en blanco o emojis en campos de entrada y búsqueda.

### 3.3 Tier 3: Pairwise Combinatorial (Interacciones Cruzadas entre Módulos)
- **Criterio de Cobertura**: Combinaciones sistemáticas por pares entre módulos y estados globales.
- **Alcance**:
  - **Pairwise P1 (Dashboard ↔ Proyectos)**: Navegación desde tarjeta de impacto o avance documental hacia la vista de Proyectos, manteniendo el contexto.
  - **Pairwise P2 (Convocatorias ↔ Proyectos)**: Postulación de un proyecto existente a una convocatoria abierta y actualización observable del listado.
  - **Pairwise P3 (Grupos ↔ Semilleros)**: Exploración del grupo de investigación y transición a la gestión de sus semilleros adscritos.
  - **Pairwise P4 (Mensajería ↔ Dashboard)**: Recepción de mensajes / notificaciones y navegación fluida entre la bandeja de comunicación y el panel principal.
  - **Pairwise P5 (Reportes ↔ Proyectos)**: Consulta de consolidado analítico y verificación de coherencia con los proyectos en ejecución.
  - **Pairwise P6 (Salvaguarda de Navegación Intermodular)**: Detección de cambios sin guardar al intentar navegar entre módulos con confirmación obligatoria mediante `ConfirmDialog`.

### 3.4 Tier 4: Real-World Workloads (Cargas de Trabajo y Flujos Reales de Usuario)
- **Criterio de Cobertura**: Escenarios completos de ciclo de vida operativo.
- **Alcance**:
  - **Workload W1 (Ciclo de Formulación y Protección de Borrador)**: Un usuario abre el modal o asistente de proyectos, introduce datos preliminares, intenta cerrar abruptamente por clic exterior o cancelar, confirma en el diálogo de salvaguarda y reanuda su edición sin perder datos.
  - **Workload W2 (Filtrado y Consulta Operativa de Convocatorias)**: El coordinador aplica filtros por texto y estado, selecciona una convocatoria para inspeccionar sus proyectos vinculados y ejecuta la postulación sin recargar la página.
  - **Workload W3 (Flujo Integral de Comunicación)**: Selección de conversación activa, redacción de mensaje en `MensajeriaModule`, envío con retroalimentación inmediata y actualización del historial.
  - **Workload W4 (Generación y Validación de Reporte Institucional)**: Navegación al centro de reportes, cambio entre pestañas de analítica y catálogo, selección de formato de exportación y validación de firma digital de autenticidad.
  - **Workload W5 (Auditoría de Accesibilidad Visual y Teclado)**: Comprobación de atributos ARIA, presencia de enlaces de salto (`Saltar al contenido principal`), foco visible en botones y ausencia de bloqueos de teclado.

---

## 4. Matriz de Trazabilidad de Requisitos

| ID Requisito | Descripción | Nivel de Prueba | ID Casos de Prueba |
|--------------|-------------|-----------------|--------------------|
| **R1** | Consistencia visual, jerarquía y navegación intuitiva | Tier 1, Tier 3 | T1-DASH-*, T1-PROY-*, T1-CONV-*, T3-PAIR-* |
| **R2** | Ergonomía en formularios, validación y salvaguarda de datos | Tier 2, Tier 4 | T2-BVA-VAL-*, T4-WORKLOAD-DRAFT-*, T4-WORKLOAD-GUARD-* |
| **R3** | Preservación funcional y suite de pruebas integral | Tier 1 a 4 | Todos los casos de `e2e-requirements.test.jsx` |
| **F1** | Accesibilidad global y preferencias de movimiento | Tier 4 | T4-WORKLOAD-A11Y-MOTION |
| **F2** | Contraste de colores accesible WCAG 2.2 AA | Tier 1, Tier 2 | T1-DASH-CONTRAST, T2-BVA-CONTRAST |
| **F3** | Componentes base de interacción (`Button`, `EmptyState`, `ErrorBanner`) | Tier 1, Tier 2 | T1-*-EMPTY, T2-BVA-ERRORBANNER |
| **F4** | Salvaguarda contra pérdida accidental de datos (`UnsavedChangesGuard`) | Tier 3, Tier 4 | T3-PAIR-GUARD, T4-WORKLOAD-GUARD |
| **F5** | Ergonomía y validación preventiva en formularios | Tier 2, Tier 4 | T2-BVA-DATE, T2-BVA-EMAIL |
| **F7** | Estados de carga y manejo de errores en Dashboard y Reportes | Tier 1, Tier 2 | T1-DASH-LOADING, T1-REP-LOADING, T2-BVA-NETFAIL |
| **F8** | Estructura en tablas y vistas vacías estandarizadas | Tier 1, Tier 2 | T1-PROY-TABLE, T2-BVA-EMPTYSTATE |
| **F10** | Suite de pruebas E2E requisito-céntrica (Tiers 1 a 4) | Todos | `frontend/src/test/e2e-requirements.test.jsx` |

---

## 5. Criterios de Aceptación y Compuertas de Calidad

Para dar por aprobada la infraestructura de pruebas E2E, se deben cumplir estrictamente los siguientes criterios:
1. **100% de Aprobación**: Cero pruebas fallidas (`0 failed`) al ejecutar la suite completa en Vitest.
2. **Sin Regresiones**: La suite completa previa (92 archivos y 818 pruebas) debe mantenerse pasando en su totalidad.
3. **Comportamiento Observable**: Cada prueba debe contener aserciones verificables en el DOM (`toBeInTheDocument`, `toBeVisible`, `toHaveValue`, `toHaveAttribute`).
4. **Compuerta de Cobertura DevBrain**: Cumplimiento del 100% de funciones auditadas.

---

## 6. Comandos de Ejecución y Verificación

### Ejecución de la Suite Completa:
```bash
cd frontend
npm test
```

### Ejecución Exclusiva del Archivo E2E:
```bash
cd frontend
npx vitest run src/test/e2e-requirements.test.jsx
```

### Ejecución con Reporte de Cobertura:
```bash
cd frontend
npm run test:coverage
```
