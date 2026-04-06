---
name: mobile-design
description: Mobile-first design for iOS, Android, Foldables, React Native, Flutter. Touch interaction, haptics, 120Hz performance, on-device AI, spatial UI, Reanimated 3. Use when building mobile UI, animations, or cross-platform apps.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
---

# Mobile Design — Dense Reference

## Hallucination Traps (Read First)
- ❌ `Animated.View` for any animation → ✅ `Reanimated 3` worklets (Animated API is legacy, runs on JS thread)
- ❌ `ScrollView` for lists → ✅ `FlashList` (Shopify) — ScrollView renders ALL items at once
- ❌ `estimatedItemSize` optional in FlashList → ✅ **REQUIRED** or you get 0-height items
- ❌ White backgrounds (`#FFFFFF`) → ✅ OLED: `#000000` true black; off-white: `#FAFAFA`
- ❌ Linear animations (`easing: linear`) → ✅ Spring physics (`stiffness`, `damping`)
- ❌ Touch targets < 48px → ✅ Min 48px hitbox (visual size can be smaller via padding)
- ❌ `useAnimatedStyle` in worklet without `'worklet'` directive → crashes on native thread
- ❌ iOS: `useSafeAreaInsets()` optional → ✅ Required — screen content goes under dynamic island/home indicator
- ❌ Android: hardcoded status bar height (24dp) → ✅ `StatusBar.currentHeight` (varies per device)
- ❌ Platform-specific code with `if (platform === 'ios')` scattered everywhere → ✅ centralize in platform/ files
- ❌ `console.log` in production → ✅ blocks JS thread — remove before release

---

## React Native Performance

### FlashList (Required for Lists)
```tsx
import { FlashList } from "@shopify/flash-list";
<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={100}          // REQUIRED — measure actual item height first
  keyExtractor={(item) => item.id}
  getItemType={(item) => item.type} // multi-type optimization
/>
// ❌ NEVER: <ScrollView>{items.map(...)}</ScrollView> for lists
// ❌ NEVER: <FlatList> for perf-critical lists — FlashList is 5-10x faster
```

### Reanimated 3 — Worklet Animations (Required for 120Hz)
```tsx
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

// Shared values run on the UI thread — never on JS thread
const scale = useSharedValue(1);
const opacity = useSharedValue(0);

// Animated style — computed on UI thread (no bridge crossing)
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
  opacity: opacity.value,
}));

// Triggers
const onPress = () => {
  scale.value = withSpring(0.95, { stiffness: 400, damping: 15 });
  opacity.value = withTiming(1, { duration: 200 });
};

// Call JS function from worklet
const onComplete = () => runOnJS(setVisible)(true);
scale.value = withSpring(1, {}, onComplete);

// ❌ TRAP: Accessing shared value with .value inside useAnimatedStyle is fine — but inside a gesture handler callback, you need runOnJS to call React setState
```

### 120Hz Animation Rules
- ✅ Animate ONLY: `transform` (translateX/Y, scale, rotate), `opacity` — all GPU composited
- ❌ Never animate: `width`, `height`, `margin`, `padding`, `top/left/bottom/right` — causes layout recalc at 60 times per second → janky, battery draining
- ✅ Use `withSpring` for all UI interactions (feel alive) — `withTiming` only for intentional timed animations
- ✅ `Gesture.Pan()` / `Gesture.Tap()` from `react-native-gesture-handler` v2 (not `PanResponder`)

---

## Haptics
```tsx
import * as Haptics from 'expo-haptics';
// light → switch toggle, tap feedback
// medium → selection change, confirm
// heavy → destructive action, strong confirm
// notificationAsync('success' | 'warning' | 'error') → operation outcomes
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);  // tap, toggle
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // save complete
// ❌ Never overuse — haptics must mean something
// ❌ Haptics not supported on Android emulators — test on device
```

---

## Safe Areas & Platform Layout
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StatusBar } from 'react-native';

function Screen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Content safe from Dynamic Island, home indicator, status bar */}
    </View>
  );
}
// Android status bar
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

// Foldable/tablet — dual pane
import { useWindowDimensions } from 'react-native';
function AdaptiveLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  return isTablet ? <TwoPaneView /> : <SinglePaneView />;
}
```

---

## Touch Psychology & Thumb Zones
- **Thumb zone**: Bottom 40% of screen = primary actions, FABs, CTAs
- **Dead zone**: Top 25% = destructive/rare actions only
- **48px minimum hitbox**: Visual icon can be 24px, padding expands hitbox to 48px
  ```tsx
  // Magnetic padding — visually small, touch-friendly
  <TouchableOpacity style={{ padding: 12, margin: -4 }}>
    <Icon size={24} />
  </TouchableOpacity>
  ```
- **Coyote time**: Allow 100–150ms buffer after button intent registers before processing — prevents mis-taps

---

## Navigation (Expo Router / React Navigation)
```tsx
// Expo Router v3+ (file-based, recommended)
// app/(tabs)/_layout.tsx — tab navigator
// app/[id].tsx — dynamic segment
// app/(modal)/settings.tsx — modal group

// Stack navigation with gesture
import { Stack } from 'expo-router';
<Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="[id]" options={{ presentation: 'modal' }} />
</Stack>

// Deep linking (Expo Router handles automatically via app.json scheme)
// ❌ TRAP: Don't use react-navigation Link for deep links in Expo Router — use expo-router Link
import { Link, useRouter } from 'expo-router';
const router = useRouter();
router.push('/user/42');
```

---

## On-Device AI UX Patterns
- **Zero-wait illusion**: When model runs → immediately show contextual skeleton/partial tokens
- **Progressive disclosure**: Low confidence → softer UI, soft colors, require confirmation
- **Streaming UI**: `useEffect` + SSE or `StreamingText` component appending tokens
- **Local models** (MediaPipe, Core ML, ONNX): always wrap in try/catch — device capability varies

---

## Color & Typography
```tsx
// OLED-safe dark mode
const colors = {
  background: '#000000',    // true black — OLED pixel off
  surface: '#0A0A0A',       // cards
  surfaceAlt: '#121212',    // elevated surfaces
  border: '#1F1F1F',
  text: '#FFFFFF',
  textMuted: '#8E8E93',     // iOS system gray
};
// Dynamic type (iOS) — always use system font with scalesWithContentSizeCategory
import { Text } from 'react-native';
<Text style={{ fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' }}>
```

---

## Performance Checklist
| Issue | Fix |
|-------|-----|
| JS thread jank | Move ALL animations to Reanimated worklets |
| Slow list | Replace ScrollView/FlatList with FlashList |
| Image flicker | `Image` from `expo-image` (faster cache, blurhash) |
| Re-render cascade | `React.memo` + stable callbacks + Zustand selectors |
| Large bundle | Dynamic imports + Metro tree shaking |
| Memory leak | `useEffect` cleanup + cancel animation on unmount |

```tsx
// Cancel animation on unmount
useEffect(() => {
  opacity.value = withTiming(1);
  return () => cancelAnimation(opacity); // ← critical
}, []);
```

---

## iOS-Specific
- **BlurView**: Use `@react-native-community/blur` for frosted glass nav bars/modals
- **SF Symbols**: Use `@expo/vector-icons/Ionicons` for system-native icons
- **Haptics**: `expo-haptics` — rich feedback on iOS, limited on Android
- **Dynamic Island**: Check `insets.top > 50` for Dynamic Island devices
- **Sheet presentations**: `presentation: 'formSheet'` in Expo Router for iOS bottom sheet native feel

## Android-Specific
- **Material You**: Use `react-native-paper` for M3 dynamic color theming
- **Edge-to-edge**: Set `android:windowLayoutInDisplayCutoutMode="shortEdges"` in AndroidManifest
- **Back gesture prediction**: Wrap routes in `GestureHandlerRootView` at root
- **Splash**: Use `expo-splash-screen` — never hardcode a delay
