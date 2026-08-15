# DevBrain — estándar canónico de desarrollo multi-IDE

**Versión:** 8.1 · **Fecha:** 2026-08-15

## 1. Autoridad y contexto

1. Para estado operativo mandan, en orden: `AI-SESSION-BRIEF.md`, `AI-CURRENT-CONFIG.md`, `_core/DEVBRAIN_RUNTIME_POLICY.md`, el `AGENTS.md` del proyecto y este estándar.
2. Al iniciar sesión se consulta `devbrain_brief`. Para cada tarea se consulta `devbrain_task_context` con la intención concreta y, si aplica, el proyecto.
3. Para arquitectura, impacto, dependencias, depuración o refactor se consulta Codebase Memory antes de verificar los archivos exactos. Tras cambios estructurales se refresca el índice.
4. Las referencias históricas nunca reemplazan la configuración vigente.

## 2. Runtime Windows nativo

- PostgreSQL 18: `127.0.0.1:5434`, servicio `postgresql-x64-18`.
- Memurai: `127.0.0.1:6380`, servicio `Memurai`.
- Gateway MCP único: `127.0.0.1:8010`. Dashboard: `127.0.0.1:8051`.
- No usar WSL, Docker, Qdrant, SearXNG, Redis 6379 ni inferencia LLM local.
- `devbrain start` inicia únicamente el núcleo compartido. Los proyectos se inician explícitamente con `devbrain start <proyecto>` o su script autorizado.
- Los MCP stdio no son servicios HTTP y no se levantan manualmente con puertos.

## 3. Credenciales y seguridad

- Windows Credential Manager es la fuente preferida. Un `.env` local, ignorado y protegido solo se permite cuando el runtime lo requiere.
- Nunca guardar secretos en JSON/JSONC, Markdown, código, prompts, logs, snapshots, argumentos de comandos ni configuraciones de IDE.
- No leer, mostrar ni copiar el contenido de `.env` o credenciales salvo que la tarea lo requiera expresamente y exista un flujo seguro.
- Todo secreto expuesto se elimina de la superficie activa y se rota de forma coordinada.
- Antes de commit se ejecutan el detector de secretos y `validate-rules.ps1`.

## 4. Autonomía objetiva

- Investigar, leer, comparar, probar y diagnosticar proactivamente dentro del alcance solicitado.
- Modificar únicamente lo autorizado por la tarea. No reparar otros proyectos “en caliente”, no arrancar aplicaciones implícitamente y no hacer cambios destructivos por intuición.
- Si una decisión cambia arquitectura, datos, credenciales o alcance, presentar evidencia y detenerse cuando falte autoridad material.
- Informar resultado, alcance, verificación, riesgos y bloqueos; no afirmar éxito sin evidencia.

## 5. Código y calidad

- Código, identificadores y comentarios técnicos en inglés donde el repositorio ya lo use; comunicación al operador en español.
- No dejar código comentado, mocks que suplanten datos persistentes ni binarios en directorios de código.
- Go mínimo 1.25, módulos `github.com/devbrain/`, sin `panic()` en handlers y sin IP/puertos hardcodeados.
- Los errores para el operador deben ser claros, accionables y en español.
- Aplicar el estilo, pruebas, linters y `AGENTS.md` específicos del proyecto.
- **TDD Autónomo Obligatorio**: Al desarrollar una nueva lógica de negocio, función o corregir un bug, el agente debe escribir primero la prueba unitaria (Test) que demuestre el comportamiento esperado, y confirmar que falla, antes de escribir o modificar el código de la aplicación para hacerla pasar.

## 6. Arquitectura modular AI-first

- Antes de crear una funcionalidad o hacer un refactor estructural, identificar responsabilidades, límites, dependencias y criterios de cambio. Consultar Codebase Memory, verificar los archivos exactos y elegir el patrón más simple que resuelva las fuerzas reales del problema; documentar en `docs/architecture/` la decisión y sus alternativas cuando afecte más de un módulo.
- Organizar por funcionalidad o vertical slice como opción inicial. Usar capas, puertos y adaptadores/hexagonal, Clean Architecture, Strategy, Adapter, Repository, eventos u otro patrón solo cuando el dominio, las integraciones, la variabilidad o las pruebas lo justifiquen. Prohibido aplicar patrones por moda o crear abstracciones sin al menos un consumidor real.
- Cada archivo de implementación tiene una responsabilidad primaria y una capacidad pública principal: un caso de uso, servicio cohesivo, repositorio, adaptador, controlador/route group o componente principal por archivo. Funciones auxiliares privadas, pequeñas y no reutilizables pueden convivir con esa capacidad; si cambian por motivos distintos, se reutilizan o se prueban de forma independiente, deben extraerse.
- Cada funcionalidad vive en su propia carpeta y conserva juntos contratos, dominio/casos de uso, adaptadores o infraestructura, interfaz de entrada y pruebas. Ningún módulo importa detalles privados de otro; las dependencias apuntan hacia contratos estables, no hay ciclos y los entrypoints/controladores permanecen delgados, sin lógica de negocio.
- Presupuesto por defecto: objetivo de 250 líneas físicas por archivo de código y 40 por función/método; revisión obligatoria al superar 400/80. Son señales de diseño, no cuotas para fragmentar: antes de extraer se evalúan cohesión, complejidad, dependencias, ritmo de cambio, pruebas y costo de navegación. Se divide cuando hay responsabilidades o razones de cambio distintas; no para cumplir un número creando archivos triviales. Un presupuesto diferente debe estar justificado por las fuerzas del proyecto en `docs/architecture/`, y nunca autoriza un archivo monolítico ni debilita el ratchet del legado. Un componente UI exporta un componente principal. Código generado, migraciones declarativas y fixtures documentados pueden exceptuarse; toda excepción manual requiere justificación, propietario y plan de reducción en `docs/architecture/exceptions.md`.
- Un archivo que ya supera el límite no recibe una funcionalidad nueva: primero se extrae el seam afectado. Si se toca por un bug urgente, no puede crecer y debe registrarse la deuda. Ejecutar `Test-DevBrainModularity.ps1 -Path <proyecto> -ChangedOnly -FailOnViolations` antes del cierre.
- Diseñar para trabajo incremental con IA: nombres explícitos, interfaces pequeñas, efectos laterales aislados, estado global mínimo, pruebas junto al módulo, contratos de entrada/salida visibles y cambios atómicos que puedan verificarse sin cargar toda la aplicación. Tras mover límites o dependencias, refrescar Codebase Memory.
- En un proyecto nuevo, `New-DevBrainProject.ps1` crea la estructura modular inicial. No crear un archivo monolítico como punto de acumulación futura (`app`, `utils`, `helpers`, `manager`, `service` o `index`) sin límites y responsabilidad documentados.
- El handoff de un cambio estructural informa: patrón y justificación, árbol afectado, responsabilidad por archivo, contratos y dirección de dependencias, pruebas/comandos, deuda o excepciones y resultado de `Test-DevBrainModularity.ps1 -ChangedOnly`.

### 6.1 Higiene de repositorio y límites de artefactos

- Cada proyecto mantiene una sola raíz por aplicación y runtime. Para un monorepo web, el código de aplicación vive en `backend/` y `frontend/`; las copias históricas, validaciones temporales y raíces con nombres alternativos (`BackFinca`, `VillaLuzFront`, `*_copy`, `restored_*`) no son fuentes válidas y deben eliminarse o moverse a una cuarentena ignorada.
- La raíz del repositorio solo contiene configuración, documentación de entrada, composición y entrypoints explícitos. Los scripts viven en `scripts/` o en una carpeta operativa del módulo; los logs, resultados, PIDs, bases locales, volcados, artefactos de build y archivos comprimidos no viven junto al código fuente.
- Todo proceso que genere un reporte debe resolver una ruta absoluta desde el proyecto y escribir bajo `test-results/`, `maintenance/` o `artifacts/`. Nunca debe depender del directorio actual ni crear `*_report.json`, `*.log`, `*.pid`, `*.db`, `restored_*` o copias completas en la raíz.
- Las copias de seguridad del código se resuelven con Git y un remoto. Las bases de datos se respaldan mediante dumps externos, cifrados y con checksum; el destino por defecto debe estar fuera del repositorio. Una herramienta de restauración debe rechazar destinos dentro del proyecto y restaurar primero en una carpeta externa de inspección.
- Todo proyecto debe tener una guardia de estructura local además de `Test-DevBrainRepoHygiene.ps1` y `Test-DevBrainModularity.ps1`. El hook/CI debe bloquear raíces duplicadas, archivos sueltos no permitidos, referencias a rutas eliminadas y crecimiento de archivos que ya superan el presupuesto.
- Antes de mover una carpeta se actualizan imports, entrypoints, compose, hooks, documentación activa y scripts. Después se ejecutan compilación/importación, pruebas afectadas, guardias de higiene y modularidad, y se refresca Codebase Memory. Los documentos históricos pueden conservar nombres antiguos si están fechados y marcados como históricos; no pueden ser consumidos por automatizaciones.
- La organización se hace por responsabilidad y funcionalidad, no por acumular `utils`, `helpers`, `misc` o `temp`. Un archivo temporal se archiva con fecha o se elimina tras verificar que no tiene referencias. Los scripts de mantenimiento se promueven a código mantenido solo cuando tienen propietario, propósito, entrada/salida documentada y prueba mínima.

## 7. UI, legibilidad y Colombia

- Interfaz en español de Colombia (`es-CO`), con fechas y números que declaren el locale.
- Nunca truncar contenido con `text-overflow: ellipsis` como primera opción: antes de perder texto hay que ajustar el tamaño de la letra al espacio disponible. Cuando la caja no puede crecer de alto (celdas, listas, chrome compacto), se encoge primero y solo se recortan los caracteres que aún no quepan. La reducción tiene un suelo absoluto de legibilidad (11 px); por debajo se recorta o se envuelve, nunca se sigue encogiendo.
- Una palabra nunca se parte a la mitad: lo que cede es el tamaño de la letra. Prohibidos `word-break: break-word`, `word-break: break-all` y la clase `break-all` sobre texto en lenguaje natural, porque reducen `min-content` a un carácter y el contenedor se encoge por debajo de la palabra. Para texto que no cabe se usa ajuste tipográfico al contenedor (`FitText`/`useFitText` o `clamp()` con unidades `cqi`); el corte a la brava solo se autoriza explícitamente y en cadenas sin espacios (identificadores, hashes, URLs, correos).
- Mobile-first desde 320 px y soporte hasta 2560 px. Usar `clamp()`, Grid con `minmax()` y breakpoints ascendentes.
- La responsividad se valida por la capacidad real de cada componente, no solo por el ancho del viewport ni por la ausencia de overflow en la página. Rejillas y filas con texto o controles esenciales deben reestructurarse antes de comprimir su contenido: preferir `auto-fit` con `minmax(min(100%, <ancho-legible>), 1fr)`, consultas de contenedor, `min-width: 0` en hijos flex/grid y acciones en una fila adicional cuando falte espacio. Prohibido aceptar títulos, rutas, etiquetas o valores reducidos a una columna de una letra. Verificar contenido largo, 200 % de zoom y 320, 390, 768, 1440, 1920 y 2560 px mediante inspección renderizada del componente, no únicamente con análisis estático.
- Tablas y bloques de código: scroll horizontal seguro; bloques de código con `white-space: pre-wrap` y `word-break: break-word`.
- Contraste suficiente, fondos sólidos para texto y estados legibles sin depender solo del color.
- En HTML, escapar `<` y `>` dentro de ejemplos de código y cerrar siempre `<textarea></textarea>`.

## 8. Verificación y sincronización

1. Después de editar este archivo: `./sync-rules.ps1 -Apply`.
2. Antes de commit: `./validate-rules.ps1` y el hook anti-secretos.
3. Tras cambios DevBrain: sincronizar conocimiento en modo estricto, validar configuración canónica, sincronizar IDEs y ejecutar las pruebas MCP.
4. Verificar el gateway en `/health`, los puertos canónicos y el contexto de tareas representativas.
5. Un fallo de validación bloquea el commit; un hook posterior solo actualiza índices y nunca sustituye la validación previa.

## 9. Registro automático de proyectos (v8.7 Zero-Touch)

- Todo proyecto nuevo alojado en `_projects/` o en la raíz de Aplicaciones debe ser registrado automáticamente en el ecosistema.
- El registro se activa de forma transparente mediante el auto-descubrimiento en `Sync-DashboardProjects.ps1`, el arranque del ecosistema (`START-DEVBRAIN.ps1`) y el script `New-DevBrainProject.ps1`.
- Al crear una nueva carpeta o proyecto bajo `_projects/`, el agente debe asegurar que el auto-registro complete la sincronización en `_core/config.yml`, `port-registry.json`, `devbrain-runtime-manifest.json` y PostgreSQL `master_db`.

## 10. Creación de Guías y Recursos Educativos (DevBrain Learner SDK)

- Toda nueva guía interactiva o recurso educativo creado en la plataforma debe utilizar obligatoriamente el `devbrain-learner-sdk` (vía IIFE bundle o importación ES6).
- **Prohibido** crear o copiar archivos manuales como `gamification.js` o lógica de simuladores duplicada. Todo el manejo de XP, logros, navegación (SPA) y persistencia debe inicializarse centralmente mediante `window.DevBrainSDK.createApp()`.
- Al recibir una petición para construir o mejorar una guía, DevBrain debe inyectar automáticamente este SDK e instanciar la plataforma consumiendo sus herramientas nativas (Builders y Simuladores).
- El agente debe auto-seleccionar el contexto, skills y herramientas relevantes para guías interactivas sin necesidad de que el operador lo exija explícitamente.

Este archivo es el estándar de desarrollo distribuido a los proyectos. No reemplaza las fuentes de autoridad operativa indicadas en la sección 1.
