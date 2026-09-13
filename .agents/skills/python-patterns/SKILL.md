---
name: python-patterns
description: Use when Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - python-pro
  - clean-code
  - data-validation-schemas
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Python Development Principles

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `python-patterns` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.
- **DO NOT activate when:** The task falls outside the `python-patterns` domain or is managed by a different dedicated specialist.

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

- ❌ Using `dict` for structured data when a dataclass/Pydantic model exists -> ✅ Dicts have no type safety; use typed models
- ❌ Catching bare `except:` or `except Exception:` -> ✅ Catch specific exceptions; bare except swallows KeyboardInterrupt and SystemExit
- ❌ Using `os.path` for path operations -> ✅ Use `pathlib.Path` for modern, readable path manipulation

---

---

## Framework Selection

| Use Case                     | Recommended    | When to Use                                  |
| ---------------------------- | -------------- | -------------------------------------------- |
| REST API, general-purpose    | FastAPI        | Type-safe, async, auto-docs via OpenAPI      |
| REST API, batteries-included | Django + DRF   | Rapid development, ORM included, admin panel |
| Microservice / minimal API   | Flask          | Simple, no overhead, full control            |
| Data pipeline / ETL          | No framework   | Standard library + pandas/polars as needed   |
| CLI tool                     | Click or Typer | Better than argparse for complex CLIs        |
| Async task queue             | Celery + Redis | Background jobs, scheduled tasks             |

**Decision question:** Does this need an ORM, admin panel, and auth out of the box? → Django. Does it need type-safe inputs with automatic validation? → FastAPI. Is it small and needs nothing? → Flask.

---

## Type Hints (Required on All New Code)

Python type hints are not optional — they are documentation that also enables static analysis.

```python
# ❌ No type hints
def create_user(email, role):
    ...

# ✅ Typed
from typing import Literal

def create_user(email: str, role: Literal["admin", "user"] = "user") -> dict[str, str]:
    ...
```

**Rules:**

- All function parameters and return values must be typed
- Use `from __future__ import annotations` for forward references
- Run `mypy` or `pyright` as part of CI — type errors fail the build

---

## Project Structure

```
src/
  api/          Route definitions (thin — parse and delegate)
  services/     Business logic (no HTTP awareness)
  repositories/ Database access (no business logic)
  models/       Pydantic models + SQLAlchemy models
  lib/          Shared utilities
  config.py     Settings via pydantic-settings

tests/
  unit/         Isolated function tests
  integration/  Database and external service tests

pyproject.toml  — single source of truth for deps, linting, test config
```

---

## Async Patterns

FastAPI uses async by default. Know when to use it and when not to.

```python
# ✅ Use async for I/O-bound operations
@app.get("/users/{user_id}")
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    return await user_service.find_by_id(db, user_id)

# ✅ Use sync for CPU-bound operations (or offload to thread pool)
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor()

@app.post("/process")
async def process_image(file: UploadFile):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, cpu_intensive_work, file)
    return result
```

**Never:** `time.sleep()` inside an async function — use `await asyncio.sleep()` instead.

---

## Error Handling

```python
# Custom exception hierarchy
class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} {id} not found", "NOT_FOUND", 404)

class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_FAILED", 400)

# FastAPI exception handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "code": exc.code}
    )
```

---

## Dependency Management

Use `pyproject.toml` with `uv` or `poetry`:

```toml
[project]
name = "my-service"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.110",
    "pydantic>=2.0",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.23",
    "mypy>=1.0",
    "ruff>=0.3",
]
```

**Never use `requirements.txt` for production projects** — no lock file, no version bounds, no dev/prod separation.

---

## Code Quality Tools

```bash
# Linting + formatting (replaces black + flake8 + isort)
ruff check . --fix
ruff format .

# Type checking
mypy src/

# Testing
pytest tests/ -v --tb=short

# Pre-commit (runs all of the above)
pre-commit run --all-files
```

Configure all tools in `pyproject.toml` — not `.flake8`, `.mypy.ini`, and `.ruff.toml` separately.

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Python Patterns Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Python Patterns
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
| **Unchecked Payload Cast** | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query** | Concatenating user inputs into SQL/Prisma query strings | Always use parameterized bindings or type-safe ORM query builders |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication checks performed before business logic execution?
✅ Did I verify that imported dependencies exist in package.json/requirements.txt?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
