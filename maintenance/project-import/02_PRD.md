# Requisitos de importación de formulaciones

## Escenario 1: revisar sugerencias

```gherkin
Feature: Importar una formulación CAP
  Scenario: Personal revisa un DOCX CAP válido
    Given que inició sesión con un rol distinto de aprendiz
    And selecciona una formulación DOCX de hasta 10 MB
    When la aplicación analiza su contenido
    Then propone el título, el objetivo general, los objetivos específicos y las secciones narrativas reconocidas
    And permite corregir esos datos en el formulario antes de guardarlos
    And conserva los valores ya diligenciados si se analiza otro archivo
```

## Escenario 2: crear y conservar el original

```gherkin
  Scenario: Crear el proyecto con datos corregidos
    Given que la persona revisó el formulario y conservó el DOCX seleccionado
    When confirma la creación
    Then la aplicación crea el proyecto con los valores revisados
    And adjunta el DOCX como formulación del proyecto
    And permite descargar el DOCX desde el Expediente del proyecto
```

## Escenario 3: archivo no válido

```gherkin
  Scenario: Rechazar archivos no compatibles
    Given que selecciona un archivo distinto de DOCX, dañado o mayor de 10 MB
    When la aplicación valida el archivo
    Then muestra qué condición impidió la lectura
    And no crea el proyecto ni el documento adjunto
```

## Escenario 4: permiso y persistencia

```gherkin
  Scenario: Evitar importación por aprendices
    Given que inició sesión como aprendiz
    When intenta analizar o guardar una formulación
    Then el servidor responde con acceso denegado
```

## Límite de cumplimiento institucional

Los DOCX CAP aportados sirven como fuente para sugerir datos y conservar el archivo original. La importación no certifica que el proyecto cumpla los lineamientos vigentes ni reemplaza su registro institucional. Para la vigencia 2026, la [Circular 3-2025-000188](https://www.sena.edu.co/es-co/Documents/cir_01-3-2025-000188.pdf) describe tipologías y fases de formulación. La [Circular 3-2026-000074](https://www.sena.edu.co/es-co/Documents/cir_01-3-2026-000074.pdf) precisa el uso y seguimiento en SENAVANCE para proyectos financiados con recursos de la Ley 344 de 1996. No se debe aplicar este flujo automáticamente a proyectos con otra fuente de financiación. La validación del formato requiere confirmar la convocatoria, su fuente de recursos, la tipología y la plantilla oficial vigente.
