---
name: red-team-tactics
description: Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Red Team & Penetration Testing Principles

> A red team engagement is a controlled attack.
> The goal is to find what a real attacker would find — before they do.

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

| Target | What to Test |
|---|---|
| Web applications | OWASP Top 10, auth bypass, IDOR, SSRF |
| APIs | Object-level authorization, mass assignment, rate limiting |
| Authentication | Brute force protection, token entropy, password reset flow |
| Secrets | Exposed env files, git history, CI/CD environment variables |
| Third-party integrations | Webhook validation, OAuth redirect URI validation |
| Infrastructure | Open S3 buckets, exposed admin ports, default credentials |

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
|---|---|---|
```

---

## Ethical Boundaries

- Stop immediately if you discover evidence of an active breach by a real attacker — report it, don't continue testing
- Don't access, copy, or delete real user data even if you can
- Document everything — every command run, every finding noted
- Brief the client team before leaving — no surprises in the report
