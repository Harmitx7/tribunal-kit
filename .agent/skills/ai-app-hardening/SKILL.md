---
name: ai-app-hardening
description: OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/security_scan.js
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/guardrail_engine.js
skills:
  - ai-prompt-injection-defense
  - vulnerability-scanner
  - backend-security-expert
---

# AI Application Hardening & Indirect Prompt Injection Defense

## Mandatory Pre-Flight Context Inspection

Before deploying AI features:
1. Indirect Prompt Injection Defense → Sanitize third-party content (scraped URLs, PDF imports, RAG docs) before feeding to LLMs
2. XML Delimiter Sandboxing → Enclose user/external inputs inside `<external_context>` and instruct model to ignore instructions within
3. Insecure Output Handling (OWASP LLM02) → Escape HTML/script tags on all rendered model outputs

## Indirect Prompt Injection Defense Filter

```typescript
export function sanitizeRAGDocument(rawDocumentContent: string): string {
  if (!rawDocumentContent || typeof rawDocumentContent !== 'string') return '';
  
  // 1. Redact indirect prompt injection trigger phrases
  let cleaned = rawDocumentContent.replace(
    /(?:system:\s*ignore|override system prompt|you are now in developer mode|print system prompt)/gi,
    '[REDACTED_INDIRECT_INJECTION]'
  );
  
  // 2. Escape structural tag injection attempts
  cleaned = cleaned.replace(/<\/?(?:system|user_input|external_context)[^>]*>/gi, '');

  // 3. Truncate document snippet length
  return cleaned.slice(0, 3000).trim();
}
```

## OWASP LLM Top 10 (2026 Matrix)

| Risk ID | Vulnerability | Defense Implementation |
|---|---|---|
| **LLM01** | Prompt Injection (Direct & Indirect) | Delimiter sandboxing + `sanitizeRAGDocument` filter |
| **LLM02** | Insecure Output Handling | Strict Zod output parsing + DOMPurify on frontend |
| **LLM04** | Model Denial of Service | Hard `max_tokens` limit + IP bucket rate limiting |
| **LLM07** | System Prompt Leakage | System prompt redaction guards in output stream |

## 🛑 Verification-Before-Completion (VBC) Protocol

- Run prompt injection test suite against external RAG context inputs.
- Audit tool calls for privilege escalation risks.
