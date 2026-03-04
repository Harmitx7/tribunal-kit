---
description: Mobile-specific Tribunal. Runs Logic + Security + Mobile reviewers. Use for React Native, Flutter, and responsive web code.
---

# /tribunal-mobile — Mobile Code Tribunal

$ARGUMENTS

---

This command activates the **Mobile Tribunal** — a focused panel of reviewers covering the specific failure modes of mobile and responsive application code.

Use this instead of `/tribunal-full` when your code is specifically mobile-domain. It gives faster, more precise feedback than running all 11 reviewers.

---

## Reviewers Activated

| Reviewer | What It Catches |
|---|---|
| `logic-reviewer` | Hallucinated methods, impossible logic, undefined refs (always active) |
| `security-auditor` | Hardcoded secrets, insecure storage, OWASP mobile top 10 (always active) |
| `mobile-reviewer` | Touch targets, safe areas, keyboard avoidance, gesture handling, image optimization |

---

## When to Use This

```
✅ React Native components, screens, or navigation
✅ Flutter widgets and state management
✅ Responsive CSS (mobile breakpoints, viewport units, touch events)
✅ Native module bridging code
✅ App-level security (sensitive data storage, biometric auth, deep links)

❌ Pure backend code → use /tribunal-backend
❌ Pure SQL queries → use /tribunal-database
❌ General web UI with no mobile concerns → use /tribunal-frontend
```

---

## Pipeline

```
Your code
    │
    ▼
logic-reviewer    → Impossible logic, hallucinated RN/Flutter APIs, undefined refs
    │
    ▼
security-auditor  → AsyncStorage of secrets, insecure deeplinks, missing certificate pinning
    │
    ▼
mobile-reviewer   → Touch targets (<44pt), missing SafeAreaView, uncovered keyboard,
                    uncontrolled image sizes, missing Platform.OS guards
    │
    ▼
Verdict Summary
```

---

## Output Format

```
━━━ Tribunal: Mobile ━━━━━━━━━━━━━━━━━━━━━

Active reviewers: logic · security · mobile

[Your code under review]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:    ✅ APPROVED
security-auditor:  ⚠️  WARNING — AsyncStorage used for auth token. Use SecureStore instead.
mobile-reviewer:   ❌ REJECTED
                   - Line 12: Button touch target is 20pt high. Minimum is 44pt.
                   - Line 34: No SafeAreaView wrapping the root view.

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━

Address rejections?  Y = fix and re-review | N = accept risk | R = revise manually
```

---

## Mobile-Specific Anti-Hallucination Rules

```
❌ Never reference RN APIs not listed in the installed react-native version
❌ Never assume iOS and Android behave identically (always check Platform.OS)
❌ Never use AsyncStorage for sensitive data (tokens, passwords, biometrics)
❌ Never skip keyboard avoidance on screens with text inputs
❌ Never use hardcoded pixel values without density consideration (use pt or dp units)
```

---

## Usage

```
/tribunal-mobile my React Native login screen component
/tribunal-mobile the Flutter payment form widget
/tribunal-mobile the responsive mobile nav component with touch gestures
```
