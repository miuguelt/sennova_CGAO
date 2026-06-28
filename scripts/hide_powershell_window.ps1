# Script para ocultar ventana de PowerShell recurrente de Windsurf
# Ejecutar este script para ocultar ventanas de PowerShell que no tienen título

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    public const int SW_HIDE = 0;
    public const int SW_SHOW = 5;
}
"@

# Buscar ventanas de PowerShell sin título (procesos en background)
$processes = Get-Process powershell -ErrorAction SilentlyContinue

foreach ($process in $processes) {
    # Intentar encontrar la ventana del proceso
    $windowHandle = [WindowHelper]::FindWindow("ConsoleWindowClass", $null)
    
    if ($windowHandle -ne [IntPtr]::Zero) {
        # Ocultar la ventana
        [WindowHelper]::ShowWindow($windowHandle, [WindowHelper]::SW_HIDE)
        Write-Host "Ventana de PowerShell ocultada para proceso ID: $($process.Id)" -ForegroundColor Green
    }
}

Write-Host "Proceso completado. Las ventanas de PowerShell recurrentes han sido ocultadas." -ForegroundColor Cyan
