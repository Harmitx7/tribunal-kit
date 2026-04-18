---
name: python-patterns
description: Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using `dict` for structured data when a dataclass/Pydantic model exists -> ✅ Dicts have no type safety; use typed models
- ❌ Catching bare `except:` or `except Exception:` -> ✅ Catch specific exceptions; bare except swallows KeyboardInterrupt and SystemExit
- ❌ Using `os.path` for path operations -> ✅ Use `pathlib.Path` for modern, readable path manipulation

---


# Python Development Principles

---

## Framework Selection

|Use Case|Recommended|When to Use|
|---|---|---|
|REST API, general-purpose|FastAPI|Type-safe, async, auto-docs via OpenAPI|
|REST API, batteries-included|Django + DRF|Rapid development, ORM included, admin panel|
|Microservice / minimal API|Flask|Simple, no overhead, full control|
|Data pipeline / ETL|No framework|Standard library + pandas/polars as needed|
|CLI tool|Click or Typer|Better than argparse for complex CLIs|
|Async task queue|Celery + Redis|Background jobs, scheduled tasks|

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


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
