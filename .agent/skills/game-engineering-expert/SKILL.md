---
name: game-engineering-expert
description: Game Engineering and Systems Architecture mastery. Replaces fragmented legacy skills. Entity Component Systems (ECS), Unity (C#) / Godot (GDScript) integration, physics calculations, deterministic engine state, WebGL memory management, multiplayer sync architectures (deterministic lockstep vs traditional authoritative), spatial partitioning, and rendering pipelines.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using deltaTime without clamping -> ✅ Unclamped deltaTime causes physics explosions on frame spikes; clamp to max 0.05s
- ❌ Allocating memory in the game loop (new objects, arrays) -> ✅ Pre-allocate and pool objects to avoid GC pauses during gameplay
- ❌ Using floating-point equality checks for game state -> ✅ Use epsilon comparisons or integer-based fixed-point for deterministic logic

---


# Game Engineering Expert — Performance & State Mastery

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
   - Only transmits *inputs* (Player A clicked Coordinate X).
   - Both machines run the identical physics frame simultaneously.
   - Extremely bandwidth efficient, but requires identical CPU math output (impossible in JS floating point Math).

2. **Server Authoritative with Client Prediction (Modern FPS/Action):**
   - The Server runs the "Real" game.
   - The Client tells the server "I fired."
   - Because Ping takes 50ms, the Client *predicts* the shot landing locally (optimistic UI) so the player doesn't feel lag.
   - If the server eventually disagrees, the Client aggressively rewinds and snaps the state to match the Server reality (Rubber-banding).

---


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
