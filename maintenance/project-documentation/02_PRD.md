# Criterios de aceptación

```gherkin
Escenario: Construir documentos desde información persistida
  Dado un investigador con acceso al proyecto
  Cuando guarda datos comunes y los campos de un documento
  Entonces la información se conserva después de volver a consultar
  Y la aplicación identifica los campos pendientes antes de generar

Escenario: Generar y descargar
  Dado un formulario completo y su revisión vigente
  Cuando el investigador genera el documento
  Entonces se guarda un archivo DOCX o PPTX válido y una versión con snapshot y SHA256
  Y puede descargarlo individualmente o dentro del ZIP de seis carpetas

Escenario: Guardado concurrente
  Dado que otra persona guardó una revisión nueva
  Cuando se envía la revisión anterior
  Entonces el servidor responde 409 sin sobrescribir datos
  Y el editor conserva los campos locales para conciliarlos

Escenario: Cierre parcial
  Dado un acta de cierre parcial generada
  Cuando se registra la revisión de su contenido
  Entonces no satisface el acta de cierre final ni finaliza el proyecto

Escenario: Error de almacenamiento o base de datos
  Cuando falla la creación de una versión
  Entonces no queda una versión ni un documento confirmado
  Y se retira solamente el archivo creado por esa operación

Escenario: Acceso del aprendiz
  Dado un aprendiz autorizado en el proyecto
  Entonces puede consultar y descargar
  Pero no puede guardar, generar ni registrar revisiones
```

Nueve tipos: formulación, presentación, inicio, resultado de producto, póster, informe por bimestre, cierre, informe final y registro de evidencias. Un índice de evidencias no sustituye fotografías o videos reales.
