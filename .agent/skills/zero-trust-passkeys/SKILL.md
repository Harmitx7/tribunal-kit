---
name: zero-trust-passkeys
description: "Use when Modern passwordless authentication using WebAuthn, FIDO2 biometric passkeys, SimpleWebAuthn v13+, Conditional UI (Passkey Autofill), and Zero-Trust security."
version: 5.0.0
last-updated: 2026-09-13
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
