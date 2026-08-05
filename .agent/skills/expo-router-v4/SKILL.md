---
name: expo-router-v4
description: React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
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
      onPress={(e) => {
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

## 🛑 Verification-Before-Completion (VBC) Protocol

- Verify zero bridge warnings during navigation.
- Ensure safe area insets are respected across iOS notch and Android gesture bars.
