---
name: powershell-windows
description: PowerShell Windows patterns. Critical pitfalls, operator syntax, error handling.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# PowerShell on Windows

> PowerShell is not bash with a Windows accent.
> It is object-based, not text-based. That changes everything.

---

## Core Difference: Objects, Not Text

Every PowerShell command returns objects, not strings. This is the foundational difference from bash.

```powershell
# bash: 'ls' returns text you parse
ls -la | awk '{print $9}'

# PowerShell: Get-ChildItem returns objects you access directly
Get-ChildItem | Select-Object Name, Length
(Get-ChildItem ".\src").Count   # count files directly
```

This means string parsing (grep, awk, cut) is often unnecessary in PowerShell.

---

## Critical Operator Pitfalls

PowerShell comparison operators use letters, not symbols:

| Operation | PowerShell | NOT This |
|---|---|---|
| Equal | `-eq` | `==` |
| Not equal | `-ne` | `!=` |
| Greater than | `-gt` | `>` |
| Less than | `-lt` | `<` |
| Like (wildcard) | `-like "*.ts"` | — |
| Match (regex) | `-match "pattern"` | — |
| Contains | `-contains "val"` | — |

```powershell
# ❌ This doesn't compare — it redirects output
if ($count == 5) { ... }

# ✅ Correct PowerShell comparison
if ($count -eq 5) { ... }
```

---

## Path Handling

Windows paths have backslashes but PowerShell handles both:

```powershell
# Both work in PowerShell
$path = "C:\Users\username\project"
$path = "C:/Users/username/project"

# Use Join-Path for safe cross-platform joins
$full = Join-Path $env:USERPROFILE "Desktop\project"

# Resolve to absolute path
$abs = Resolve-Path ".\relative\path"

# Test existence before using
if (Test-Path $path) { ... }
if (Test-Path $path -PathType Container) { ... }  # is it a directory?
if (Test-Path $path -PathType Leaf) { ... }        # is it a file?
```

---

## Error Handling

PowerShell has two error types: terminating and non-terminating.

```powershell
# Stop on any error (like bash set -e)
$ErrorActionPreference = 'Stop'

# Try/Catch only catches terminating errors
try {
  Remove-Item "nonexistent.txt" -ErrorAction Stop
} catch {
  Write-Host "Error: $_" -ForegroundColor Red
  exit 1
}

# Handle non-terminating errors
$result = Get-Item "maybe.txt" -ErrorAction SilentlyContinue
if (-not $result) {
  Write-Host "File not found"
}
```

---

## String Handling

```powershell
# Single quotes = literal (no variable expansion)
$name = 'world'
Write-Host 'Hello $name'   # outputs: Hello $name

# Double quotes = interpolation
Write-Host "Hello $name"   # outputs: Hello world

# Here-string for multiline
$block = @"
Line 1
Line 2
Value: $name
"@

# String operations
$str.ToLower()
$str.Replace("old", "new")
$str.Split(",")
$str.Trim()
$str -like "*.ts"       # wildcard match
$str -match "^\d{4}$"   # regex match
```

---

## Useful Patterns

```powershell
# Get script directory (equivalent of bash's $SCRIPT_DIR)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Run command and capture output WITH error handling
$output = & git status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "git failed: $output"
  exit 1
}

# Iterate files matching pattern
Get-ChildItem ".\src" -Recurse -Filter "*.ts" | ForEach-Object {
    Write-Host $_.FullName
}

# Create directory if not exists
New-Item -ItemType Directory -Force ".\output" | Out-Null

# Read/write files
$content = Get-Content ".\file.txt" -Raw
Set-Content ".\output.txt" "new content"
Add-Content ".\log.txt" "append this line"

# Environment variables
$env:MY_VAR = "value"         # set
[System.Environment]::GetEnvironmentVariable("PATH")   # read system-level
```

---

## Execution Policy

Scripts may be blocked by execution policy:

```powershell
# Check current policy
Get-ExecutionPolicy

# Allow local scripts (most permissive safe setting)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run a specific script bypassing policy (one-time)
powershell -ExecutionPolicy Bypass -File script.ps1
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Powershell Windows Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Powershell Windows
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/audit` or `/review`**
**Active reviewers: `logic` · `security` · `devops`**

### ❌ Forbidden AI Tropes in PowerShell

1. **Using Bash Operators** — writing `==` or `!=` instead of `-eq` or `-ne`.
2. **Text Parsing Over Objects** — extracting properties with regex instead of just accessing `$obj.Property`.
3. **Ignoring Execution Policies** — writing scripts without considering that they might be blocked on the user's machine.
4. **Silent Failures** — relying on generic `catch` blocks without understanding terminating vs non-terminating errors.
5. **Path Separator Errors** — failing to wrap path operations in safe cmdlets like `Join-Path` or `Test-Path`.

### ✅ Pre-Flight Self-Audit

Review these questions before generating PowerShell commands:
```
✅ Did I use the correct comparison operators (e.g., `-gt`, `-like`)?
✅ Did I leverage PowerShell's object pipeline instead of parsing text?
✅ Are paths safely manipulated (e.g., `Join-Path`) to handle Windows backslashes correctly?
✅ Are potential non-terminating errors handled explicitly?
✅ Will this script require an execution policy bypass, and did I note that for the user?
```
