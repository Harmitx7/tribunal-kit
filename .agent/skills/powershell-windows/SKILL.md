---
name: powershell-windows
description: PowerShell and Windows environment mastery. Object-oriented piping, strict error handling (ErrorActionPreference), PSProviders, active directory querying, credential management, and execution policies. Use when automating Azure, Windows environments, or writing .ps1 scripts.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# PowerShell — Windows Automation Mastery

> PowerShell does not pipe text. It pipes rich .NET Objects.
> Your Bash instincts will betray you here. Think in structured data, not regex.

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

## 🤖 LLM-Specific Traps (PowerShell)

1. **Bash Equivalencies:** AI writing `Test-Path | regex` instead of dealing with properties. Always use object properties (`$obj.Length`, `$obj.Name`).
2. **Missing `ErrorActionPreference`:** Continuing execution blindly after a critical `Copy-Item` command fails. Always set preference to "Stop".
3. **Execution Policy Destruction:** Instructing users to permanently change global machine policy to run a script. Always use `-ExecutionPolicy Bypass` natively.
4. **JSON Conversion Depth limits:** `ConvertTo-Json` defaults to a depth of only 2. It will ruthlessly truncate your nested API payloads silently unless you append `-Depth 10`.
5. **Return Types in Functions:** PowerShell returns EVERYTHING that hits the pipeline inside a function, not just the `return` statement. Explicitly cast silent operations to `$null` or pipe to `Out-Null`. (e.g., `$list.Add("item") | Out-Null`).
6. **Comparison Operators:** AI uses `>` or `==`. PowerShell requires `-gt`, `-eq`, `-ne`, `-lt`.
7. **Backtick Continuation:** Using the backtick `` ` `` as a line continuation character randomly. It is notoriously hard to read and breaks if there's a trailing space. Use proper pipeline formatting or array declarations.
8. **Paths with Spaces:** Similar to bash, failing to wrap paths in string quotes when executing. `& "C:\Program Files\Node\npm.cmd" install`.
9. **`Out-File` vs `Set-Content` Encryption:** AI writing configs using `Out-File` defaults to UTF-16 on older PowerShell versions, breaking Linux/Docker containers. Standardize on `Set-Content` or explicitly declare `-Encoding UTF8`.
10. **`Write-Host` vs `Write-Output`:** AI uses `Write-Host` to return data from functions. `Write-Host` goes straight to the console display buffer. Always use `Write-Output` if you want another variable or pipe to catch the return data.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Have I forced strict error catching via `$ErrorActionPreference = "Stop"`?
✅ Am I manipulating objects (e.g., `Where-Object`) rather than string parsing?
✅ If I invoked `ConvertTo-Json`, did I set `-Depth 10` (or higher)?
✅ Are my comparison operators using PowerShell syntax (`-eq`, `-gt`) instead of (`==`, `>`)?
✅ Did I use `-ExecutionPolicy Bypass` rather than recommending global registry changes?
✅ Is text encoded correctly to UTF8 via `Set-Content` instead of `Out-File`?
✅ Did I return data from my functions via `Write-Output` instead of `Write-Host`?
✅ Are array modifications piped to `Out-Null` to prevent pipeline pollution?
✅ Is `Invoke-RestMethod` leveraged for APIs instead of the heavier `Invoke-WebRequest`?
✅ Are commands with spaces invoked using the call operator `& "Path\To\File"`?
```
