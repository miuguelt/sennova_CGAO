# Criterios de aceptación

```gherkin
Característica: Incorporar archivos al expediente
  Escenario: Importar una carpeta de proyecto
    Dado un investigador con acceso al proyecto abierto
    Cuando analiza un ZIP con subcarpetas y confirma los archivos revisados
    Entonces se conservan los originales y las rutas dentro de ese proyecto
    Y se completan únicamente los campos vacíos reconocidos

  Escenario: Continuar el diligenciamiento
    Dado un expediente con documentos y datos ya guardados
    Cuando se cargan archivos independientes
    Entonces los datos existentes permanecen intactos
    Y las diferencias se informan para revisión
    Y los documentos se pueden generar desde los formularios persistidos

  Escenario: Fallo durante el registro
    Cuando falla la escritura de los archivos o de la base de datos
    Entonces se revierte el registro y se retiran los archivos nuevos de esa transacción
```
