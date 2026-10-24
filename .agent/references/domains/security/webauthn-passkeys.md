# WebAuthn & FIDO2 Passkey Engineering Reference

> **Authority**: W3C WebAuthn Level 3 (`https://www.w3.org/TR/webauthn-3/`) & FIDO Alliance  
> **Applicable Domains**: Security, Authentication, Zero-Trust Architecture  
> **Status**: Verified Specification Reference  

---

## 1. Protocol Architecture & Invariants

WebAuthn establishes asymmetric public-key authentication between a Client (Browser/OS Authenticator) and a Relying Party (Server).

### Invariants:
1. **Relying Party ID (RP ID)**: Must match the current domain or a registrable suffix (e.g. `auth.example.com` or `example.com`). It must never include schemes (`https://`) or ports (`:443`).
2. **Challenge Entropy**: Cryptographically random byte buffer (minimum 32 bytes) generated server-side per ceremony, stored in transient session/cache with a tight TTL (maximum 120 seconds).
3. **Origin Verification**: The server must verify that the `clientDataJSON.origin` matches the exact application URL (including scheme and port, e.g. `https://example.com`).

---

## 2. Ceremony Sequences

### Registration Ceremony (Attestation)

```
Client                              Relying Party (Server)
  │                                           │
  │── 1. POST /auth/passkey/register/start ──>│
  │                                           │ Generate 32-byte challenge
  │<─ 2. PublicKeyCredentialCreationOptions ──│ Store challenge in session
  │                                           │
  │ (User completes biometric / PIN prompt)   │
  │                                           │
  │── 3. POST /auth/passkey/register/finish ─>│
  │      (attestationResponse)                │ 1. Validate challenge
  │                                           │ 2. Validate origin & RP ID
  │                                           │ 3. Extract public key & credential ID
  │<─ 4. 200 OK (Registration Confirmed) ─────│ 4. Persist (credentialID, publicKey, counter: 0)
```

### Authentication Ceremony (Assertion)

```
Client                              Relying Party (Server)
  │                                           │
  │── 1. POST /auth/passkey/login/start ─────>│
  │                                           │ Generate 32-byte challenge
  │<─ 2. PublicKeyCredentialRequestOptions ───│ Store challenge in session
  │                                           │
  │ (User verifies identity via TouchID/PIN)  │
  │                                           │
  │── 3. POST /auth/passkey/login/finish ────>│
  │      (assertionResponse)                  │ 1. Validate challenge & origin
  │                                           │ 2. Fetch stored public key by credentialID
  │                                           │ 3. Verify signature over (authenticatorData + clientDataHash)
  │                                           │ 4. Verify signCount > storedSignCount (clone detection)
  │<─ 4. 200 OK (Session Issued) ─────────────│ 5. Update stored signCount
```

---

## 3. Critical Verification Guardrails & Anti-Patterns

- ❌ **Client-Side Verification**: Never accept unverified attestation or assertion payloads from client code.
- ❌ **Replay Attacks**: Once a challenge is evaluated, immediately delete it from the server cache to prevent re-use.
- ❌ **Sign Counter Bypass**: If the received `signCount` is lower than or equal to the stored `signCount` (and neither is `0`), an authenticator clone may exist. Immediately reject authentication and flag account.
- ✅ **User Verification Requirement**: Set `userVerification: "required"` or `"preferred"` to enforce biometric or PIN verification.
