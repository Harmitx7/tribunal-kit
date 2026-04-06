---
name: devops-incident-responder
description: Production incident response mastery. MTTR (Mean Time to Recovery) reduction, blameless post-mortems, rapid triaging, halting systemic cascading failures, isolating problematic deployments, and evidence-based forensic analysis. Use when stabilizing broken systems, fighting active production fires, or conducting root-cause post-mortems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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
