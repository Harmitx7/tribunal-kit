---
name: ai-app-hardening
description: OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security..
- **DO NOT activate when:** The task falls strictly outside ai-app-hardening domain or belongs to a different dedicated specialist.

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

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
