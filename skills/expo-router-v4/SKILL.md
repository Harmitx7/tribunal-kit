---
name: expo-router-v4
description: Use when React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - mobile-developer
  - mobile-design
  - react-specialist
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Expo Router v4 & React Native New Architecture

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `expo-router-v4` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics.
- **DO NOT activate when:** The task falls outside the `expo-router-v4` domain or is managed by a different dedicated specialist.

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

## Layout Navigation Architecture (`app/_layout.tsx`)

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Feed' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

## Native Haptic Touch Button Component

```tsx
import * as Haptics from 'expo-haptics';
import { Pressable, Text, PressableProps } from 'react-native';

interface TouchButtonProps extends PressableProps {
  label: string;
}

export function TouchButton({ label, onPress, ...props }: TouchButtonProps) {
  return (
    <Pressable
      {...props}
      onPress={e => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      className="px-5 py-3 bg-indigo-600 rounded-xl active:scale-95 transition-transform"
    >
      <Text className="text-white font-medium text-center">{label}</Text>
    </Pressable>
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
| **JS Thread Animation Lag** | Driving gestures and scrolling physics on the React Native JS thread | Use React Native Reanimated worklets running directly on the UI thread |
| **Missing Keyboard Offset** | Forms hidden behind native software keyboard on iOS/Android | Wrap form views in KeyboardAvoidingView with platform-calibrated behavior |
| **Uncached Image Flooding** | Rendering raw image URLs in list items without memory caching | Use FastImage or Expo Image with disk cache policies and thumbnail previews |

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
