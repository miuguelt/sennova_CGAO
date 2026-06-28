#!/usr/bin/env pwsh
#Requires -Version 7.0
# Script de inicio para sennova - fastapi
$ErrorActionPreference = "Stop"
$BackendDir = $PSScriptRoot
$VenvPython = "$BackendDir\.venv\Scripts\python.exe"

Write-Host "Iniciando sennova (fastapi) en puerto 8000..." -ForegroundColor Cyan

if (-not (Test-Path $VenvPython)) {
    Write-Host "Error: Entorno virtual no encontrado. Ejecuta setup-backends.ps1 primero." -ForegroundColor Red
    exit 1
}

# Cambiar al directorio del backend
Set-Location $BackendDir
& $VenvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
