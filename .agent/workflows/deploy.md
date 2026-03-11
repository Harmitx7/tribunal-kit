---
description: Deployment command for production releases. Pre-flight checks and deployment execution.
---

# /deploy — Production Release

$ARGUMENTS

---

This command runs a structured, gate-enforced deployment sequence. **Nothing reaches production without passing all three gates.**

---

## The Non-Negotiable Rule

> **The Human Gate is never skipped.**
> Even if every automated gate passes, a human sees the deployment summary and explicitly approves before anything executes.

---

## Before Running /deploy

Confirm the following checklist manually:

```
□ /audit passed with no CRITICAL or HIGH issues
□ All tests pass on the current commit
□ CHANGELOG.md is updated
□ Environment variables are confirmed in the target environment
□ Database migrations (if any) have a rollback plan
□ Rollback target (tag or SHA) is documented
```

---

## Three-Gate Sequence

### Gate 1 — Security Sweep

`security-auditor` scans all files in the deployment diff:

```
Expected clean state:
  ✅ No secrets or credentials in any changed file
  ✅ No unparameterized query introduced
  ✅ No new CVE-affected dependency
  ✅ No debug endpoints left active
  ✅ No `console.log` with sensitive data
```

```bash
// turbo
python .agent/scripts/security_scan.py .
```

**If any CRITICAL or HIGH issue → deployment is blocked.** Fix and re-scan before proceeding.

### Gate 2 — Tribunal Verification

Run `/tribunal-full` on all changed code:

```bash
# Run full check suite
// turbo
python .agent/scripts/verify_all.py
```

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
━━━ Release Summary ━━━━━━━━━━━━━━━━━━━━━━━━
Target:        [staging | production]
Commit:        [SHA — first 8 chars]
Files changed: [N] — view diff?
Security gate: ✅ Passed (no CRITICAL/HIGH issues)
Tribunal gate: ✅ All reviewers APPROVED
Tests:         ✅ [N] passed, [0] failed

Rollback to:   [previous tag or commit SHA]
Rollback time: [estimate in minutes]
DB migration:  [None | ⚠️ IRREVERSIBLE | ✅ Reversible]
DB backup:     [Confirmed | Not confirmed — deployment blocked]

Proceed with deployment? Y = execute | N = cancel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rollback is a Prerequisite

Before any deployment executes, a rollback plan must exist:

```
What does this roll back to?     → [tag or SHA]
How long will rollback take?     → [estimate]
Is the DB migration reversible?  → Yes | No — if No, is backup confirmed?
Who gets notified on rollback?   → [name or Slack channel]
```

**No rollback plan = no deployment.** This is not optional.

---

## Environment-Specific Rules

| Target | Extra Requirements |
|---|---|
| Staging | Rollback optional, tests required, git tag optional |
| Production | All requirements above + git tag required |
| Hotfix | Security gate required, Human Gate required |

---

## Hallucination Guard

- **No invented CLI flags** — `# VERIFY: check docs for this flag` on any uncertain command
- **All secrets via environment variables** — never hardcoded in deploy configs or scripts
- **All images tagged with a specific version** — `latest` is forbidden in production configs
- **Never generate deployment steps without reading the existing deploy scripts** — read before writing

---

## Cross-Workflow Navigation

| Before /deploy... | Go to |
|---|---|
| Security audit not run yet | `/audit` first |
| Tests broken | `/debug` to fix, then `/test` to verify |
| Changelog outdated | `/changelog` to update first |
| DB migration needed | `/migrate` with rollback plan documented |

---

## Usage

```
/deploy to staging
/deploy to production after staging validation
/deploy hotfix for the auth regression
```
