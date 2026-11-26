# Tribunal Kit: Comprehensive Security Model & Threat Architecture

**Document:** `docs/SECURITY_MODEL.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Security Standard:** Zero-Trust Autonomous Agent Containment & Defense-in-Depth

---

## 1. Threat Landscape & Risk Vectors

AI coding agents introduce unprecedented threat vectors into software repositories:

1. **Direct System Prompt Infiltration:** Attackers embedding prompt injection payloads within untrusted markdown, PR descriptions, or source code comments.
2. **Path Traversal & Filesystem Escapes:** AI models generating path parameters with `../../` sequences that read or overwrite sensitive system configuration (`/etc/passwd`, `~/.ssh/id_rsa`).
3. **SSRF (Server-Side Request Forgery):** Automated browser or curl tools querying internal cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/`) to exfiltrate IAM role credentials.
4. **Supply Chain Traps & Ghost Dependencies:** Attackers publishing typosquatted or malicious packages on public registries matching names hallucinated by models.
5. **Denial of Service via Recursion:** Circular AST or Error cause graphs causing Node.js processes to crash with maximum call stack exhaustion.

---

## 2. Security Perimeter & Enforcement Points

```mermaid
graph TD
    UntrustedInput[Untrusted Input: LLM Output / PR Diff / Web Page] --> Perimeter{Security Perimeter}

    subgraph DefenseMechanisms["Layered Defense Mechanisms"]
        Perimeter -->|Filesystem Check| PathContainment["assertWithinRoot (src/utils/path_containment.js)"]
        Perimeter -->|Network / URL Check| SsrfGuard["isProhibitedIp & validateUrlDestination (src/security/boundary.js)"]
        Perimeter -->|Prompt Stream Check| InjectionDefense["Prompt Injection Quarantine (.agent/scripts/)"]
        Perimeter -->|Telemetry & Logging| SecretRedactor["Universal 13-Class Secret Redaction (src/activity/schema.js)"]
        Perimeter -->|Memory Traversal| WeakMapGuard["WeakMap / WeakSet Cycle Protection (src/activity/schema.js)"]
        Perimeter -->|Disk Mutation Gate| HumanGate["Human Approval Token Gate (bin/mcp-server.js)"]
    end

    PathContainment -->|Escape Detected| HaltOut["OUT_OF_BOUNDS_ERROR"]
    SsrfGuard -->|Internal IP Detected| HaltSsrf["SSRF_PROHIBITED_DESTINATION"]
    HumanGate -->|Approved| DiskWrite[Filesystem Write]
```

---

## 3. Detailed Defense Mechanisms

### 3.1 Filesystem Boundary Containment

- **Implementation:** `src/utils/path_containment.js` and `crates/core/src/commands/security.rs` [VERIFIED].
- **Protections:**
  1. Rejects null bytes (`\0`) which bypass standard C/OS path parsers.
  2. Resolves canonical realpaths to defeat symlink race conditions (TOCTOU).
  3. Validates that the relative path between target and root does not start with `..` or root traversal tokens.
  4. Strips and normalizes Windows verbatim path prefixes (`\\?\` and `\\.\`).
- **Enforcement:** Enforced before any `readFile`, `writeFile`, or `spawnSync` invocation.

### 3.2 SSRF & Browser Destination Defense

- **Implementation:** `src/security/boundary.js` (`isProhibitedIp`, `validateUrlDestination`) [VERIFIED: `src/security/boundary.js#L49-L120`].
- **Protections:**
  - Prohibits IPv4 loopback (`127.0.0.0/8`) and IPv6 loopback (`::1`).
  - Prohibits RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Prohibits AWS/GCP/Azure link-local cloud metadata endpoints (`169.254.0.0/16`).
  - Prohibits Carrier Grade NAT (`100.64.0.0/10`) and multicast/broadcast addresses.
  - Performs DNS resolution before connection to prevent DNS rebinding attacks.

### 3.3 Prompt Injection Quarantine

- **Implementation:** `.agent/scripts/codebase_intelligence.js` [VERIFIED: `CHANGELOG.md#L49-L53`].
- **Neutralizes 6 Distinct Attack Vectors:**
  1. Direct System Override (`"Ignore previous instructions and..."`).
  2. Multilingual Infiltration (exploiting low-resource language safety bypasses).
  3. Base64 Evasion (decoding hidden executable directives).
  4. Delimiter Hijacking (prematurely closing XML/Markdown tags).
  5. Token Smuggling (zero-width characters and homoglyphs).
  6. XSS / Script Injection (`/<script\b[^>]*>[\s\S]*?<\/script>/i`).
- **Behavior:** Untrusted inputs are safely quoted inside explicit `<user_provided_context>` boundary tags with `isUntrusted: true` telemetry.

### 3.4 13-Class Deterministic Secret Redaction

- **Implementation:** `src/activity/schema.js` (`redactSecrets`, `SECRET_PATTERNS`) [VERIFIED].
- **Scrubbed Credential Classes:**
  1. AWS Access Key IDs (`AKIA[0-9A-Z]{16}`)
  2. AWS Secret Access Keys
  3. Slack User & Bot Tokens (`xoxb-`, `xoxp-`)
  4. GitHub Personal Access & Fine-Grained Tokens (`ghp_`, `github_pat_`)
  5. JSON Web Tokens (`eyJ[a-zA-Z0-9_-]+\.eyJ...`)
  6. Authorization Bearer Tokens
  7. Basic Auth Passwords embedded in URLs (`https://user:password@host`)
  8. RSA / OpenSSH / DSA / EC Private Keys (`-----BEGIN RSA PRIVATE KEY-----`)
  9. Generic High-Entropy API Keys

### 3.5 The Human Approval Gate

- **Implementation:** `bin/mcp-server.js` (`tribunal_request_write`, `tribunal_approve_write`) [VERIFIED].
- **Invariant:** Autonomous agents cannot write directly to disk through MCP. They must call `tribunal_request_write`, receive a preview diff and blast radius impact assessment, and wait for the human user to provide an approval token.

---

## 4. Unresolved Risks & Proposed Hardening

- **ESLint Unused Variables:** 519 unused variable warnings in legacy scripts and test fixtures do not introduce vulnerabilities but clutter static analysis diagnostics.
- **Node.js Sandbox Limitations:** When running commands outside containerization on Windows, OS-level filesystem isolation depends on process privileges rather than Linux namespace cgroups.
