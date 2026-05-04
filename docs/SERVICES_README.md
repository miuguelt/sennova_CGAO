# 🚀 Gestor de Servicios SENNOVA CGAO

Scripts para iniciar, detener y monitorear el backend (FastAPI) y frontend (Vite).

## 📁 Archivos

- `start_services.ps1` - Script principal (PowerShell - recomendado)
- `start_services.bat` - Wrapper para CMD

## 🎯 Uso Rápido

### Opción 1: Desde CMD (más simple)
```cmd
start_services.bat start
```

### Opción 2: Desde PowerShell (más control)
```powershell
# Ejecutar directamente
.\start_services.ps1 start

# O con parametros especificos
.\start_services.ps1 restart backend
.\start_services.ps1 status
.\start_services.ps1 logs
```

## 📋 Comandos Disponibles

| Acción | Descripción | Ejemplo |
|--------|-------------|---------|
| `start` | Inicia los servicios | `start_services.bat start` |
| `stop` | Detiene los servicios | `start_services.bat stop` |
| `restart` | Reinicia los servicios | `start_services.bat restart` |
| `status` | Muestra estado y health check | `start_services.bat status` |
| `logs` | Muestra últimas líneas de logs | `start_services.bat logs` |

## 🔧 Servicios Específicos

Puedes especificar `backend`, `frontend` o `all` (por defecto):

```powershell
# Solo backend
.\start_services.ps1 restart backend

# Solo frontend
.\start_services.ps1 restart frontend

# Ambos (default)
.\start_services.ps1 restart all
```

## 📊 Información de Servicios

- **Backend (FastAPI):** http://localhost:8000
  - API Docs: http://localhost:8000/docs
  - Health: http://localhost:8000/health
  - Log: `backend.log`

- **Frontend (Vite):** http://localhost:3001
  - Log: `frontend.log`

## 🩺 Troubleshooting

### Verificar si están corriendo
```powershell
.\start_services.ps1 status
```

### Ver logs de errores
```powershell
.\start_services.ps1 logs
# o
Get-Content backend.log -Tail 50
Get-Content frontend.log -Tail 50
```

### Reinicio completo (limpio)
```powershell
.\start_services.ps1 stop
Start-Sleep 2
.\start_services.ps1 start
```

### Problema de permisos en PowerShell
Si aparece error de ejecución de scripts, ejecutar:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start_services.ps1 start
```

## 🔗 Acceso al Sistema

- URL Frontend: http://localhost:3001
- API Backend: http://localhost:8000
- Credenciales por defecto: admin@sena.edu.co / 123456
