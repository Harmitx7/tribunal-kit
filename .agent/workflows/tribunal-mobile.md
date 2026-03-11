---
description: Mobile-specific Tribunal. Runs Logic + Security + Mobile reviewers. Use for React Native, Flutter, and responsive web code.
---

# /tribunal-mobile — Mobile Code Tribunal

$ARGUMENTS

---

This command activates the **Mobile Tribunal** — a focused panel of reviewers covering the specific failure modes of mobile and responsive application code.

Use this instead of `/tribunal-full` when your code is specifically mobile-domain. It gives faster, more precise feedback than running all 11 reviewers.

---

## When to Use This vs Other Tribunals

| Code type | Right tribunal |
|---|---|
| React Native, Flutter, mobile UI | `/tribunal-mobile` ← you are here |
| Pure React (web) components | `/tribunal-frontend` |
| API routes, auth, middleware | `/tribunal-backend` |
| Cross-domain or pre-merge audit | `/tribunal-full` |

---

## Active Reviewers

| Reviewer | What It Catches |
|---|---|
| `logic-reviewer` | Hallucinated RN/Flutter APIs, impossible logic, undefined refs |
| `security-auditor` | Hardcoded secrets, insecure storage, OWASP Mobile Top 10 |
| `mobile-reviewer` | Touch targets, safe areas, keyboard avoidance, gesture handling, image optimization |

---

## What Gets Flagged — Real Examples

| Reviewer | Example Finding | Severity |
|---|---|---|
| logic | Calling a non-existent `Animated.stagger()` method | ❌ HIGH |
| security | `AsyncStorage.setItem('token', jwt)` — use `expo-secure-store` instead | ⚠️ MEDIUM |
| security | Deeplink handler with no validation of `url` param | ❌ HIGH |
| security | Missing certificate pinning on sensitive API endpoints | ⚠️ MEDIUM |
| mobile | Button `height: 20` — minimum touch target is 44pt (iOS) / 48dp (Android) | ❌ HIGH |
| mobile | Missing `<SafeAreaView>` on root screen component | ❌ HIGH |
| mobile | No `KeyboardAvoidingView` on screen with text inputs | ❌ HIGH |
| mobile | `<Image source={uri}>` with no width/height bounds — memory risk | ⚠️ MEDIUM |
| mobile | No `Platform.OS` guard on platform-specific code | ⚠️ MEDIUM |

---

## Mobile-Specific Anti-Hallucination Rules

```
❌ Never reference RN APIs not listed in the installed react-native version
❌ Never assume iOS and Android behave identically — always check Platform.OS when needed
❌ Never use AsyncStorage for sensitive data (tokens, passwords, biometrics)
❌ Never skip keyboard avoidance on screens with text inputs
❌ Never use hardcoded pixel values — use pt (iOS) or dp (Android) logical units
❌ Never claim an animation approach is "performant" without mentioning native driver usage
```

---

## Output Format

```
━━━ Tribunal: Mobile ━━━━━━━━━━━━━━━━━━━━━

Active reviewers: logic · security · mobile

[Your code under review]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:    ✅ APPROVED
security-auditor:  ⚠️  WARNING
mobile-reviewer:   ❌ REJECTED

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

security-auditor:
  ⚠️ MEDIUM — Line 8
     AsyncStorage used for auth token storage
     Fix: Use expo-secure-store or react-native-keychain for sensitive data

mobile-reviewer:
  ❌ HIGH — Line 12
     Touch target: Button height is 20pt. Minimum is 44pt (iOS) / 48dp (Android)
     Fix: style={{ minHeight: 44 }}

  ❌ HIGH — Line 34
     Missing SafeAreaView wrapping the root view
     Fix: Wrap with <SafeAreaView style={{ flex: 1 }}>

━━━ Verdict: REJECTED ━━━━━━━━━━━━━━━━━━━━

Address rejections?  Y = fix and re-review | N = accept risk | R = revise manually
```

---

## Cross-Workflow Navigation

| Finding type | Next step |
|---|---|
| Insecure storage CRITICAL | Replace storage library via `/enhance` |
| All touch target issues | `/enhance` to normalize touch targets in shared components |
| Cross-platform behavior gap | `/refactor` to extract Platform.OS guards into a utility |
| All approved | Human Gate to write to disk |

---

## Usage

```
/tribunal-mobile my React Native login screen component
/tribunal-mobile the Flutter payment form widget
/tribunal-mobile the responsive mobile nav component with touch gestures
/tribunal-mobile the biometric authentication flow
```
