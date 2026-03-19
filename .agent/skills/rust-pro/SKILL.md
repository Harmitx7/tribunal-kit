---
name: rust-pro
description: Master Rust 1.75+ with modern async patterns, advanced type system features, and production-ready systems programming. Expert in the latest Rust ecosystem including Tokio, axum, and cutting-edge crates. Use PROACTIVELY for Rust development, performance optimization, or systems programming.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Rust Development — Production Principles

> Rust's compiler is not your enemy. It is the most thorough code reviewer you will ever have.
> Learn to read its errors as design feedback, not roadblocks.

---

## Ownership in Practice

The borrow checker enforces rules that prevent entire categories of bugs:

```rust
// Rule 1: Each value has exactly one owner
let s1 = String::from("hello");
let s2 = s1;           // s1 is moved — no longer valid
// println!("{}", s1); // ❌ compile error: value used after move

// Rule 2: Borrowing — multiple readers OR one writer
let s = String::from("hello");
let r1 = &s;          // immutable borrow — fine
let r2 = &s;          // second immutable borrow — fine
// let r3 = &mut s;   // ❌ can't borrow mutably while immutably borrowed
println!("{} {}", r1, r2);
let r3 = &mut s.clone(); // ✅ clone to get a new owned value
```

---

## Error Handling

Rust has no exceptions. Errors are values. Design for them explicitly.

```rust
use std::io;
use thiserror::Error;

// Define domain errors with thiserror
#[derive(Error, Debug)]
pub enum AppError {
    #[error("User {0} not found")]
    UserNotFound(String),
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
}

// Return Result in every function that can fail
async fn get_user(id: &str) -> Result<User, AppError> {
    let user = db.find_user(id).await?;  // the `?` operator propagates errors
    user.ok_or_else(|| AppError::UserNotFound(id.to_string()))
}

// In main or handlers: match on the error
match get_user("123").await {
    Ok(user) => println!("Found: {}", user.name),
    Err(AppError::UserNotFound(id)) => eprintln!("No user: {}", id),
    Err(e) => eprintln!("Unexpected error: {}", e),
}
```

---

## Async with Tokio

```rust
use tokio;

#[tokio::main]
async fn main() {
    // Concurrent tasks — run independently
    let (result_a, result_b) = tokio::join!(
        fetch_user(1),
        fetch_products()
    );

    // Spawn a background task
    let handle = tokio::spawn(async {
        background_work().await
    });

    // With timeout
    use tokio::time::{timeout, Duration};
    let result = timeout(Duration::from_secs(5), slow_operation()).await;
    match result {
        Ok(Ok(val)) => println!("Got: {}", val),
        Ok(Err(e)) => eprintln!("Operation failed: {}", e),
        Err(_) => eprintln!("Timed out"),
    }
}
```

---

## HTTP Server with axum

```rust
use axum::{Router, routing::get, routing::post, Json, extract::State};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    db: Arc<Database>,
}

#[tokio::main]
async fn main() {
    let state = AppState { db: Arc::new(Database::connect().await.unwrap()) };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user))
        .with_state(state);

    axum::serve(
        tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap(),
        app,
    ).await.unwrap();
}

async fn get_user(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<User>, StatusCode> {
    state.db.find_user(&id).await
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}
```

---

## Common Pitfalls

| Pitfall | What Happens | Fix |
|---|---|---|
| `.clone()` everywhere | Hides ownership problems, creates heap allocations | Use references `&T` where ownership isn't needed |
| `unwrap()` in production | Panics on None/Err — crashes the process | Use `?` or match and return proper errors |
| Blocking in async | `std::thread::sleep` blocks the Tokio runtime | Use `tokio::time::sleep().await` |
| `Arc<Mutex<T>>` contention | Mutex held across await points causes deadlocks | Hold locks for minimum duration, never across `.await` |

---

## Project Structure

```
src/
  main.rs         Entry point — thin, just wires up the server
  lib.rs          Re-exports for library usage
  handlers/       HTTP request handlers (thin — parse, call service, return response)
  services/       Business logic (no HTTP awareness)
  repositories/   Database queries
  models/         Data structures and validation
  errors.rs       Unified error type
  config.rs       Settings loaded from environment

Cargo.toml         Dependencies
```

---

## Essential Crates

| Crate | Purpose |
|---|---|
| `tokio` | Async runtime |
| `axum` | Web framework |
| `sqlx` | Async SQL with compile-time query checking |
| `serde` + `serde_json` | Serialization |
| `thiserror` | Ergonomic error definitions |
| `anyhow` | Error handling in binaries/scripts (not libraries) |
| `tracing` | Structured async-aware logging |
| `config` | Hierarchical configuration from env/files |

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Rust Pro Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Rust Pro
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

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `memory` · `type-safety`**

### ❌ Forbidden AI Tropes in Rust

1. **`unwrap()`/`expect()` in production code** — hiding errors instead of propagating them with `?`.
2. **`.clone()` everywhere** — blindly copying data instead of reasoning about lifetimes and borrows.
3. **`Arc<Mutex<T>>` overuse** — wrapping everything in locks instead of passing ownership or using channels.
4. **Blocking the Tokio runtime** — using `std::thread::sleep` or sync I/O inside an `async` function.
5. **Over-complex trait bounds** — creating massive generic trait puzzles instead of concrete types when generics aren't needed.

### ✅ Pre-Flight Self-Audit

Review these questions before generating Rust code:
```
✅ Did I properly propagate errors using `Result` and the `?` operator?
✅ Is the Tokio runtime safe from being blocked by my code?
✅ Did I avoid unnecessary `.clone()` calls by borrowing (`&T`) appropriately?
✅ Are my error types properly implemented (e.g., using `thiserror`)?
✅ Did I keep the lock durations on Mutexes as short as possible and never across `.await` points?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Concluding your work because the logic seems sound or assuming `cargo check` is enough for complex runtime logic.
- ✅ **Required:** You are explicitly forbidden from completing your Rust task without providing **concrete terminal evidence** that `cargo test` passes or the binary runs successfully (`cargo run`) without panics. The Borrow Checker passing is step one; runtime verification is mandatory before completion.