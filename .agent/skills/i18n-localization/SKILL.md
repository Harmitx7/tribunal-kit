---
name: i18n-localization
description: Internationalization (i18n) and localization mastery. Abstracting hardcoded strings, managing JSON/YAML translation dictionaries, bidirectional routing (RTL support for Arabic/Hebrew), Pluralization algorithms, date/currency formatting, and SSR locale detection in Next.js/React. Use when preparing an application for global multilingual scaling.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# i18n & Localization — Global Scale Mastery

> Translating text is easy. Localizing variables, dates, plurals, and reading directions is complex.
> Do not build your own translation hash-map engine. It will break on Arabic plurals.

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

## 🤖 LLM-Specific Traps (i18n)

1. **Building Custom Maps:** AI writes generic `const dict = { en: "Hello", es: "Hola" }` and queries it via `dict[locale]`. This fundamentally fails for plurals, interpolation, and rich text. Use standard libraries.
2. **Ignoring Plural Rules:** English has 2 plural forms (singular, plural). Arabic has 6 (zero, one, two, few, many, other). Hallucinating `count === 1 ? 'apple' : 'apples'` logic breaks internationally. Ensure ICU message formatting.
3. **Physical CSS Layouts:** Writing `ml-4` or `pr-2` (margin-left, padding-right) in Tailwind. Standardize exclusively on `ms-4` (margin-start) and `pe-2` (padding-end) to guarantee RTL flip compliance.
4. **Hardcoded Date Formats:** AI using `date.toLocaleDateString('en-US')` globally inside an i18n abstraction library, overriding the dynamic user locality entirely.
5. **Component Cracking for Rich Text:** The AI tries to translate "Click *here* to login" by breaking it into 3 separate translation keys (Start, Link, End). This destroys translator context. Modern libraries support `t.rich('key', { span: (chunks) => <span>{chunks}</span> })`.
6. **Server vs Client Disconnect:** AI suggests using a React Context `LocaleProvider` heavily in Next.js Server Components. SSR apps must extract locale explicitly from the URL route (`params.locale`), not React Context.
7. **Dictionary Bloat:** Trying to load a massive 5MB `global.json` translation file on initial boot, completely destroying First Contentful Paint. AI must segment routing into domain namespaces (e.g., `Checkout.json`).
8. **Locale Fallbacks Missing:** Failing to set `en` as the default fallback logic when a key is missing in the requested language, causing catastrophic `undefined` crashes on runtime rendering.
9. **Translating Variable Identities:** Accidentally translating JSON mapping keys or CSS classes inside the codebase when attempting to internationalize display text.
10. **Timezone Blindness:** Assuming formatting a DateTime automatically translates the underlying timezone shift. Timezone and Locale are two distinct configurations. Displaying local time requires tracking client offset via timezone context.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are strings fully abstracted into standard JSON/YAML dictionaries using ICU format?
✅ Is variable interpolation utilizing standard library bindings rather than raw string concatenation?
✅ Have pluralization logic been delegated to the i18n engine to support multi-form languages?
✅ Are physical CSS layouts stripped in favor of Logical Properties (e.g., `start`, `end`, `margin-inline`)?
✅ Has the `<html dir="rtl">` tag generation been integrated for Right-To-Left language requests?
✅ Is data formatting (dates, currency, relative time) natively executed via target-aware `Intl` APIs?
✅ Did I ensure Rich-Text translations (links within blocks) remain unified in one single translation key?
✅ Is Next.js routing actively leveraging `[locale]` parameters accurately in SSR domains?
✅ Are JSON translation files segmented logically by namespace to prevent massive client-side bloat?
✅ Did I enforce strict error-bypassing fallback logic to default language upon missing translation keys?
```
