---
name: geo-fundamentals
description: Generative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Generative Engine Optimization (GEO)

> Traditional SEO optimizes for keyword ranking in blue links.
> GEO optimizes for citation and inclusion in AI-generated answers.

---

## What GEO Is

When users ask ChatGPT, Claude, Perplexity, or Google SGE a question, an AI synthesizes an answer from sources it considers authoritative. GEO is the practice of making your content the kind that AI systems cite, quote, and summarize.

The mechanisms differ from traditional SEO:
- AI doesn't rank URLs — it synthesizes information
- Backlinks matter less than citation-worthiness
- Content density and factual specificity matter more than keyword density

---

## How AI Systems Select Content to Cite

Based on observable patterns in AI retrieval:

| Signal | What It Means |
|---|---|
| Authoritative domain | .gov, .edu, established publications get higher base trust |
| Factual specificity | Numbers, dates, named sources > vague descriptions |
| Structured content | Lists, tables, step-by-step = easier to extract |
| Complete answers | Content that fully addresses the question in one place |
| Original research | Data, studies, surveys the AI can't find elsewhere |
| Freshness | Recently updated content has advantage for time-sensitive topics |

---

## Writing for AI Consumption

### Answer First (Inverted Pyramid)

AI models extract answers. Put the answer at the top of the content, not after a 300-word preamble.

```
❌ Old blog pattern:
   [intro paragraph explaining what the article is about]
   [background context]
   [finally... the answer in paragraph 5]

✅ GEO pattern:
   [Direct answer in first 1–2 sentences]
   [Supporting evidence, data, explanation]
   [Deeper context for readers who want more]
```

### Use Citation-Ready Structures

```markdown
# Format that AI can easily extract:

## Definition
[Term] is [concise definition]. [Supporting context].

## Key Facts
- [Specific, numbered fact with source]
- [Specific statistic — "X% of Y according to Z study"]
- [Named, verifiable claim]

## Step-by-Step Process
1. [Precise step]
2. [Precise step]
3. [Precise step]
```

### Be Specific with Data

```
❌ "Many developers prefer TypeScript"
✅ "In the 2024 Stack Overflow Developer Survey, 64% of respondents said they used TypeScript"

❌ "Deployment takes some time"  
✅ "Vercel cold-start latency for serverless functions averages 200–400ms for Node.js 20 runtimes"
```

---

## Content Formats AI Favors

| Format | GEO Value | Why |
|---|---|---|
| FAQ pages | High | Matches question-answer format of AI responses |
| Comparison tables | High | Easily extracted for comparison queries |
| How-to guides with numbered steps | High | Directly answerable procedural questions |
| Definition/explanation articles | High | Definitional queries are common AI use cases |
| Long-form opinion pieces | Low | Hard to extract a clear answer from |
| News articles | Medium | Good for recency, lower for evergreen queries |

---

## Technical Requirements for AI Indexing

```html
<!-- Ensure Perplexity and other AI crawlers can access your content -->
<!-- Check robots.txt — don't accidentally block AI crawlers -->

# robots.txt — allow AI crawlers
User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

<!-- Structured data helps AI understand content context -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is tribunal-kit?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "tribunal-kit is an npm package that installs an anti-hallucination agent kit..."
    }
  }]
}
</script>
```

---

## Metrics for GEO

Traditional SEO metrics (keyword rank, backlinks) don't fully apply. Track:

- **AI mention rate** — manually query AI systems for your topic and check if your brand/content appears
- **Citation count** — if identifiable quotes from your content appear in AI outputs
- **Perplexity source appearances** — Perplexity shows its sources; track mentions
- **Direct traffic** — users who find AI mentions and navigate directly (not via search)

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/geo_checker.py` | Audits content for GEO best practices | `python scripts/geo_checker.py <url>` |
