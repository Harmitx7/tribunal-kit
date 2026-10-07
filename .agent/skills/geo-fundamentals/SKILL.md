---
name: geo-fundamentals
description: "Use when executing, coordinating, planning, or reviewing geo fundamentals agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - seo-fundamentals
  - browser-native-ai
  - readme-builder
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "geo"
  - "fundamentals"
---

# Generative Engine Optimization (GEO)

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `geo-fundamentals` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing geo fundamentals agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `geo-fundamentals` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Assuming SEO and GEO are the same -> ✅ GEO optimizes for AI crawlers and LLM ingestion, not just search engine ranking
- ❌ Using complex nested HTML for content -> ✅ AI parsers prefer flat, semantic HTML with clear heading hierarchies
- ❌ Ignoring structured data (JSON-LD) -> ✅ LLMs heavily weight structured data for citation and fact extraction

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
GEO relies heavily on **Taxonomy and Relational Mapping**. The LLM wants to know exactly _what_ entity this page represents.

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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

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
