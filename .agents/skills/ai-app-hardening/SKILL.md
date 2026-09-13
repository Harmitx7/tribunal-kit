---
name: ai-app-hardening
description: Use when OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security.
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `ai-app-hardening` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when OWASP Top 10 for LLMs (2026), prompt injection defense, model output sanitization, indirect injection defense, and automated SBOM dependency security.
- **DO NOT activate when:** The task falls outside the `ai-app-hardening` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

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

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hardcoded Secret Pattern** | Committing API keys, tokens, or private salts into source code | Load credentials strictly via runtime environment variables and secret stores |
| **Prompt Injection Surface** | Directly concatenating untrusted user input into LLM system prompts | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are user inputs sanitized and treated as untrusted at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive customer data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
