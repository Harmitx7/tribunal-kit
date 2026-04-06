---
name: python-pro
description: Python 3.12+ specialist. FastAPI, Pydantic v2, asyncio, modern types, pytest. Use when building Python APIs, data pipelines, automation, or any Python code.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
---

# Python 3.12+ — Dense Reference

## Hallucination Traps (Read First)
- ❌ `from typing import List, Dict, Optional, Union` → ✅ `list[str]`, `dict[k,v]`, `X | None`, `X | Y` (Python 3.10+)
- ❌ `user.dict()` / `user.json()` / `UserCreate.parse_obj()` → ✅ Pydantic v2: `model_dump()`, `model_dump_json()`, `model_validate()`
- ❌ Pydantic `class Config: orm_mode = True` → ✅ `model_config = {"from_attributes": True}`
- ❌ `@validator` / `@root_validator` → ✅ `@field_validator` / `@model_validator`
- ❌ `@app.on_event("startup")` → ✅ `lifespan` context manager (deprecated)
- ❌ `import requests` in async code → ✅ `httpx.AsyncClient()` (requests BLOCKS the event loop)
- ❌ `asyncio.run()` inside running loop → ✅ `await` directly or use `loop.create_task()`
- ❌ `except Exception as e: pass` → ✅ always log or re-raise

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
