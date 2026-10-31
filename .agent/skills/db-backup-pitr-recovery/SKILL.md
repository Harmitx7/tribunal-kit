---
name: db-backup-pitr-recovery
description: "Use when configuring, validating, and testing database backups, Point-In-Time Recovery (PITR), WAL archiving (pgBackRest, WAL-G), and disaster recovery drills."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - backend-postgresql
  - devops-incident-responder
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "db backup pitr recovery"
  - "point in time recovery postgres"
  - "wal archiving backup"
  - "database disaster recovery drill"
  - "pgbackrest recovery"
  - "restore verification database"
---

# Database Backup, Point-In-Time Recovery (PITR) & Disaster Drill

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `db-backup-pitr-recovery` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify WAL archiving is actively operating without storage accumulation errors
2. **Runtime Context & Platform Invariants**: Check Recovery Time Objective (RTO) and Recovery Point Objective (RPO) SLAs
3. **Execution Guardrails**: Inspect backup encryption (AES-256) and multi-region storage immutability (S3 Object Lock)
4. **Validation & Type Contracts**: Confirm automated restore verification runs regularly on an isolated staging instance
5. **Observability & Proof of Execution**: Verify target timestamp syntax and timezone handling for PITR targets

## Activation Boundaries
- **Activate when:** Use when configuring, validating, and testing database backups, Point-In-Time Recovery (PITR), WAL archiving (pgBackRest, WAL-G), and disaster recovery drills.
- **DO NOT activate when:** The task falls outside the `db-backup-pitr-recovery` domain or is managed by a different dedicated specialist agent.

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

## 2026 Invariants
1. **An untested backup is not a backup**: backups must be restored and verified periodically in automated staging environments.
2. **Always use continuous WAL archiving for production databases**: nightly snapshots create up to 24 hours of data loss (unacceptable RPO).
3. **Enable data checksums (`data_checksums = on`) at cluster initialization to detect silent bit rot and disk corruption.**: Enable data checksums (`data_checksums = on`) at cluster initialization to detect silent bit rot and disk corruption.
4. **Isolate restore targets**: never restore a backup into a network location where it can accidentally connect to production clients.

## Hallucination Traps (Read First)
❌ Relying solely on `pg_dump` for multi-terabyte databases → ✅ Use physical backups with continuous WAL archiving (pgBackRest, WAL-G, or managed cloud PITR)
❌ Backing up to the same cloud region or availability zone as the primary database → ✅ Mirror backups and WAL archives to a secondary geographic region
❌ Discovering backup encryption keys were lost when disaster strikes → ✅ Store KMS/GPG backup keys in secure, multi-region secret managers
❌ Restoring to target time without verifying whether transactions before target committed → ✅ Verify `recovery_target_time` with explicit timestamps

---

### 1. PostgreSQL WAL Archiving Configuration (`postgresql.conf`)
```ini
# Enable WAL level for archival and standby replicas
wal_level = replica
archive_mode = on

# Archive command sending WAL segments to secure object storage
archive_command = 'pgbackrest --stanza=production archive-push %p'
archive_timeout = 300 # Force WAL switch every 5 minutes if idle

# Cluster corruption detection
data_checksums = on
```

### 2. Point-in-Time Recovery Specification (`recovery.signal`)
```ini
# Trigger file placed in data directory to initiate PITR
# Target exact timestamp right before a mistaken DROP TABLE occurred at 14:32:00
restore_command = 'pgbackrest --stanza=production archive-get %f "%p"'
recovery_target_time = '2026-10-27 14:30:00 UTC'
recovery_target_action = 'promote' # Promote to writable standalone primary upon target reach
```

---

## Diagnostic Procedures & Verification Commands
### Automated Recovery Verification Drill
1. Check WAL archive health and backup stanza:
   ```bash
   pgbackrest --stanza=production check
   pgbackrest --stanza=production info
   ```
2. Verify restore drill completes on isolated instance:
   ```bash
   pgbackrest --stanza=production --delta --target="2026-10-27 12:00:00" restore
   ```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?
✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?
✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?
✅ Did I verify table and column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


