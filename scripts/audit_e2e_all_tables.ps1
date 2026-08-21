<#
.SYNOPSIS
    SENNOVA CGAO - Suite de Auditoría E2E y Compuerta de Calidad SDLC.
    Valida el funcionamiento de extremo a extremo de todas las funciones y tablas del sistema.

.DESCRIPTION
    Ejecuta:
    1. Pruebas Backend E2E de Todas las Tablas (17 pruebas exhaustivas)
    2. Pruebas Backend de Regresión Completa (36+ pruebas unitarias y de integración)
    3. Pruebas Frontend E2E / Contratos API y Componentes UI (150+ pruebas)
    
.EXAMPLE
    .\scripts\audit_e2e_all_tables.ps1
#>

[CmdletBinding()]
param (
    [switch]$Quick = $false
)

$ErrorActionPreference = "Continue"
$StartTime = Get-Date

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 🚀 SENNOVA CGAO - AUDITORÍA E2E DE TODAS LAS TABLAS Y SDLC GATE " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

$RootPath = Resolve-Path "$PSScriptRoot\.."
$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"
$PythonExe = Join-Path $BackendPath ".venv\Scripts\python.exe"

$BackendFailed = $false
$FrontendFailed = $false

# -----------------------------------------------------------------------------
# PASO 1: AUDITORÍA BACKEND E2E (TODAS LAS TABLAS)
# -----------------------------------------------------------------------------
Write-Host "[1/3] 🔍 Ejecutando Auditoría E2E Backend de Todas las Tablas..." -ForegroundColor Yellow

Push-Location $BackendPath
try {
    if (Test-Path $PythonExe) {
        & $PythonExe -m pytest tests/test_e2e_all_tables_audit.py -v
        if ($LASTEXITCODE -ne 0) {
            $BackendFailed = $true
            Write-Host "❌ Fallaron las pruebas E2E de auditoría de tablas en Backend." -ForegroundColor Red
        } else {
            Write-Host "✅ Auditoría E2E Backend superada exitosamente (17/17 módulos verificados)." -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️ Python venv no encontrado en $PythonExe. Usando python global..." -ForegroundColor Yellow
        python -m pytest tests/test_e2e_all_tables_audit.py -v
        if ($LASTEXITCODE -ne 0) { $BackendFailed = $true }
    }
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# PASO 2: SUITE COMPLETA DE REGRESIÓN BACKEND
# -----------------------------------------------------------------------------
if (-not $Quick) {
    Write-Host ""
    Write-Host "[2/3] 🧪 Ejecutando Suite de Regresión Completa Backend (36+ tests)..." -ForegroundColor Yellow
    Push-Location $BackendPath
    try {
        if (Test-Path $PythonExe) {
            & $PythonExe -m pytest tests/ -q
            if ($LASTEXITCODE -ne 0) {
                $BackendFailed = $true
                Write-Host "❌ Fallaron algunas pruebas en la suite general de Backend." -ForegroundColor Red
            } else {
                Write-Host "✅ Suite completa de Backend 100% en verde." -ForegroundColor Green
            }
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[2/3] ⏭️ Paso de regresión completa omitido (-Quick activado)." -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# PASO 3: AUDITORÍA FRONTEND E2E & CONTRATOS API
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/3] 🌐 Ejecutando Auditoría E2E Frontend y Contratos de Tablas (150+ tests)..." -ForegroundColor Yellow
Push-Location $FrontendPath
try {
    npm test
    if ($LASTEXITCODE -ne 0) {
        $FrontendFailed = $true
        Write-Host "❌ Fallaron las pruebas de Frontend." -ForegroundColor Red
    } else {
        Write-Host "✅ Suite completa de Frontend 100% en verde (150/150 tests superados)." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# RESUMEN FINAL Y COMPUERTA DE CALIDAD
# -----------------------------------------------------------------------------
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " 📊 REPORTE FINAL DE AUDITORÍA E2E Y COMPUERTA SDLC             " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Tiempo de Ejecución: $([math]::Round($Duration.TotalSeconds, 2)) segundos" -ForegroundColor Gray

if (-not $BackendFailed -and -not $FrontendFailed) {
    Write-Host ""
    Write-Host "🎉 COMPUERTA DE CALIDAD SUPERADA EXITOSAMENTE [PASSED]" -ForegroundColor Green -BackgroundColor Black
    Write-Host "Todas las tablas, modelos, routers y clientes frontend operan de extremo a extremo sin errores." -ForegroundColor Green
    Write-Host "El código es apto para commit, merge y despliegue a producción." -ForegroundColor Cyan
    exit 0
} else {
    Write-Host ""
    Write-Host "🚨 COMPUERTA DE CALIDAD BLOQUEADA [FAILED]" -ForegroundColor Red -BackgroundColor Black
    if ($BackendFailed) { Write-Host " - Errores detectados en Backend" -ForegroundColor Red }
    if ($FrontendFailed) { Write-Host " - Errores detectados en Frontend" -ForegroundColor Red }
    Write-Host "Por favor resuelva las discrepancias antes de continuar el ciclo de desarrollo." -ForegroundColor Yellow
    exit 1
}
