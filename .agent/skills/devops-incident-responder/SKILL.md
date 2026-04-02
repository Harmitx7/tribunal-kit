---
name: devops-incident-responder
description: Production incident response mastery. MTTR (Mean Time to Recovery) reduction, blameless post-mortems, rapid triaging, halting systemic cascading failures, isolating problematic deployments, and evidence-based forensic analysis. Use when stabilizing broken systems, fighting active production fires, or conducting root-cause post-mortems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Incident Responder — Production Stabilization Mastery

> Time is blood. The goal of an incident response is Mitigation first, Resolution second.
> DO NOT investigate the root cause while the building is burning. Put out the fire (Rollback), then investigate the ashes.

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

## 🤖 LLM-Specific Traps (Incident Response)

1. **Investigating the Fire:** Identifying a crash and immediately demanding the user rewrite the deeply nested API logic while the site remains completely offline to customers. Always prescribe an instant Rollback first.
2. **Shotgun Reboots:** Telling the user to just restart all the servers blindly. This destroys all volatile memory evidence (Heap Dumps, core dumps) required to actually solve the root cause.
3. **Restart Loops:** The AI identifies an OOM (Out Of Memory) crash and writes a bash loop to infinitely restart the system every time it crashes, actively masking the fatal memory leak from architectural review.
4. **Ignoring Network Geometries:** Trying to debug an API failure for 20 minutes by analyzing Node.js code, while totally forgetting to check if the AWS Security Group / Firewall simply blocked the port.
5. **Assuming Code is Flawless:** Recommending complex database re-indexing strategies because queries got slow, without recognizing that the recent Git Commit deployed an N+1 query loop. Assume recent deployments are guilty until proven innocent.
6. **No Circuit Breakers:** Fixing a timeout bug by suggesting the user increase the global HTTP timeout from 10s to 60s, guaranteeing the entire thread pool becomes exhausted instantly during the next network fluctuation.
7. **The Blame Game:** Writing analysis reports that focus heavily on the individual developer who pushed the bad code, rather than identifying the systemic CI/CD pipeline failure that *allowed* the bad code to merge.
8. **Logging in Production:** Advising the user to `console.log` massive payloads to track an error in production environments, massively polluting logs and potentially leaking PII compliance data.
9. **Tunnel Vision:** Debugging Application A intensely, failing to realize Application A failed because the underlying global Redis cache failed completely, affecting all services simultaneously. Focus on shared infrastructure metrics first.
10. **The Unverifiable Fix:** Proposing an intricate solution and skipping the final critical step: "How will we prove this actually fixed the problem under load?". Deploy without telemetry monitoring is flying blind.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Was immediate Mitigation/Rollback explicitly ordered prior to initiating Root Cause Analysis?
✅ Did I enforce strategies to break cascading failures (e.g., Circuit Breakers, load shedding)?
✅ Are diagnostic analyses tracing specific metrics to explicit log anomalies?
✅ Ensure that system reboots did not intentionally destroy critical volatile diagnostic evidence.
✅ Have recent deployments/git-commits been flagged as the primary initial vector of suspicion?
✅ Did I avoid masking problems by extending timeout thresholds, opting instead to fix blocking execution?
✅ Is the incident Post-Mortem methodology completely focused on systemic flaws rather than human error?
✅ Were cross-service infrastructure layers (DBs, Redis, Load Balancers) cleared before deep-diving into local code?
✅ Has an action item been established verifying how future iterations of this failure will be programmatically blocked?
✅ Are there explicit mechanisms checking for PII leakage before increasing diagnostic logging verbosity in production?
```
