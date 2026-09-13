---
name: devops-incident-responder
description: Use when Production incident response mastery. MTTR (Mean Time to Recovery) reduction, blameless post-mortems, rapid triaging, halting systemic cascading failures, isolating problematic deployments, and evidence-based forensic analysis. Use when stabilizing broken systems, fighting active production fires, or conducting root-cause post-mortems.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - error-resilience
  - observability
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Incident Responder — Production Stabilization Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `devops-incident-responder` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production incident response mastery. MTTR (Mean Time to Recovery) reduction, blameless post-mortems, rapid triaging, halting systemic cascading failures, isolating problematic deployments, and evidence-based forensic analysis. Use when stabilizing broken systems, fighting active production fires, or conducting root-cause post-mortems.
- **DO NOT activate when:** The task falls outside the `devops-incident-responder` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ Changing code during an active incident -> ✅ STABILIZE first (rollback, feature flag, traffic shift), investigate AFTER
- ❌ Assigning blame in post-mortems -> ✅ Blameless post-mortems focus on systemic causes, not individual errors
- ❌ Skipping the 'what went well' section -> ✅ Understanding what prevented worse outcomes is as valuable as the root cause

---

---

## 1. The Prime Directive (Stop the Bleeding)

When an outage is declared (e.g., 502 Bad Gateway across the entire primary cluster), do not ask the developer to check the database logs to figure out why the code crashed.

**Immediate Action Pipeline:**

1. **Identify the Trigger:** What changed in the last 15 minutes? (90% of outages are caused by deployments).
2. **Revert the Change:** Execute the emergency rollback pipeline instantly. Revert the Git commit, swap the Docker tag, or disable the Feature Flag.
3. **Verify Stabilization:** Ensure metrics return to healthy thresholds.
4. **Communicate:** "Mitigation complete. Services restored. Root cause investigation underway."

---

## 2. Isolating Cascading Failures

A cascading failure occurs when Service A dies, causing Service B to overload with retries, which kills Service B, which kills the database.

**The Circuit Breaker Protocol:**
If a downstream dependency is dead, sever it immediately to save the rest of the ecosystem.

```javascript
// ❌ VULNERABLE: Infinite Retry Death Spiral
async function fetchUser(id) {
  while (true) {
    try {
      return await api.get(`/user/${id}`);
    } catch {
      await sleep(100);
    } // Hundreds of containers doing this will execute a DDoSing attack on the API
  }
}

// ✅ RESILIENT: Circuit Breaking / Fallbacks
const breaker = new CircuitBreaker(fetchUser, {
  errorThresholdPercentage: 50, // If 50% of requests fail...
  resetTimeout: 30000, // Open the circuit (stop sending requests) for 30s
});

breaker.fallback(() => ({ id: 'cached-user', status: 'degraded' }));
```

**Heavy Mitigation Tactics:**

- **Shed Load:** Aggressively drop non-critical traffic (e.g., disable background syncs, temporarily ban aggressive scraping IPs).
- **Scale Out (Band-Aid):** If the memory leak is crashing nodes every 10 minutes, scale the nodes up 3x to buy yourself 30 minutes of runway to find the actual bug.

---

## 3. The Investigative Triage Routine

Once the bleeding is stopped (or if you are investigating a non-fatal anomaly), follow the data strictly:

1. **Metrics (The "What"):** Look at the Dashboards. Did latency spike? Did CPU pin at 100%? Did Database active connections max out?
2. **Traces (The "Where"):** Look at OpenTelemetry/Datadog traces. Which specific microservice is the bottleneck?
3. **Logs (The "Why"):** Query the centralized logs (Splunk/Elastic/CloudWatch) exactly around the timestamp the trace spiked.

---

## 4. The Blameless Post-Mortem

Incident response does not end when the system recovers. It ends when the system is architected to survive the same failure tomorrow automatically.

**A Professional Post-Mortem Must Include:**

1. **The Timeline:** Chronological factual representation of the event to the minute.
2. **Root Cause Analysis (The 5 Whys):**
   - _Why did the site go down?_ DB exhausted connections.
   - _Why did it exhaust?_ The new background worker didn't pool connections.
   - _Why did the worker deploy?_ It bypassed CI tests for speed.
3. **Action Items:** Tangible Jira tickets preventing recurrence (e.g., "Implement PgBouncer connection limits", "Enforce CI checks block on all branches").

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Silent Pipeline Failure** | Executing shell steps without set -euo pipefail, ignoring errors | Always initialize shell scripts with set -euo pipefail and trap handlers |
| **Unpinned Dependency Shift** | Installing packages with npm install or using :latest docker tags | Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests |
| **Leaking Build Secrets** | Passing secrets as Docker build arguments baked into image layers | Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are strict execution modes (set -euo pipefail) active on all scripts?
✅ Are container images pinned to digest/immutable tags instead of "latest"?
✅ Are deployment health checks and rollback baselines configured?
✅ Are CI secrets masked and unexposed to untrusted pull requests?
✅ Did I verify environment compatibility across target runtimes?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
