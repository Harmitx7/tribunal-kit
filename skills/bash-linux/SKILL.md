---
name: bash-linux
description: Use when Bash/Linux terminal mastery. Shell scripting, piping, stream redirection, process substitution, strict mode (set -euo pipefail), AWK, ripgrep parsing, and robust error handling. Use when writing CI scripts, debugging POSIX environments, or manipulating text pipelines.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - server-management
  - devops-engineer
  - cicd-pro
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Bash & Linux — Shell Scripting Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `bash-linux` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Bash/Linux terminal mastery. Shell scripting, piping, stream redirection, process substitution, strict mode (set -euo pipefail), AWK, ripgrep parsing, and robust error handling. Use when writing CI scripts, debugging POSIX environments, or manipulating text pipelines.
- **DO NOT activate when:** The task falls outside the `bash-linux` domain or is managed by a different dedicated specialist.

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


## Hallucination Traps (Read First)

- ❌ Scripts without `set -euo pipefail` -> ✅ Always enable strict mode to catch silent failures
- ❌ Using `[ ]` instead of `[[ ]]` for conditionals -> ✅ `[[ ]]` handles spaces in variables and supports regex
- ❌ Parsing `ls` output -> ✅ Use `find` or glob expansion instead; `ls` output is not portable
- ❌ `cat file | grep` (useless use of cat) -> ✅ `grep pattern file` directly

---

---

## 1. Bash Strict Mode (Mandatory)

Always start every single bash script with strict compilation flags.

```bash
#!/usr/bin/env bash

# ❌ BAD: Default bash execution
# - Undefined variables evaluate to empty strings
# - Failed commands are ignored, execution continues blindly
# - Piped failures are hidden (only last command exit code matters)

# ✅ GOOD: Strict Mode
set -euo pipefail
IFS=$'\n\t'

# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error and exit immediately.
# -o pipefail: Pipeline returns the status of the rightmost command to exit with a non-zero status.
# IFS: Only split on newlines and tabs, not spaces (prevents terrifying globbing/array bugs).

# Example: Catching potential disasters
unset MY_VAR
rm -rf "/some/path/${MY_VAR}" # With 'set -u', this throws an error instead of running 'rm -rf /some/path/'
```

---

## 2. Advanced Stream Manipulation

Piping allows passing stdout from one program into stdin of another.

```bash
# ❌ VULNERABLE: Useless Use of Cat (UUOC)
cat file.txt | grep "error"

# ✅ EFFICIENT: Direct parsing
grep "error" file.txt
# Or modern ripgrep for huge repositories:
rg "error" file.txt

# Process Substitution: Treating tool outputs as if they were files
# Compare two remote JSON responses without writing to disk
diff <(curl -s api.com/v1) <(curl -s api.com/v2)

# Redirection Mastery
# 1> stdout, 2> stderr
command > output.txt 2> error.txt   # Split streams
command > all.txt 2>&1              # Combine streams (POSIX)
command &> all.txt                  # Combine streams (Bash shortcut)
command >/dev/null 2>&1             # Subdue all output cleanly
```

---

## 3. AWK and Stream Formatting

AWK is a complete programming language designed for text processing.

```bash
# Example: We have a ps aux output and we want the PIDs (column 2) of all Node processes
ps aux | grep node | awk '{print $2}'

# Example: Summing numbers in column 3 from a CSV
cat data.csv | awk -F ',' '{sum+=$3} END {print sum}'

# Extracting specific lines (e.g. line 5 to 10)
sed -n '5,10p' file.txt
```

---

## 4. Modern CLI Alternatives (The 2026 Stack)

Standard POSIX tools are reliable but slow. Use modern Rust-based alternatives when available in CI/CD.

| Task               | Legacy POSIX          | Modern Alternative | Why?                                                          |
| :----------------- | :-------------------- | :----------------- | :------------------------------------------------------------ |
| Find files         | `find . -name "*.ts"` | `fd -e ts`         | Context-aware, respects `.gitignore`, 10x faster.             |
| Search text        | `grep -r "auth"`      | `rg "auth"`        | Ripgrep uses multi-threading and SIMD instructions.           |
| Inspect JSON       | `grep / awk`          | `jq '.users[].id'` | `jq` explicitly parses and filters valid JSON arrays/objects. |
| Process monitoring | `top`                 | `htop` / `btm`     | Interactive metrics.                                          |
| Check curl         | `curl -i`             | `httpie` / `xh`    | Colorized, structured JSON networking.                        |

---

## 5. File System Traps & Quoting

If a filename contains a space and you didn't quote your variable, your script will crash or delete the wrong files.

```bash
# Let FILE="my backup.tar"

# ❌ BAD: Evaluates as `rm my` AND `backup.tar` -> Two different files!
rm $FILE

# ✅ GOOD: Always quote string variables
rm "$FILE"

# ✅ GOOD: Array iteration (Using quotes specifically formatted with @)
FILES=("file 1.txt" "file 2.txt")
for file in "${FILES[@]}"; do
  echo "Processing: $file"
done
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
