---
name: fixing-metadata
description: "Use when Audit and fix page metadata including page titles, meta descriptions, Open Graph, Twitter cards, canonical URLs, and JSON-LD structured data."
version: 5.0.0
last-updated: 2026-09-13
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

## 🛠️ Technical Architecture & Reference Recipes

---

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
