# Mobile Ergonomics & Apple HIG Architecture Reference

> **Authority**: Apple Human Interface Guidelines & Google Material 3 Design  
> **Applicable Domains**: Mobile UI/UX, React Native, SwiftUI  
> **Status**: Verified Industry Standard  

---

## 1. Physical Touch Targets & The Thumb Zone

Touch interfaces require deliberate spatial tolerance to prevent mis-clicks:

| Platform | Minimum Touch Target | Minimum Spacing Between Targets |
|:---|:---:|:---:|
| **Apple iOS (HIG)** | `44 × 44 pt` | `8 pt` |
| **Android (Material 3)**| `48 × 48 dp` | `8 dp` |

### The Touch Expansion HitSlop Technique
When visual design requires an icon smaller than 44pt (e.g. 24x24pt close icon), expand the touchable hit box without mutating visual layout:
```tsx
<TouchableOpacity 
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  onPress={handleClose}
>
  <CloseIcon width={20} height={20} />
</TouchableOpacity>
```

---

## 2. Safe Area Inset Management

Never hardcode top padding for notches or bottom padding for home indicator bars.
Always use `react-native-safe-area-context`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

export function ScreenContainer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }
});
```

---

## 3. Dynamic Type & Scalable Typography

- Text containers must never use rigid fixed heights (`height: 30`) that truncate when users increase system accessibility font sizes.
- Allow text to wrap or use `numberOfLines` with an explicit `ellipsizeMode="tail"`.
