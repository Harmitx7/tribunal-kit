---
name: i18n-localization
description: Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ I18N Localization Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

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
