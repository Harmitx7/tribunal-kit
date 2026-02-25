---
name: python-patterns
description: Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Python Development Principles

> Python's flexibility is its greatest weakness.
> Without conventions, every project ends up with its own unpredictable shape.

---

## Framework Selection

| Use Case | Recommended | When to Use |
|---|---|---|
| REST API, general-purpose | FastAPI | Type-safe, async, auto-docs via OpenAPI |
| REST API, batteries-included | Django + DRF | Rapid development, ORM included, admin panel |
| Microservice / minimal API | Flask | Simple, no overhead, full control |
| Data pipeline / ETL | No framework | Standard library + pandas/polars as needed |
| CLI tool | Click or Typer | Better than argparse for complex CLIs |
| Async task queue | Celery + Redis | Background jobs, scheduled tasks |

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

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `dependency` · `type-safety`**

### ❌ Forbidden AI Tropes in Python

1. **Missing Type Hints** — writing `def func(a, b):` instead of fully typing parameters and return values.
2. **Bare `except:` blocks** — catching all exceptions blindly without logging or raising `AppError`.
3. **`requirements.txt` over `pyproject.toml`** — hallucinating outdated dependency management practices.
4. **Blocking the async event loop** — writing synchronous I/O or `time.sleep()` inside an `async def` FastAPI route.
5. **Assuming Django for microservices** — defaulting to a massive framework when `FastAPI` or `Flask` fits better.

### ✅ Pre-Flight Self-Audit

Review these questions before generating Python code:
```
✅ Are all function parameters and return types strictly typed?
✅ Did I use the modern toolchain (`uv`/`poetry`, `ruff`, `mypy`)?
✅ Did I accidentally block the async event loop with sync code?
✅ Are domain errors properly caught and mapped to HTTP status codes without leaking stack traces?
✅ Is my dependency selection precise and explicitly declared in `pyproject.toml`?
```
