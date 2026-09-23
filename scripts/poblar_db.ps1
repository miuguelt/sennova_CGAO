<#
.SYNOPSIS
    SENNOVA CGAO — Script PowerShell para ejecutar el poblado de base de datos con Docker Compose.

.DESCRIPTION
    Detecta si el contenedor backend está activo y ejecuta el script de semillado
    con mínimo 20 registros por tabla y usuarios de prueba.

.EXAMPLE
    .\scripts\poblar_db.ps1
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  🌱 SENNOVA CGAO — POBLAR BASE DE DATOS CON DOCKER COMPOSE" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan

# Verificar Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker no está disponible en este sistema." -ForegroundColor Red
    exit 1
}

# Verificar estado de los servicios
$runningServices = docker compose ps --services --filter "status=running" 2>$null

if ($runningServices -contains "sennova-backend") {
    Write-Host "🚀 Servicio 'sennova-backend' detectado en ejecución." -ForegroundColor Yellow
    Write-Host "📡 Ejecutando script de semillado en el contenedor activo..." -ForegroundColor Cyan
    docker compose exec sennova-backend python scripts/seed_database.py
} else {
    Write-Host "📦 Backend no está en ejecución. Iniciando contenedor efímero..." -ForegroundColor Yellow
    Write-Host "🔄 Ejecutando con perfil 'seed'..." -ForegroundColor Cyan
    docker compose --profile seed run --rm sennova-seed
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  ✅ Proceso de poblado finalizado con éxito." -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
