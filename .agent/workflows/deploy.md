---
description: Deployment command for production releases. Pre-flight checks and deployment execution.
---

# /deploy — Production Release

$ARGUMENTS

---

This command runs a structured, gate-enforced deployment sequence. Nothing reaches production without passing all three gates.

---

## The Non-Negotiable Rule

> **The Human Gate is never skipped.**
> Even if every automated gate passes, a human sees the deployment summary and explicitly approves before anything executes.

---

## Three-Gate Sequence

### Gate 1 — Security Sweep

`security-auditor` scans all files in the deployment diff:

```
Expected clean state:
  ✅ No secrets or credentials in any changed file
  ✅ No unparameterized query added
  ✅ No new CVE-affected dependency introduced
  ✅ No debug endpoints left active
```

**If any Critical or High issue is found → deployment is blocked.**
The issue must be fixed and re-scanned before proceeding.

### Gate 2 — Tribunal Verification

`/tribunal-full` runs on all changed code:

```
  ✅ logic-reviewer: APPROVED
  ✅ security-auditor: APPROVED
  ✅ dependency-reviewer: APPROVED
  ✅ type-safety-reviewer: APPROVED
```

**Any REJECTED verdict → deployment blocked.** Fix and re-review.

### Gate 3 — Human Approval

A deployment summary is shown before execution:

```
━━━ Release Summary ━━━━━━━━━
Target:        [staging | production]
Files changed: [N]
Security gate: ✅ Passed
Tribunal gate: ✅ All APPROVED
Tests:         ✅ N passed

Rollback to:   [previous tag / commit SHA]
Rollback time: [estimate]
DB-safe:       [Yes | No — explain]

Proceed with deployment? (Y to execute | N to cancel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rollback is a Prerequisite

Before any deployment executes, the rollback plan must be established:

```
What does this roll back to?          → [tag or SHA]
How long will rollback take?          → [estimate]
Is the DB migration reversible?       → Yes | No
Who gets notified on rollback?        → [name or channel]
```

No rollback plan = no deployment.

---

## Hallucination Guard

- No invented CLI flags — `# VERIFY: check docs for this flag` on any uncertain command
- All secrets via environment variables — never hardcoded in deploy configs
- All images tagged with a specific version — `latest` is forbidden in production configs

---

## Usage

```
/deploy to staging
/deploy to production after staging validation
```
