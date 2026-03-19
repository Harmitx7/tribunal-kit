---
name: deployment-procedures
description: Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Deployment Procedures Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

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
