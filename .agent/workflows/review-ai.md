---
description: Audit AI/LLM integration code for hallucinated model names, invented API parameters, prompt injection vulnerabilities, missing rate-limit handling, and cost explosion patterns. Uses ai-code-reviewer + logic + security.
---

# /review-ai — LLM Integration Audit

$ARGUMENTS

---

Paste any code that calls an AI API (OpenAI, Anthropic, Google Gemini, Cohere, Mistral, etc.) and this command audits it for the class of bugs that only appear in AI-integration code.

---

## Who Runs

```
ai-code-reviewer  → Hallucinated models, fake params, phantom SDK methods, prompt injection
logic-reviewer    → Impossible logic, undefined refs, hallucinated standard library calls
security-auditor  → Hardcoded API keys, secrets in env, OWASP injection patterns
```

---

## What Gets Caught

| Category | Example |
|---|---|
| Hallucinated model | `model: "gpt-5"` |
| Invented parameter | `temperature: "low"` or `max_length: 500` |
| Phantom SDK method | `openai.chat.stream()` |
| Prompt injection | `systemPrompt + userInput` concatenation |
| Missing 429 retry | No backoff on rate-limit errors |
| Token cost explosion | `Promise.all(1000 items)` with no concurrency limit |
| Hardcoded API key | `apiKey: "sk-proj-abc..."` in source |
| Missing error handling | No catch on `context_length_exceeded` |

---

## Report Format

```
━━━ AI Integration Audit ━━━━━━━━━━━━━━━━━━━━━

  ai-code-reviewer:  ❌ REJECTED
  logic-reviewer:    ✅ APPROVED
  security-auditor:  ❌ REJECTED

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ai-code-reviewer:
  ❌ Critical — Line 8
     model: "gpt-5" — model does not exist
     Fix: use "gpt-4o" or add // VERIFY: confirm current model ID

  ❌ High — Line 22
     systemPrompt += userInput — prompt injection vector
     Fix: move user content to role: "user" message, keep system prompt static

security-auditor:
  ❌ Critical — Line 4
     apiKey: "sk-proj-abc123" — hardcoded secret in source
     Fix: process.env.OPENAI_API_KEY

━━━ Verdict ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  2 REJECTED. Fix before this code reaches production.
```

---

## Usage

```
/review-ai [paste your LLM integration code]
/review-ai src/lib/openai.ts
/review-ai the embedding pipeline in services/rag.ts
```
