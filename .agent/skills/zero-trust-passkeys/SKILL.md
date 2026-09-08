---
name: zero-trust-passkeys
description: Modern passwordless authentication using WebAuthn, FIDO2 biometric passkeys, SimpleWebAuthn v13+, Conditional UI (Passkey Autofill), and Zero-Trust security.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
script: .agent/scripts/security_scan.js
scripts-binding:
  - .agent/scripts/security_scan.js
skills:
  - authentication-best-practices
  - backend-security-expert
  - frontend-security-expert
---

# Zero-Trust Passkeys & WebAuthn (SimpleWebAuthn v13+)

## Mandatory Pre-Flight Context Inspection

Before implementing auth flows:

1. Conditional UI (Passkey Autofill) → Use `useBrowserAutofill: true` and `autocomplete="username webauthn"` for seamless form autofill
2. Feature Detection & Abort Signals → Check `isConditionalMediationAvailable()` and manage cancellation via `AbortController`
3. Discoverable Credentials → Ensure `userVerification` and resident key options are enabled on registration


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Modern passwordless authentication using WebAuthn, FIDO2 biometric passkeys, SimpleWebAuthn v13+, Conditional UI (Passkey Autofill), and Zero-Trust security..
- **DO NOT activate when:** The task falls strictly outside zero-trust-passkeys domain or belongs to a different dedicated specialist.

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
