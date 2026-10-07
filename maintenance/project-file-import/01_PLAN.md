# Plan de importación del expediente

Resultado: incorporar fuentes existentes al proyecto abierto y reutilizar sus datos en el constructor documental.

1. Analizar ZIP o archivos sueltos sin escrituras.
2. Mostrar originales, clasificación, períodos y datos reconocidos para revisión.
3. Registrar originales y campos vacíos en una sola transacción, conservando procedencia y diferencias.
4. Descargar archivos individuales o reconstruir carpetas en el ZIP; generar versiones desde los datos persistidos.
5. Comprobar límites, permisos, reversión, conservación y recorrido integral, con PostgreSQL aislado y revisión visual.

Los contratos y responsabilidades están en `docs/architecture/importacion-expediente.md`.
