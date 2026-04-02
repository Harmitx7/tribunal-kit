---
name: game-engineering-expert
description: Game Engineering and Systems Architecture mastery. Replaces fragmented legacy skills. Entity Component Systems (ECS), Unity (C#) / Godot (GDScript) integration, physics calculations, deterministic engine state, WebGL memory management, multiplayer sync architectures (deterministic lockstep vs traditional authoritative), spatial partitioning, and rendering pipelines.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Game Engineering Expert — Performance & State Mastery

> A web server processes requests asynchronously. A game engine processes reality 60 times a second.
> Memory allocation inside the update loop is a death sentence for frame rates.

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

## 🤖 LLM-Specific Traps (Game Engineering)

1. **Await Inside Update:** AI suggests `await Task.Delay()` inside a Unity `Update()` loop instead of yielding inside a proper Coroutine, causing thousands of tasks to stack and crash the engine memory instantaneously.
2. **Missing DeltaTime:** The AI forgets to multiply positional vectors by `Time.deltaTime` (or Godot's `delta`), making games function optimally on developer PCs but hyper-speed glitch on high refresh rate monitors.
3. **Direct String Lookups:** Executing `GameObject.Find("Player")` inside an `Update()` loop. This forces a recursive string-matching crawl across the entire scene hierarchy 60 times a second. Architect via localized caching/Singleton pattern on boot.
4. **Trusting the Client State:** Architecting a multiplayer route as `emit('playerDead', { id: targetId })`. An exploiter can forge this payload and kill anyone. The client must emit `('fireWeapon', { aimVector })` and the server decides if targetId dies.
5. **Physics Tunneling:** The AI moves objects by altering `.position` directly instead of manipulating `RigidBody` velocities. If moved directly, the physics engine cannot calculate intermediate collision sweeps, causing bullets to phase through thin walls blindly.
6. **OOP Hierarchy Hell:** The AI generating deep, brittle C++ inheritance trees for enemies instead of favoring flat Component composition.
7. **Allocating In Rendering Loops:** Instantiating new Vector3 structs (`new Vector3()`) continuously inside tight algorithmic loops instead of utilizing strict global allocations or structural re-assignment.
8. **WebGL Threading Illusions:** Suggesting complex C# multi-threading (System.Threading.Tasks) for a Unity WebGL web-game build. WebGL fundamentally executes single-threaded; multi-threading must be emulated or bypassed entirely via Job Systems.
9. **Event Spillage (Memory Leaks):** Subscribing to strict engine C# Action events ( `GameManager.OnDeath += Explode;` ) but entirely failing to unsubscribe in the `OnDestroy()` hierarchy, creating immortal zombie objects in RAM forever.
10. **The Canvas Rebuild:** Altering a single Text element in a massive UI grouping, causing Unity to expensively re-rasterize and bake the entire UI canvas mesh. Segment UI into static and dynamic distinct canvases.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are positional equations multiplied universally by `deltaTime` for frame independence?
✅ Have physics/collision mutations been explicitly restricted to the `FixedUpdate` engine cycles?
✅ Are memory pools implemented to completely eliminate runtime garbage collection stutter?
✅ Does the networking architecture explicitly forbid the client from dictating authoritative game state?
✅ Have `.Find()` string query loops been eliminated from continuous execution pathways?
✅ Did I rely on Component composition rather than deep, brittle inheritance trees?
✅ Are `RigidBody` velocities manipulated instead of raw `.position` to prevent quantum wall tunneling?
✅ Have all event subscriptions (`+=`) been rigidly paired with localized destruction unsubscribe (`-=`) methods?
✅ Were multi-threading paradigms avoided/recalculated if targeting web browser execution formats?
✅ Is the UI strictly architected to prevent global canvas rebuilds across minor localized visual changes?
```
