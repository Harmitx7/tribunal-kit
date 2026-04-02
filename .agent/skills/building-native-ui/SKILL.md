---
name: building-native-ui
description: Cross-platform Native UI mastery (React Native / Expo). Building seamless, 60fps mobile interfaces, handling safe areas, navigation architectures (Expo Router), native modules, gestures/animations (Reanimated), and platform-specific styling. Use when building React Native or Expo mobile apps.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Building Native UI — React Native & Expo Mastery

> A mobile app isn't a website confined to a small screen.
> 60 FPS is not a goal; it is a rigid requirement. The JS thread is a fragile bottleneck.

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

## 🤖 LLM-Specific Traps (React Native UI)

1. **HTML Elements:** AI frequently hallucinates `<div>`, `<span>`, and `<p>` tags inside React Native code. React Native STRICTLY requires `<View>`, `<Text>`, and `<Pressable>`.
2. **CSS properties:** AI writes `box-shadow` or `border-radius: 10px`. React Native styling uses `shadowColor / elevation` and numeric `borderRadius: 10`.
3. **Bridge Animations:** AI suggests legacy `Animated.timing` or `setState` loops for animations. Demand `react-native-reanimated` shared values on the UI thread.
4. **Ignoring Safe Areas:** Bounding UI boxes against the absolute physical screen edge, resulting in text hidden behind iPhone dynamic islands or Android navigation bars.
5. **ScrollView Data Dumps:** Rendering a `.map()` inside a `<ScrollView>` for 1000 items, crashing the mobile memory constraint.
6. **`onClick` instead of `onPress`:** Using standard web synthetic events. React Native buttons use `onPress`.
7. **Absolute SVGs:** Attempting to render standard `<svg>` tags. Requires `react-native-svg` with precise React-friendly props.
8. **Keyboard Avoidance:** Failing to wrap inputs in `<KeyboardAvoidingView>`, meaning the digital keyboard pops up and permanently obscures the text input.
9. **Platform Blindness:** Applying `shadowOpacity` expecting it to work on Android (it doesn't, requires `elevation`).
10. **Legacy Navigation:** Generating sprawling `react-navigation` stack files instead of utilizing modern Expo Router file-based topologies.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Did I exclusively use native primitives (<View>, <Text>, <Pressable>) and NO HTML tags?
✅ Is `react-native-reanimated` handling all physics and animations on the UI thread?
✅ Are large lists utilizing `<FlashList>` with a declared `estimatedItemSize`?
✅ Is UI guarded from notches using `useSafeAreaInsets`?
✅ Are styles written strictly via `StyleSheet.create` with numeric values, not string CSS?
✅ Are interactive touch points using `onPress`, not `onClick`?
✅ Is the Keyboard explicitly handled via `KeyboardAvoidingView` or `KeyboardAwareScrollView`?
✅ Is routing leveraging modern Expo Router file systems?
✅ Are shadows handled specifically for iOS (shadowProps) and Android (elevation)?
✅ Have I avoided sending massive state updates back and forth across the JS bridge?
```
