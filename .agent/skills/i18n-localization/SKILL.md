---
name: i18n-localization
description: Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Internationalization & Localization

> Internationalization (i18n) is preparing code to support multiple languages.
> Localization (l10n) is the work of adapting to a specific locale.
> Do i18n once, properly. Do l10n for each market.

---

## The Core Rule: No Hardcoded Strings

Every user-visible string in the source code is a localization problem waiting to happen.

```ts
// ❌ Hardcoded — untranslatable
<button>Save Changes</button>
<p>You have {count} messages</p>
<p>Error: Invalid email address</p>

// ✅ Key-referenced — translatable
<button>{t('common.save')}</button>
<p>{t('inbox.messageCount', { count })}</p>
<p>{t('errors.invalidEmail')}</p>
```

---

## Translation File Structure

Organize translation keys hierarchically — flat files become unmaintainable past ~50 keys:

```json
// en.json
{
  "common": {
    "save": "Save Changes",
    "cancel": "Cancel",
    "loading": "Loading…",
    "error": "Something went wrong"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "register": "Create Account",
    "errors": {
      "invalidEmail": "Enter a valid email address",
      "passwordTooShort": "Password must be at least {{min}} characters"
    }
  },
  "inbox": {
    "messageCount_one": "{{count}} message",
    "messageCount_other": "{{count}} messages"
  }
}
```

**Key naming conventions:**
- `feature.element` or `feature.element.state`
- Error keys under `.errors`
- Never use the English text as the key (`"Save Changes": "Save Changes"`)

---

## Pluralization

Pluralization rules differ per language. Use your i18n library's plural system — never manual `if count > 1`:

```ts
// ❌ Only works for English
const label = count === 1 ? 'message' : 'messages';

// ✅ i18next handles per-language plural rules
t('inbox.messageCount', { count })

// Translation files handle the variants:
// English: { "messageCount_one": "{{count}} message", "messageCount_other": "{{count}} messages" }
// Arabic:  6 plural forms (zero, one, two, few, many, other)
// Russian: 3 plural forms with complex rules
```

---

## Date, Number & Currency Formatting

Never format these manually. Use the browser's `Intl` API:

```ts
// Date
const date = new Date();
new Intl.DateTimeFormat('en-US').format(date);  // "2/20/2026"
new Intl.DateTimeFormat('de-DE').format(date);  // "20.2.2026"

// Number
new Intl.NumberFormat('en-US').format(1234567.89);  // "1,234,567.89"
new Intl.NumberFormat('de-DE').format(1234567.89);  // "1.234.567,89"

// Currency
new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(99.99);
// "$99.99"
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(99.99);
// "99,99 €"
```

---

## RTL (Right-to-Left) Support

Arabic, Hebrew, Persian, Urdu are RTL languages. Supporting them requires more than flipping direction.

```html
<!-- Set direction on html element based on locale -->
<html lang="ar" dir="rtl">

<!-- Or dynamically -->
<html lang={locale} dir={isRTL(locale) ? 'rtl' : 'ltr'}>
```

```css
/* Use logical properties — they flip automatically with direction */
/* ❌ Physical: only works for LTR */
padding-left: 1rem;
margin-right: 2rem;
border-left: 2px solid;

/* ✅ Logical: works for both LTR and RTL */
padding-inline-start: 1rem;
margin-inline-end: 2rem;
border-inline-start: 2px solid;
```

---

## Detecting Hardcoded Strings (Code Audit)

Look for:
- JSX text content directly in tags: `<p>some text</p>` (not `<p>{t(...)}</p>`)
- Template literals with user-facing copy: `` `Welcome, ${name}!` ``
- Alert/toast calls with string literals: `toast.success('Saved!')`
- Error messages: `new Error('Invalid input')` shown to users
- `placeholder`, `aria-label`, `title` attributes hardcoded

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/i18n_checker.py` | Scans codebase for hardcoded strings | `python scripts/i18n_checker.py <project_path>` |
