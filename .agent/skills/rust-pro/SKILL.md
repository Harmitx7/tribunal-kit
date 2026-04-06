---
name: rust-pro
description: Master Rust 1.75+ with modern async patterns, ownership/borrowing, lifetimes, traits, error handling with thiserror/anyhow, async Tokio runtime, axum web framework, serde serialization, and systems programming. Use when building Rust services, CLI tools, WebAssembly, or performance-critical systems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Rust Pro — Rust 1.75+ Systems Mastery

---

## Ownership & Borrowing

### The Three Rules

```rust
// Rule 1: Each value has exactly ONE owner
let s1 = String::from("hello");
let s2 = s1; // s1 is MOVED to s2 — s1 is no longer valid
// println!("{s1}"); // ❌ compile error: value borrowed after move

// Rule 2: You can have EITHER one mutable reference OR any number of immutable references
let mut data = vec![1, 2, 3];
let r1 = &data;     // ✅ immutable borrow
let r2 = &data;     // ✅ second immutable borrow — fine
// let r3 = &mut data; // ❌ compile error: cannot borrow as mutable while immutable borrows exist
println!("{r1:?} {r2:?}");
// r1 and r2 go out of scope here (NLL — Non-Lexical Lifetimes)
let r3 = &mut data; // ✅ now fine — no immutable borrows active
r3.push(4);

// Rule 3: References must always be valid (no dangling pointers)
// fn dangling() -> &String { // ❌ compile error
//     let s = String::from("hello");
//     &s // s is dropped at end of function — reference would dangle
// }
fn not_dangling() -> String {
    String::from("hello") // ✅ return owned value
}
```

### Common Ownership Patterns

```rust
// Clone when you need independent copies (has a cost — measure)
let original = vec![1, 2, 3];
let copy = original.clone(); // deep copy — both are independent

// Rc<T> — shared ownership (single-threaded)
use std::rc::Rc;
let shared = Rc::new(vec![1, 2, 3]);
let also_shared = Rc::clone(&shared); // cheap reference count increment
// Both shared and also_shared point to the same data

// Arc<T> — shared ownership (thread-safe)
use std::sync::Arc;
let thread_safe = Arc::new(vec![1, 2, 3]);
let for_thread = Arc::clone(&thread_safe);
std::thread::spawn(move || {
    println!("{for_thread:?}");
});

// Cow<T> — Clone on Write (zero-copy when not modified)
use std::borrow::Cow;
fn process(input: &str) -> Cow<'_, str> {
    if input.contains("bad") {
        Cow::Owned(input.replace("bad", "good")) // allocated only if needed
    } else {
        Cow::Borrowed(input) // zero-copy
    }
}
```

---

## Lifetimes

```rust
// Lifetime annotations tell the compiler how long references are valid
// They DON'T change how long values live — they DESCRIBE existing relationships

// ✅ Explicit lifetime: return value lives as long as the input
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Struct with references (requires lifetime annotation)
struct Config<'a> {
    name: &'a str,
    version: &'a str,
}

impl<'a> Config<'a> {
    fn display(&self) -> String {
        format!("{} v{}", self.name, self.version)
    }
}

// 'static lifetime — lives for the entire program
let s: &'static str = "I live forever"; // string literals are 'static
// Owned types satisfy 'static (they own their data)
fn takes_static(s: String) { /* String is 'static because it owns its data */ }

// ❌ HALLUCINATION TRAP: Lifetime elision rules handle most cases
// Don't add lifetimes unless the compiler asks for them
// The compiler tells you exactly which annotations are needed
```

---

## Error Handling

### The `?` Operator & Result

```rust
use std::fs;
use std::io;

// ✅ Propagate errors with ?
fn read_config(path: &str) -> Result<Config, io::Error> {
    let content = fs::read_to_string(path)?; // returns early on error
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}

// ❌ HALLUCINATION TRAP: NEVER use .unwrap() in production code
// .unwrap() panics on error — crashes the entire program
// ❌ let file = File::open("config.json").unwrap();
// ✅ let file = File::open("config.json")?;
// ✅ let file = File::open("config.json").unwrap_or_default();
// ✅ let file = File::open("config.json").map_err(|e| AppError::Io(e))?;
```

### thiserror (Library Errors)

```rust
// thiserror — for library code (structured error types)
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Validation error: {field} — {message}")]
    Validation { field: String, message: String },

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

// #[from] auto-implements From<sqlx::Error> for AppError
// So sqlx errors can be propagated with ? automatically
```

### anyhow (Application Errors)

```rust
// anyhow — for application code (quick error propagation)
use anyhow::{Context, Result, bail, ensure};

fn load_config(path: &str) -> Result<Config> {
    let content = fs::read_to_string(path)
        .context(format!("Failed to read config from {path}"))?;

    let config: Config = serde_json::from_str(&content)
        .context("Invalid JSON in config file")?;

    ensure!(config.port > 0, "Port must be positive, got {}", config.port);

    if config.name.is_empty() {
        bail!("Config name cannot be empty");
    }

    Ok(config)
}

// Use thiserror for libraries, anyhow for applications
// ❌ HALLUCINATION TRAP: Don't use anyhow in library crates
// Libraries should expose structured error types (thiserror)
// anyhow erases type information — callers can't match on specific errors
```

---

## Traits

### Defining & Implementing

```rust
trait Summarizable {
    fn summary(&self) -> String;

    // Default implementation
    fn preview(&self) -> String {
        let s = self.summary();
        if s.len() > 50 {
            format!("{}...", &s[..50])
        } else {
            s
        }
    }
}

struct Article {
    title: String,
    body: String,
    author: String,
}

impl Summarizable for Article {
    fn summary(&self) -> String {
        format!("{} by {} — {}", self.title, self.author, &self.body[..100.min(self.body.len())])
    }
}

// Trait bounds
fn notify(item: &impl Summarizable) {
    println!("Breaking: {}", item.summary());
}

// Equivalent with generics (more flexible)
fn notify_generic<T: Summarizable + std::fmt::Display>(item: &T) {
    println!("Breaking: {}", item.summary());
}

// where clause (cleaner for complex bounds)
fn process<T, U>(t: &T, u: &U) -> String
where
    T: Summarizable + Clone,
    U: std::fmt::Debug + Send,
{
    format!("{} — {:?}", t.summary(), u)
}

// Return impl Trait (hide concrete type)
fn make_summarizer() -> impl Summarizable {
    Article { title: "News".into(), body: "Content".into(), author: "Author".into() }
}
```

### Common Standard Traits

```rust
// Derive common traits
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Point {
    x: i32,
    y: i32,
}

// Display — for user-facing output
use std::fmt;
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// From/Into — type conversion
impl From<(i32, i32)> for Point {
    fn from((x, y): (i32, i32)) -> Self {
        Point { x, y }
    }
}
let p: Point = (10, 20).into(); // uses From automatically

// Iterator
struct Counter { count: u32, max: u32 }
impl Iterator for Counter {
    type Item = u32;
    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}
```

---

## Async with Tokio

### Runtime Setup

```rust
// Cargo.toml
// [dependencies]
// tokio = { version = "1", features = ["full"] }

#[tokio::main]
async fn main() {
    let result = fetch_data("https://api.example.com/data").await;
    println!("{result:?}");
}

// For library code — don't use #[tokio::main], let the caller choose the runtime
pub async fn fetch_data(url: &str) -> Result<String> {
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    Ok(body)
}
```

### Concurrent Tasks

```rust
use tokio::task;

// Spawn concurrent tasks
async fn parallel_fetch() -> Result<(Users, Posts)> {
    let users_handle = task::spawn(async { fetch_users().await });
    let posts_handle = task::spawn(async { fetch_posts().await });

    let users = users_handle.await??; // first ? for JoinError, second for app error
    let posts = posts_handle.await??;

    Ok((users, posts))
}

// tokio::join! — run concurrently, wait for all
async fn fetch_all() -> Result<(Users, Posts, Analytics)> {
    let (users, posts, analytics) = tokio::join!(
        fetch_users(),
        fetch_posts(),
        fetch_analytics(),
    );
    Ok((users?, posts?, analytics?))
}

// tokio::select! — race multiple futures, take first to complete
async fn fetch_with_timeout(url: &str) -> Result<String> {
    tokio::select! {
        result = fetch_data(url) => result,
        _ = tokio::time::sleep(Duration::from_secs(5)) => {
            Err(anyhow!("Request timed out after 5s"))
        }
    }
}

// ❌ HALLUCINATION TRAP: tokio::spawn requires 'static + Send
// You cannot spawn a task referencing local variables without Arc/clone
// ❌ let data = &local_data;
//    tokio::spawn(async { process(data) }); // ❌ data doesn't live long enough
// ✅ let data = Arc::new(local_data);
//    let data_clone = Arc::clone(&data);
//    tokio::spawn(async move { process(&data_clone) });
```

### Channels

```rust
use tokio::sync::{mpsc, oneshot, broadcast};

// mpsc — Multiple Producer, Single Consumer
async fn worker_pattern() {
    let (tx, mut rx) = mpsc::channel::<String>(32); // buffer size

    tokio::spawn(async move {
        tx.send("hello".to_string()).await.unwrap();
        tx.send("world".to_string()).await.unwrap();
    });

    while let Some(msg) = rx.recv().await {
        println!("Got: {msg}");
    }
}

// oneshot — single response (request/response pattern)
async fn request_response() {
    let (tx, rx) = oneshot::channel::<String>();

    tokio::spawn(async move {
        let result = expensive_computation().await;
        tx.send(result).unwrap();
    });

    let response = rx.await.unwrap();
}

// Mutex (async-safe)
use tokio::sync::Mutex;
let shared_state = Arc::new(Mutex::new(Vec::new()));

let state = Arc::clone(&shared_state);
tokio::spawn(async move {
    let mut guard = state.lock().await;
    guard.push("item");
}); // lock released when guard is dropped
```

---

## Axum Web Framework

### Basic Server

```rust
use axum::{
    extract::{Path, Query, State, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, delete},
    Router,
};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
struct AppState {
    db: sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    let pool = sqlx::PgPool::connect("postgres://localhost/mydb").await.unwrap();
    let state = AppState { db: pool };

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/{id}", get(get_user).delete(delete_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ❌ HALLUCINATION TRAP: axum 0.7+ uses {id} not :id for path params
// ❌ .route("/users/:id", ...)  ← old syntax
// ✅ .route("/users/{id}", ...)  ← axum 0.7+
```

### Handlers

```rust
#[derive(Deserialize)]
struct ListParams {
    page: Option<u32>,
    limit: Option<u32>,
}

async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<User>>, AppError> {
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let users = sqlx::query_as!(
        User,
        "SELECT id, name, email FROM users ORDER BY id LIMIT $1 OFFSET $2",
        limit as i64,
        offset as i64,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(users))
}

#[derive(Deserialize)]
struct CreateUserPayload {
    name: String,
    email: String,
}

async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserPayload>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = sqlx::query_as!(
        User,
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
        payload.name,
        payload.email,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(user)))
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User, "SELECT id, name, email FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound(format!("User {id}")))?;

    Ok(Json(user))
}
```

### Error Handling in Axum

```rust
use axum::response::{IntoResponse, Response};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Validation: {0}")]
    Validation(String),
    #[error("Database: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Internal: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Database(e) => {
                tracing::error!("DB error: {e}"); // log internal details
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".to_string())
            }
        };

        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}
```

---

## Serde (Serialization)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]  // JSON uses camelCase
struct UserResponse {
    user_id: i32,           // serialized as "userId"
    full_name: String,      // serialized as "fullName"
    email: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    phone: Option<String>,  // omitted from JSON if None

    #[serde(default)]       // defaults to 0 if missing in input
    login_count: u32,

    #[serde(rename = "type")]  // rename for reserved keywords
    user_type: String,

    #[serde(skip)]          // never serialized/deserialized
    internal_token: String,
}

// Enum serialization
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]  // adjacently tagged
enum Event {
    #[serde(rename = "user_created")]
    UserCreated { id: i32, name: String },
    #[serde(rename = "user_deleted")]
    UserDeleted { id: i32 },
}
// Serializes as: {"type": "user_created", "data": {"id": 1, "name": "Alice"}}
```

---

## Iterator Patterns

```rust
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Chain operations (lazy — no allocation until collect)
let result: Vec<i32> = numbers.iter()
    .filter(|&&n| n % 2 == 0)    // keep even
    .map(|&n| n * n)              // square
    .take(3)                      // first 3
    .collect();                   // [4, 16, 36]

// fold (reduce)
let sum: i32 = numbers.iter().fold(0, |acc, &n| acc + n);

// find / position
let first_even = numbers.iter().find(|&&n| n % 2 == 0); // Some(&2)
let pos = numbers.iter().position(|&n| n > 5);           // Some(5)

// chunk / window
let chunks: Vec<&[i32]> = numbers.chunks(3).collect();
// [[1,2,3], [4,5,6], [7,8,9], [10]]

let windows: Vec<&[i32]> = numbers.windows(3).collect();
// [[1,2,3], [2,3,4], [3,4,5], ...]

// Collecting into HashMap
use std::collections::HashMap;
let word_counts: HashMap<&str, usize> = words.iter()
    .fold(HashMap::new(), |mut map, word| {
        *map.entry(word.as_str()).or_insert(0) += 1;
        map
    });
```


