---
name: backend-sqlalchemy
description: "Use when analyzing, writing, and optimizing SQLAlchemy 2.0+ ORM and Core code in Python. Covers modern select() syntax, async sessions, relationship loading strategies (selectinload, joinedload), session lifecycles, and N+1 prevention."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - python-pro
  - database-design
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
  - "backend"
  - "sqlalchemy"
  - "analyzing"
---

# SQLAlchemy 2.0+ Mastery — Async ORM & Core Architecture

## Activation Boundaries
- **Activate when:** Use when analyzing, writing, and optimizing SQLAlchemy 2.0+ ORM and Core code in Python. Covers modern select() syntax, async sessions, relationship loading strategies (selectinload, joinedload), session lifecycles, and N+1 prevention.
- **DO NOT activate when:** The task falls outside the `backend-sqlalchemy` domain or is managed by a different dedicated specialist agent.


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
1. **SQLAlchemy Version**: Confirm version is 2.0+; reject legacy 1.x patterns (`session.query(Model)` is deprecated).
2. **Sync vs Async Engine**: Identify whether `create_async_engine` or synchronous `create_engine` is in use.
3. **Session Lifecycle**: Verify session scope; in web frameworks (FastAPI/Flask), ensure sessions are bound to request lifecycles.
4. **Relationship Loading Strategy**: Inspect model relationships for lazy loading (`lazy="select"`) which causes async greenlet errors.
5. **Connection Pool Bounds**: Check `pool_size`, `max_overflow`, and `pool_pre_ping=True`.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Modern SQLAlchemy 2.0 Async Session & Loading Pattern
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload, DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    orders: Mapped[list["Order"]] = relationship(back_populates="user")

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped[User] = relationship(back_populates="orders")

# ✅ Modern 2.0 query with eager loading (Prevents N+1 and Async MissingGreenlet error)
async def get_user_with_orders(session: AsyncSession, user_id: int) -> User | None:
    stmt = (
        select(User)
        .options(selectinload(User.orders))  # Eager load 1:N via separate SELECT IN
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
```

### 2. Transaction Management & Unit of Work Context
```python
async def transfer_credits(session: AsyncSession, from_id: int, to_id: int, amount: int) -> None:
    async with session.begin():  # Manages BEGIN and COMMIT/ROLLBACK automatically
        sender = await session.get(User, from_id, with_for_update=True)
        recipient = await session.get(User, to_id, with_for_update=True)
        
        if not sender or sender.credits < amount:
            raise ValueError("Insufficient balance")
            
        sender.credits -= amount
        recipient.credits += amount
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Async MissingGreenlet Exception** | Accessing unloaded relationship attribute in async handler crashes runtime | Always explicitly specify `selectinload()` or `joinedload()` in query options |
| **Session Leak Across Requests** | Unclosed sessions starve the connection pool, locking new requests | Use dependency injection context manager (`async with get_session() as session:`) |
| **ExpiredOnCommit Attribute Access** | Accessing model attributes after `session.commit()` triggers unexpected DB query | Set `expire_on_commit=False` in `async_sessionmaker` |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Legacy `session.query()`** | Generating deprecated `session.query(User).filter(...)` | Use 2.0 syntax `select(User).where(...)` executed via `session.execute()` |
| **Unparameterized Raw SQL** | Using `text(f"SELECT * FROM users WHERE id = {user_id}")` | Use bound parameters: `text("SELECT * FROM users WHERE id = :id"), {"id": user_id}` |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `python-pro`, `resilience-reviewer`
- **Evidence Standard:** Categorize findings into `[OBSERVED]`, `[INFERRED]`, and `[UNVERIFIED]`.
