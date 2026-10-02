# Persistencia y permisos

La tecnología vigente es PostgreSQL con autorización en FastAPI; este cambio no migra la arquitectura a Supabase. La columna nueva es `documentos.periodo_bimestre INTEGER NULL`. Su migración comprueba la existencia de tabla y columna antes de agregarla y conserva datos heredados.

Las relaciones de proyecto a grupo, semillero, convocatoria y reto se validan antes de escribir. Los documentos usan una referencia polimórfica; su existencia se valida en las cargas y su limpieza se coordina al eliminar proyectos o productos. Las pruebas PostgreSQL comprueban UUID y llaves foráneas reales.

Un bloqueo transaccional PostgreSQL serializa el catálogo. Los IDs UUID5 estables conservan su idempotencia incluso cuando se renombra un grupo. No se ejecutan scripts destructivos de demostración en el despliegue de producción.
