# FastAPI & Pydantic v2 Production Reference

> **Authority**: FastAPI Official Documentation (`https://fastapi.tiangolo.com/`) & Pydantic v2  
> **Applicable Domains**: Backend Engineering, Python APIs, Async Systems  
> **Status**: Verified Production Specification  

---

## 1. Async Def vs. Def Decision Matrix

FastAPI treats `async def` and plain `def` endpoints fundamentally differently:

| Route Definition | Execution Thread | When to Use |
|:---|:---|:---|
| `async def endpoint(...)` | Runs directly on the **Main Event Loop** | Non-blocking async libraries (`asyncpg`, `httpx`, `aiofiles`) |
| `def endpoint(...)` | Offloaded to an external **Thread Pool** | Blocking synchronous libraries (`requests`, standard `psycopg2`, CPU math) |

> ⚠️ **Catastrophic Failure**: Calling blocking code (e.g. `time.sleep()`, synchronous database calls) inside an `async def` function blocks the single main event loop, causing all concurrent requests to stall!

---

## 2. Pydantic v2 Validation Standards

Pydantic v2 replaces v1 `@validator` and `@root_validator` with strict performance-optimized Rust core methods:

```python
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

class UserCreateRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    password_confirm: str

    @field_validator('username')
    @classmethod
    def validate_username_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

    @model_validator(mode='after')
    def verify_passwords_match(self) -> 'UserCreateRequest':
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')
        return self
```

---

## 3. Application Lifespan Events (`asynccontextmanager`)

Replace deprecated `@app.on_event("startup")` with modern ASGI lifespan handlers:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connection pools
    db_pool = await create_db_pool()
    app.state.db = db_pool
    yield
    # Shutdown: Cleanly terminate connections
    await db_pool.close()

app = FastAPI(lifespan=lifespan)
```
