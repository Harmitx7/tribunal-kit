---
name: deployment-procedures
description: Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Deployment Principles

> Deployments are not risky because of the code. They are risky because of all the
> assumptions that have never been tested in production.

---

## The Core Tension

Speed vs. safety. Moving fast reduces iteration time. Moving carefully reduces incidents.
The answer is not "always be careful" — it's **make fast safe**.

That means:
- Deployments that are reversible
- Changes that are observable in real time
- Failures that are isolated to a subset of users
- State changes that can be undone without code changes

---

## Five Phases of Safe Deployment

### Phase 1 — Pre-Flight

Before touching anything in production:

- [ ] Tests passing on the branch being deployed
- [ ] No pending schema migrations that will break the current production code
- [ ] Feature flags in place for any risky changes
- [ ] Rollback plan confirmed — "delete the feature flag" is a valid plan, "redeploy" is not (too slow)
- [ ] Team notified if deployment will cause visible disruption

### Phase 2 — Database First

If there are schema changes:

- Deploy the migration **before** the code that depends on it
- Verify the migration completed and the database is healthy
- The new code must be backward-compatible with the old schema (for the window during which old pods are still running)

**Never:**
- Add NOT NULL without a DEFAULT in the migration
- Drop a column in the same deployment that removes the code referencing it
- Run a migration that locks the table for more than a few seconds without scheduling a maintenance window

### Phase 3 — Code Deploy

Deploy with traffic distribution:

| Strategy | Risk | When to Use |
|---|---|---|
| Direct (all-at-once) | High | Small teams, low traffic, with immediate rollback |
| Rolling | Medium | Multiple instances, gradual update, auto-rollback on health fail |
| Blue/Green | Low | Mission-critical services, instant switch and rollback |
| Canary | Very low | Unknown risk level, expose to 1–5% of traffic first |

### Phase 4 — Verify

After deploying, watch:

- Error rate — compare to pre-deploy baseline, not zero
- Response time P50, P95, P99 — not just average
- Business metric if visible (conversion, checkout completion)
- Key logs for new error patterns

Wait at minimum:
- 5 minutes for canary verification
- 15 minutes for a rolling deploy
- Until traffic covers the full daily pattern for any significant feature

### Phase 5 — Complete or Roll Back

**Roll back when:**
- Error rate increases by more than 2x pre-deploy baseline
- P95 latency increases significantly without an expected cause
- A critical user path stops working

**Complete when:**
- All metrics stable for the required observation window
- All instances updated
- Feature flags cleaned up if used

---

## Rollback vs. Roll Forward

| Scenario | Recommendation |
|---|---|
| Bug in new code, no data mutations | Roll back (redeploy previous version) |
| Bug in new code, data already mutated | Roll forward (fix the mutation in a follow-up deploy) |
| Schema migration caused the issue | Fix forward — migrations are rarely safely reversible |
| Feature flag controls the issue | Turn off the flag — fastest rollback possible |

---

## Environment Hierarchy

Code flows one direction: dev → staging → production. Never skip staging for anything non-trivial.

- **Development:** Fast iteration, local data, no external consequences
- **Staging:** Production-like data (anonymized), used for final verification
- **Production:** Real users, real consequences, thorough before touching

---

## What a Deployment Runbook Contains

For any significant deployment, document before starting:

```
Date/Time:         
Engineer:          
What is changing:  
Why:               
Expected behavior: 
How to verify:     
Rollback plan:     
Time to rollback:  
```
