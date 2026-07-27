---
name: web-quality-audit
description: Web quality auditing skill for Lighthouse-style analysis across Performance, Accessibility, Best Practices, and SEO signals.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Full-Stack Web Quality & Lighthouse Signals
  tier: pro
  co-requires: [web-accessibility-auditor, fixing-metadata, performance-profiling]
  trigger-signals:
    strong: [web-quality-audit, Lighthouse audit, Core Web Vitals audit, web quality report, LCP CLS INP audit]
    weak: [quality audit, site audit]
---

# Web Quality Audit — Lighthouse & Core Web Vitals

Conduct a comprehensive multi-pillar web quality audit covering Performance, Accessibility, Best Practices, and SEO signals.

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

## 🤖 LLM-Specific Traps

1. **Ignoring Image Dimensions**: Omitting `width` and `height` on images, causing layout shifts (CLS penalties).
2. **Synchronous Heavy Scripts**: Loading render-blocking third-party scripts in the document `<head>` without `async` or `defer`.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `vitals-reviewer` · `accessibility-reviewer` · `seo-specialist`**

### ✅ Pre-Flight Self-Audit

```
✅ Are explicit `width` and `height` aspect ratios declared on all media tags?
✅ Are script tags in the `<head>` marked with `defer` or `async`?
✅ Is text contrast WCAG AA compliant across all components?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
