---
name: devops-incident-responder
description: Production incident response mastery. MTTR (Mean Time to Recovery) reduction, blameless post-mortems, rapid triaging, halting systemic cascading failures, isolating problematic deployments, and evidence-based forensic analysis. Use when stabilizing broken systems, fighting active production fires, or conducting root-cause post-mortems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Changing code during an active incident -> ✅ STABILIZE first (rollback, feature flag, traffic shift), investigate AFTER
- ❌ Assigning blame in post-mortems -> ✅ Blameless post-mortems focus on systemic causes, not individual errors
- ❌ Skipping the 'what went well' section -> ✅ Understanding what prevented worse outcomes is as valuable as the root cause

---


# Incident Responder — Production Stabilization Mastery

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
  while(true) {
    try { return await api.get(`/user/${id}`); }
    catch { await sleep(100); } // Hundreds of containers doing this will execute a DDoSing attack on the API
  }
}

// ✅ RESILIENT: Circuit Breaking / Fallbacks
const breaker = new CircuitBreaker(fetchUser, {
  errorThresholdPercentage: 50, // If 50% of requests fail...
  resetTimeout: 30000           // Open the circuit (stop sending requests) for 30s
});

breaker.fallback(() => ({ id: "cached-user", status: "degraded" }));
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
   - *Why did the site go down?* DB exhausted connections.
   - *Why did it exhaust?* The new background worker didn't pool connections.
   - *Why did the worker deploy?* It bypassed CI tests for speed.
3. **Action Items:** Tangible Jira tickets preventing recurrence (e.g., "Implement PgBouncer connection limits", "Enforce CI checks block on all branches").

---


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
