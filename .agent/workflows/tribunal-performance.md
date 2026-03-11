---
description: Performance-specific Tribunal. Runs Logic + Performance reviewers. Use for optimization, profiling, and bottleneck analysis.
---

# /tribunal-performance — Performance Code Tribunal

$ARGUMENTS

---

This command activates the **Performance Tribunal** — a focused panel targeting algorithmic complexity, memory bloat, blocking I/O, and throughput bottlenecks before they hit production.

Use this instead of `/tribunal-full` when you specifically need a performance lens. It avoids noise from unrelated reviewers.

---

## When to Use This vs Other Tribunals

| Code type | Right tribunal |
|---|---|
| Performance-critical loops, async patterns | `/tribunal-performance` ← you are here |
| Security vulnerabilities | `/tribunal-backend` or `/tribunal-full` |
| Mobile-specific performance | `/tribunal-mobile` (includes mobile perf issues) |
| SQL N+1 or unbounded queries | `/tribunal-database` |
| Cross-domain or pre-merge | `/tribunal-full` |

---

## Active Reviewers

| Reviewer | What It Catches |
|---|---|
| `logic-reviewer` | Hallucinated methods, impossible logic, undefined refs |
| `performance-reviewer` | O(n²) complexity, blocking I/O, memory floods, missing pagination, no streaming |

---

## What Gets Flagged — Real Examples

| Pattern | Example | Severity |
|---|---|---|
| O(n²) complexity | `Array.includes()` inside a `for` loop | ❌ REJECTED |
| Blocking I/O in async context | `fs.readFileSync()` inside an `async` handler | ❌ REJECTED |
| Uncontrolled concurrency | `Promise.all(items.map(item => fetchItem(item)))` where `items.length` is unbounded | ❌ REJECTED |
| Memory flood | Loading entire table into memory: `const all = await db.findMany()` | ❌ REJECTED |
| Expensive re-renders | Derived value recomputed on every render without `useMemo` | ⚠️ WARNING |
| No streaming on large responses | Returning full LLM response, not streaming | ⚠️ WARNING |
| Sort on every render | `items.sort(fn)` inside JSX (mutates original array) | ❌ REJECTED |
| Regex in hot path | Complex regex compiled on every call (not pre-compiled) | ⚠️ WARNING |

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
                       no streaming on LLM responses,
                       missing pagination on large datasets
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

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

performance-reviewer:
  ❌ HIGH — Line 18
     O(n²): Array.includes() inside for loop — O(n) lookup inside O(n) loop
     Fix: Convert `otherList` to a Set before the loop for O(1) lookup

  ❌ HIGH — Line 34
     Blocking I/O: fs.readFileSync() inside async handler blocks the event loop
     Fix: await fs.promises.readFile(path, 'utf-8')

  ⚠️ MEDIUM — Line 52
     No streaming: LLM response buffered before returning to client
     Fix: Pipe the stream directly: res.pipe(openaiStream)

━━━ Verdict: REJECTED ━━━━━━━━━━━━━━━━━━━━
```

---

## Severity Levels

| Level | Meaning |
|---|---|
| `❌ REJECTED (HIGH)` | Will cause visible performance degradation under load — fix before merge |
| `❌ REJECTED (MEDIUM)` | Will become a bottleneck at scale — address before deploy |
| `⚠️ WARNING` | Acceptable now, will degrade at 10x scale — flag for upcoming sprint |
| `✅ APPROVED` | No performance concerns detected at this code level |

---

## Performance-Specific Anti-Hallucination Rules

```
❌ Never claim a fix is "faster" without citing the algorithmic reason (O-notation or benchmark)
❌ Never recommend Promise.all for unbounded arrays — always suggest chunking with p-limit or similar
❌ Never mark O(n²) as acceptable without explicit justification tied to data size constraints
❌ Never suggest caching without identifying the invalidation strategy
❌ Never recommend premature micro-optimizations over algorithmic improvements
❌ No invented profiling tools — only documented options for the target runtime
```

---

## Cross-Workflow Navigation

| Finding type | Next step |
|---|---|
| O(n²) pattern found | `/refactor` to extract and fix the algorithm |
| Memory bloat in data loading | `/enhance` to add pagination or streaming |
| Promise.all flood | `/enhance` to add concurrency control with `p-limit` |
| Regex in hot path | `/enhance` to pre-compile and cache |
| All approved | Human Gate to write to disk |

---

## Usage

```
/tribunal-performance the data processing loop in userService.ts
/tribunal-performance the search filter function that runs on every keystroke
/tribunal-performance the batch API handler that fetches user data
/tribunal-performance the LLM response handler
```
