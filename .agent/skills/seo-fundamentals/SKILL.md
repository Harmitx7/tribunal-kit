---
name: seo-fundamentals
description: SEO fundamentals, E-E-A-T, Core Web Vitals, and Google algorithm principles.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# SEO Fundamentals

> SEO is not a trick. It is the practice of making content genuinely useful
> for the people searching for it, and technically accessible to the crawlers that index it.

---

## What Search Engines Actually Rank

Google's stated ranking factors, simplified:

1. **Relevance** — does the content match the search intent?
2. **Quality** — is it accurate, original, and valuable?
3. **Authority** — do other credible sources link to it?
4. **Experience** — is the page fast and easy to use?

The manipulation era is over. Keyword stuffing gets pages penalized. Thin AI-generated content is actively filtered. The only reliable long-term SEO is making something worth ranking.

---

## E-E-A-T Framework

Google evaluates content on Experience, Expertise, Authoritativeness, and Trustworthiness.

| Signal | What It Means | How to Demonstrate |
|---|---|---|
| Experience | First-hand use of the topic | Case studies, screenshots, real examples |
| Expertise | Deep knowledge of the domain | Accurate detail, citations, author credentials |
| Authoritativeness | Recognized by others in the field | External links, mentions, speaking/publishing |
| Trustworthiness | Safe and reliable site | HTTPS, privacy policy, correct contact info |

E-E-A-T matters most for YMYL content (health, finance, legal, safety).

---

## Technical SEO Checklist

### Page-Level Requirements

```html
<!-- Title: 50–60 chars, includes primary keyword -->
<title>Tribunal Agent Kit — Anti-Hallucination AI Tools</title>

<!-- Description: 120–160 chars, actionable, includes keyword -->
<meta name="description" content="Install the Tribunal Kit with npx tribunal-kit init. 
27 specialist agents and 17 slash commands for Cursor, Windsurf, and Antigravity.">

<!-- One H1 per page — matches the title intent -->
<h1>Anti-Hallucination Agent Kit for AI IDEs</h1>

<!-- Canonical — prevent duplicate content -->
<link rel="canonical" href="https://yoursite.com/page">

<!-- Open Graph (social sharing) -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://yoursite.com/og-image.jpg">
```

### Core Web Vitals (2025 Targets)

| Metric | Good | Needs Work | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5–4s | > 4s |
| INP (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

**Most common LCP fix:** The hero image or heading is the LCP element. Preload it:
```html
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">
```

**Most common CLS fix:** Images without explicit width/height cause layout shifts:
```html
<img src="..." width="800" height="450" alt="...">
```

---

## Content Structure

```
Page structure that works:
  H1: Primary topic (one per page)
  H2: Major sections
  H3: Subsections
  
Content patterns that help:
  - Answer the question in the first paragraph
  - Use tables and lists for comparative or step-by-step info
  - Add FAQ sections for long-tail queries
  - Internal links to related content
  - External links to authoritative sources
```

---

## What Not to Do

- **Keyword stuffing** — unreadable text written for bots; penalized
- **Thin content** — pages with nothing to say; filtered
- **Duplicate content** — same content on multiple URLs without canonical; splits authority
- **Hidden text** — same color as background, `display:none` with keywords; penalized
- **Link schemes** — buying links; can result in manual penalty

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/seo_checker.py` | Audits page-level technical SEO | `python scripts/seo_checker.py <url>` |
