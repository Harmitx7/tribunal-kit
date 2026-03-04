---
description: Performance-specific Tribunal. Runs Logic + Performance reviewers. Use for optimization, profiling, and bottleneck analysis.
---

# /tribunal-performance — Performance Code Tribunal

$ARGUMENTS

---

This command activates the **Performance Tribunal** — a focused panel targeting algorithmic complexity, memory bloat, blocking I/O, and throughput bottlenecks before they hit production.

Use this instead of `/tribunal-full` when you specifically need a performance lens. It avoids noise from unrelated reviewers.

---

## Reviewers Activated

| Reviewer | What It Catches |
|---|---|
| `logic-reviewer` | Hallucinated methods, impossible logic, undefined refs (always active) |
| `performance-reviewer` | O(n²) complexity, blocking I/O, memory floods, missing pagination, no streaming |

---

## When to Use This

```
✅ Data-processing loops (sorting, filtering, transforming large arrays)
✅ Database query patterns (N+1, unbounded SELECT *, missing indexes)
✅ Async concurrency (Promise.all floods, uncontrolled batch sizes)
✅ LLM streaming vs. blocking response patterns
✅ React renders (missing useMemo/useCallback, expensive re-renders)
✅ Any function you expect to handle 10x more data than today

❌ Security vulnerabilities → use /tribunal-backend or /tribunal-full
❌ Mobile-specific issues → use /tribunal-mobile
❌ SQL injection / parameterization → use /tribunal-database
```

---

## Pipeline

```
Your code
    │
    ▼
logic-reviewer       → Hallucinated methods, undefined refs
    │
    ▼
performance-reviewer → O(n²) complexity, Array.includes() in loops,
                       blocking fs.readFileSync() in async contexts,
                       unbounded SELECT *, uncontrolled Promise.all floods,
                       missing useMemo() on expensive derivations,
                       no streaming on LLM responses
    │
    ▼
Verdict Summary
```

---

## Output Format

```
━━━ Tribunal: Performance ━━━━━━━━━━━━━━━━━

Active reviewers: logic · performance

[Your code under review]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:       ✅ APPROVED
performance-reviewer: ❌ REJECTED
                      - Line 18: O(n²) — Array.includes() inside for loop.
                        Convert `otherList` to a Set before the loop (O(1) lookup).
                      - Line 34: fs.readFileSync() inside async handler.
                        Replace with: await fs.promises.readFile(...)

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━

Address rejections?  Y = fix and re-review | N = accept risk | R = revise manually
```

---

## Performance-Specific Anti-Hallucination Rules

```
❌ Never claim a fix is "faster" without citing the algorithmic reason (O-notation or benchmark)
❌ Never recommend Promise.all for unbounded arrays — always suggest chunking
❌ Never mark O(n²) as acceptable without explicit justification tied to data size
❌ Never suggest caching without identifying the invalidation strategy
❌ Never recommend premature micro-optimizations over algorithmic improvements
```

---

## Severity Levels

| Level | Meaning |
|---|---|
| ❌ REJECTED | Will degrade under production load — must be fixed |
| ⚠️ WARNING | Acceptable now, will become a problem at scale — flag for future sprint |
| ✅ APPROVED | No performance concerns detected at this code level |

---

## Usage

```
/tribunal-performance the data processing loop in userService.ts
/tribunal-performance the search filter function that runs on every keystroke
/tribunal-performance the batch API handler that fetches user data
```
