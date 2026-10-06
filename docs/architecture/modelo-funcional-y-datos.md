# Modelo funcional y de datos de SENNOVA CGAO

**Estado:** descripción técnica derivada del modelo y las rutas de la aplicación. No representa un diseño aprobado por el equipo de CAP-14 ni fija requisitos institucionales.

**Actualizado:** 5 de octubre de 2026.

## Alcance funcional observado

| Módulo | Responsabilidad comprobable | Componentes principales |
|---|---|---|
| Proyectos | Registrar proyectos de investigación, objetivos, estado, responsables y relaciones institucionales. | `frontend/src/components/projects/ProyectosModule.jsx`; `backend/app/routers/proyectos.py` |
| Cronogramas y entregables | Asociar tareas, fechas, responsables, estado y, cuando aplica, un producto al proyecto. | `frontend/src/components/deliverables/CronogramaModule.jsx`; `backend/app/routers/entregables.py` |
| Productos | Registrar productos, investigador responsable, evidencia y proyecto relacionado. | `frontend/src/components/products/ProductosModule.jsx`; `backend/app/routers/productos_query.py`; `backend/app/routers/productos_commands.py` |
| Documentación y evidencias | Cargar, consultar, revisar y descargar documentos asociados al proyecto, producto o usuario. | `frontend/src/components/projects/ProjectDocumentationEditor.jsx`; `backend/app/routers/project_documentation.py`; `backend/app/routers/documentos.py` |
| Consultas e indicadores | Consultar consolidados de proyectos, grupos, productos, semilleros y talento; descargar la matriz descriptiva de indicadores. | `frontend/src/components/reports/ReportesModule.jsx`; `backend/app/routers/reportes.py`; `backend/app/services/minciencias_indicator_workbook.py` |
| Estructura de investigación | Mantener usuarios, grupos, semilleros, convocatorias y retos relacionados con los proyectos. | Modelos correspondientes en `backend/app/models.py`; routers por módulo en `backend/app/routers/` |

Este mapa refleja componentes encontrados en el repositorio. La lista de perfiles, permisos, aprobadores, integraciones y criterios de aceptación de CAP-14 requiere confirmación del equipo del proyecto.

## Modelo de datos

El siguiente diagrama resume las claves foráneas declaradas en `backend/app/models.py`. `DOCUMENTOS.entidad_tipo` y `DOCUMENTOS.entidad_id` forman una referencia polimórfica y no una clave foránea. El diagrama se limita a las entidades que dan soporte directo a la gestión de investigación.

```mermaid
erDiagram
    USERS ||--o{ PROYECTOS : lidera
    USERS }o--o{ PROYECTOS : participa
    PROYECTOS ||--o{ PROYECTO_EQUIPO : integra
    USERS ||--o{ PROYECTO_EQUIPO : participa
    CONVOCATORIAS o|--o{ PROYECTOS : financia
    GRUPOS o|--o{ PROYECTOS : orienta
    SEMILLEROS o|--o{ PROYECTOS : vincula
    RETOS o|--o{ PROYECTOS : origina
    GRUPOS ||--o{ SEMILLEROS : organiza
    USERS }o--o{ GRUPOS : integra
    USERS }o--o{ SEMILLEROS : investiga
    SEMILLEROS o|--o{ RETOS : recibe
    PROYECTOS o|--o{ PRODUCTOS : agrupa
    USERS ||--o{ PRODUCTOS : registra
    PROYECTOS ||--o{ ENTREGABLES : programa
    USERS o|--o{ ENTREGABLES : responde
    PRODUCTOS o|--o{ ENTREGABLES : evidencia
    USERS ||--o{ DOCUMENTOS : carga
    USERS ||--o{ ACTIVIDADES : genera
    USERS o|--o{ AUDIT_LOGS : audita

    USERS {
        uuid id PK
        string email
        string nombre
        string rol
        boolean is_active
    }
    CONVOCATORIAS {
        uuid id PK
        string nombre
        string fuente
        uuid owner_id FK
    }
    GRUPOS {
        uuid id PK
        string nombre
        string codigo_gruplac
        string clasificacion
        uuid owner_id FK
    }
    SEMILLEROS {
        uuid id PK
        string nombre
        string sigla
        uuid grupo_id FK
        uuid owner_id FK
    }
    RETOS {
        uuid id PK
        string titulo
        string estado
        uuid semillero_asignado_id FK
        uuid owner_id FK
    }
    PROYECTOS {
        uuid id PK
        string codigo_sgps
        string nombre
        string estado
        text objetivo_general
        uuid convocatoria_id FK
        uuid grupo_id FK
        uuid semillero_id FK
        uuid reto_origen_id FK
        uuid owner_id FK
    }
    PROYECTO_EQUIPO {
        uuid proyecto_id PK, FK
        uuid user_id PK, FK
        string rol_en_proyecto
        int horas_dedicadas
    }
    PRODUCTOS {
        uuid id PK
        string tipo
        string nombre
        date fecha_publicacion
        int anio_reporte "campo del modelo: año_reporte"
        uuid proyecto_id FK
        uuid owner_id FK
    }
    ENTREGABLES {
        uuid id PK
        string fase
        string titulo
        date fecha_entrega
        string estado
        uuid proyecto_id FK
        uuid responsable_id FK
        uuid producto_id FK
    }
    DOCUMENTOS {
        uuid id PK
        string entidad_tipo
        uuid entidad_id
        string tipo
        string nombre_archivo
        string file_path
        int periodo_bimestre
        uuid owner_id FK
    }
    ACTIVIDADES {
        uuid id PK
        uuid user_id FK
        string tipo_accion
        string entidad_tipo
        uuid entidad_id
        datetime created_at
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string method
        string endpoint
        int status_code
        datetime created_at
    }
```

### Notas de lectura

- `PROYECTO_EQUIPO`, `GRUPO_INTEGRANTES` y `SEMILLERO_INVESTIGADORES` son tablas de asociación. El diagrama muestra las dos últimas como relaciones muchos-a-muchos para facilitar la lectura.
- Un proyecto puede no tener grupo, semillero, convocatoria, reto, productos o algunos responsables. Las claves foráneas correspondientes admiten valores vacíos, salvo las marcadas como obligatorias en el código.
- `DOCUMENTOS.entidad_id` puede apuntar a distintos tipos de entidad y no tiene integridad referencial declarada por base de datos. La API valida el destino y los permisos.
- `ACTIVIDADES` y `AUDIT_LOGS` son registros técnicos de uso y auditoría. No representan una bitácora narrativa del proyecto.
- Los informes finales hacen parte de la documentación de proyectos. Los documentos nuevos se gestionan en `DOCUMENTOS`; `proyectos.informe_final_path` se conserva como campo heredado.

## Retiro de la función ajena de bitácora

La función de bitácoras y los formatos de seguimiento de etapa productiva no hacen parte del alcance confirmado de CAP-14. El modelo vigente ya no registra `BitacoraEntry` ni define `formato_bitacora_path` o `formato_seguimiento_path`. La inicialización de la aplicación elimina esos campos heredados y la tabla `bitacora_entries` de una base existente. Esto borra las filas de esa bitácora al aplicar la migración; conserva los registros generales de auditoría, actividad, documentos de proyecto e informes finales. Los archivos físicos que pudieran estar referenciados en el campo heredado `adjuntos` no se borran automáticamente: primero se debe comprobar que cada ruta pertenece únicamente a una bitácora.

Las cargas nuevas del antiguo tipo `evidencia_bitacora` se rechazan y las notificaciones históricas se dirigen al listado de proyectos. Ese manejo evita reactivar rutas retiradas y mantiene accesibles las notificaciones anteriores.

## Confirmaciones pendientes

Antes de declarar terminado el diseño de CAP-14, el equipo debe validar el modelo frente a los requisitos aprobados, los perfiles y permisos, las reglas de revisión, los periodos de informes, la edición aplicable de Minciencias y cualquier integración externa requerida. Este documento describe la aplicación actual y no sustituye esa revisión.
