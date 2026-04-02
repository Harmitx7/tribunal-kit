---
name: swiftui-expert
description: SwiftUI development mastery. View architecture, state management (@State, @Binding, @Environment, @Observable), performance optimization (identifiable loops, implicit vs explicit animations), architectural patterns (MVVM vs TCA), and iOS-native UX paradigms. Use when writing native Apple platforms code.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# SwiftUI Expert — Native Apple Platforms Mastery

> SwiftUI views are a description of your UI, not the UI itself. They are cheap.
> State drives the UI. If the UI is wrong, your State is wrong.

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

## 🤖 LLM-Specific Traps (SwiftUI)

1. **Using `@StateObject` in new iOS projects:** AI reverts to pre-iOS 17 patterns. Use the `@Observable` macro and standard `@State` going forward.
2. **Modifier Order Chaos:** AI randomly orders `.frame()`, `.padding()`, `.background()`, leading to clipped layouts. Padding must precede background to expand the fill.
3. **`ForEach` with `id: \.self` on Objects:** AI uses `\.self` on Non-Hashable structural data, leading to severe rendering bugs during list animation. Use the `Identifiable` protocol.
4. **Massive View Bodies:** AI writes 300-line `var body: some View` blobs. Extract subviews.
5. **Ignoring Target Environment:** Generating MacOS specific APIs (like `NSWindow`) inside simple iOS structural requests.
6. **GeometryReader Abuse:** AI uses `GeometryReader` to set standard widths. `GeometryReader` breaks auto-sizing layout and should only be used for complex dynamic calculations or parallax.
7. **Implicit Animation Madness:** AI attaches `.animation(.spring())` haphazardly. In modern SwiftUI this is deprecated. Demand `.animation(.spring(), value: observedState)`.
8. **Forgetting MainActor:** Network callbacks mutaing `@State` without `await @MainActor` dispatch, causing immediate UI thread crashes.
9. **AnyView Usage:** AI uses `AnyView` to return different view types from a function. `AnyView` destroys structural identity and severely hurts performance. Use `@ViewBuilder`.
10. **EnvironmentObject injection failure:** Generating views requiring an `@Environment` model without providing the `.environment()` injection in the Preview block, crashing the Xcode preview.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Is state management utilizing the modern `@Observable` macro?
✅ Are array elements in `ForEach` conforming to `Identifiable`?
✅ Is UI threading safe (mutating state on `@MainActor`)?
✅ Are view modifiers logically ordered (e.g., padding before background)?
✅ Is `GeometryReader` avoided unless strictly necessary for dynamic math?
✅ Are functions returning dynamic views marked with `@ViewBuilder` (avoiding `AnyView`)?
✅ Are animations value-bound (`.animation(..., value: x)`)?
✅ Has the `body` property been kept small and readable via sub-view extraction?
✅ Are Xcode Previews populated with the necessary Environment mock data?
✅ Did I use `LazyVStack` appropriately for large scrolling datasets?
```
