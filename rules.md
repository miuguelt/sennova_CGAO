# DevBrain Project Rules
- Encoding: UTF-8
- Pattern: Atomic Brick (Additive changes only)
- Documentation: Always update /docs
- Logging: All critical logs to /maintenance
- Standards: WCAG AA for UI, ES Modules for JS, PEP8 for Python

## 🛡️ Regla Anti-Hardcoding (P100 - CRÍTICO)

### Mandato
**TODAS** las configuraciones sensibles, URLs, CORS, secrets y parámetros de entorno DEBEN leerse desde variables de entorno (`.env`) y NUNCA deben estar hardcodeadas en el código fuente.

### Configuraciones Obligatorias via .env

| Variable | Uso | Ejemplo |
|----------|-----|---------|
| `ALLOWED_ORIGINS` | CORS orígenes permitidos | `https://sennova.enlinea.sbs` |
| `VITE_API_URL` / `API_URL` | URL del backend | `/api` o `https://api.dominio.com` |
| `JWT_SECRET` | Firma de tokens | Mínimo 32 caracteres aleatorios |
| `DATABASE_URL` | Conexión DB | `postgresql://...` |
| `FRONTEND_URL` / `BACKEND_URL` | URLs completas | Para envío de emails/links |

### ❌ Prohibido (Hardcoding)
```javascript
const API_URL = 'http://localhost:8000';
const allowedOrigins = ['http://localhost:3000'];
const jwtSecret = 'mi-secreto-123';
```

### ✅ Correcto (Variables de Entorno)
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
```

```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
JWT_SECRET = os.getenv("JWT_SECRET")
```

### Checklist antes de Commit
- [ ] ¿URL/secreto está en `.env`?
- [ ] ¿Hay valor por defecto para desarrollo?
- [ ] ¿Documentado en `.env.example`?
- [ ] ¿Validado en punto de entrada?

### Consecuencias del Incumplimiento
- ❌ Fallos en producción
- ❌ Brechas de seguridad
- ❌ Dificultad para cambios de configuración
- ❌ Riesgo de filtrar secrets en repositorios públicos
