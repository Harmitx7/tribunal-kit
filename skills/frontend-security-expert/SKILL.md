---
name: frontend-security-expert
description: "Use when Frontend security auditing for modern meta-frameworks. Focuses on React/Next.js UI paradigms, hydration poisoning, third-party script supply chain, local storage security, and XSS prevention in modern environments."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - backend-security-expert
  - api-security-auditor
  - vulnerability-scanner
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Frontend Security Expert — Modern Meta-Frameworks

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Focusing on generic OWASP top 10 (SQLi, IDOR) → ✅ This is the _frontend_ skill. Focus strictly on client-side boundaries, SSR hydration, and DOM.
- ❌ Treating React `useEffect` data fetching as secure → ✅ Data fetched client-side can be intercepted or manipulated.
- ❌ Recommending LocalStorage for JWTs → ✅ JWTs must go in HttpOnly, Secure, SameSite cookies.
- ❌ Assuming Next.js SSR is immune to XSS → ✅ Hydration mismatch or dangerouslySetInnerHTML can inject payloads.

---

## 1. React & Next.js Specific Vulnerabilities

Modern frameworks handle basic XSS by escaping text, but specific APIs bypass this.

- **`dangerouslySetInnerHTML`**: Never use this with unsanitized user input. If required, mandate the use of DOMPurify.
- **Hydration Poisoning**: Ensure that data rendered on the server matches the client to prevent malicious hydration states.
- **`javascript:` URIs**: React does not automatically prevent `javascript:` URIs in `href` tags. Audit all dynamic links.

## 2. Token & State Storage (Web Storage API)

- **Local/Session Storage**: Do not store sensitive PII, Auth Tokens (JWTs), or API keys here. They are accessible via any XSS attack.
- **Cookies**: Use `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax`) for all authentication cookies.
- **In-Memory State**: Store temporary sensitive data in React state/Zustand, recognizing it clears on refresh.

## 3. Third-Party Supply Chain

- **External Scripts**: Any `<script src="...">` has full access to the DOM and global window.
- **Subresource Integrity (SRI)**: Ensure all CDN-loaded scripts use the `integrity` attribute.
- **Next.js `<Script>` Component**: Use appropriate strategies (`beforeInteractive`, `afterInteractive`) and audit what is loaded.

## 4. Cross-Origin & PostMessage

- **`postMessage`**: Never use `targetOrigin: '*'` when sending messages. Always validate `event.origin` when receiving messages.
- **Iframes**: Use the `sandbox` attribute for any user-generated iframes to restrict script execution and top-level navigation.
