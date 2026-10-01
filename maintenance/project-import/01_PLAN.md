# Plan de importación de formulaciones de proyecto

## Objetivo

Permitir que personal autorizado cargue una formulación CAP en DOCX, use sus datos para iniciar un proyecto y revise las sugerencias antes de guardarlas.

## Alcance

- Leer título, objetivos y secciones narrativas de un DOCX CAP.
- Mostrar un estado de lectura y conservar el documento fuente como soporte del proyecto.
- Rechazar archivos distintos de DOCX, dañados o mayores de 10 MB.
- Guardar proyecto y soporte en una sola transacción lógica.
- Mantener la creación manual de proyectos disponible.

## Criterios de cierre

- La persona puede corregir las sugerencias antes de confirmar.
- El archivo original queda ligado al proyecto.
- Aprendices no pueden analizar ni importar formulaciones.
- Las pruebas de backend y frontend y sus compuertas de cobertura pasan.
