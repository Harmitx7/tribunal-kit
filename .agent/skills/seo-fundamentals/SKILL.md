---
name: seo-fundamentals
description: Search Engine Optimization (SEO) mastery. Metadata implementation, Open Graph (OG) social card rendering, semantic HTML5 structuring, canonicalization, Core Web Vitals performance mapping, Sitemap/Robots configurations, structured data (JSON-LD), and Next.js SSR SEO implementations. Use when auditing site visibility or building consumer-facing web architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using `<div>` for everything instead of semantic HTML -> ✅ Use `<main>`, `<article>`, `<nav>`, `<section>` for crawler comprehension
- ❌ Multiple `<h1>` tags on a single page -> ✅ One `<h1>` per page; use `<h2>`-`<h6>` for hierarchy
- ❌ Generating meta descriptions with AI boilerplate -> ✅ Each page needs a unique, specific meta description under 160 characters
- ❌ Using client-side rendering for content pages -> ✅ SSR/SSG for pages that need to be indexed; CSR is invisible to crawlers without JS rendering

---


# SEO Fundamentals — Visibility & Discoverability Mastery

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
      canonical: `https://www.example.com/blog/${params.slug}`
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
    }
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
