---
name: powershell-windows
description: Use when PowerShell and Windows environment mastery. Object-oriented piping, strict error handling (ErrorActionPreference), PSProviders, active directory querying, credential management, and execution policies. Use when automating Azure, Windows environments, or writing .ps1 scripts.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - server-management
  - devops-engineer
  - bash-linux
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# PowerShell — Windows Automation Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `powershell-windows` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when PowerShell and Windows environment mastery. Object-oriented piping, strict error handling (ErrorActionPreference), PSProviders, active directory querying, credential management, and execution policies. Use when automating Azure, Windows environments, or writing .ps1 scripts.
- **DO NOT activate when:** The task falls outside the `powershell-windows` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Silent Pipeline Failure** | Executing shell steps without set -euo pipefail, ignoring errors | Always initialize shell scripts with set -euo pipefail and trap handlers |
| **Unpinned Dependency Shift** | Installing packages with npm install or using :latest docker tags | Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests |
| **Leaking Build Secrets** | Passing secrets as Docker build arguments baked into image layers | Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are strict execution modes (set -euo pipefail) active on all scripts?
✅ Are container images pinned to digest/immutable tags instead of "latest"?
✅ Are deployment health checks and rollback baselines configured?
✅ Are CI secrets masked and unexposed to untrusted pull requests?
✅ Did I verify environment compatibility across target runtimes?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
