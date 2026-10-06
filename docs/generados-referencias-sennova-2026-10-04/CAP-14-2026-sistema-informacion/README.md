# Paquete de referencia SENNOVA

Proyecto: **CAP-14-2026 Sistema de información para la gestión de proyectos de investigación del CGAO (referencia de validación)**  
Identificador: `2f8ac792-c560-524c-8962-95a8a3236e0b`  
Corte de datos: 2026-10-04

## Contenido

- `fuentes_originales/`: 5 archivos asociados en SENNOVA, copiados sin modificar. Los hashes SHA-256 se encuentran en `manifest.json`.
- `muestras_exactas/`: 5 documentos Word o PowerPoint fuente, conservados byte a byte para comparar su formato.
- `borradores_generados/`: 11 documentos, uno por cada formulario documental configurado para esta referencia.
- `manifest.json`: fuentes, huellas, estrategia de renderizado y campos pendientes.
- `contenido_propuesto_cap14.md`: redacción sugerida para vacíos narrativos, indicadores propuestos y datos que requieren confirmación.
- `trazabilidad_cap14_objetivos.md`: cruce de los seis objetivos con módulos del repositorio y protocolo propuesto para validar el sistema con usuarios.

## Estado del paquete

Los archivos usan los datos vigentes de SENNOVA y no modifican la base ni crean versiones. **4 de 11 slots** son copias exactas de una muestra adjunta al proyecto. El informe final usa la plantilla GCDTP-F-023 V01 de muestra y la completa con los datos actuales. Los otros tipos o períodos sin muestra se renderizan con la lógica de la aplicación.

El manifest registra **404 pendientes de campo**. El generador oficial de la aplicación bloquea el guardado de versiones hasta completar los campos obligatorios. Se extrajeron del DOCX de formulación el referente teórico, las referencias y dos resultados esperados; el título y los objetivos se dejaron como estaban porque difieren entre el registro y la fuente. En las salidas del renderer, los faltantes aparecen como «Pendiente por diligenciar». No se inventaron códigos SGPS, productos, fechas, montos ni evidencias.

Los slots con `identico_a_muestra: true` son copias byte a byte de fuentes que ya estaban guardadas en SENNOVA; no representan nuevas versiones. Los slots con `usa_plantilla_muestra: true` usan el formato GCDTP-F-023 V01 y completan sus campos actuales. Los documentos creados por renderer programático son borradores, no están revisados ni firmados y no se declaran visualmente idénticos a una muestra ausente. Ningún documento de este paquete está listo para radicar.

El archivo `contenido_propuesto_cap14.md` es un borrador separado de las fuentes originales. Sus textos e indicadores se deben revisar; las metas se identifican como propuestas y no rellenan los 404 campos pendientes del manifest. La aplicación también permite descargar una matriz Excel por investigador desde **Reportes > Consolidados > Indicadores de clasificación**; la matriz es descriptiva y no calcula una clasificación oficial.

El archivo `trazabilidad_cap14_objetivos.md` distingue presencia de código, validación automatizada y aceptación institucional. El protocolo allí incluido es una propuesta: debe aprobarse con los responsables antes de convocar participantes o registrar resultados.
