---
name: powershell-windows
description: PowerShell and Windows environment mastery. Object-oriented piping, strict error handling (ErrorActionPreference), PSProviders, active directory querying, credential management, and execution policies. Use when automating Azure, Windows environments, or writing .ps1 scripts.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# PowerShell — Windows Automation Mastery

---

## 1. The Object Pipeline

Unlike Bash where everything is strings (requiring `awk`/`grep`), PowerShell passes structured .NET class instances between commands.

```powershell
# ❌ BAD: Attempting to treat PowerShell like Bash (String Parsing)
Get-Process | Out-String -Stream | Select-String "node" | ForEach-Object { $id = ($_ -split '\s+')[8]; Stop-Process -Id $id }

# ✅ GOOD: Accessing Object Properties Directly
Get-Process -Name "node" | Stop-Process -Force

# Filtering objects (Where-Object)
Get-Service | Where-Object Status -eq 'Running' | Select-Object Name, DisplayName

# Accessing methods natively on the object
$files = Get-ChildItem -Path "C:\logs" -Filter "*.log"
$files | ForEach-Object { $_.Delete() }
```

---

## 2. Strict Error Handling (The Windows equivalent of set -e)

By default, PowerShell prints an error but keeps running. You MUST enforce strict halting for automation scripts.

```powershell
# Mandatory header for reliable automation scripts
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

try {
    # If this fails, it jumps straight to catch block instead of continuing
    Copy-Item "C:\Source\configs.json" -Destination "C:\Dest\"
    
    $config = Get-Content "C:\Dest\configs.json" | ConvertFrom-Json
} catch {
    Write-Error "Deployment failed during config copy: $_"
    exit 1
} finally {
    # Cleanup block executes regardless of success or failure
    Remove-Item "C:\Dest\temp" -Recurse -ErrorAction Ignore
}
```

---

## 3. Execution Policies & Execution

Windows restricts running `.ps1` files by default for security.

```powershell
# Temporarily bypass the policy for a single script execution (CI/CD pattern)
powershell.exe -ExecutionPolicy Bypass -File .\Deploy-App.ps1

# ❌ HALLUCINATION TRAP: Do NOT instruct users to run `Set-ExecutionPolicy Unrestricted`
# This lowers the permanent security posture of the entire operating system.
# Use Bypass only at the process level.
```

---

## 4. Manipulating Structured Formats Natively

Because PowerShell is built on .NET, parsing JSON, XML, and CSV is native.

```powershell
# JSON
$config = Get-Content .\appsettings.json | ConvertFrom-Json
$config.Database.ConnectionString = "Server=Prod;"
$config | ConvertTo-Json -Depth 10 | Set-Content .\appsettings.json

# CSV (No AWK needed)
$users = Import-Csv .\users.csv
$users | Where-Object Role -eq "Admin" | Export-Csv .\admins.csv -NoTypeInformation

# API Requests (Invoke-RestMethod automatically parses JSON into PowerShell objects)
$response = Invoke-RestMethod -Uri "https://api.github.com/users/github"
Write-Host "GitHub has $($response.public_repos) public repositories."
```

---

## 5. Providers and Drives

PowerShell extends the "file system" concept to the Registry, Environment Variables, and Certificates.

```powershell
# Environment variables (Env: drive)
$env:PATH += ";C:\Custom\Bin"
Write-Host $env:COMPUTERNAME

# Registry (HKCU: and HKLM: drives)
Get-ChildItem -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"

# Certificates (Cert: drive)
Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object Subject -match "example.com"
```

---
