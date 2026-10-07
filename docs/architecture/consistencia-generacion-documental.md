# Consistencia de los formularios y de los archivos generados

Los formularios y el catálogo siguen siendo la fuente de los campos de cada formato. La generación usa los datos guardados del proyecto, sus comunes y el borrador específico. Esta revisión conserva los contratos y las tablas existentes; no añade campos ni modifica el esquema de persistencia.

`generation_pending` normaliza los valores antes de evaluar los campos obligatorios. Comprueba las horas de las reuniones en formato `HH:MM`, su orden, la coincidencia del presupuesto planeado con el total y los períodos de los informes. Cada bimestre se calcula desde el día de inicio del proyecto mediante meses calendario; el último período se limita a la fecha de terminación. Un cierre final abarca todo el período del proyecto, concilia su presupuesto planeado y exige registrar cada gasto real o explicar el monto pendiente. La fecha de su reunión debe ser igual o posterior al fin del período cerrado.

El editor, la generación de versiones y el conteo de documentos listos utilizan la misma comprobación. Los formularios pueden guardar información parcial y corregirla después. Los valores heredados ilegibles se muestran como pendientes y advertencias, de modo que el editor permanece disponible para corregirlos.

Las diferencias con la fuente permiten producir borradores para validación, pero conservan la restricción existente para registrarlos como revisados. Los nueve tipos documentales incluyen el aviso que se haya registrado en `inconsistencias_fuente`. Las actas mantienen las firmas vacías y la generación no acredita ejecución, aceptación ni aprobación institucional.

La versión de representación del snapshot pasa a `2`. Los archivos producidos con la representación anterior quedan disponibles en el historial, pero se deben generar de nuevo para considerarlos vigentes. Esto evita reutilizar un archivo que no contiene los campos incorporados en esta revisión.

La presentación conserva el equipo, el presupuesto y el cronograma como tablas editables, junto con los datos institucionales y las fechas. El póster identifica la regional, el producto y todos los autores; el contenido que excede la primera lámina continúa en láminas adicionales. El informe final conserva la plantilla GCDTP-F-023 V01 y agrega los datos comunes complementarios después de sus apartados principales. Las salidas de divulgación omiten los documentos de identidad y los datos de contacto opcionales del equipo.

El informe final conserva los enlaces y los títulos del índice, pero retira las páginas almacenadas en la plantilla: la paginación cambia con el contenido registrado y no se dispone de un cálculo fiel durante la generación. Sus filas de tabla permanecen juntas para evitar etiquetas partidas entre páginas. Los encabezados complementarios se añaden en negro, sin modificar los estilos del formato fuente. Una tabla opcional vacía indica que no se registraron filas; no se presenta como un campo pendiente obligatorio.

Se conserva una sola validación en el servicio de estado y se reutiliza desde el servicio de progreso. Duplicar las comprobaciones en la interfaz o alterar los porcentajes habría permitido que un documento figurara como listo aun cuando su generación fuera rechazada. No se cambia la ponderación del avance documental.

Las pruebas de regresión verifican rechazo de horas inválidas, períodos fuera del proyecto o de su bimestre, balances sin explicación, discrepancias presupuestales y recuperación de datos heredados. También leen los paquetes DOCX y PPTX de los nueve tipos para comprobar el aviso de fuente, los valores que antes se omitían y las reglas de presentación del informe final. Las pruebas pertenecen a la suite de backend que ejecuta la integración continua.
