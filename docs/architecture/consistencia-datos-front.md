# Consistencia de datos en el frontend

## Decisión

El backend es la fuente autoritativa de los datos de SENNOVA. Toda escritura confirmada (`POST`, `PUT`, `PATCH` o `DELETE`) realizada mediante `fetchAPI` publica el evento `sennova:data-refresh` con el endpoint y método que cambiaron.

`AppContent` escucha ese evento y cambia la clave de la vista activa. Esto desmonta y monta nuevamente el módulo visible, obligándolo a ejecutar sus consultas iniciales contra el backend. También se remonta el `Navbar`, que mantiene datos globales como notificaciones.

## Reglas de implementación

- El evento se emite únicamente después de recibir una respuesta exitosa, incluida una respuesta `204`.
- Las respuestas de error no disparan refrescos ni presentan datos como confirmados.
- Los módulos no deben tratar su estado local, estadísticas calculadas o resultados de búsqueda como fuente de verdad después de una mutación.
- Las nuevas cachés derivadas deben incluir una invalidación asociada al evento o al recurso que las alimenta.
- Las mutaciones deben pasar por `fetchAPI`; si un caso excepcional usa otro cliente HTTP, debe emitir `emitDataRefresh` después de confirmar la escritura.

## Cobertura

La estrategia aplica a dashboard, estadísticas, listados, perfiles, búsquedas, reportes y módulos relacionados. Una mutación de un recurso puede afectar más de una vista, por lo que el refresco se mantiene transversal y no depende únicamente del componente que inició la operación.
