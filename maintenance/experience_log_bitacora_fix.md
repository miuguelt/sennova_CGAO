# Registro de Experiencia DevBrain - Fix Bitácora 500

## 📝 Error Identificado
**Síntoma:** Error 500 (Internal Server Error) al intentar listar las entradas de la bitácora de un proyecto en el frontend. La consola del navegador mostraba fallos en `GET /api/bitacora/proyecto/{uuid}`.

**Causa Raíz:** Fallo de validación en el esquema Pydantic `BitacoraResponse`. La base de datos contenía registros con el campo `categoria` como `NULL`, mientras que el esquema `BitacoraBase` definía `categoria: str = "técnica"`. En Pydantic, un campo con valor por defecto pero sin tipo `Optional` rechaza explícitamente el valor `None`.

## 🛠️ Solución Aplicada
Se modificó el archivo `backend/app/schemas.py` para permitir valores nulos en el campo `categoria`:

```python
class BitacoraBase(BaseModel):
    # ...
    categoria: Optional[str] = "técnica"
```

Esto permite que los registros antiguos con valores nulos se serialicen correctamente sin romper la API.

## 🔍 Verificación
Se ejecutó un script de prueba (`test_api_bitacora.py`) que simulaba la consulta a la base de datos y la validación con el esquema de respuesta.
- **Antes del fix:** `ValidationError: categoria - Input should be a valid string`.
- **Después del fix:** `✅ Entry {uuid} valid`.

## 💡 Lección Aprendida
Siempre que se añadan campos con valores por defecto a modelos existentes en una base de datos en producción, el esquema Pydantic debe ser `Optional` si hay posibilidad de que existan registros previos con valores `NULL` en esa columna, incluso si SQLAlchemy tiene un valor por defecto definido a nivel de aplicación.
