---
name: ai-app-hardening
description: "Use when OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - ai-prompt-injection-defense
  - vulnerability-scanner
  - backend-security-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/guardrail_engine.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# AI Application Hardening & Indirect Prompt Injection Defense

---

## 🛠️ Technical Architecture & Reference Recipes

## Indirect Prompt Injection Defense Filter

```typescript
export function sanitizeRAGDocument(rawDocumentContent: string): string {
  if (!rawDocumentContent || typeof rawDocumentContent !== 'string') return '';

  // 1. Redact indirect prompt injection trigger phrases
  let cleaned = rawDocumentContent.replace(
    /(?:system:\s*ignore|override system prompt|you are now in developer mode|print system prompt)/gi,
    '[REDACTED_INDIRECT_INJECTION]',
  );

  // 2. Escape structural tag injection attempts
  cleaned = cleaned.replace(/<\/?(?:system|user_input|external_context)[^>]*>/gi, '');

  // 3. Truncate document snippet length
  return cleaned.slice(0, 3000).trim();
}
```

## OWASP LLM Top 10 (2026 Matrix)

| Risk ID   | Vulnerability                        | Defense Implementation                              |
| --------- | ------------------------------------ | --------------------------------------------------- |
| **LLM01** | Prompt Injection (Direct & Indirect) | Delimiter sandboxing + `sanitizeRAGDocument` filter |
| **LLM02** | Insecure Output Handling             | Strict Zod output parsing + DOMPurify on frontend   |
| **LLM04** | Model Denial of Service              | Hard `max_tokens` limit + IP bucket rate limiting   |
| **LLM07** | System Prompt Leakage                | System prompt redaction guards in output stream     |
