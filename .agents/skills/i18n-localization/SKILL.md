---
name: i18n-localization
description: Use when Internationalization (i18n) and localization mastery. Abstracting hardcoded strings, managing JSON/YAML translation dictionaries, bidirectional routing (RTL support for Arabic/Hebrew), Pluralization algorithms, date/currency formatting, and SSR locale detection in Next.js/React. Use when preparing an application for global multilingual scaling.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - nextjs-react-expert
  - adapt
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# i18n & Localization — Global Scale Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `i18n-localization` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Internationalization (i18n) and localization mastery. Abstracting hardcoded strings, managing JSON/YAML translation dictionaries, bidirectional routing (RTL support for Arabic/Hebrew), Pluralization algorithms, date/currency formatting, and SSR locale detection in Next.js/React. Use when preparing an application for global multilingual scaling.
- **DO NOT activate when:** The task falls outside the `i18n-localization` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ Concatenating translated strings (`'Hello ' + name`) -> ✅ Use interpolation: `t('greeting', { name })` to handle word order differences
- ❌ Hardcoding date/number formats -> ✅ Use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the user's locale
- ❌ Assuming all languages read left-to-right -> ✅ Arabic, Hebrew, Farsi are RTL; use CSS `dir='auto'` and logical properties
- ❌ Using string length for validation on translated text -> ✅ Translations can be 30-200% longer than English; design for expansion

---

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
  return (
    <h1>
      Welcome back, {user.name}! You have {alertCount} alerts.
    </h1>
  );
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
const price = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(1200.5);
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
.btn {
  margin-left: 10px;
} /* Will break layout in Hebrew */

/* ✅ GOOD: Logical spacing (Tailwind: ms-4, me-4) */
.btn {
  margin-inline-start: 10px;
} /* Automatically flips in RTL mode */
```

_In React HTML tag:_ `<html lang="ar" dir="rtl">`

---

## 4. Routing and SSR Detection

Users should not face English UI natively in Japan. Detect their browser headers at the edge routing layer.

In Next.js Middleware:

1. Parse the incoming `Accept-Language` header.
2. Intercept requests to `/dashboard`.
3. Rewrite URL to the detected locale (e.g., `/ja/dashboard`).

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
