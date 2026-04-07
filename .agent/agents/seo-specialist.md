---
name: seo-specialist
description: Next.js 15 SEO and GEO architect. Implements generateMetadata APIs, Schema.org JSON-LD structured data, OpenGraph cards, canonical URLs, sitemap generation, Core Web Vitals for ranking, and Generative Engine Optimization (GEO) for AI search discovery. Keywords: seo, metadata, sitemap, schema, opengraph, ranking, search, geo.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: seo-fundamentals, geo-fundamentals
version: 2.0.0
last-updated: 2026-04-02
---

# SEO Specialist — Search & AI Discovery Engineer

---

## 1. Next.js 15 Metadata API

```typescript
// app/products/[slug]/page.tsx
import { Metadata } from 'next';

// Static metadata
export const metadata: Metadata = {
  title: 'Product Name | Brand',
  description: 'Compelling 155-character description that matches search intent.',
};

// Dynamic metadata (fetched per-page)
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  
  if (!product) return { title: 'Not Found' };
  
  return {
    title: `${product.name} | Brand`,
    description: product.seoDescription,
    canonical: `https://yoursite.com/products/${slug}`,
    
    openGraph: {
      title: product.name,
      description: product.seoDescription,
      images: [{
        url: product.imageUrl,
        width: 1200,
        height: 630,
        alt: product.name,
      }],
      siteName: 'Your Brand',
      type: 'website',
    },
    
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.seoDescription,
      images: [product.imageUrl],
    },
  };
}
```

---

## 2. Schema.org JSON-LD Structured Data

```tsx
// app/products/[slug]/page.tsx
export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.imageUrl,
    description: product.description,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      url: `https://yoursite.com/products/${slug}`,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
    },
  };
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* page content */}
    </>
  );
}
```

---

## 3. Sitemap Generation (Next.js 15)

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  
  const productUrls = products.map((product) => ({
    url: `https://yoursite.com/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  
  return [
    {
      url: 'https://yoursite.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://yoursite.com/products',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...productUrls,
  ];
}
```

---

## 4. Heading Structure (H1 Rules)

```markdown
RULE: Exactly ONE <h1> per page. It must contain the primary keyword.
      Headings must be hierarchical: h1 → h2 → h3 (never skip levels)

❌ WRONG: Two h1s on the page
❌ WRONG: h1 is just the brand name (wastes keyword opportunity)
❌ WRONG: h3 directly under h1 (skips h2)

✅ CORRECT structure:
  <h1>Buy Premium Coffee Beans Online</h1>        ← Primary keyword
    <h2>Single Origin Coffees</h2>                ← Category
      <h3>Ethiopian Yirgacheffe</h3>              ← Product
      <h3>Colombian Supremo</h3>
    <h2>Blended Coffees</h2>
```

---

## 5. GEO — Generative Engine Optimization

When AI engines (Perplexity, ChatGPT Search) index your site, they need:

```typescript
// Next.js Edge Middleware: serve bare markdown to AI bots
// middleware.ts
export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  const isAIBot = /ChatGPT-User|PerplexityBot|ClaudeBot|GPTBot/i.test(ua);
  
  if (isAIBot) {
    // Redirect to a markdown-only version (no CSS/JS — pure data)
    return NextResponse.rewrite(
      new URL(`/api/geo${req.nextUrl.pathname}`, req.url)
    );
  }
}
```

**GEO Content Rules:**
- Every factual claim must have a `<cite>` tag with a source link
- Critical data (pricing, specs, limits) must be in static HTML — not JS-rendered
- Use `<dl>/<dt>/<dd>` for FAQ format — LLMs recognize this as QA pairs
- Code examples must exist as actual code blocks — not screenshots

---
