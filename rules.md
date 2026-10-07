# DevBrain Project Rules
- Encoding: UTF-8
- Pattern: Atomic Brick (Additive changes only)
- Documentation: Always update /docs
- Logging: All critical logs to /maintenance
- Standards: WCAG AA for UI, ES Modules for JS, PEP8 for Python
- DB_FIRST: IA genera contenido en desarrollo (APP_ENV=development) y lo guarda en PostgreSQL.
- NO_AI_RUNTIME: En produccion (APP_ENV=production), prohibido llamar a APIs de IA en runtime.
- LOCAL_PG: Desarrollo local conecta a PostgreSQL `127.0.0.1:5434` en Windows nativo. No usar WSL, Docker ni la base de produccion.
- ENV_VARS: Declara solo variables que el código o el despliegue consumen y cuyo valor cambia entre entornos o instalaciones, o contiene un secreto. En el código actual, `DATABASE_URL` se usa para las conexiones PostgreSQL; no marques `USE_AI_CONTENT_GENERATION` ni `PRODUCTION_DATABASE_URL` como obligatorias mientras no exista un consumidor activo.

## Configuración por entorno y protección de secretos

- Usa variables de entorno para secretos y para parámetros operativos que realmente cambian por entorno o instalación. Mantén en el código las constantes públicas estables; no crees una variable por cada valor predeterminado.
- Reutiliza las variables que el runtime ya consume. No dupliques una configuración entre el código, Docker Compose y archivos `.env` sin una necesidad de despliegue.
- En Windows, usa Windows Credential Manager para las credenciales locales. Usa un `.env` local, ignorado y protegido solo si el runtime lo necesita. En CI, usa el almacén de secretos del proveedor; en producción, el gestor de secretos del host.
- Nunca guardes secretos reales ni ejemplos con apariencia de credencial en archivos versionados, incluidos Markdown, código, pruebas, logs y configuraciones. No incluyas valores de credenciales en URLs de conexión versionadas.
- Si una ejecución requiere un secreto, léelo de una fuente autorizada y falla con un mensaje accionable si falta. No uses valores sensibles predeterminados ni secretos de prueba fijos; genera los valores de prueba en tiempo de ejecución.
- En documentación y ejemplos usa marcadores como `<JWT_SECRET_AQUI>` o `example`. Evita cadenas pseudo-realistas y tokens truncados que puedan confundirse con credenciales.
- Las variables `VITE_*` llegan al navegador y son públicas; nunca pongas secretos en ellas.

### Variables según su uso

| Variable | Cuándo usarla |
|----------|---------------|
| `JWT_SECRET` | Secreto requerido para firmar tokens; cargarlo desde el gestor autorizado del entorno. |
| `DATABASE_URL` | Cuando el proceso se conecte a PostgreSQL; la URL completa puede contener credenciales. |
| `ALLOWED_ORIGINS` | Cuando los orígenes permitidos cambien entre entornos o instalaciones. |
| `VITE_API_URL` | Cuando cambie la URL pública de la API; nunca contiene credenciales. |
| `FRONTEND_URL` / `BACKEND_URL` | Cuando el runtime necesite URLs públicas completas que varíen por entorno. |

### Lectura en tiempo de ejecución
```javascript
const jwtSecret = process.env.JWT_SECRET;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
```

```python
JWT_SECRET = os.getenv("JWT_SECRET")
```

### Revisión antes de Commit
- [ ] ¿La variable tiene un consumidor activo en el runtime?
- [ ] ¿El valor es secreto o cambia por entorno o instalación?
- [ ] ¿El secreto vive fuera de Git y se valida cuando la aplicación inicia?
- [ ] ¿Los ejemplos usan marcadores y las pruebas generan secretos temporales?

No versionar credenciales reduce el riesgo de filtración y evita configuraciones inseguras en producción.
