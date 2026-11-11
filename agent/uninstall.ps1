<#
.SYNOPSIS
  Uninstalls the Mesa remote remediation agent: stops and removes the
  scheduled task and deletes the installed files.

.NOTES
  Run as Administrator.
#>

param(
    [string]$InstallDir = "$env:ProgramData\MesaAgent"
)

$ErrorActionPreference = "Stop"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

$taskName = "MesaRemediationAgent"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Scheduled task '$taskName' removed."
} else {
    Write-Host "No scheduled task '$taskName' was installed."
}

# Stop-ScheduledTask no mata el proceso al instante (en la practica deja el
# .exe bloqueado un momento), lo que hace fallar el Remove-Item de abajo.
Get-Process -Name "mesa-agent" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "Folder $InstallDir deleted."
}

Write-Host "Agent uninstalled."
