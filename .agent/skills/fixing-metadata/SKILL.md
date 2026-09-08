---
name: fixing-metadata
description: Audit and fix page metadata including page titles, meta descriptions, Open Graph, Twitter cards, canonical URLs, and JSON-LD structured data.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - nextjs-react-expert
  - baseline-ui
  - compact-landing
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Fixing Metadata — Technical SEO & Open Graph Tags

---

## Mandatory Pre-Flight Context Inspection

Before engineering metadata or Open Graph tags, you MUST inspect:

1. Title & Meta Description Caps (Section 24) → Restrict title tags to 50–60 chars and meta descriptions to 140–155 chars
2. Absolute Image URL Rule (Section 74) → Enforce full absolute HTTPS URLs (`https://domain.com/og.jpg`) for `og:image` and `twitter:image`
3. Twitter Card Type (Section 39) → Always specify `<meta name="twitter:card" content="summary_large_image" />` for prominent social previews

Audit, generate, and fix page metadata for rich social previews, search engine indexing, and structured data.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Audit and fix page metadata including page titles, meta descriptions, Open Graph, Twitter cards, canonical URLs, and JSON-LD structured data..
- **DO NOT activate when:** The task falls strictly outside fixing-metadata domain or belongs to a different dedicated specialist.

---

## 4 Metadata Standard Requirements

### 1. Title & Meta Description Length & Formatting

- **Title Tag**: 50–60 characters max (_"Product Title | Brand Name"_).
- **Meta Description**: 140–155 characters max. Must contain active call to value without truncating on search result cards.

### 2. Open Graph & Twitter Card Matrix

```html
<!-- Open Graph / Facebook / LinkedIn -->
<meta property="og:type" content="website" />
<meta property="og:title" content="UI Skills for Design Engineers" />
<meta
  property="og:description"
  content="A curated collection of design-engineering skills for accessibility, motion, and frontend craft."
/>
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="UI Skills for Design Engineers" />
<meta
  name="twitter:description"
  content="A curated collection of design-engineering skills for accessibility, motion, and frontend craft."
/>
<meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
```

### 3. Canonical Tag Verification

```html
<link rel="canonical" href="https://example.com/current-page-path" />
```

### 4. Next.js App Router Metadata Export Example

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UI Skills for Design Engineers',
  description: 'Curated design-engineering skills for accessibility, motion, and frontend craft.',
  openGraph: {
    title: 'UI Skills for Design Engineers',
    description: 'Curated design-engineering skills for accessibility, motion, and frontend craft.',
    url: 'https://example.com',
    images: [{ url: 'https://example.com/og.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UI Skills for Design Engineers',
    images: ['https://example.com/twitter.jpg'],
  },
};
```

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
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
