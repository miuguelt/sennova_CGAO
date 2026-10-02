# Límites de integración con módulos heredados

El constructor documental mantiene sus componentes, rutas, estado, validación, comandos y adaptadores en archivos independientes. No se autorizan archivos nuevos de producción por encima del máximo de 400 líneas. La revisión de modularidad motivó separar el generador Office en tres responsabilidades: contrato y DOCX, adaptador PPTX, y representación de valores compartidos.

| Módulo heredado | Alcance y deuda | Responsable y reducción |
| --- | --- | --- |
| `frontend/src/components/projects/ProyectosModule.jsx` | Sigue concentrando listado, edición y detalle. El expediente y el constructor se consumen como componentes separados; el arreglo de Referencia conserva el estado recibido. | Mantenimiento de proyectos. Antes de ampliar su lógica de edición o diagnóstico, extraer el detalle y su estado en un componente y un hook propios, con sus contratos y pruebas existentes. No agregar nuevos formularios al archivo. |
| `backend/app/models.py` | Mantiene las entidades heredadas; los tres modelos de autoría viven en `documentation_models.py`. La importación al final registra el módulo en el mismo metadata. | Mantenimiento de persistencia. Cualquier nueva entidad documental debe permanecer en el módulo documental; separar las entidades heredadas por dominio en una tarea que preserve metadata, imports y relaciones. |
| `backend/app/routers/proyectos.py` y `documentos.py` | Conservan rutas anteriores y los puntos de integración del expediente. La autoría tiene router propio y sus reglas están en servicios documentales. | Mantenimiento de API. Antes de ampliar cargas, borrado o cierre, extraer el caso de uso afectado a un servicio transaccional y mantener la ruta como validación y delegación. Conservar pruebas de rollback, permisos y archivos. |

La compuerta de modularidad reporta estos límites del legado como avisos y no certifica una reorganización de toda la aplicación. Los cambios concurrentes ajenos a este alcance se conservaron. Este registro describe deuda y su responsabilidad; no aumenta los límites ni sustituye las compuertas.
