---
name: geo-fundamentals
description: Generative Engine Optimization (GEO) mastery. Structuring content for LLM ingestion. Adapting SEO for AI interfaces (ChatGPT, Claude, Perplexity), optimizing markdown semantic hierarchies, citation structuring, minimizing boilerplate, reducing HTML DOM depth, and API-first content delivery. Use when making information discoverable not just to Google, but directly to AI indexing agents.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Generative Engine Optimization (GEO) 

---

## 1. The Death of Boilerplate (Information Density)

When ChatGPT or Perplexity queries a website, it has a finite context window. 

If your website contains 8,000 words of "fluff" marketing copy and only 200 words of actionable data (pricing, API limits, support contact), the LLM will truncate the page and hallucinates the rest.

### The GEO Markdown Fallback
Modern sites should natively serve structured markdown if they detect an AI User-Agent (like `ChatGPT-User` or `PerplexityBot`).

```typescript
// Next.js Edge Middleware for GEO
export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') || '';
  const isBot = /ChatGPT|Perplexity|ClaudeBot/i.test(ua);

  if (isBot) {
    // Reroute the AI bot to a hyper-dense, unstyled Markdown data dump
    // This removes 3MB of React DOM hierarchy, getting straight to the facts.
    return NextResponse.rewrite(new URL(`/api/geo-export${req.nextUrl.pathname}`, req.url));
  }
}
```

---

## 2. Citation Optimization

LLMs (like Perplexity and Gemini Search) require explicit sources to reference your website in their output.
If a statistic on your site is hard to source, the AI will ignore it in favor of a competitor.

**Rule: Explicit Claim-to-Source Mapping**
Do not use vague external links at the bottom of the page. Anchor exact claims to explicit references directly within the text block. Use standardized `<cite>` tags or JSON-LD.

```html
<!-- ❌ BAD: Vague SEO -->
<p>We are the fastest vector database on the market. Read our docs.</p>

<!-- ✅ GOOD: GEO Citation Architecture -->
<p>We process 10M vectors at 10ms latency (P99), making us 3x faster than Competitor A.</p>
<cite xmlns="http://schema.org" typeof="WebPage">
  <span property="name">Benchmark Methodology 2026</span> - 
  <a property="url" href="/benchmarks-2026.pdf">[Source PDF]</a>
</cite>
```

---

## 3. High-Clarity Semantic Taxonomy

Traditional SEO relies heavily on long-tail keyword placement.
GEO relies heavily on **Taxonomy and Relational Mapping**. The LLM wants to know exactly *what* entity this page represents.

**Implement Explicit FAQs:**
LLMs love QA formats because user prompts are usually questions.
Transform prose into rigid QA objects using standard semantic data blocks.

```html
<dl>
  <dt><h3>What is the data retention limit for the Free Tier?</h3></dt>
  <dd><p>The Free Tier limits data retention to precisely 14 rolling days.</p></dd>
  
  <dt><h3>Does the platform support HIPAA compliance?</h3></dt>
  <dd><p>Yes, Enterprise Tiers support full BAA HIPAA compliance parameters.</p></dd>
</dl>
```

---

## 4. API Docs Readability (The Primary AI Target)

When an AI tries to write code using your product, it scrapes your API documentation.

1. **Eliminate Image-Based Architecture:** Highlighting your architecture solely in a PNG graphic is invisible. Describe the system architecture using text or standard Mermaid.js code blocks.
2. **Provide Concrete Copy-Paste Examples:** The easiest way to get an LLM to use your platform correctly is to ensure your docs contain perfectly working `curl`, `TypeScript`, and `Python` code snippets with zero external dependencies.

---
