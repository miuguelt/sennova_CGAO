# Contratos de autoría documental

GET /proyectos/{id}/documentacion expone contexto autoritativo, campos comunes, formularios por documento, pendientes y versiones. PUT /documentacion/comunes y PUT /documentacion/borradores/{clave} exigen revision y datos. POST /documentacion/generar/{clave} exige revisiones del formulario y de datos comunes. POST /documentacion/revisar/{documento_id} registra la revisión del contenido.

Los UUID, la existencia del proyecto y el permiso se verifican antes del acceso. Los campos usan catálogo declarativo con tipos, ayudas, columnas y exigencias. Se validan fechas, límites, números finitos, filas, opciones y campos desconocidos. Los valores monetarios complementarios se guardan como cadenas decimales exactas.

La generación conserva snapshot de contexto, campos comunes y formulario, versión de plantilla y SHA256 del archivo. Bloquea transaccionalmente el proyecto para serializar las versiones. Los archivos se crean exclusivamente y se retiran en un fallo de persistencia. La revisión requiere datos y archivo vigentes. Las mutaciones refrescan las vistas mediante la estrategia central existente.

Los renderizadores son deterministas respecto del contenido y no consultan la base de datos. No inventan resultados, fechas, enlaces, firmas o aprobación institucional.
