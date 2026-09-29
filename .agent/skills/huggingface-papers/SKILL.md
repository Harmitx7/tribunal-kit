---
name: huggingface-papers
description: "Use when Look up and read Hugging Face paper pages in markdown, and use the papers API for structured metadata such as authors, linked models/datasets/spaces, Github repo and project page. Use when the user shares a Hugging Face paper page URL, an arXiv URL or ID, or asks to summarize, explain, or analyze an AI research paper."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Hugging Face Paper Pages

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `huggingface-papers` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Look up and read Hugging Face paper pages in markdown, and use the papers API for structured metadata such as authors, linked models/datasets/spaces, Github repo and project page. Use when the user shares a Hugging Face paper page URL, an arXiv URL or ID, or asks to summarize, explain, or analyze an AI research paper.
- **DO NOT activate when:** The task falls outside the `huggingface-papers` domain or is managed by a different dedicated specialist agent.


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


Hugging Face Paper pages (hf.co/papers) is a platform built on top of arXiv (arxiv.org), specifically for research papers in the field of artificial intelligence (AI) and computer science. Hugging Face users can submit their paper at hf.co/papers/submit, which features it on the Daily Papers feed (hf.co/papers). Each day, users can upvote papers and comment on papers. Each paper page allows authors to:
- claim their paper (by clicking their name on the `authors` field). This makes the paper page appear on their Hugging Face profile.
- link the associated model checkpoints, datasets and Spaces by including the HF paper or arXiv URL in the model card, dataset card or README of the Space
- link the Github repository and/or project page URLs
- link the HF organization. This also makes the paper page appear on the Hugging Face organization page.

Whenever someone mentions a HF paper or arXiv abstract/PDF URL in a model card, dataset card or README of a Space repository, the paper will be automatically indexed. Note that not all papers indexed on Hugging Face are also submitted to daily papers. The latter is more a manner of promoting a research paper. Papers can only be submitted to daily papers up until 14 days after their publication date on arXiv.

The Hugging Face team has built an easy-to-use API to interact with paper pages. Content of the papers can be fetched as markdown, or structured metadata can be returned such as author names, linked models/datasets/spaces, linked Github repo and project page.

## When to Use

- User shares a Hugging Face paper page URL (e.g. `https://huggingface.co/papers/2602.08025`)
- User shares a Hugging Face markdown paper page URL (e.g. `https://huggingface.co/papers/2602.08025.md`)
- User shares an arXiv URL (e.g. `https://arxiv.org/abs/2602.08025` or  `https://arxiv.org/pdf/2602.08025`)
- User mentions a arXiv ID (e.g. `2602.08025`)
- User asks you to summarize, explain, or analyze an AI research paper

## Parsing the paper ID

It's recommended to parse the paper ID (arXiv ID) from whatever the user provides:

| Input | Paper ID |
| --- | --- |
| `https://huggingface.co/papers/2602.08025` | `2602.08025` |
| `https://huggingface.co/papers/2602.08025.md` | `2602.08025` |
| `https://arxiv.org/abs/2602.08025` | `2602.08025` |
| `https://arxiv.org/pdf/2602.08025` | `2602.08025` |
| `2602.08025v1` | `2602.08025v1` |
| `2602.08025` | `2602.08025` |

This allows you to provide the paper ID into any of the hub API endpoints mentioned below.

### Fetch the paper page as markdown

The content of a paper can be fetched as markdown like so:

```bash
curl -s "https://huggingface.co/papers/{PAPER_ID}.md"
```

This should return the Hugging Face paper page as markdown. This relies on the HTML version of the paper at https://arxiv.org/html/{PAPER_ID}.

There are 2 exceptions:
- Not all arXiv papers have an HTML version. If the HTML version of the paper does not exist, then the content falls back to the HTML of the Hugging Face paper page.
- If it results in a 404, it means the paper is not yet indexed on hf.co/papers. See [Error handling](#error-handling) for info.

Alternatively, you can request markdown from the normal paper page URL, like so:

```bash
curl -s -H "Accept: text/markdown" "https://huggingface.co/papers/{PAPER_ID}"
```

### Paper Pages API Endpoints

All endpoints use the base URL `https://huggingface.co`.

#### Get structured metadata

Fetch the paper metadata as JSON using the Hugging Face REST API:

```bash
curl -s "https://huggingface.co/api/papers/{PAPER_ID}"
```

This returns structured metadata that can include:

- authors (names and Hugging Face usernames, in case they have claimed the paper)
- media URLs (uploaded when submitting the paper to Daily Papers)
- summary (abstract) and AI-generated summary
- project page and GitHub repository
- organization and engagement metadata (number of upvotes)

To find models linked to the paper, use:

```bash
curl https://huggingface.co/api/models?filter=arxiv:{PAPER_ID}
```

To find datasets linked to the paper, use:

```bash
curl https://huggingface.co/api/datasets?filter=arxiv:{PAPER_ID}
```

To find spaces linked to the paper, use:

```bash
curl https://huggingface.co/api/spaces?filter=arxiv:{PAPER_ID}
```

#### Claim paper authorship

Claim authorship of a paper for a Hugging Face user:

```bash
curl "https://huggingface.co/api/settings/papers/claim" \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $HF_TOKEN" \
  --data '{
    "paperId": "{PAPER_ID}",
    "claimAuthorId": "{AUTHOR_ENTRY_ID}",
    "targetUserId": "{USER_ID}"
  }'
```

- Endpoint: `POST /api/settings/papers/claim`
- Body:
  - `paperId` (string, required): arXiv paper identifier being claimed
  - `claimAuthorId` (string): author entry on the paper being claimed, 24-char hex ID
  - `targetUserId` (string): HF user who should receive the claim, 24-char hex ID
- Response: paper authorship claim result, including the claimed paper ID

#### Get daily papers

Fetch the Daily Papers feed:

```bash
curl -s -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/daily_papers?p=0&limit=20&date=2017-07-21&sort=publishedAt"
```

- Endpoint: `GET /api/daily_papers`
- Query parameters:
  - `p` (integer): page number
  - `limit` (integer): number of results, between 1 and 100
  - `date` (string): RFC 3339 full-date, for example `2017-07-21`
  - `week` (string): ISO week, for example `2024-W03`
  - `month` (string): month value, for example `2024-01`
  - `submitter` (string): filter by submitter
  - `sort` (enum): `publishedAt` or `trending`
- Response: list of daily papers

#### List papers

List arXiv papers sorted by published date:

```bash
curl -s -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/papers?cursor={CURSOR}&limit=20"
```

- Endpoint: `GET /api/papers`
- Query parameters:
  - `cursor` (string): pagination cursor
  - `limit` (integer): number of results, between 1 and 100
- Response: list of papers

#### Search papers

Perform hybrid semantic and full-text search on papers:

```bash
curl -s -H "Authorization: Bearer $HF_TOKEN" \
  "https://huggingface.co/api/papers/search?q=vision+language&limit=20"
```

This searches over the paper title, authors, and content.

- Endpoint: `GET /api/papers/search`
- Query parameters:
  - `q` (string): search query, max length 250
  - `limit` (integer): number of results, between 1 and 120
- Response: matching papers

#### Index a paper

Insert a paper from arXiv by ID. If the paper is already indexed, only its authors can re-index it:

```bash
curl "https://huggingface.co/api/papers/index" \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $HF_TOKEN" \
  --data '{
    "arxivId": "{ARXIV_ID}"
  }'
```

- Endpoint: `POST /api/papers/index`
- Body:
  - `arxivId` (string, required): arXiv ID to index, for example `2301.00001`
- Pattern: `^\d{4}\.\d{4,5}$`
- Response: empty JSON object on success

#### Update paper links

Update the project page, GitHub repository, or submitting organization for a paper. The requester must be the paper author, the Daily Papers submitter, or a papers admin:

```bash
curl "https://huggingface.co/api/papers/{PAPER_OBJECT_ID}/links" \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $HF_TOKEN" \
  --data '{
    "projectPage": "https://example.com",
    "githubRepo": "https://github.com/org/repo",
    "organizationId": "{ORGANIZATION_ID}"
  }'
```

- Endpoint: `POST /api/papers/{paperId}/links`
- Path parameters:
  - `paperId` (string, required): Hugging Face paper object ID
- Body:
  - `githubRepo` (string, nullable): GitHub repository URL
  - `organizationId` (string, nullable): organization ID, 24-char hex ID
  - `projectPage` (string, nullable): project page URL
- Response: empty JSON object on success

## Error Handling

- **404 on `https://huggingface.co/papers/{PAPER_ID}` or `md` endpoint**: the paper is not indexed on Hugging Face paper pages yet.
- **404 on `/api/papers/{PAPER_ID}`**: the paper may not be indexed on Hugging Face paper pages yet.
- **Paper ID not found**: verify the extracted arXiv ID, including any version suffix

### Fallbacks

If the Hugging Face paper page does not contain enough detail for the user's question:

- Check the regular paper page at `https://huggingface.co/papers/{PAPER_ID}`
- Fall back to the arXiv page or PDF for the original source:
  - `https://arxiv.org/abs/{PAPER_ID}`
  - `https://arxiv.org/pdf/{PAPER_ID}`

## Notes

- No authentication is required for public paper pages.
- Write endpoints such as claim authorship, index paper, and update paper links require `Authorization: Bearer $HF_TOKEN`.
- Prefer the `.md` endpoint for reliable machine-readable output.
- Prefer `/api/papers/{PAPER_ID}` when you need structured JSON fields instead of page markdown.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Platform-Dependent Shell Commands** | Hardcoding $(cat ~/.cache/huggingface/token) or piping to jq | Use platform-agnostic token checks via env var HF_TOKEN and native JSON parsing |
| **VRAM OOM Crash** | Loading 70B model weights on a consumer 16GB GPU without quantization | Calculate parameter bounds (fp16 = VRAM/2, Q4 = VRAM*2) and load with bitsandbytes/GGUF |
| **Blocking Batch Generation** | Generating large batches synchronously without streaming or yield | Use TextIteratorStreamer or asynchronous generate workers to prevent request timeouts |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `ai-code-reviewer` · `python-pro` · `performance-optimizer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are model architectures and weights verified to fit within target hardware VRAM budgets?
✅ Are pipeline requests guarded with bounded timeouts and retry backoffs?
✅ Are dataset loading scripts operating in streaming mode to prevent out-of-memory errors?
✅ Are API tokens and cache paths handled portably without assuming UNIX shell environments?
✅ Are tokenizers and generation parameters (max_new_tokens, temperature) strictly bounded?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
