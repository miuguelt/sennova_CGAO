# Script de monitoreo para ocultar ventanas de PowerShell recurrentes de Windsurf
# Este script se ejecuta en background y monitorea continuamente

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
    public const int SW_HIDE = 0;
    public const int SW_SHOW = 5;
}
"@

function Hide-PowerShellWindows {
    $hiddenCount = 0
    
    # Buscar todas las ventanas de consola
    $processes = Get-Process powershell -ErrorAction SilentlyContinue
    
    foreach ($process in $processes) {
        try {
            # Intentar encontrar la ventana del proceso
            $windowHandle = [WindowHelper]::FindWindow("ConsoleWindowClass", $null)
            
            if ($windowHandle -ne [IntPtr]::Zero) {
                # Verificar si la ventana es visible
                $isVisible = [WindowHelper]::IsWindowVisible($windowHandle)
                
                if ($isVisible) {
                    # Ocultar la ventana
                    $result = [WindowHelper]::ShowWindow($windowHandle, [WindowHelper]::SW_HIDE)
                    if ($result) {
                        $hiddenCount++
                        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Ventana de PowerShell ocultada (PID: $($process.Id))" -ForegroundColor Green
                    }
                }
            }
        }
        catch {
            # Ignorar errores al acceder a procesos del sistema
        }
    }
    
    return $hiddenCount
}

Write-Host "Iniciando monitoreo de ventanas de PowerShell..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener." -ForegroundColor Yellow

# Bucle de monitoreo continuo
while ($true) {
    $hidden = Hide-PowerShellWindows
    if ($hidden -gt 0) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $hidden ventana(s) ocultada(s)" -ForegroundColor Green
    }
    
    # Esperar 5 segundos antes de volver a verificar
    Start-Sleep -Seconds 5
}
