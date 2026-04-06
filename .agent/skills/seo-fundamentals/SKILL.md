---
name: seo-fundamentals
description: Search Engine Optimization (SEO) mastery. Metadata implementation, Open Graph (OG) social card rendering, semantic HTML5 structuring, canonicalization, Core Web Vitals performance mapping, Sitemap/Robots configurations, structured data (JSON-LD), and Next.js SSR SEO implementations. Use when auditing site visibility or building consumer-facing web architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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
