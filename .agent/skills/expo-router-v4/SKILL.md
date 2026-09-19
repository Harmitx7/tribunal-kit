---
name: expo-router-v4
description: "Use when React Native 0.76+ New Architecture (Fabric/TurboModules), Expo Router v4 typed file-based navigation, native haptics, and biometrics."
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
