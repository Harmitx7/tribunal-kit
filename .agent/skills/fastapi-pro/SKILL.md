---
name: fastapi-pro
description: "Use when designing, building, auditing, and securing FastAPI applications. Covers Pydantic v2 schemas, async def vs def threadpool mechanics, dependency injection security (Depends), BOLA/IDOR prevention, middleware, and OpenAPI documentation."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - python-pro
  - api-security-auditor
  - backend-security-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "fastapi"
  - "pro"
---

# FastAPI & Pydantic v2 Production Architecture Mastery

## Activation Boundaries
- **Activate when:** Use when designing, building, auditing, and securing FastAPI applications. Covers Pydantic v2 schemas, async def vs def threadpool mechanics, dependency injection security (Depends), BOLA/IDOR prevention, middleware, and OpenAPI documentation.
- **DO NOT activate when:** The task falls outside the `fastapi-pro` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


## Mandatory Pre-Flight Context Inspection
1. **Async vs Sync Function Signature**: Verify whether route handlers do blocking IO; `async def` with blocking calls freezes event loop.
2. **Pydantic Version**: Confirm Pydantic v2 syntax (`model_dump()`, `model_validate()`, `field_validator`); reject v1 (`dict()`, `parse_obj()`).
3. **Dependency Scopes**: Inspect `Depends()` hierarchies; verify authorization and database session boundaries are encapsulated cleanly.
4. **Data Exposure in Responses**: Verify every endpoint declares an explicit `response_model` to filter private internal fields.
5. **CORS & Middleware Order**: Ensure security and exception handling middleware are initialized in correct order.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Correct Async vs Sync Handler Architecture
```python
from fastapi import FastAPI, Depends, HTTPException, status
import time
import asyncio

app = FastAPI()

# ❌ BAD: Blocking IO inside async def blocks the entire single-threaded event loop!
@app.get("/bad-async")
async def bad_async():
    time.sleep(2)  # FREEZES all incoming requests on server
    return {"status": "blocked"}

# ✅ CORRECT: Use regular def for synchronous/blocking libraries (FastAPI runs in external threadpool)
@app.get("/good-sync")
def good_sync():
    time.sleep(2)  # Executed safely inside anyio worker threadpool
    return {"status": "threaded"}

# ✅ CORRECT: Use async def ONLY with non-blocking awaitable calls
@app.get("/good-async")
async def good_async():
    await asyncio.sleep(2)  # Releases event loop to handle concurrent requests
    return {"status": "concurrent"}
```

### 2. Secure Dependency Injection & Object-Level Authorization (BOLA/IDOR)
```python
from pydantic import BaseModel, ConfigDict
from typing import Annotated

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    user = await verify_jwt_and_fetch_user(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user

async def get_project_for_user(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Project:
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    # Tenancy / Ownership validation
    if project.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return project

@app.get("/projects/{project_id}", response_model=ProjectRead)
async def read_project(project: Annotated[Project, Depends(get_project_for_user)]):
    return project
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Missing response_model** | Accidental return of ORM model exposes password hashes, salts, and internal keys | Always define explicit output schema on route decorator `@app.get(..., response_model=UserPublic)` |
| **Wildcard CORS with Credentials** | `allow_origins=["*"]` with `allow_credentials=True` triggers browser security rejection | Explicitly declare exact trusted origins array from environment configuration |
| **Payload Size Bomb** | Unbounded body uploads cause memory exhaustion | Enforce maximum content-length validation in custom middleware |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Pydantic v1 Syntax** | Using `.dict()`, `.json()`, `validator` | Use Pydantic v2: `.model_dump()`, `.model_dump_json()`, `@field_validator` |
| **Direct Request Body Extraction** | Manually parsing `await request.json()` | Use type-annotated Pydantic models in endpoint parameters |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `backend-specialist`, `security-auditor`, `api-architect`
- **Evidence Standard:** Mark all findings as `[OBSERVED]`, `[INFERRED]`, or `[UNVERIFIED]`.
