# Espacio de trabajo documental

## Resultado y alcance

Al abrir un proyecto, el usuario entra directamente a la documentación en un espacio de ancho completo. Puede elegir cualquier sección sin completar las anteriores, guardar borradores y consultar ayudas opcionales. La navegación institucional inicial en Grupos se conserva.

## Plan de arquitectura

Se mantiene React 18, Vite, Tailwind, FastAPI, SQLAlchemy y PostgreSQL. El editor existente conserva las mutaciones, revisiones, permisos e invalidación central. Los componentes del espacio documental viven en `frontend/src/components/projects/`; las pruebas se integran en Vitest. La presentación responsiva usa un archivo CSS de la funcionalidad y consultas de contenedor para decidir si caben navegación y ayuda junto al editor.

El avance se calcula en el servicio de documentación del backend, a partir de requisitos guardados y versiones vigentes. El listado y el editor consumen el mismo resumen. Los entregables, el presupuesto y el estado administrativo no sustituyen el avance documental. El porcentaje no cuenta cambios locales sin guardar ni una casilla de autoevaluación como documento revisado.

Se extraen la orientación metodológica y la generación de archivos del componente de sección para reducir su tamaño. El catálogo institucional sigue definiendo los campos; no se reemplazan sus contratos ni se migran datos.

## Dependencias y aceptación

1. Datos: resumen documental calculado con requisitos del catálogo, estados y versiones; pruebas herméticas para vacío, borrador, generación, revisión y versiones desactualizadas.
2. Interfaz: apertura en Documentación, ancho completo, navegación libre, campos de escritura amplios y ayuda plegable; pruebas de interacción, guardado, errores, permisos y conservación de borradores.
3. Integración: cambios confirmados refrescan listado y resumen. Suite completa, cobertura de funciones, compilación y revisión visual en 320, 390, 768, 1440, 1920 y 2560 px, con contenido largo y ampliación equivalente al 200 %.

Se descarta rehacer la aplicación o cambiar su almacenamiento: los límites existentes ya permiten conservar la persistencia y rediseñar la experiencia de construcción.

## Evidencia de verificación

El backend aprobó 430 pruebas y la compuerta global de 465/465 funciones. El frontend aprobó 614 pruebas; la suite complementaria de contratos de API y la compuerta conjunta acreditaron 2325/2325 funciones. La compilación de producción y el gate WorkingTree pasaron. La integración continua existente ejecuta las suites y sus compuertas de cobertura. La verificación final incorporó la depuración documental realizada simultáneamente en el mismo repositorio. Los informes propios del frontend se escribieron en `test-results/redisenio-coverage/` para evitar conflictos con ejecuciones paralelas.

La revisión en Chromium autenticado recorrió Grupo → Proyectos → Documentación, con datos persistidos de CAP-14-2026. Se verificaron 320, 390, 768, 1440, 1920 y 2560 px, tanto con la guía cerrada como abierta: no hubo desbordamiento horizontal. A 1920 px, la escritura obtuvo 1528 px sin guía y 1056 px con guía. Los campos conservaron texto de 16 px y ocho filas. La navegación por teclado permaneció dentro del panel. Se verificaron 33 botones visibles del espacio con altura y ancho mínimos de 44 px. También se comprobó el diseño con un área de 960 × 540 px, equivalente al espacio disponible al ampliar al 200 % una pantalla de 1920 × 1080 px.

Los borradores sin guardar se conservan al cambiar de pestaña y bloquean la generación de archivos, incluida la identificación. La consulta externa no sustituye una identificación editada; el guardado conserva el título recién enviado. Los porcentajes solo se actualizan con la respuesta del servidor.
