---
name: python-pro
description: Senior Python developer (3.12+) specializing in idiomatic, type-safe, and performant Python. FastAPI/Django mastery, Pydantic v2 data validation, asyncio concurrency, modern type system (TypeVar, ParamSpec, TypedDict, Protocol), testing with pytest, and production patterns. Use when building Python APIs, data pipelines, automation, or any Python code.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Python Pro — Python 3.12+ Mastery

> Python is not a scripting language you hack together. It is a typed, async-capable, production-grade platform.
> Every function gets type hints. Every I/O call gets `async`. Every exception gets caught specifically. No shortcuts.

---

## Modern Python Type System

### Function Signatures (Mandatory)

```python
# ✅ Every public function MUST have full type hints
def calculate_tax(amount: float, rate: float = 0.08) -> float:
    """Calculate tax for a given amount."""
    return amount * rate

# ✅ Collections use built-in generics (Python 3.9+)
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# ❌ HALLUCINATION TRAP: Do NOT import from typing for built-in generics
# ❌ from typing import List, Dict, Tuple, Set  ← LEGACY (Python 3.8)
# ✅ Use list[str], dict[str, int], tuple[int, ...], set[str] directly
```

### Union Types & Optional

```python
# Python 3.10+ — use | instead of Union
def find_user(user_id: int) -> User | None:
    """Return user or None if not found."""
    return db.get(user_id)

# ❌ HALLUCINATION TRAP: Do NOT use Optional[X] or Union[X, Y]
# ❌ from typing import Optional, Union  ← LEGACY
# ✅ Use X | None and X | Y directly (Python 3.10+)

# Multiple return types
def parse_value(raw: str) -> int | float | None:
    try:
        return int(raw)
    except ValueError:
        try:
            return float(raw)
        except ValueError:
            return None
```

### TypedDict

```python
from typing import TypedDict, NotRequired

class UserPayload(TypedDict):
    name: str
    email: str
    age: NotRequired[int]     # optional key
    role: NotRequired[str]

def create_user(data: UserPayload) -> User:
    # TypedDict gives you autocomplete and type checking on dict keys
    return User(name=data["name"], email=data["email"])

# Usage:
payload: UserPayload = {"name": "Alice", "email": "alice@example.com"}
```

### Protocol (Structural Typing)

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...

class HTMLWidget:
    def render(self) -> str:
        return "<div>Widget</div>"

class JSONExporter:
    def render(self) -> str:
        return '{"type": "export"}'

# Both satisfy Renderable WITHOUT inheriting from it
def display(item: Renderable) -> None:
    print(item.render())

display(HTMLWidget())    # ✅ works — has render() -> str
display(JSONExporter())  # ✅ works — has render() -> str

# Protocol is Duck Typing with type safety
# Use Protocol INSTEAD of ABC when you want structural (not nominal) typing
```

### Generic Functions & Classes

```python
from typing import TypeVar, ParamSpec
from collections.abc import Callable

T = TypeVar("T")
P = ParamSpec("P")

# Generic function
def first(items: list[T]) -> T | None:
    return items[0] if items else None

# ParamSpec — preserve function signatures in decorators
def with_logging(func: Callable[P, T]) -> Callable[P, T]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        print(f"Calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"Result: {result}")
        return result
    return wrapper

@with_logging
def add(a: int, b: int) -> int:
    return a + b

# Python 3.12+ — Simplified generic syntax (PEP 695)
def first_item[T](items: list[T]) -> T | None:  # 3.12+ syntax
    return items[0] if items else None

type Point = tuple[float, float]  # 3.12+ type alias syntax
```

---

## Pydantic v2 (Data Validation)

### Models

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[\w.-]+@[\w.-]+\.\w+$")
    age: int = Field(..., ge=13, le=120)
    role: Role = Role.USER
    tags: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("name")
    @classmethod
    def name_must_be_titlecase(cls, v: str) -> str:
        if not v[0].isupper():
            raise ValueError("Name must start with uppercase")
        return v.strip()

    @model_validator(mode="after")
    def check_admin_age(self) -> "UserCreate":
        if self.role == Role.ADMIN and self.age < 18:
            raise ValueError("Admins must be 18+")
        return self

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}  # ORM mode

# ❌ HALLUCINATION TRAP: Pydantic v2 uses model_config dict
# NOT the inner class Config (Pydantic v1 pattern)
# ❌ class Config:
# ❌     orm_mode = True   ← REMOVED in v2
# ✅ model_config = {"from_attributes": True}

# ❌ HALLUCINATION TRAP: Pydantic v2 validators use @field_validator
# NOT @validator (v1) or @root_validator (v1)
# @field_validator replaces @validator
# @model_validator replaces @root_validator
```

### Serialization

```python
user = UserCreate(name="Alice", email="alice@test.com", age=30)

# Serialize to dict
data = user.model_dump()  # ✅ v2
# ❌ user.dict()  ← REMOVED in v2

# Serialize to JSON
json_str = user.model_json_schema()  # schema
json_str = user.model_dump_json()    # data as JSON string
# ❌ user.json()  ← REMOVED in v2

# Parse from dict
user = UserCreate.model_validate({"name": "Bob", "email": "bob@test.com", "age": 25})
# ❌ UserCreate.parse_obj({...})  ← REMOVED in v2

# Parse from JSON
user = UserCreate.model_validate_json('{"name": "Bob", ...}')
# ❌ UserCreate.parse_raw(...)  ← REMOVED in v2
```

---

## FastAPI Patterns

### Basic Route Structure

```python
from fastapi import FastAPI, HTTPException, Depends, Query, Path, status
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="My API",
    version="1.0.0",
    docs_url="/docs",          # Swagger UI
    redoc_url="/redoc",        # ReDoc
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],  # ❌ NEVER use ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Role | None = Query(None),
) -> list[UserResponse]:
    query = select(User)
    if role:
        query = query.where(User.role == role)
    users = await db.execute(query.offset(skip).limit(limit))
    return users.scalars().all()

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int = Path(..., ge=1)) -> UserResponse:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate) -> UserResponse:
    user = User(**payload.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

### Dependency Injection

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Database session dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# Auth dependency
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_jwt(token)
    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

# Permission dependency
def require_role(role: Role):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# Usage:
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(Role.ADMIN)),
) -> dict:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(user)
    await db.commit()
    return {"deleted": user_id}
```

### Background Tasks & Lifespan

```python
from contextlib import asynccontextmanager
from fastapi import BackgroundTasks

# Lifespan (replaces @app.on_event — which is deprecated)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await redis.connect()
    print("App started")
    yield
    # Shutdown
    await redis.close()
    print("App stopped")

app = FastAPI(lifespan=lifespan)

# ❌ HALLUCINATION TRAP: @app.on_event("startup") is DEPRECATED in FastAPI
# ✅ Use the lifespan context manager instead

# Background tasks
@app.post("/orders")
async def create_order(
    order: OrderCreate,
    background_tasks: BackgroundTasks,
) -> OrderResponse:
    result = await save_order(order)
    background_tasks.add_task(send_confirmation_email, result.email)
    background_tasks.add_task(update_inventory, result.items)
    return result
```

### Error Handling

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "path": str(request.url)},
    )

@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log the full traceback — critical for debugging
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )
```

---

## Async Programming

### asyncio Patterns

```python
import asyncio
import httpx

# ✅ Parallel async calls
async def fetch_all_data() -> tuple[Users, Posts, Analytics]:
    async with httpx.AsyncClient() as client:
        users, posts, analytics = await asyncio.gather(
            client.get("https://api.example.com/users"),
            client.get("https://api.example.com/posts"),
            client.get("https://api.example.com/analytics"),
        )
    return users.json(), posts.json(), analytics.json()

# ❌ HALLUCINATION TRAP: Do NOT use `requests` in async code
# `requests` is synchronous and blocks the event loop
# ✅ Use httpx (async) or aiohttp
# ❌ import requests  ← blocks async event loop
# ✅ import httpx     ← async-native HTTP client

# Semaphore — limit concurrent operations
async def fetch_with_limit(urls: list[str], max_concurrent: int = 10):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_one(url: str) -> dict:
        async with semaphore:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                return response.json()

    return await asyncio.gather(*[fetch_one(url) for url in urls])

# TaskGroup (Python 3.11+) — structured concurrency
async def process_batch():
    results = []
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_users())
        task2 = tg.create_task(fetch_posts())
    # Both tasks guaranteed to complete or all cancel on error
    return task1.result(), task2.result()
```

### Async Files & Databases

```python
import aiofiles

# ✅ Async file I/O
async def read_config(path: str) -> dict:
    async with aiofiles.open(path, "r") as f:
        content = await f.read()
    return json.loads(content)

# ❌ HALLUCINATION TRAP: Do NOT use open() in async contexts
# open() blocks the event loop — use aiofiles instead

# Blocking code in async context — use to_thread
import asyncio

async def process_image(path: str) -> bytes:
    # CPU-bound work — offload to thread pool
    return await asyncio.to_thread(heavy_image_processing, path)
```

---

## Dataclasses & Patterns

### Modern Dataclasses

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass(frozen=True, slots=True)  # immutable + memory efficient
class Point:
    x: float
    y: float

    def distance_to(self, other: "Point") -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

@dataclass(slots=True)
class Task:
    title: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    _internal: str = field(default="", repr=False, init=False)

# ✅ slots=True — faster attribute access, less memory
# ✅ frozen=True — immutable (hashable, safe for sets/dicts)
# ✅ field(default_factory=list) — never use mutable defaults

# ❌ HALLUCINATION TRAP: NEVER use mutable default arguments
# ❌ def __init__(self, tags: list[str] = []):  ← BUG (shared reference)
# ✅ def __init__(self, tags: list[str] | None = None):
#        self.tags = tags or []
```

### Pattern Matching (3.10+)

```python
# Structural pattern matching — NOT just a switch statement
def handle_command(command: dict) -> str:
    match command:
        case {"action": "create", "name": str(name), "type": str(kind)}:
            return f"Creating {kind}: {name}"

        case {"action": "delete", "id": int(item_id)}:
            return f"Deleting item {item_id}"

        case {"action": "list", "filter": {"status": str(status)}}:
            return f"Listing items with status: {status}"

        case {"action": "list"}:
            return "Listing all items"

        case _:
            raise ValueError(f"Unknown command: {command}")

# With guards
def classify_response(status_code: int) -> str:
    match status_code:
        case code if 200 <= code < 300:
            return "success"
        case 404:
            return "not_found"
        case code if 400 <= code < 500:
            return "client_error"
        case code if 500 <= code < 600:
            return "server_error"
        case _:
            return "unknown"
```

---

## Context Managers

```python
from contextlib import contextmanager, asynccontextmanager
import time

# Sync context manager
@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.3f}s")

# Usage:
with timer("Database query"):
    results = db.execute(query)

# Async context manager
@asynccontextmanager
async def managed_transaction(db: AsyncSession):
    try:
        yield db
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()

# Usage:
async with managed_transaction(session) as db:
    db.add(user)
```

---

## Decorators

```python
import functools
import time
from collections.abc import Callable
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
T = TypeVar("T")

# Retry decorator with exponential backoff
def retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_error: Exception | None = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        sleep_time = delay * (2 ** attempt)
                        time.sleep(sleep_time)
            raise last_error  # type: ignore[misc]
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def flaky_api_call(url: str) -> dict:
    response = httpx.get(url)
    response.raise_for_status()
    return response.json()

# Cache decorator (Python 3.9+ — replaces lru_cache for methods)
from functools import cache

@cache  # unbounded cache (use lru_cache(maxsize=N) to limit)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

## Testing with pytest

### Test Structure

```python
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

# Fixtures
@pytest.fixture
def sample_user() -> UserCreate:
    return UserCreate(name="Alice", email="alice@test.com", age=30)

@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

# ❌ HALLUCINATION TRAP: Do NOT use TestClient for async FastAPI tests
# TestClient is synchronous. Use httpx.AsyncClient with ASGITransport.

# Basic test
def test_calculate_tax():
    assert calculate_tax(100, 0.08) == pytest.approx(8.0)

# Async test
@pytest.mark.anyio  # or @pytest.mark.asyncio
async def test_create_user(async_client: AsyncClient):
    response = await async_client.post("/users", json={
        "name": "Alice",
        "email": "alice@test.com",
        "age": 30,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Alice"

# Parametrize
@pytest.mark.parametrize("input_val,expected", [
    (0, "zero"),
    (1, "positive"),
    (-1, "negative"),
])
def test_classify(input_val: int, expected: str):
    assert classify(input_val) == expected

# Mocking
async def test_external_api_call():
    with patch("myapp.services.httpx.AsyncClient.get", new_callable=AsyncMock) as mock:
        mock.return_value = httpx.Response(200, json={"data": "mocked"})
        result = await fetch_external_data()
        assert result == {"data": "mocked"}
        mock.assert_called_once()

# Exception testing
def test_invalid_age_raises():
    with pytest.raises(ValueError, match="Admins must be 18"):
        UserCreate(name="Kid", email="kid@test.com", age=15, role=Role.ADMIN)
```

### conftest.py Patterns

```python
# conftest.py — shared fixtures across all tests
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture(scope="session")
def engine():
    return create_async_engine("sqlite+aiosqlite:///:memory:")

@pytest.fixture(autouse=True)
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

---

## Project Structure

```
myproject/
├── pyproject.toml          ← project config (replaces setup.py + setup.cfg)
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── main.py         ← FastAPI app factory
│       ├── config.py       ← Settings via pydantic-settings
│       ├── models/         ← SQLAlchemy / Pydantic models
│       ├── routes/         ← API route modules
│       ├── services/       ← Business logic
│       ├── repositories/   ← Database access layer
│       └── utils/          ← Shared utilities
├── tests/
│   ├── conftest.py
│   ├── test_routes/
│   ├── test_services/
│   └── test_models/
├── alembic/                ← Database migrations
│   └── versions/
└── .env                    ← Environment variables (git-ignored)
```

### Settings with pydantic-settings

```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field("redis://localhost:6379", alias="REDIS_URL")
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    debug: bool = False
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

# ❌ HALLUCINATION TRAP: pydantic-settings is a SEPARATE package in v2
# pip install pydantic-settings
# ❌ from pydantic import BaseSettings  ← REMOVED from pydantic v2 core
# ✅ from pydantic_settings import BaseSettings

settings = Settings()  # reads from .env and environment variables
```

---

## Common Idioms

### Comprehensions & Generators

```python
# Dict comprehension with filtering
active_users = {u.id: u.name for u in users if u.is_active}

# Set comprehension
unique_domains = {email.split("@")[1] for email in emails}

# Generator (lazy — doesn't load all into memory)
def read_large_file(path: str):
    with open(path) as f:
        for line in f:
            yield line.strip()

# Walrus operator (:=) — assign and test
while chunk := f.read(8192):
    process(chunk)

# zip with strict (Python 3.10+)
for name, score in zip(names, scores, strict=True):
    # Raises ValueError if lengths differ
    print(f"{name}: {score}")
```

### Exception Handling

```python
# ✅ CORRECT: Specific exceptions with context
import logging

logger = logging.getLogger(__name__)

async def fetch_user(user_id: int) -> User:
    try:
        response = await client.get(f"/users/{user_id}")
        response.raise_for_status()
        return User.model_validate(response.json())
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise UserNotFoundError(f"User {user_id} not found") from e
        logger.error("API error: %s", e.response.text)
        raise
    except httpx.RequestError as e:
        logger.error("Network error fetching user %d: %s", user_id, e)
        raise ServiceUnavailableError("User service unreachable") from e

# ❌ NEVER: Bare except or broad Exception catch
# ❌ except:                          ← catches SystemExit, KeyboardInterrupt
# ❌ except Exception:                ← too broad
# ❌ except Exception as e: pass      ← silent failure (WORST)
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Python Pro Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Python Pro
Python Ver:  3.12+
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

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when generating Python code. These are strictly forbidden:

1. **Legacy Type Imports:** Do NOT import `List`, `Dict`, `Tuple`, `Set`, `Optional`, `Union` from `typing`. Use `list[str]`, `dict[str, int]`, `tuple[int, ...]`, `X | None`, `X | Y` directly (Python 3.10+).
2. **Pydantic v1 Syntax:** Do NOT use `.dict()`, `.json()`, `.parse_obj()`, `@validator`, `@root_validator`, or `class Config:`. Use `.model_dump()`, `.model_dump_json()`, `.model_validate()`, `@field_validator`, `@model_validator`, and `model_config = {}`.
3. **`BaseSettings` from Pydantic Core:** `BaseSettings` was moved to the `pydantic-settings` package in v2. Import from `pydantic_settings`, not `pydantic`.
4. **Synchronous I/O in Async:** Never use `requests`, `open()`, or blocking `time.sleep()` inside `async` functions. Use `httpx`, `aiofiles`, and `asyncio.sleep()`.
5. **Mutable Default Arguments:** Never use `def func(items=[])` or `def func(data={})`. Use `None` and initialize inside the function body.
6. **Bare `except:`:** Never catch all exceptions. Always catch specific exception types. Never silence errors with `except: pass`.
7. **`@app.on_event("startup")`:** This is deprecated in FastAPI. Use the `lifespan` context manager.
8. **`TestClient` for Async Tests:** Use `httpx.AsyncClient` with `ASGITransport` for async FastAPI tests, not the synchronous `TestClient`.
9. **String-Interpolated SQL:** Never use f-strings or `.format()` to build SQL queries. Always use parameterized queries or ORM methods.
10. **Missing `from __future__ import annotations`:** If targeting Python 3.9 with 3.10+ type syntax, you need this import. For 3.10+, it's not needed.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `dependency` · `type-safety`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `# VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing exceptions without logging.
3. **Context Amnesia:** Forgetting the user's Python version, framework, or package manager constraints.
4. **Over-Engineering:** Creating abstractions, factory patterns, or metaclasses where a simple function suffices.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Are all function signatures fully typed (params + return)?
✅ Did I use modern syntax (X | None, not Optional[X])?
✅ Did I use Pydantic v2 methods (.model_dump, not .dict)?
✅ Is I/O properly awaited or offloaded with asyncio.to_thread?
✅ Did I catch specific exceptions (not bare except)?
✅ Did I use parameterized queries (not f-string SQL)?
✅ Are mutable defaults avoided (no list/dict as default args)?
✅ Did I use the lifespan pattern (not @app.on_event)?
✅ Is the code PEP 8 / black / ruff compliant?
✅ Did I write pytest tests with proper fixtures?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Ending your task because the code "looks pythonic" or lacks syntax errors.
- ✅ **Required:** You are explicitly forbidden from completing your task without providing **concrete terminal/test evidence** (e.g., passing `pytest` logs, `mypy --strict` success, or `ruff check` pass) proving the code actually runs correctly.
