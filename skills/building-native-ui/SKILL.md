---
name: building-native-ui
description: Use when Cross-platform Native UI mastery (React Native / Expo). Building seamless, 60fps mobile interfaces, handling safe areas, navigation architectures (Expo Router), native modules, gestures/animations (Reanimated), and platform-specific styling. Use when building React Native or Expo mobile apps.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - mobile-design
  - react-specialist
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Building Native UI — React Native & Expo Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `building-native-ui` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Cross-platform Native UI mastery (React Native / Expo). Building seamless, 60fps mobile interfaces, handling safe areas, navigation architectures (Expo Router), native modules, gestures/animations (Reanimated), and platform-specific styling. Use when building React Native or Expo mobile apps.
- **DO NOT activate when:** The task falls outside the `building-native-ui` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ `SafeAreaView` wrapping everything -> ✅ Use `SafeAreaProvider` + `useSafeAreaInsets()` for granular control
- ❌ Using `ScrollView` for long lists -> ✅ `FlatList` or `FlashList` for virtualized rendering; ScrollView renders ALL items
- ❌ `Dimensions.get('window')` for responsive layouts -> ✅ Use `useWindowDimensions()` hook (reactive to rotation/resize)
- ❌ Animating with `Animated.timing` by default -> ✅ Use `Reanimated 3` with `useSharedValue` for 120fps worklet-based animations

---

A mobile app isn't a website confined to a small screen.
60 FPS is not a goal; it is a rigid requirement. The JS thread is a fragile bottleneck.

---

## 1. The Expo Router Architecture

File-based routing replaces legacy imperative React Navigation boilerplates.

```typescript
// Directory structure dictates routes
// app/
// ├── _layout.tsx      (Global wrap, e.g. Stack or Tabs)
// ├── index.tsx        (Matches '/')
// ├── (auth)/          (Route group, invisible in URL)
// │   └── login.tsx    (Matches '/login')
// └── user/
//     └── [id].tsx     (Dynamic route, matches '/user/123')

// Link navigation (Strongly typed in Expo Router v3+)
import { Link, router } from 'expo-router';

export default function Home() {
  return (
    <View>
      {/* Declarative */}
      <Link href="/user/123" asChild>
        <Pressable><Text>Go to Profile</Text></Pressable>
      </Link>

      {/* Imperative */}
      <Button onPress={() => router.push('/(auth)/login')} title="Login" />
    </View>
  );
}
```

---

## 2. Platform Nuances & Safe Areas

Mobile devices have notches, home indicators, and varied status bars.

```typescript
// ❌ BAD: Ignoring notches
export const Header = () => <View style={{ paddingTop: 20 }} />

// ✅ GOOD: react-native-safe-area-context
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Header = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Text>Header Content</Text>
    </View>
  );
}

// ✅ Platform-specific logic
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 },
      android: { elevation: 4 }, // Android requires elevation for shadows
    }),
  }
});
```

---

## 3. High-Performance Animations (Reanimated)

Never animate over the React Native bridge. Keep animations strictly on the native UI thread using `react-native-reanimated`.

```typescript
// ❌ BAD: Animated.Value across the bridge, or setState driven animations
// setState -> JS Thread calculate -> Bridge JSON -> Native UI (Drops frames!)

// ✅ GOOD: Reanimated UI thread execution
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

export function BouncyBox() {
  const offset = useSharedValue(0); // Lives natively

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offset.value }], // Syncs natively
    };
  });

  return (
    <>
      <Animated.View style={[styles.box, animatedStyles]} />
      <Button onPress={() => (offset.value = withSpring(Math.random() * 255))} title="Bounce" />
    </>
  );
}
```

---

## 4. List Performance

FlatList rendering is the #1 cause of React Native app crashes due to OOM (Out of Memory).

```typescript
import { FlashList } from "@shopify/flash-list";

// ❌ BAD: Standard ScrollView for massive lists
// Maps every item instantly. Crashes on large data sets.

// ❌ MEDIOCRE: FlatList
// Blank spaces when scrolling fast due to JS thread bridge bottlenecks.

// ✅ BEST: FlashList (Shopify)
// Recycles views instantly like native UICollectionView / RecyclerView.
export function FastList({ data }) {
  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <Text>{item.title}</Text>}
      estimatedItemSize={50} // CRUCIAL for performance
    />
  );
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
