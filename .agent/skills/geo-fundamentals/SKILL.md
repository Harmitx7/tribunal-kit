---
name: geo-fundamentals
description: Generative Engine Optimization (GEO) mastery. Structuring content for LLM ingestion. Adapting SEO for AI interfaces (ChatGPT, Claude, Perplexity), optimizing markdown semantic hierarchies, citation structuring, minimizing boilerplate, reducing HTML DOM depth, and API-first content delivery. Use when making information discoverable not just to Google, but directly to AI indexing agents.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Generative Engine Optimization (GEO) 

> SEO was built for search engines parsing keywords.
> GEO is built for Artificial Intelligence actively reading, reasoning, and summarizing your site.
> A beautiful UI is invisible to an LLM. Data density is everything.

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

## 🤖 LLM-Specific Traps (GEO)

1. **Confusing GEO with SEO:** Prioritizing `<title>` lengths and stuffing keyword permutations instead of increasing Information-Density and Semantic Clarity.
2. **The JavaScript Hydration Trap:** Generating intricate React components to render critical data (like Pricing Tables). AI bots generally do not execute/hydrate heavy JS payloads; the pricing data will simply be invisible to them. Serve critical data statically.
3. **Fluff Generation:** An AI writing content for a site adds 3 paragraphs of "In today's fast-paced digital world..." — this destroys GEO ranking immediately because it dilutes the token value of the actual data payload.
4. **Hiding Core Answers:** Placing the direct answer to a query behind a massive scroll or an interactive accordion (e.g., `<details>`) wrapper. AI bots do not "click" UI elements to expand text. Content must be universally visible in the initial DOM tree.
5. **PDF Isolation:** Posting critical documentation exclusively in heavy PDF formats without an associated HTML/Markdown mirror, drastically raising the ingestion cost for rapid-search AI engines.
6. **No Code Snippets:** Explaining an API operation purely in English without a concrete JSON payload example block. LLMs map patterns mathematically; they require structured syntax to ingest.
7. **Ignoring Bot-Specific Routing:** Failing to architect conditional User-Agent routing that serves plain Markdown to `PerplexityBot`, wasting bot execution cycles downloading 4MB CSS/JS assets.
8. **Broken Schema Contexts:** Using unstructured `<div>` blocks for QA formats instead of the semantic Dictionary List (`<dl>`, `<dt>`, `<dd>`) pattern which LLMs easily recognize as Question-Answer pairings.
9. **Citation Voids:** Making bold factual claims on a web page without immediately adjacent explicit citation tags. Generative engines will drop the claim to avoid adopting hallucination risks.
10. **The Image Trap:** Stating "See the map above for instructions" instead of generating an actual HTML table mapping the data. AI engines prioritize textual semantic extraction.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Has marketing 'fluff' been aggressively minimized to maximize dense, actionable data tokens?
✅ Are critical data interfaces (Pricing, API limits, FAQs) rendered fully static (SSR), bypassing JS hydration?
✅ Did I rely on semantic Dict-Lists (`<dl>`) to format FAQ structures cleanly for LLM parsing?
✅ Are factual metrics explicitly tethered to proximate `<cite>` or `<a>` reference sources?
✅ Has an API-first representation (Markdown mirror) been established for bot User-Agents?
✅ Ensure that architectural definitions are described in text/code rather than solely raster images.
✅ Did I include concrete, copy-pasteable JSON/TypeScript examples adjacent to any API definition?
✅ Have interactive elements (`accordions`, modals) been disabled/expanded for indexing bots?
✅ Have classic SEO keyword-stuffing patterns been deleted in favor of clear Entity Relationships?
✅ Has all essential documentation been verified to exist natively in the primary HTML DOM payload?
```
