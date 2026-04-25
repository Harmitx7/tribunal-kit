---
name: i18n-localization
description: Internationalization (i18n) and localization mastery. Abstracting hardcoded strings, managing JSON/YAML translation dictionaries, bidirectional routing (RTL support for Arabic/Hebrew), Pluralization algorithms, date/currency formatting, and SSR locale detection in Next.js/React. Use when preparing an application for global multilingual scaling.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Concatenating translated strings (`'Hello ' + name`) -> ✅ Use interpolation: `t('greeting', { name })` to handle word order differences
- ❌ Hardcoding date/number formats -> ✅ Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the user's locale
- ❌ Assuming all languages read left-to-right -> ✅ Arabic, Hebrew, Farsi are RTL; use CSS `dir='auto'` and logical properties
- ❌ Using string length for validation on translated text -> ✅ Translations can be 30-200% longer than English; design for expansion

---


# i18n & Localization — Global Scale Mastery

---

## 1. The i18n Architecture (Next.js / React)

Do not hardcode strings inside UI components. Use a standardized library (e.g., `next-intl` or `react-i18next`).

### Step 1: Dictionary Abstraction
```json
// messages/en.json
{
  "Dashboard": {
    "welcomeMessage": "Welcome back, {name}!",
    "unreadAlerts": "{count, plural, =0 {No unread alerts} one {You have 1 unread alert} other {You have # unread alerts}}"
  }
}
```

### Step 2: Component Implementation
```tsx
// ❌ BAD: Hardcoded English text and manual variable interpolation
export function Header({ user, alertCount }) {
  return <h1>Welcome back, {user.name}! You have {alertCount} alerts.</h1>;
}

// ✅ GOOD: i18n Abstraction (using next-intl)
import { useTranslations } from 'next-intl';

export function Header({ user, alertCount }) {
  const t = useTranslations('Dashboard');
  
  return (
    <header>
      <h1>{t('welcomeMessage', { name: user.name })}</h1>
      <p>{t('unreadAlerts', { count: alertCount })}</p>
    </header>
  );
}
```

---

## 2. Advanced Native Formatting (`Intl`)

Do not install `moment.js` or write massive regex string parsers to format currencies in Euros vs Dollars. The browser handles this natively with the `Intl` API.

```typescript
// Data/Currency Formatting correctly tied to the active locale
const locale = 'de-DE';

// ✅ Currency
const price = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(1200.50);
// Output in Germany: "1.200,50 €"

// ✅ Dates
const date = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date());
// Output in Germany: "Freitag, 2. April 2026"

// ✅ Relative Time
const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
rtf.format(-2, 'day'); // Output: "vorgestern" (the day before yesterday)
```

---

## 3. Bidirectional Architecture (RTL)

For languages like Arabic and Hebrew, the UI must fundamentally flip horizontally. Right-To-Left (RTL) breaks standard CSS `marginLeft` and `marginRight`.

**The Solution:** Logical CSS Properties.
Tailwind v4 (and modern CSS) natively supports logical direction.

```css
/* ❌ BAD: Hardcoded physical space */
.btn { margin-left: 10px; } /* Will break layout in Hebrew */

/* ✅ GOOD: Logical spacing (Tailwind: ms-4, me-4) */
.btn { margin-inline-start: 10px; } /* Automatically flips in RTL mode */
```

*In React HTML tag:* `<html lang="ar" dir="rtl">`

---

## 4. Routing and SSR Detection

Users should not face English UI natively in Japan. Detect their browser headers at the edge routing layer.

In Next.js Middleware:
1. Parse the incoming `Accept-Language` header.
2. Intercept requests to `/dashboard`.
3. Rewrite URL to the detected locale (e.g., `/ja/dashboard`).

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
