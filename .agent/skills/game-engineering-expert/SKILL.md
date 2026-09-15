---
name: game-engineering-expert
description: Use when Game Engineering and Systems Architecture mastery. Replaces fragmented legacy skills. Entity Component Systems (ECS), Unity (C#) / Godot (GDScript) integration, physics calculations, deterministic engine state, WebGL memory management, multiplayer sync architectures (deterministic lockstep vs traditional authoritative), spatial partitioning, and rendering pipelines.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - game-design-expert
  - csharp-developer
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Game Engineering Expert — Performance & State Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `game-engineering-expert` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Game Engineering and Systems Architecture mastery. Replaces fragmented legacy skills. Entity Component Systems (ECS), Unity (C#) / Godot (GDScript) integration, physics calculations, deterministic engine state, WebGL memory management, multiplayer sync architectures (deterministic lockstep vs traditional authoritative), spatial partitioning, and rendering pipelines.
- **DO NOT activate when:** The task falls outside the `game-engineering-expert` domain or is managed by a different dedicated specialist.

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

## Hallucination Traps (Read First)

- ❌ Using deltaTime without clamping -> ✅ Unclamped deltaTime causes physics explosions on frame spikes; clamp to max 0.05s
- ❌ Allocating memory in the game loop (new objects, arrays) -> ✅ Pre-allocate and pool objects to avoid GC pauses during gameplay
- ❌ Using floating-point equality checks for game state -> ✅ Use epsilon comparisons or integer-based fixed-point for deterministic logic

---

---

## 1. Frame Rate Architecture (The Update Loop)

In web development, we await Promises. In game development, we calculate Delta Time continuously.

```csharp
// ❌ BAD: Frame-rate dependent logic
// If the game runs at 120 FPS, the character moves twice as fast as on 60 FPS
void Update() {
    transform.position += currentSpeed;
}

// ✅ GOOD: Frame-independent physics (Unity C# Example)
void Update() {
    // DeltaTime is the time elapsed since the last frame
    transform.position += currentVelocity * Time.deltaTime;
}
```

### FixedUpdate vs Update (The Physics Boundary)

- `Update()` fires as fast as the GPU/CPU can draw. Used for User Input and visual animation interpolations.
- `FixedUpdate()` fires at absolute strict mathematical intervals (e.g., 50 times a second exactly). ALL Physics interactions (`AddForce()`, collision sweeps) MUST live here to prevent tearing and tunneling.

---

## 2. Memory Pooling (Garbage Collection Death)

In Node.js, V8 cleans up objects eventually. In Game Engines, allocating memory creates "Garbage", which forces the Garbage Collector (GC) to pause the entire game to clean up, causing massive micro-stutters.

```csharp
// ❌ FATAL (in Update loops): Creating new objects 60x a second
void Update() {
    Instantiate(bulletPrefab, gun.position, gun.rotation); // Kills the CPU
}

// ✅ EFFICIENT: Object Pooling
// Pre-allocate 100 bullets during the Loading Screen.
// Then simply toggle their active state natively.
void Fire() {
    Bullet b = bulletPool.GetDisabledBullet();
    b.transform.position = gun.position;
    b.gameObject.SetActive(true);
}
```

---

## 3. Entity Component Systems (ECS)

Traditional Object-Oriented Programming (OOP) inheritance hierarchies break down in game engines.
(e.g., `Enemy` inherits from `Character` which inherits from `Renderable`). What happens when you want a `Renderable` that isn't a `Character` but acts like an `Enemy` (like a deadly spike trap)?

**Use ECS.**

1. **Entities:** Just a meaningless ID (e.g., `Entity 304`).
2. **Components:** Pure localized data structs attached to an ID (e.g., `Position {x: 5, y: 10}`, `Health {hp: 100}`).
3. **Systems:** Logic that maps continuously over structs (e.g., `MovementSystem` iterates over ALL Entities that specifically have both a `Position` AND `Velocity` component).

---

## 4. Multiplayer Architectures

Never trust the client. A multiplayer architecture dictates latency fundamentally.

1. **Deterministic Lockstep (RTS / Fighting Games):**
   - Transmits absolute ZERO game state (coordinates).
   - Only transmits _inputs_ (Player A clicked Coordinate X).
   - Both machines run the identical physics frame simultaneously.
   - Extremely bandwidth efficient, but requires identical CPU math output (impossible in JS floating point Math).

2. **Server Authoritative with Client Prediction (Modern FPS/Action):**
   - The Server runs the "Real" game.
   - The Client tells the server "I fired."
   - Because Ping takes 50ms, the Client _predicts_ the shot landing locally (optimistic UI) so the player doesn't feel lag.
   - If the server eventually disagrees, the Client aggressively rewinds and snaps the state to match the Server reality (Rubber-banding).

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

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
