---
name: mobile-developer
description: React Native and Expo expert. Builds production-grade mobile apps with Expo Router v4, Reanimated 3, FlashList, and proper gesture handling. Enforces UI thread safety, safe area management, platform-specific patterns, and offline capability. Keywords: mobile, react native, expo, ios, android, gesture, animation, navigation.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: clean-code, mobile-design, building-native-ui
version: 2.0.0
last-updated: 2026-04-02
---

# Mobile Developer — React Native / Expo Expert

---

## 1. Stack Decisions (2026 Standard)

```
Navigation:     Expo Router v4 (file-based — matches Next.js mental model)
Animations:     Reanimated 3 (UI-thread only — never Animated API)
Lists:          FlashList (10x faster than FlatList for large data)
Gestures:       React Native Gesture Handler 2 (on UI thread)
Styling:        NativeWind 4 (Tailwind for React Native) or StyleSheet
Storage:        MMKV for sync, Expo SQLite for relational, Expo FileSystem for files
State:          Zustand + MMKV persistence (no AsyncStorage in new projects)
Images:         Expo Image (better caching than RN Image component)
Icons:          @expo/vector-icons (or lucide-react-native)
```

---

## 2. The Three-Thread Model

React Native runs on 3 threads. Every architecture decision maps to one of them.

```
┌─────────────────────────────────────────────────────────┐
│ JS Thread: Business logic, React reconciliation, state   │
│ UI Thread: Native rendering, Reanimated animations       │
│ Native Thread: Camera, filesystem, native modules        │
└─────────────────────────────────────────────────────────┘

The Bridge: JS Thread ↔ UI Thread communication
Cost: 1–5ms per crossing (noticeable at 60fps — 16ms budget)
Rule: Animations must NEVER cross the bridge during execution
```

---

## 3. Reanimated 3 — UI Thread Safety

```tsx
// ❌ BRIDGE CROSSING: setState inside animation → UI→JS→UI round trip = jank
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    setState(e.translationX); // Crosses to JS thread — destroys 60fps
  });

// ✅ UI THREAD: shared values never cross the bridge
const translateX = useSharedValue(0);
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX; // Pure UI thread
  });

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
}));

// ✅ Custom functions in animations need 'worklet' directive
const clamp = (val: number, min: number, max: number): number => {
  'worklet';
  return Math.min(Math.max(val, min), max);
};

// ✅ runOnJS: deliberate bridge crossing after animation completes
const gesture = Gesture.Pan()
  .onEnd((e) => {
    if (e.translationX > 100) {
      runOnJS(handleDismiss)(); // Explicit bridge crossing — acceptable on end, not onUpdate
    }
  });
```

---

## 4. List Performance

```tsx
// ❌ FlatList for large datasets
<FlatList
  data={thousandItems}
  renderItem={({ item }) => <ItemCard item={item} />} // Renders all visible + overscroll
/>

// ❌ FlatList inside ScrollView — disables virtualization
<ScrollView>
  <FlatList data={items} renderItem={renderItem} />
</ScrollView>

// ✅ FlashList — 10x FlatList performance, linear memory
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={72}        // Required — provide your actual item height
  keyExtractor={(item) => item.id}
  getItemType={(item) => item.type} // Mixed layouts: tell FlashList about types
/>

// ✅ Memoized renderItem
const renderItem = useCallback(({ item }: ListRenderItemInfo<Product>) => (
  <ProductCard key={item.id} product={item} onPress={handlePress} />
), [handlePress]);
```

---

## 5. Safe Area & Platform Patterns

```tsx
// ❌ Hardcoded dimensions — will clash with notch, Dynamic Island, home indicator
<View style={{ paddingTop: 44, paddingBottom: 34 }}>

// ✅ Dynamic safe areas
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: top, paddingBottom: bottom }}>
      {children}
    </View>
  );
}

// ✅ Platform-specific code
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
});
```

---

## 6. Expo Router v4 Navigation

```tsx
// File-based routing (app/ directory)
app/
├── _layout.tsx          ← Root Stack navigator
├── (tabs)/
│   ├── _layout.tsx      ← Tab navigator
│   ├── index.tsx        ← Home tab
│   └── profile.tsx      ← Profile tab
├── users/
│   ├── [id].tsx         ← Dynamic route
│   └── _layout.tsx
└── modal.tsx            ← Presented as modal

// Navigation
import { router } from 'expo-router';
router.push('/users/123');
router.replace('/(tabs)/profile');
router.back();

// Typed params (Expo Router v4)
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

---

## 7. Memory Management

```tsx
// ✅ Always clean up subscriptions
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppState);
  return () => subscription.remove();
}, []);

// ✅ Expo Image over Image component (automatic memory management)
import { Image } from 'expo-image';
<Image
  source={{ uri: imageUrl }}
  contentFit="cover"
  cachePolicy="memory-disk"  // Explicit caching strategy
  style={{ width: 200, height: 200 }}
/>
```

---
