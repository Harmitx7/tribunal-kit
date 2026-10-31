# Tribunal-Kit Activity Engine: Progressive Disclosure, Diagnostic Intelligence, and Output Optimization (Phase 10)

## Overview

Phase 10 establishes the **Progressive Disclosure, Diagnostic Retention, and Output Optimization Architecture** for Tribunal-Kit.

The core rule of Phase 10 is: **LESS NOISE, MORE INFORMATION**.
Rather than mechanically shortening messages or hiding information, Phase 10 structures output into three distinct information tiers, bounds diagnostic memory safely, redacts secrets prior to retention, provides evidence-backed completion summaries, and semantically truncates large payloads without corrupting machine-readable contracts.

---

## 1. Information Priority & Detail Levels

Output detail is governed by three deterministic tiers:

| Detail Level | Scope & Target | Visibility Rules |
| :--- | :--- | :--- |
| **`essential`** | Interactive chat & default CLI streams. | Displays primary state changes, user approvals, warnings, critical errors, and final outcomes. Routine intermediate progress updates and sub-tool executions are consolidated or suppressed. |
| **`expanded`** | Completion cards, review milestones, and audit inspections. | Shows task details, verification evidence (up to 4 inline items), stage pipelines, non-blocking warnings, and actionable recommendations. |
| **`diagnostic`** | Troubleshooting traces, `--verbose` flags, and debug investigation. | Full event sequences, uncollapsed stack traces, timestamp headers `[HH:MM:SS]`, operation IDs, raw parameter dumps, and memory retention metrics. |

### Priority Evaluation

Every event is assigned an immutable priority tier:

- **`CRITICAL` (P0)**: `validation_failed`, `operation_blocked`, `approval_required`, `human_approval_required`, `stall_suspected`, or any event carrying an `error` payload.
  > **Invariant**: Critical events are **NEVER** suppressed or truncated across any detail level. A failed state transition is always visibly communicated.
- **`HIGH` (P1)**: `warning_detected`, `operation_completed`, `operation_cancelled`. Always visible across all detail levels.
- **`MEDIUM` (P2)**: `operation_started`, `agent_activated`, `skill_activated`, `analysis_started`, `validation_passed`, `retry_started`, terminal progress (100%). Visible in essential and expanded modes.
- **`LOW` (P3)**: `tool_executing`, intermediate `progress_updated` (e.g. 1/8, 2/8), `evidence_collecting`. Suppressed in essential mode to eliminate chat flooding, visible in expanded and diagnostic modes.

---

## 2. Diagnostic Retention & Retrieval Engine

To keep chat and terminal streams concise without losing troubleshooting evidence, Tribunal-Kit implements an in-memory bounded diagnostic retention buffer:

```
ActivityTracker / Core Engine
   │
   ├─► DiagnosticBuffer.record(event) [Secrets scrubbed, Bounded 50 events]
   │
   └─► Renderer [Filtered by DetailLevel]
         ├─ Essential: High-level progress & critical alerts
         ├─ Expanded: Evidence badges & stage flows
         └─ Diagnostic: Full uncollapsed traces
```

### Buffer Invariants

1. **Strictly Bounded Capacity**: Default circular buffer capacity of 50 events per operation, and a maximum of 20 tracked operations. Oldest events are evicted on overflow, incrementing `truncatedCount`.
2. **Secret Scrubbing on Ingestion**: All tokens (`sk-...`, `ghp_...`, `github_pat_...`) are redacted before events enter the diagnostic buffer.
3. **Structured Failure Classification**: Errors are categorized automatically:
   - `permission_error`: File or process access denied (`EACCES`, `EPERM`).
   - `timeout_or_stall`: Network or execution stall (`ETIMEDOUT`, stall detector).
   - `test_failure`: Assertion or test runner regression.
   - `dependency_failure`: Missing package or module import error (`MODULE_NOT_FOUND`).
   - `validation_failure`: Schema or contract violation.
   - `invalid_input`: Invalid command-line argument or syntax.
   - `internal_error`: Unexpected exception.
4. **Actionable Diagnostic Reports**: `getDiagnosticReport(operationId)` produces an evidence-grounded report containing the failure category, root cause, suggested remedy, stack trace, and full event timeline.

---

## 3. Semantic Large Output Truncation & Pagination

Arbitrary character slicing corrupts JSON and multi-byte UTF-8 streams. Tribunal-Kit uses semantic truncation:

- **`boundArray(items, options)`**:
  - Preserves array items as discrete semantic units.
  - Generates explicit pagination metadata: `{ total, shown, omitted, isTruncated, notice }`.
  - Attaches human-readable retrieval notes: `"... and 35 more verified findings (retained in diagnostics: op-123)"`.
- **`boundString(text, options)`**:
  - Preserves head context (60%) and tail conclusions/errors (40%).
  - Inserts explicit character omission markers: `"[... 1,420 characters truncated for display ...]"` at line boundaries.
- **`boundObject(obj, options)`**:
  - Prevents circular reference crashes and bounds nested object depth and array keys.

---

## 4. High-Information Completion Summaries

Replaces uninformative "Execution finished" logs with high-density completion summaries:

```markdown
✔ **Completed** · Full Repository Security Scan (2.45s)
  Attempted: Static AST scan, Dependency CVE audit, Secret leak detector
  Changed: package-lock.json, .agent/case_law.json
  Succeeded:
    ✔ Zero critical vulnerabilities
  Verified:
    - OWASP Top 10 compliance
  Attention:
    ⚠ Lodash 4.17.15 deprecation warning
  Artifacts: `reports/security.json`, `reports/sbom.json`
  Diagnostics: `op-sec-101`
```

### Truthfulness Invariant

A summary **never** claims that an operation succeeded unless verified evidence was recorded. If an operation fails, the badge is strictly `✖ **Failed**`, accompanied by the blocking reason and remedy.

---

## 5. Measured Impact & Performance

Benchmarked across representative engineering workloads (`node scripts/benchmark_output_optimization.js`):

| Workload | Emitted Events | Baseline Bytes | Essential Bytes | Byte Reduction | Line Reduction | Message Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test Execution** | 17 events | 1,849 bytes (37 lines) | 842 bytes (15 lines) | **-54%** | **-59%** | **-65%** |
| **Security Audit** | 7 events | 2,349 bytes (29 lines) | 951 bytes (15 lines) | **-60%** | **-48%** | **-14%** |
| **Failure Recovery** | 6 events | 1,362 bytes (27 lines) | 1,279 bytes (25 lines) | **-6%** *(Failure details fully preserved)* | **-7%** | **-17%** |

### Throughput

- **Renders per Second**: **55,448 renders/sec** (0.018 ms per render).
- **Memory Footprint**: Strict $O(1)$ bounded memory per operation via circular ring buffers.

