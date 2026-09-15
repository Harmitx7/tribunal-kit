---
name: red-team-tactics
description: Use when Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - vulnerability-scanner
  - backend-security-expert
  - api-security-auditor
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Red Team & Penetration Testing Principles

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `red-team-tactics` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.
- **DO NOT activate when:** The task falls outside the `red-team-tactics` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Testing only happy-path authentication -> ✅ Red teaming must test token reuse, expired tokens, forged tokens, and privilege escalation
- ❌ Reporting vulnerabilities without proof-of-concept -> ✅ Every finding needs a reproducible PoC and severity rating (CVSS)
- ❌ Stopping after finding the first vulnerability -> ✅ Real attackers chain multiple low-severity issues; test for escalation paths

---

A red team engagement is a controlled attack.
The goal is to find what a real attacker would find — before they do.

⚠️ **These techniques are for authorized security testing only. Unauthorized use is illegal.**

---

## Engagement Scope First

Before any testing activity:

1. **Written authorization** — who authorized this engagement and in what scope?
2. **Scope definition** — which systems, IPs, domains, time windows are in scope?
3. **Rules of engagement** — what is prohibited? (production data access, social engineering of specific roles, DDoS)
4. **Emergency contact** — who do you call if you discover a critical live breach mid-engagement?
5. **Deconfliction** — does the blue team know an engagement is running, or is it blind?

No authorization = no testing.

---

## Attack Phases (Based on MITRE ATT&CK)

### 1. Reconnaissance

Passive and active information gathering before touching the target.

**Passive (no target contact):**

- DNS lookup: `nslookup`, `dig`, certificate transparency logs
- OSINT: LinkedIn for employee names/roles, GitHub for leaked configs, Shodan for exposed infrastructure

**Active (target is contacted):**

- Port scanning: `nmap -sV -sC <target>`
- Web tech detection: `whatweb`, `wappalyzer`
- Subdomain enumeration: `amass`, `subfinder`

### 2. Initial Access

How does an attacker get their first foothold?

Common vectors:

- Phishing (credential harvest or malicious attachment)
- Exposed admin interfaces with default or weak credentials
- Publicly exposed vulnerable services (`searchsploit`, `nuclei`)
- Supply chain compromise (malicious npm package, CI/CD injection)

### 3. Persistence

Maintaining access after initial compromise:

- Scheduled tasks / cron jobs
- Web shells on compromised web servers
- New user accounts with admin rights
- SSH authorized_keys injection

### 4. Lateral Movement

Moving from initial foothold to higher-value targets:

- Pass-the-hash / pass-the-ticket (Active Directory)
- SSH key reuse across hosts
- Credential reuse (if one service is compromised, others sharing the password are vulnerable)
- Internal network scanning to map new targets

### 5. Exfiltration

Getting data out without triggering alerts:

- Small, slow transfers to blend with normal traffic
- Staging data in cloud storage linked to attacker-controlled accounts
- DNS exfiltration (for heavily monitored networks)

---

## Common Vulnerability Targets

| Target                   | What to Test                                                |
| ------------------------ | ----------------------------------------------------------- |
| Web applications         | OWASP Top 10, auth bypass, IDOR, SSRF                       |
| APIs                     | Object-level authorization, mass assignment, rate limiting  |
| Authentication           | Brute force protection, token entropy, password reset flow  |
| Secrets                  | Exposed env files, git history, CI/CD environment variables |
| Third-party integrations | Webhook validation, OAuth redirect URI validation           |
| Infrastructure           | Open S3 buckets, exposed admin ports, default credentials   |

---

## Detection Evasion (for Authorized Testing)

When testing detection capabilities:

- Slow scan rates to stay under IDS thresholds
- Use legitimate user agents and headers
- Blend with normal traffic patterns
- Test from IP ranges the organization wouldn't expect

---

## Reporting Format

```markdown
# Red Team Report: [Engagement Name]

## Executive Summary

[2–3 sentences: what was tested, biggest risk found, business impact]

## Scope

[Systems tested, date range, authorization reference]

## Critical Findings

### CRIT-01: [Title]

**Risk:** Critical
**CVSS:** 9.8
**Description:** [What the vulnerability is]
**Evidence:** [Screenshot, payload, response]
**Impact:** [What an attacker could do]
**Remediation:** [Specific fix with code or config example]

## Attack Narrative

[Chronological story of the full attack path from initial access to objective]

## Remediation Priority

| Finding | Severity | Fix By |
| ------- | -------- | ------ |
```

---

## Ethical Boundaries

- Stop immediately if you discover evidence of an active breach by a real attacker — report it, don't continue testing
- Don't access, copy, or delete real user data even if you can
- Document everything — every command run, every finding noted
- Brief the client team before leaving — no surprises in the report

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Red Team Tactics Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                    | What AI Commonly Does Wrong                                                       | What Is Actually Correct                                                       |
| :------------------------------ | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Hardcoded Secret Pattern**    | Committing API keys, tokens, or private salts into source code                    | Load credentials strictly via runtime environment variables and secret stores  |
| **Prompt Injection Surface**    | Directly concatenating untrusted user input into LLM system prompts               | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation  |

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
