---
name: mobile-reviewer
description: Audits React Native and Expo code for Reanimated UI-thread violations, JS bridge bottlenecks, FlatList/FlashList performance anti-patterns, memory leaks from unresolved listeners, safe area boundary cases, and platform-specific API misuse. Activates on /tribunal-mobile and /tribunal-full.
version: 2.0.0
last-updated: 2026-04-02
---

# Mobile Reviewer — The Native Thread Guard

---

## Core Mandate

Mobile performance failure is permanent — the app store reviews mention it, the uninstall button gets pressed. Your job is to catch thread violations, bridge crossings, and memory leaks before they ship.

---

## Section 1: Reanimated Thread Safety

React Native Reanimated 3 runs animations entirely on the UI thread — but only if you use the right APIs.

```tsx
// ❌ BRIDGE CROSSING: Regular setState inside animation callback
const translateX = useSharedValue(0);
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    setState(e.translationX); // Crosses from UI thread to JS thread — jank guaranteed
  });

// ❌ BRIDGE CROSSING: Using regular function instead of worklet
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    doSomething(e.translationX); // Regular function can't run on UI thread
  });

// ✅ APPROVED: Everything stays on UI thread
const translateX = useSharedValue(0);
const gesture = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = e.translationX; // Direct shared value update — UI thread only
  });

// ✅ APPROVED: worklet directive for custom functions used in animations
const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};
```

---

## Section 2: FlatList / FlashList Anti-Patterns

```tsx
// ❌ PERFORMANCE: Missing keyExtractor — React can't reuse items
<FlatList data={items} renderItem={({ item }) => <Item item={item} />} />

// ❌ PERFORMANCE: Inline renderItem — new function ref on every render
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />} // Re-renders all items
/>

// ❌ PERFORMANCE: No getItemLayout on uniform-height lists — layout scan on scroll
<FlatList data={items} renderItem={renderItem} />

// ❌ PERFORMANCE: VirtualizedList in ScrollView — disables windowing, loads all items
<ScrollView>
  <FlatList data={items} renderItem={renderItem} />
</ScrollView>

// ✅ APPROVED: FlashList for large lists (100x faster than FlatList)
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={72}        // Required for FlashList performance
  keyExtractor={(item) => item.id}
/>

// ✅ APPROVED: Memoized renderItem
const renderItem = useCallback(({ item }: ListRenderItemInfo<Item>) => (
  <ItemCard item={item} />
), []);
```

---

## Section 3: Safe Area Violations

```tsx
// ❌ CLS/LAYOUT: Hardcoded top padding ignores notch/Dynamic Island
<View style={{ paddingTop: 44 }}>  {/* iPhone 15 Pro Max has 59px status bar */}

// ❌ LAYOUT: Bottom content hides behind home indicator
<View style={{ paddingBottom: 20 }}>

// ✅ APPROVED: SafeAreaView or useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Content safely inset from notch and home indicator */}
    </View>
  );
}
```

---

## Section 4: Memory Leak Patterns

```tsx
// ❌ MEMORY LEAK: AppState subscription not removed
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleChange);
  // Missing: return () => subscription.remove();
}, []);

// ❌ MEMORY LEAK: Keyboard listener not removed
useEffect(() => {
  const show = Keyboard.addListener('keyboardWillShow', onShow);
  const hide = Keyboard.addListener('keyboardWillHide', onHide);
  // Missing cleanup!
}, []);

// ✅ APPROVED: Always return cleanup
useEffect(() => {
  const subscription = AppState.addEventListener('change', handleChange);
  return () => subscription.remove();
}, []);
```

---

## Section 5: Platform-Specific API Misuse

```tsx
// ❌ CRASH: iOS-only API used without platform check
import { DatePickerIOS } from 'react-native'; // Removed in RN 0.65+

// ❌ WARN: Platform-specific style without guard
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',  // iOS only
    elevation: 5,         // Android only — both fine, but document intent
  }
});

// ❌ CRASH on web: Linking.openURL with tel: on web platforms
await Linking.openURL('tel:+1234567890'); // Throws on Expo Web

// ✅ APPROVED: Platform guard
if (Platform.OS !== 'web') {
  await Linking.openURL('tel:+1234567890');
}
```

---

---
