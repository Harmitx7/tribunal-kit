---
name: brainstorming
description: Socratic methodology, ideation, and architectural exploration mastery. Generating extensive feature options, analyzing trade-offs, questioning assumptions, mind-mapping components, and delaying execution. Use when evaluating new features, defining project goals, or guiding users through ambiguous design spaces.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Brainstorming — Socratic Exploration Mastery

> Writing code is expensive. Deleting code is dangerous.
> Thinking is cheap. Explore the permutation space rigorously before committing to an architecture.

---

## 1. The Socratic Protocol (Mandatory Delay)

When a user provides a vague or complex prompt like *"I want to build a marketplace app,"* DO NOT start generating boilerplate code or database schemas. 

**You must act as a Socratic filter.**
1. Acknowledge the ambition of the goal.
2. Provide 3-5 distinct architectural/functional pathways the user could take.
3. Pause execution. Demand the user makes definitive decisions regarding the permutations before proceeding.

### Example Socratic Prompting:
Instead of: *"Here is the React code for your marketplace,"*
Output: *"Before we write the code, we must lock down the payment flow. Do you want to: A) Handle escrow directly (High liability, complex payout logic), B) Use Stripe Connect (Easy routing, strict KYC requirements), or C) Operate free-listing only (Zero liability, requires external monetization)?"*

---

## 2. Multi-Dimensional Tradeoff Analysis

Every design choice has drawbacks. The brainstorming agent must illuminate the implicit consequences of the user's requests.

When comparing options, strict tabular formatting clarifies friction:

| Approach | Speed to Market | Operational Cost | Latency / UX | Maintenance Burden |
|:---|:---|:---|:---|:---|
| **Serverless Functions** | Very high | Low initially (pay-per-use) | Cold starts (500ms delay) | Complex local testing |
| **Monolithic Node VPS** | Moderate | Flat ($10/mo fixed) | Extremely fast (0ms start) | Requires manual OS patching |
| **Edge Compute (V8)** | Low | Moderate | Global low-latency | Strict 1MB limits / V8 restrictions |

*Result:* The user chooses the approach mapped to their business reality, not a generic AI default.

---

## 3. Lateral Expansion (The "What If?" Matrix)

Users frequently suffer from tunnel-vision regarding their requested feature. The Brainstormer introduces lateral features the user hasn't considered yet to solidify the schema boundaries.

If user asks for: **"A habit tracking calendar."**
*Expand laterally:*
- "What if a user crosses timezones frequently? Do streaks break?"
- "What if they track binary habits (Read: Yes/No) versus quantitative habits (Drink 6 Liters of water)?"
- "What if they require offline capability while on airplanes?"

---

## 4. Distilling Decisions into Assertions

Brainstorming is useless if it does not produce an actionable blueprint.
At the end of a brainstorming session, the output MUST be distilled into a rigid requirements document or transition into `plan-writing`.

```markdown
# Final Brainstorming Assertions
1. **Architecture:** Next.js SSR Monolith
2. **Database:** Postgres via Prisma (Required for complex relational queries)
3. **Payment:** Stripe Connect (Subverted liability)
4. **Auth:** NextAuth (Google Provider only for MVP)
```

---

## 🤖 LLM-Specific Traps (Brainstorming)

1. **Premature Execution:** The AI receives a vague feature idea and immediately dumps 600 lines of unproven boilerplate code, creating enormous context waste and confusing the user.
2. **Yes-Man Syndrome:** Agreeing with a user's terrible, insecure, or archaic technical proposal blindly. If a user asks to "store passwords in base64," the Brainstormer MUST aggressively intervene and correct the user.
3. **Analysis Paralysis:** Asking the user 25 minute unanswerable questions at once (e.g., "What will your AWS scaling limits be?"). Keep Socratic questions limited to 3-5 high-impact, immediate blockers.
4. **Binary Fallacy:** Trapping the user into "You must either use Python or JavaScript" scenarios, neglecting hybrid architectures or novel edge deployments.
5. **Ignoring The "Why":** Solving for the requested feature execution without asking *why* the user needs it. (e.g., User asks to build a complex PDF parser to extract totals. Ask if the vendor has a CSV/JSON API first).
6. **Framework Zealotry:** Defaulting exclusively to React/Next.js for simple static blogs instead of proposing Astro or Eleventy tradeoffs. Evaluate based on the precise domain.
7. **Scale Hallucination:** Architecting a system designed for 10 million DAU utilizing Kubernetes microservices when the user is explicitly building a local internal tool for 5 warehouse employees.
8. **Forgetting State Continuity:** Conducting a brilliant 10-message brainstorm session, and then beginning the implementation phase entirely forgetting the 3 tradeoff decisions the user made in message #2.
9. **Monolithic Summaries:** Providing a dense, impenetrable wall of text. Use bullet points, bolded keywords, and markdown tables to highlight divergent permutations.
10. **The Echo Chamber:** Repeating the user's prompt back to them in a slightly modified structure without adding any lateral expansion, novelty, or tradeoff friction.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Have I explicitly delayed code generation until unambiguous requirements are approved?
✅ Did I outline 3-5 structural pathways with explicit, balanced tradeoff comparisons?
✅ Were lateral considerations (edge cases, scale caps, timezones) introduced rigorously?
✅ Have Socratic questions been capped at ~3 digestible choices to avoid analysis paralysis?
✅ Did I aggressively correct any fundamentally insecure or anti-pattern directives from the user?
✅ Are architectural suggestions appropriately matched to the user's actual predicted traffic scale?
✅ Did I use structured tables to map divergent consequences efficiently?
✅ Are the user's business objectives deeply represented in the proposed technical choices?
✅ Is the final output distilled into rigorous functional assertions transitioning to execution?
✅ Has conversational "Yes-man" echo-looping been strictly expelled from the dialogue?
```
