---
name: web-quality-audit
description: Web quality auditing skill for Lighthouse-style analysis across Performance, Accessibility, Best Practices, and SEO signals.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - web-design-guidelines
  - fixing-accessibility
  - fixing-metadata
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Web Quality Audit — Lighthouse & Core Web Vitals

---

## Mandatory Pre-Flight Context Inspection

Before executing web quality audits or Lighthouse-style evaluations, you MUST inspect:

1. Core Web Vitals Benchmarks (Section 24) → LCP $\le 2.5\text{s}$, INP $\le 200\text{ms}$, CLS $\le 0.1$
2. Layout Shift Prevention (Section 27) → Enforce explicit `width`/`height` or aspect-ratio declarations on all media tags
3. Async Script Loading (Section 46) → Enforce `async` or `defer` attributes on all third-party script tags in `<head>`

Conduct a comprehensive multi-pillar web quality audit covering Performance, Accessibility, Best Practices, and SEO signals.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Web quality auditing skill for Lighthouse-style analysis across Performance, Accessibility, Best Practices, and SEO signals..
- **DO NOT activate when:** The task falls strictly outside web-quality-audit domain or belongs to a different dedicated specialist.

---

## 4 Quality Pillars

### 1. Core Web Vitals (Performance)

- **Largest Contentful Paint (LCP)**: Target $\le 2.5\text{s}$. Preload hero images using `<link rel="preload" as="image">` and fetchpriority="high".
- **Interaction to Next Paint (INP)**: Target $\le 200\text{ms}$. Break long JS tasks into smaller chunks using `setTimeout` or `requestIdleCallback`.
- **Cumulative Layout Shift (CLS)**: Target $\le 0.1$. Set explicit `width` and `height` attributes on images and videos; reserve space for dynamic ads/banners.

### 2. Accessibility (a11y)

- Target 100/100 score. Verify all interactive controls have accessible names, proper contrast ($\ge 4.5:1$), and complete keyboard accessibility.

### 3. Web Best Practices

- Serve images in modern formats (`.webp` or `.avif`).
- Enforce HTTPS security headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`).
- Eliminate console errors and unhandled promise rejections.

### 4. Search Engine Optimization (SEO)

- Valid HTML5 document structure (`<!DOCTYPE html>`, `<html>` with `lang`, single `<h1>`).
- Robots.txt, sitemap.xml, canonical URLs, and structured JSON-LD data.

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
