---
name: seo-fundamentals
description: Search Engine Optimization (SEO) mastery. Metadata implementation, Open Graph (OG) social card rendering, semantic HTML5 structuring, canonicalization, Core Web Vitals performance mapping, Sitemap/Robots configurations, structured data (JSON-LD), and Next.js SSR SEO implementations. Use when auditing site visibility or building consumer-facing web architectures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# SEO Fundamentals — Visibility & Discoverability Mastery

> If a consumer web app is not indexed efficiently, it does not mathematically exist on the internet.
> Googlebot does not execute massive React payloads effectively. Server-Side Rendering is mandatory for SEO.

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

## 🤖 LLM-Specific Traps (SEO)

1. **The SPA Fallacy:** AI building a Client-Side Rendered (CSR) React App with `react-router` and assuring the user SEO is perfect. Googlebot struggles heavily with executing massive JS bundles. Force SSR Next.js/Astro architecture for consumer-facing sites.
2. **Missing Canonicals:** Failing to generate `<link rel="canonical">` tags on dynamic URL structures (`?category=shoes&brand=nike`), resulting in Google penalizing the main page for "Duplicate Content" against itself.
3. **OpenGraph Amputation:** Creating `<title>` tags perfectly but entirely omitting the `og:` and `twitter:` meta tags. The site will look like a broken ugly text link when shared on social media.
4. **`next/head` Obsession:** The AI relies on the legacy React `Helmet` library or Next 12 `Head` tag generation methods instead of utilizing the Next.js `generateMetadata()` App Router architectural API.
5. **Div Soups:** Generating 400 lines of UI where bold strings are mapped as `<span>` tags instead of strong semantic `<h2>` and `<h3>` document structural tags.
6. **NoIndex Blindness:** The AI scaffolds the staging `/dev/` URL environment but neglects to inject global `noindex` headers into staging layouts, causing Google to permanently index half-finished development drafts globally.
7. **Image Alt-Tag Exclusion:** Utilizing `<Image src="...">` without writing highly descriptive `alt="..."` attributes, wiping out all potential Google Images search traffic and destroying accessibility scores simultaneously.
8. **Invalid Schema Output:** Generating broken JSON-LD objects because the AI used generic un-validated JSON types instead of rigidly consulting the `schema.org` mandated data structures (e.g., omitting the required `priceCurrency` on an Offer schema).
9. **Sitemap Generation Forgetting:** Ensuring excellent SEO on specific pages but totally failing to scaffold dynamic `app/sitemap.ts` files that continually update the XML tree when new databases articles are published.
10. **The H1 Spam:** Putting multiple `<h1>` tags on a single page visually simply because they want the font to be large, heavily confusing the search engine content analyzers.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Have dynamic Meta tags (Title, Description) been localized into SSR native configuration (`generateMetadata`)?
✅ Did I guarantee the mathematical generation of Open Graph (OG) and Twitter Card payload tags?
✅ Is there strictly only one `<h1>` tag rendered structurally per page view?
✅ Is the DOM heavily semantic (`<main>`, `<article>`, `<nav>`) bypassing standard div-soups?
✅ Were Canonical URL alternates properly mapped on complex pagination/parameterized URL routes?
✅ Have standard `Schema.org` JSON-LD data graphs been injected for transactional/content entries?
✅ Has `alt` text been rigidly mandated and populated for all primary visual `<Image>` tags?
✅ Ensure that indexing prevention (robots noindex) is actively applied to user-private/admin/test routes?
✅ Was the SEO advice generated explicitly recognizing the difference between static SSR delivery vs CSR Javascript limits?
✅ Did I ensure the XML sitemap generation accurately captures dynamically generated database routes (e.g., blog slugs)?
```
