# Requisitos y escenarios BDD

- Dada una instalación nueva con administrador activo, cuando inicia el bootstrap, entonces persiste exactamente los doce grupos del catálogo; al repetirlo o concurrir cuatro workers no duplica registros.
- Dado un grupo editado o adicional, cuando se ejecuta el catálogo, entonces conserva su identidad, campos y propietario.
- Dado un proyecto sin archivos, cuando se consulta su expediente, entonces aparecen seis etapas y sus faltantes, con completitud 0 %.
- Dado un proyecto de cuatro meses, cuando se adjuntan informes duplicados para el primer bimestre, entonces el segundo bimestre continúa pendiente.
- Dado un expediente completo con archivos reales, cuando se descarga, entonces el ZIP contiene las seis carpetas, originales sin colisiones y diagnóstico.
- Dado un documento cuyo archivo no existe, cuando se evalúa el expediente, entonces no satisface su etapa.
- Dado un aprendiz ajeno al proyecto, cuando consulta o descarga su expediente, entonces recibe 403; una entidad inexistente recibe 404.
- Dado un informe sin período válido o una asociación grupo/semillero incompatible, cuando se guarda, entonces recibe 422 sin persistencia parcial.
- Dado un fallo SQL al guardar un archivo, cuando se revierte, entonces no queda registro ni archivo nuevo.
- Dado un fallo SQL durante la finalización, cuando se revierte, entonces se conservan el estado anterior y la ausencia de actividad/notificaciones del cierre.
- Dado un proyecto completo, cuando una misma actualización solicita finalizarlo y retirar su presupuesto, entonces se rechaza y se revierten ambos valores.
- Dado un fallo al eliminar una entidad, cuando se revierte, entonces conserva sus documentos y archivos.
