---
name: seo-fundamentals
description: Use when Search Engine Optimization (SEO) mastery. Metadata implementation, Open Graph (OG) social card rendering, semantic HTML5 structuring, canonicalization, Core Web Vitals performance mapping, Sitemap/Robots configurations, structured data (JSON-LD), and Next.js SSR SEO implementations. Use when auditing site visibility or building consumer-facing web architectures.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - fixing-metadata
  - web-quality-audit
  - nextjs-react-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# SEO Fundamentals — Visibility & Discoverability Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `seo-fundamentals` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Search Engine Optimization (SEO) mastery. Metadata implementation, Open Graph (OG) social card rendering, semantic HTML5 structuring, canonicalization, Core Web Vitals performance mapping, Sitemap/Robots configurations, structured data (JSON-LD), and Next.js SSR SEO implementations. Use when auditing site visibility or building consumer-facing web architectures.
- **DO NOT activate when:** The task falls outside the `seo-fundamentals` domain or is managed by a different dedicated specialist.

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

- ❌ Using `<div>` for everything instead of semantic HTML -> ✅ Use `<main>`, `<article>`, `<nav>`, `<section>` for crawler comprehension
- ❌ Multiple `<h1>` tags on a single page -> ✅ One `<h1>` per page; use `<h2>`-`<h6>` for hierarchy
- ❌ Generating meta descriptions with AI boilerplate -> ✅ Each page needs a unique, specific meta description under 160 characters
- ❌ Using client-side rendering for content pages -> ✅ SSR/SSG for pages that need to be indexed; CSR is invisible to crawlers without JS rendering

---

---

## 1. Core Meta Architecture (The Next.js 15 Standard)

Do not use legacy `next/head` tags scattered across components. Use the built-in Metadata API explicitly.

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await fetchPost(params.slug);

  return {
    title: `${post.title} | MyBrand`,
    description: post.excerpt,
    keywords: post.tags,
    alternates: {
      canonical: `https://www.example.com/blog/${params.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `https://example.com/blog/${params.slug}`,
      images: [{ url: post.coverImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image', // Critical for big Twitter link previews
    },
  };
}
```

---

## 2. Semantic HTML & Heading Hierarchy

Google establishes context by parsing the DOM outline. A massive application constructed purely of `<div className="text-xl font-bold">` tags will be heavily penalized.

1. **The H1 Law:** Exactly ONE `<h1>` per page. This is the primary subject.
2. **Hierarchy Integrity:** Never skip heading levels. An `<h2>` MUST precede an `<h3>`. Do not use heading tags for visual sizing; use them purely for document structure.
3. **Semantic Tags:** Wrap headers in `<header>`, menus in `<nav>`, main content in `<main>`, and sidebars in `<aside>`.

```html
<!-- ✅ GOOD: Perfect SEO Document Outline -->
<main>
  <article>
    <h1>The Future of AI Agents</h1>
    <p>Introduction...</p>

    <h2>Architectural Patterns</h2>
    <section>
      <h3>The Supervisor Pattern</h3>
      <p>Content regarding supervisors...</p>
    </section>
  </article>
</main>
```

---

## 3. Structured Data (JSON-LD)

Help search engines understand exact data graphs (Products, Reviews, Articles, Jobs) bypassingly standard text crawling. Inject standard `Schema.org` JSON-LD.

```typescript
// Injecting JSON-LD structurally into a React/Next component
export default function ProductPage({ product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <section>
      {/* Script injected cleanly into DOM */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1>{product.name}</h1>
      {/* ... rest of UI ... */}
    </section>
  );
}
```

---

## 4. Robots & Sitemaps

If a page shouldn't be indexed (e.g., dynamic search result matrices, user profiles), you must explicitly block it, otherwise Googlebot wastes "Crawl Budget" on infinite URLs.

- **`robots.txt`**: Denies crawling of specific directories.
- **`<meta name="robots" content="noindex, nofollow">`**: Denies indexing of a specific page instance.
- **`sitemap.xml`**: A programmatic manifest mapped to root guiding crawlers mathematically through all valid indexable paths.

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
