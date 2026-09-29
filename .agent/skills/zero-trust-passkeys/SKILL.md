---
name: zero-trust-passkeys
description: "Use when auditing, pen-testing, hardening, and verifying code against zero trust passkeys vulnerabilities, injection vectors, and auth flaws."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - authentication-best-practices
  - backend-security-expert
  - frontend-security-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Zero-Trust Passkeys & WebAuthn (SimpleWebAuthn v13+)

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `zero-trust-passkeys` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when auditing, pen-testing, hardening, and verifying code against zero trust passkeys vulnerabilities, injection vectors, and auth flaws.
- **DO NOT activate when:** The task falls outside the `zero-trust-passkeys` domain or is managed by a different dedicated specialist agent.


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

## Client-Side Passkey Autofill Pattern (SimpleWebAuthn v13 Browser)

```typescript
import { startAuthentication, isConditionalMediationAvailable } from '@simplewebauthn/browser';

export async function initConditionalPasskeyAutofill(abortSignal: AbortSignal) {
  const isAvailable = await isConditionalMediationAvailable();
  if (!isAvailable) return;

  try {
    // 1. Fetch options from server
    const res = await fetch('/api/auth/generate-authentication-options');
    const options = await res.json();

    // 2. Trigger browser native autofill dropdown
    const credential = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill: true,
    });

    // 3. Send response to server for verification
    await fetch('/api/auth/verify-authentication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    });
  } catch (err: any) {
    if (err.name !== 'AbortError') console.error('Passkey autofill error:', err);
  }
}
```

## Server Verification Pattern (SimpleWebAuthn v13 Server)

```typescript
import {
  verifyAuthenticationResponse,
  generateAuthenticationOptions,
} from '@simplewebauthn/server';

export async function verifyPasskeyAuth(
  body: any,
  expectedChallenge: string,
  userPublicKey: Uint8Array,
) {
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: process.env.APP_ORIGIN!,
    expectedRPID: process.env.RP_ID!,
    credential: {
      id: body.id,
      publicKey: userPublicKey,
      counter: body.counter || 0,
    },
  });

  return verification.verified;
}
```

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
| **Hardcoded Secret Pattern** | Committing API keys, tokens, or private salts into source code | Load credentials strictly via runtime environment variables and secret stores |
| **Prompt Injection Surface** | Directly concatenating untrusted user input into LLM system prompts | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are user inputs sanitized and treated as untrusted data at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
