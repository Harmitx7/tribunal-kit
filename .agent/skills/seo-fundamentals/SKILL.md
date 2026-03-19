---
name: seo-fundamentals
description: SEO fundamentals, E-E-A-T, Core Web Vitals, and Google algorithm principles.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Seo Fundamentals Recommendation ━━━━━━━━━━━━━━━━
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
