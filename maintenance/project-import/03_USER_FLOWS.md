# Flujo de usuario para importar un proyecto

1. La persona abre **Iniciar Proyecto** y carga un archivo `.docx`.
2. La aplicación muestra la lectura en curso mientras valida y analiza el contenido.
3. La persona revisa los datos propuestos en las pestañas del formulario, corrige lo necesario y confirma.
4. La aplicación guarda el proyecto con el DOCX original y presenta confirmación.
5. Desde **Expediente**, las personas con acceso al proyecto consultan y descargan el DOCX fuente.

## Estados de la carga

- **Vacío:** explica qué se puede importar, muestra límite de tamaño y acción para seleccionar el archivo.
- **Cargando:** anuncia la lectura y presenta un esqueleto animado.
- **Listo:** informa los campos encontrados y advierte que se deben revisar.
- **Error:** explica la causa y ofrece reintentar o elegir otro archivo.
- **Reimportación:** completa campos vacíos y conserva los valores que la persona ya diligenció.
