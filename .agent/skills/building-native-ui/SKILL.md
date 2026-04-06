---
name: building-native-ui
description: Cross-platform Native UI mastery (React Native / Expo). Building seamless, 60fps mobile interfaces, handling safe areas, navigation architectures (Expo Router), native modules, gestures/animations (Reanimated), and platform-specific styling. Use when building React Native or Expo mobile apps.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Building Native UI — React Native & Expo Mastery

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
