---
name: swiftui-expert
description: SwiftUI development mastery. View architecture, state management (@State, @Binding, @Environment, @Observable), performance optimization (identifiable loops, implicit vs explicit animations), architectural patterns (MVVM vs TCA), and iOS-native UX paradigms. Use when writing native Apple platforms code.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using `@State` for shared data between views -> ✅ `@State` is local to a view; use `@Binding`, `@Environment`, or `@Observable` for sharing
- ❌ Putting heavy computation in the `body` property -> ✅ `body` is called on EVERY re-render; move computation to `.task {}` or `onChange`
- ❌ `List { ForEach(items) { ... } }` without `id:` parameter -> ✅ Always provide `id:` for `Identifiable` conformance or use `\.self`
- ❌ Using `NavigationView` -> ✅ Deprecated in iOS 16+; use `NavigationStack` or `NavigationSplitView`

---


# SwiftUI Expert — Native Apple Platforms Mastery

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


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



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
