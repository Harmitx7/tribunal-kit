---
name: python-pro
description: Use when Python 3.12+ specialist. FastAPI, Pydantic v2, asyncio, modern types, pytest. Use when building Python APIs, data pipelines, automation, or any Python code.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - python-patterns
  - data-validation-schemas
  - api-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Python 3.12+ — Dense Reference

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `python-pro` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Python 3.12+ specialist. FastAPI, Pydantic v2, asyncio, modern types, pytest. Use when building Python APIs, data pipelines, automation, or any Python code.
- **DO NOT activate when:** The task falls outside the `python-pro` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 Python 3.12+ Performance & Logic Invariants

1. **Structured Concurrency with `TaskGroup`**:
   ```python
   async with asyncio.TaskGroup() as tg:
       task1 = tg.create_task(fetch_user(user_id))
       task2 = tg.create_task(fetch_orders(user_id))
   # If either fails, the other is cancelled immediately; exceptions grouped in ExceptionGroup
   ```
2. **PEP 695 Native Type Aliases & Generics**:
   ```python
   type Coordinates = tuple[float, float]
   def get_first[T](items: list[T]) -> T | None:
       return items[0] if items else None
   ```
3. **Pydantic v2 Zero-Copy Deserialization**: Use `TypeAdapter(list[Model]).validate_python(data)` for batch parsing.
4. **Connection Pooling & Lifespan**: Always manage client lifecycles using `lifespan` context managers rather than re-instantiating HTTP/DB clients per request.

## Hallucination Traps (Read First)

- ❌ `from typing import List, Dict, Optional, Union, TypeVar` → ✅ Native `list[str]`, `dict[k,v]`, `X | None`, `type Alias = ...`
- ❌ `user.dict()` / `user.json()` / `UserCreate.parse_obj()` → ✅ Pydantic v2: `model_dump()`, `model_dump_json()`, `model_validate()`
- ❌ Pydantic `class Config: orm_mode = True` → ✅ `model_config = {"from_attributes": True}`
- ❌ `@validator` / `@root_validator` → ✅ `@field_validator` / `@model_validator`
- ❌ `@app.on_event("startup")` → ✅ FastAPI `lifespan` context manager
- ❌ `import requests` in async code → ✅ `httpx.AsyncClient()`
- ❌ `asyncio.gather()` leaving orphaned tasks on error → ✅ `asyncio.TaskGroup()`
- ❌ `except Exception as e: pass` → ✅ Always log or re-raise

---

## Type System (3.12+)

```python
# Built-in generics (3.9+) — no typing imports needed for basic types
def process(items: list[str]) -> dict[str, int]: ...
def find(user_id: int) -> User | None: ...      # 3.10+ union
def parse(raw: str) -> int | float | None: ...

# Generic syntax (3.12+)
def first[T](items: list[T]) -> T | None:
    return items[0] if items else None
type Point = tuple[float, float]                 # 3.12+ type alias

# Protocol (structural typing — duck typing with types)
from typing import Protocol, runtime_checkable
@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...

# TypedDict — typed dict with optional keys
from typing import TypedDict, NotRequired
class UserPayload(TypedDict):
    name: str; email: str
    age: NotRequired[int]                         # optional key

# ParamSpec — preserve signatures in decorators
from typing import TypeVar, ParamSpec
from collections.abc import Callable
T = TypeVar("T"); P = ParamSpec("P")
def with_logging(func: Callable[P, T]) -> Callable[P, T]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        result = func(*args, **kwargs)
        return result
    return wrapper
```

---

## Pydantic v2

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"; USER = "user"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[\w.-]+@[\w.-]+\.\w+$")
    age: int = Field(..., ge=13, le=120)
    role: Role = Role.USER
    tags: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def name_titlecase(cls, v: str) -> str:
        if not v[0].isupper(): raise ValueError("Name must start with uppercase")
        return v.strip()

    @model_validator(mode="after")
    def check_admin_age(self) -> "UserCreate":
        if self.role == Role.ADMIN and self.age < 18:
            raise ValueError("Admins must be 18+")
        return self

class UserResponse(BaseModel):
    id: int; name: str; email: str
    model_config = {"from_attributes": True}  # ORM mode (was orm_mode=True in v1)

# Serialization
user.model_dump()                # ✅ (was .dict())
user.model_dump_json()           # ✅ (was .json())
user.model_dump(exclude={"password"}, mode="json")
UserCreate.model_validate({"name": "Alice", "email": "a@b.com", "age": 30})  # ✅ (was parse_obj)
UserCreate.model_validate_json('{"name": "Bob", ...}')
```

---

## FastAPI

```python
from fastapi import FastAPI, HTTPException, Depends, Query, Path, status
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db(); await redis.connect()   # startup
    yield
    await redis.close()                       # shutdown

app = FastAPI(title="My API", version="1.0.0", lifespan=lifespan)

# CORS — never "*" in production
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
    allow_origins=["https://myapp.com"],      # ❌ NEVER ["*"]
    allow_credentials=True, allow_methods=["GET","POST","PUT","DELETE"], allow_headers=["*"])

# Routes
@app.get("/users", response_model=list[UserResponse])
async def list_users(skip: int = Query(0, ge=0), limit: int = Query(20, le=100)) -> list[UserResponse]:
    return await db.execute(select(User).offset(skip).limit(limit))

@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> UserResponse:
    user = User(**payload.model_dump())
    db.add(user); await db.commit(); await db.refresh(user)
    return user

# Dependency Injection
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try: yield session
        finally: await session.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_jwt(token)
    user = await db.get(User, payload["sub"])
    if not user: raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

def require_role(role: Role):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != role: raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

# Background Tasks
from fastapi import BackgroundTasks
@app.post("/orders")
async def create_order(order: OrderCreate, bg: BackgroundTasks) -> OrderResponse:
    result = await save_order(order)
    bg.add_task(send_email, result.email)
    return result

# Exception handlers
from fastapi.responses import JSONResponse
@app.exception_handler(AppError)
async def app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})
```

---

## Async Patterns

```python
import asyncio, httpx

# Parallel calls — await all simultaneously
async def fetch_all() -> tuple:
    async with httpx.AsyncClient() as client:
        users, posts = await asyncio.gather(
            client.get("/users"), client.get("/posts")
        )
    return users.json(), posts.json()

# Timeout
async with asyncio.timeout(5.0):      # 3.11+ (was asyncio.wait_for)
    result = await slow_operation()

# Semaphore — limit concurrent ops
sem = asyncio.Semaphore(10)
async def limited_fetch(url: str) -> dict:
    async with sem:
        async with httpx.AsyncClient() as client:
            return (await client.get(url)).json()

# Producer-Consumer
async def producer(q: asyncio.Queue[str]):
    for item in data: await q.put(item)
    await q.put(None)  # sentinel

async def consumer(q: asyncio.Queue[str]):
    while (item := await q.get()) is not None:
        await process(item)
        q.task_done()
```

---

## Error Handling

```python
# NEVER silently swallow exceptions
try: result = await risky_op()
except SpecificError as e: logger.error("Failed: %s", e); raise
except Exception: logger.exception("Unexpected"); raise

# Custom exceptions with context
class ServiceError(Exception):
    def __init__(self, msg: str, code: int = 500, context: dict | None = None):
        super().__init__(msg)
        self.code = code; self.context = context or {}

# Context managers for cleanup
from contextlib import asynccontextmanager
@asynccontextmanager
async def managed_connection():
    conn = await db.connect()
    try: yield conn
    finally: await conn.close()
```

---

## Testing (pytest)

```python
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.anyio
async def test_create_user(client: AsyncClient):
    r = await client.post("/users", json={"name": "Alice", "email": "a@b.com", "age": 25})
    assert r.status_code == 201
    assert r.json()["name"] == "Alice"

# Fixtures with factories (avoid fixtures that return complex data directly)
@pytest.fixture
def make_user(db_session):
    async def _make(name="Alice", role="user"):
        return await User.create(db=db_session, name=name, role=role)
    return _make
```

---

## Project Structure

```
my-api/
├── app/
│   ├── main.py           # FastAPI app + lifespan
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response models
│   ├── routers/          # APIRouter groups
│   ├── services/         # Business logic (no FastAPI imports)
│   ├── dependencies.py   # Shared Depends() callables
│   └── config.py         # Settings via pydantic-settings
├── tests/
├── alembic/              # Migrations
└── pyproject.toml
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                | What AI Commonly Does Wrong                                                  | What Is Actually Correct                                                  |
| :-------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Unchecked Payload Cast**  | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing        | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query**   | Concatenating user inputs into SQL/Prisma query strings                      | Always use parameterized bindings or type-safe ORM query builders         |

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
