# Paquete de referencia SENNOVA

Proyecto: **Fortalecimiento de los procesos de organización documental en entidades territoriales y públicas de la provincia de Vélez (referencia de validación)**  
Identificador: `78e4abca-1248-53e9-b2f1-cfeeac9629a3`  
Corte de datos: 2026-10-04

## Contenido

- `fuentes_originales/`: 9 archivos asociados en SENNOVA, copiados sin modificar. Los hashes SHA-256 se encuentran en `manifest.json`.
- `muestras_exactas/`: 6 documentos Word o PowerPoint fuente, conservados byte a byte para comparar su formato.
- `borradores_generados/`: 16 documentos, uno por cada formulario documental configurado para esta referencia.
- `manifest.json`: fuentes, huellas, estrategia de renderizado y campos pendientes.

## Estado del paquete

Los archivos usan los datos vigentes de SENNOVA y no modifican la base ni crean versiones. **5 de 16 slots** son copias exactas de una muestra adjunta al proyecto. El informe final usa la plantilla GCDTP-F-023 V01 de muestra y la completa con los datos actuales. Los otros tipos o períodos sin muestra se renderizan con la lógica de la aplicación.

El manifest registra **802 pendientes de campo**. El generador oficial de la aplicación bloquea el guardado de versiones hasta completar los campos obligatorios. Se completó Regional como «Santander» a partir de la carta de aval adjunta. En las salidas del renderer, los faltantes aparecen como «Pendiente por diligenciar». No se inventaron códigos SGPS, productos, fechas, montos ni evidencias.

Los slots con `identico_a_muestra: true` son copias byte a byte de fuentes que ya estaban guardadas en SENNOVA; no representan nuevas versiones. Los slots con `usa_plantilla_muestra: true` usan el formato GCDTP-F-023 V01 y completan sus campos actuales. Los documentos creados por renderer programático son borradores, no están revisados ni firmados y no se declaran visualmente idénticos a una muestra ausente. Ningún documento de este paquete está listo para radicar.
