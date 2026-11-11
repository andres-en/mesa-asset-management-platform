<#
.SYNOPSIS
  Installs the Mesa remote remediation agent as a Windows scheduled task
  (starts with the system, runs as SYSTEM, no user session needed).

.EXAMPLE
  .\install.ps1 -BaseUrl "https://mesa.example.com" -Token "the-token-generated-from-the-device-page"

.NOTES
  Run as Administrator, from the same folder as mesa-agent.exe
  (the agent is copied to C:\ProgramData\MesaAgent).
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [int]$PollIntervalSeconds = 25,

    [string]$InstallDir = "$env:ProgramData\MesaAgent"
)

$ErrorActionPreference = "Stop"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

$exeSource = Join-Path $PSScriptRoot "mesa-agent.exe"
if (-not (Test-Path $exeSource)) {
    $exeSource = Join-Path $PSScriptRoot "dist\mesa-agent.exe"
}
if (-not (Test-Path $exeSource)) {
    Write-Error "mesa-agent.exe was not found next to this script or in .\dist ($PSScriptRoot)."
    exit 1
}

$taskName = "MesaRemediationAgent"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Write-Host "A previous installation exists; stopping and replacing it..."
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Get-Process -Name "mesa-agent" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
}

Write-Host "Installing the agent in $InstallDir ..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path $exeSource -Destination $InstallDir -Force

$config = @{
    base_url              = $BaseUrl
    token                 = $Token
    poll_interval_seconds = $PollIntervalSeconds
} | ConvertTo-Json

# Set-Content -Encoding UTF8 escribe BOM en Windows PowerShell 5.1, y el
# agente (Python) no lo acepta al leer el JSON. Se escribe sin BOM a mano.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $InstallDir "config.json"), $config, $utf8NoBom)

$action    = New-ScheduledTaskAction -Execute (Join-Path $InstallDir "mesa-agent.exe") -WorkingDirectory $InstallDir
$trigger   = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Days 0)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Description "Mesa remote remediation agent" | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host "Done. The agent is installed and running (scheduled task '$taskName')."
Write-Host "It will start automatically with the system, even with no user signed in."
