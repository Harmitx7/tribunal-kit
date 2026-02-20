#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Install the Tribunal Anti-Hallucination Agent Kit into any project.

.DESCRIPTION
    Copies the .agent/ folder from the kit into the target project directory.
    If no target is specified, installs into the current directory.

.PARAMETER Target
    The project directory to install into. Defaults to current directory.

.PARAMETER Force
    Overwrite existing .agent/ folder if present.

.EXAMPLE
    # Install into current project
    .\install.ps1

    # Install into a specific project
    .\install.ps1 -Target "C:\Users\me\projects\my-app"

    # Force overwrite existing .agent/
    .\install.ps1 -Target "C:\Users\me\projects\my-app" -Force
#>

param(
    [string]$Target = (Get-Location).Path,
    [switch]$Force
)

$KitRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentSource = Join-Path $KitRoot ".agent"
$AgentDest   = Join-Path $Target ".agent"

Write-Host ""
Write-Host "  Tribunal Anti-Hallucination Agent Kit" -ForegroundColor Cyan
Write-Host "  ──────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# Validate source
if (-not (Test-Path $AgentSource)) {
    Write-Host "  [ERROR] .agent/ folder not found at: $AgentSource" -ForegroundColor Red
    exit 1
}

# Validate target
if (-not (Test-Path $Target)) {
    Write-Host "  [ERROR] Target directory not found: $Target" -ForegroundColor Red
    exit 1
}

# Check if .agent already exists
if ((Test-Path $AgentDest) -and -not $Force) {
    Write-Host "  [WARN]  .agent/ already exists in target." -ForegroundColor Yellow
    Write-Host "          Use -Force to overwrite: .\install.ps1 -Target '$Target' -Force" -ForegroundColor DarkGray
    exit 0
}

# Copy
try {
    Copy-Item -Path $AgentSource -Destination $AgentDest -Recurse -Force
    Write-Host "  [OK]    .agent/ installed to:" -ForegroundColor Green
    Write-Host "          $AgentDest" -ForegroundColor White
    Write-Host ""
    Write-Host "  Your AI IDE will pick this up automatically." -ForegroundColor DarkGray
    Write-Host "  Slash commands like /generate, /review, /create are now active." -ForegroundColor DarkGray
    Write-Host ""
} catch {
    Write-Host "  [ERROR] Failed to copy: $_" -ForegroundColor Red
    exit 1
}
