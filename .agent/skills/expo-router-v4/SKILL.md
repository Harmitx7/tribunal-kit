---
name: expo-router-v4
description: React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
script: .agent/scripts/lint_runner.js
scripts-binding:
  - .agent/scripts/lint_runner.js
skills:
  - mobile-developer
  - mobile-design
  - react-specialist
---

# Expo Router v4 & React Native New Architecture

## Mandatory Pre-Flight Context Inspection

Before building mobile navigation or components:

1. New Architecture Enforcement → Enable Fabric renderer and TurboModules in `app.json` (`"newArchEnabled": true`)
2. Typed Routing → Use `expo-router` typed routes for safe navigation
3. Safe Area & Haptics → Wrap screens in `SafeAreaView` and provide subtle `expo-haptics` feedback


## Activation Boundaries

- **Activate when:** Operating in tasks requiring React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics..
- **DO NOT activate when:** The task falls strictly outside expo-router-v4 domain or belongs to a different dedicated specialist.

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

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
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
