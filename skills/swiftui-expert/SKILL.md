---
name: swiftui-expert
description: Use when SwiftUI development mastery. View architecture, state management (@State, @Binding, @Environment, @Observable), performance optimization (identifiable loops, implicit vs explicit animations), architectural patterns (MVVM vs TCA), and iOS-native UX paradigms. Use when writing native Apple platforms code.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - mobile-design
  - building-native-ui
  - apple-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# SwiftUI Expert — Native Apple Platforms Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `swiftui-expert` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when SwiftUI development mastery. View architecture, state management (@State, @Binding, @Environment, @Observable), performance optimization (identifiable loops, implicit vs explicit animations), architectural patterns (MVVM vs TCA), and iOS-native UX paradigms. Use when writing native Apple platforms code.
- **DO NOT activate when:** The task falls outside the `swiftui-expert` domain or is managed by a different dedicated specialist.

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

- ❌ Using `@State` for shared data between views -> ✅ `@State` is local to a view; use `@Binding`, `@Environment`, or `@Observable` for sharing
- ❌ Putting heavy computation in the `body` property -> ✅ `body` is called on EVERY re-render; move computation to `.task {}` or `onChange`
- ❌ `List { ForEach(items) { ... } }` without `id:` parameter -> ✅ Always provide `id:` for `Identifiable` conformance or use `\.self`
- ❌ Using `NavigationView` -> ✅ Deprecated in iOS 16+; use `NavigationStack` or `NavigationSplitView`

---

---

## 1. Modern State Management (iOS 17+ / Swift 5.9+)

Apple deprecated `@StateObject` and `@ObservedObject` in favor of the new `@Observable` macro.

```swift
// ❌ OLD WAY (Pre-iOS 17)
class UserProfile: ObservableObject {
    @Published var name: String = "Guest"
}
struct ProfileView: View {
    @StateObject var profile = UserProfile()
    // ...
}

// ✅ NEW WAY (iOS 17+ / @Observable)
import Observation

@Observable
class UserProfile {
    var name: String = "Guest"
    var age: Int = 0
    // No @Published needed! Only properties that are actually read
    // inside the body will trigger view updates.
}

struct ProfileView: View {
    // Treat the reference type exactly like a value type!
    @State private var profile = UserProfile()

    var body: some View {
        VStack {
            TextField("Name", text: $profile.name)
            Text("Hello, \(profile.name)")
        }
    }
}
```

### Property Data Flow Cheat Sheet

- `@State`: The view OWNS value (or reference if `@Observable`).
- `@Binding`: The view mutates a value OWNED by a parent.
- `@Environment`: The view reads value injected high up in the view hierarchy.
- `@Bindable`: Creates bindings from an `@Observable` model passed via parameters/environment.

---

## 2. View Architecture & Modifiers

SwiftUI Views should be impossibly small. Extract frequently.

```swift
// ❌ BAD: Massive body with 10 layers of nesting
struct MassiveView: View {
    var body: some View { ... }
}

// ✅ GOOD: Extract via properties, functions, or new View structs
struct CleanView: View {
    var body: some View {
        VStack {
            headerSection
            CustomScrollingList(items: data)
            footerSection
        }
    }

    private var headerSection: some View {
        Text("Header").font(.headline)
    }
}
```

### Modifier Ordering Matters

Modifiers wrap views sequentially. The order fundamentally changes the rendering.

```swift
// Padding BEFORE Background
Text("Hello")
    .padding()
    .background(Color.blue)
// Result: A large blue box with text inside.

// Padding AFTER Background
Text("Hello")
    .background(Color.blue)
    .padding()
// Result: A tight blue box around text, surrounded by invisible spacing.
```

---

## 3. Performance & Rendering

```swift
// ❌ BAD: Using indices in ForEach
// If the array mutates (items injected/deleted), SwiftUI loses
// track of identity and re-renders EVERYTHING aggressively.
ForEach(0..<items.count, id: \.self) { index in
    ItemRow(item: items[index])
}

// ✅ GOOD: Identifiable protocol
struct Item: Identifiable {
    let id = UUID()
    let title: String
}

ForEach(items) { item in
    ItemRow(item: item)
}
```

### Avoiding Massive Layout Recalculations

Use `LazyVStack` and `LazyHStack` inside ScrollViews when presenting large lists, but NOT everywhere. Normal `VStack` is faster for < 20 items because it pre-calculates boundaries instantly.

---

## 4. MVVM vs Context-Driven Architecture

While MVVM is historically popular, SwiftUI natively represents View-as-a-function-of-State.

```swift
// ✅ Context-Driven / Feature-Driven
// The Model handles data fetching/logic.
// The View creates its own local @State and passes @Bindings down.
// Only use full ViewModels for complex orchestration crossing multiple views.
```

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

| Anti-Pattern                | What AI Commonly Does Wrong                                          | What Is Actually Correct                                                    |
| :-------------------------- | :------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **JS Thread Animation Lag** | Driving gestures and scrolling physics on the React Native JS thread | Use React Native Reanimated worklets running directly on the UI thread      |
| **Missing Keyboard Offset** | Forms hidden behind native software keyboard on iOS/Android          | Wrap form views in KeyboardAvoidingView with platform-calibrated behavior   |
| **Uncached Image Flooding** | Rendering raw image URLs in list items without memory caching        | Use FastImage or Expo Image with disk cache policies and thumbnail previews |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `mobile-reviewer` · `frontend-reviewer` · `type-safety`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Do touch targets satisfy the 44x44px minimum touch boundary standard?
✅ Are gesture handlers and native thread animations offloaded via Reanimated?
✅ Are keyboard avoiding views, safe areas, and notch offsets handled?
✅ Is offline storage and state hydration handled with optimistic sync?
✅ Did I verify compatibility across iOS, Android, and varying densities?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
