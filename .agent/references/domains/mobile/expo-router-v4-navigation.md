# Expo Router v4 Navigation & State Architecture Reference

> **Authority**: Expo Official Documentation (`https://docs.expo.dev/router/introduction/`)  
> **Applicable Domains**: Mobile Development, React Native, Cross-Platform Architecture  
> **Status**: Verified Production Specification  

---

## 1. File-Based Routing Hierarchy (App Directory)

Expo Router v4 maps the filesystem directly to native navigation stacks:

```
app/
├── _layout.tsx           Root layout (Providers, Fonts, Auth Gate)
├── (tabs)/               Tab navigation route group
│   ├── _layout.tsx       Tabs configuration (Tab.Navigator)
│   ├── index.tsx         Home Tab (Route: /)
│   └── settings.tsx      Settings Tab (Route: /settings)
├── details/
│   └── [id].tsx          Dynamic route segment (Route: /details/42)
└── +not-found.tsx        Native 404 boundary
```

---

## 2. SplashScreen Hydration Protocol

Never hide the splash screen before native assets (fonts, auth state, local SQLite) are fully loaded:

```tsx
import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { useFonts } from 'expo-font';

// Prevent native splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InterRegular: require('../assets/fonts/Inter-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="details/[id]" options={{ title: 'Details', presentation: 'card' }} />
    </Stack>
  );
}
```

---

## 3. Typed Navigation Invariants

Always use typed `Href` navigation instead of untyped string literals:

```tsx
import { useRouter, Href } from 'expo-router';

export function NavigationButton({ targetId }: { targetId: string }) {
  const router = useRouter();

  const handleNavigate = () => {
    // Type-safe route navigation
    router.push({
      pathname: '/details/[id]',
      params: { id: targetId }
    } as Href);
  };

  return <Button title="View Details" onPress={handleNavigate} />;
}
```
