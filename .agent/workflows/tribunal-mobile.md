---
description: Mobile-specific Tribunal. Runs Logic + Security + Mobile reviewers. Use for React Native, Expo, gesture handlers, animations, navigation, and any iOS/Android-targeted code.
---

# /tribunal-mobile — Mobile Code Audit

$ARGUMENTS

---

## When to Use /tribunal-mobile

|Use `/tribunal-mobile` when...|Use something else when...|
|:---|:---|
|React Native components|Web-only components → `/tribunal-frontend`|
|Expo Router navigation|API routes → `/tribunal-backend`|
|Reanimated animations/gestures|Full audit → `/tribunal-full`|
|FlashList / FlatList code||
|Platform-specific (ios/android) code||

---

## 3 Active Reviewers (All Run Simultaneously)

### logic-reviewer
- `runOnJS` called inside `onUpdate` instead of `onEnd` (runs every frame)
- Missing `'worklet'` directive on functions called inside Reanimated
- FlatList inside ScrollView (disables virtualization)
- `useSharedValue` vs `useState` confusion (SharedValue on wrong thread)

### security-auditor
- AsyncStorage storing sensitive data (tokens, PII) unencrypted
- API keys in source code (should be in EAS Secrets)
- cleartext HTTP traffic (should be HTTPS on all platforms)
- Deep link not validated before processing URL scheme

### mobile-reviewer
- `setState` inside Reanimated `onUpdate` (JS bridge crossing = jank)
- Missing `'worklet'` on custom functions used in Reanimated
- FlatList for large lists (use FlashList with `estimatedItemSize`)
- Hardcoded pixel insets instead of `useSafeAreaInsets()`
- `Platform.OS === 'ios'` inside StyleSheet.create (not evaluated correctly)
- Missing `AppState` subscription cleanup (`subscription.remove()`)
- `react-native Image` used instead of `expo-image` (poor caching)

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: fix before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items
If all reviewers → ✅ APPROVED: Human Gate
```

---

---

## Mobile-Specific Hallucination Traps (Common LLM Mistakes)

```tsx
// ❌ Missing 'worklet' — animation function crashes silently
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
// ✅ Must have worklet directive
const clamp = (val: number, min: number, max: number): number => {
  'worklet';
  return Math.min(Math.max(val, min), max);
};

// ❌ Expo Router: navigate() was refactored in v4 — old API
import { navigate } from 'expo-router';   // Named export doesn't exist
// ✅ Current Expo Router v4
import { router } from 'expo-router';
router.push('/products/123');

// ❌ React Native: StyleSheet.create doesn't eval functions
const styles = StyleSheet.create({
  box: { paddingTop: Platform.OS === 'ios' ? 20 : 0 } // Doesn't work in all contexts
});
// ✅ Use Platform.select or dynamic style object
const boxStyle = Platform.select({ ios: { paddingTop: 20 }, android: { paddingTop: 0 } });
```

---

## Usage Examples

```
/tribunal-mobile the SwipeToDelete gesture implementation with Reanimated 3
/tribunal-mobile the ProductList component using FlashList
/tribunal-mobile the auth token storage and retrieval functions
/tribunal-mobile the ProfileScreen with safe area insets
```
