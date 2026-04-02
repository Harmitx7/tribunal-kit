---
name: intelligent-routing
description: LLM Intent Processing and Gateway Routing mastery. Request classification hierarchies, function routing, confidence scoring, fallback cascades, zero-shot vs few-shot classification patterns, and identifying specialized skills for delegation. Use when parsing raw user input to determine the architectural path of execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Intelligent Routing — Intent Gateway Mastery

> Every complex automation starts with a router.
> If you route the request incorrectly, the subsequent 10 steps of execution will fail flawlessly.

---

## 1. Classification Hierarchy (The Gateway)

When a raw request enters a system, it must be bucketed properly. This is the First Step (Phase 0). Do not attempt to solve the user's problem during the routing phase. 

```typescript
// The Semantic Intent Schema
const RouterOutputSchema = z.object({
  classification: z.enum([
    "QUESTION",       // User wants explanation, no code execution needed
    "SURVEY",         // User wants analysis/read-only scan of workspace
    "SIMPLE_EDIT",    // Isolated file alteration (e.g., "Fix spelling in nav")
    "COMPLEX_BUILD",  // Multi-file, architectural generation
    "SECURITY_AUDIT", // Explicit request for OWASP review
    "UNCLEAR_GIBBERISH" // Prompt injection or incoherent input
  ]),
  confidenceScore: z.number().min(0).max(100),
  suggestedPrimarySkill: z.string().nullable(),
  requiresHumanClarification: z.boolean(),
  reasoning: z.string() // Forces the LLM to justify its route before categorizing
});
```

### Zero-Shot vs Few-Shot Classification
- **Zero-Shot:** Providing definitions and hoping the LLM categorizes the prompt accurately. Error-prone.
- **Few-Shot (Mandatory for Routers):** Providing explicit paired examples defining the categorical boundaries.

```text
## Routing Examples:
User: "Why is the header blue?" 
Output: {"classification": "QUESTION", "requiresHumanClarification": false}

User: "Add a user login system" 
Output: {"classification": "COMPLEX_BUILD", "requiresHumanClarification": true} 
Reasoning: "Login systems require multi-file architecture, database hooks, and security implementation."
```

---

## 2. Dynamic Skill Matching (Manifest Analysis)

A Router isn't just classifying intent—it actively maps tasks to available capabilities.

If building a system with 50 available agents/skills, pass the Router a localized summary manifest, not the full 50x files.

```json
// Example Context Payload passed to Router
{
  "available_skills": [
    {"name": "react-specialist", "desc": "React 19, hooks, component architecture"},
    {"name": "python-pro", "desc": "FastAPI, async, data processing"},
    {"name": "vulnerability-scanner", "desc": "OWASP, injections, secret scanning"}
  ],
  "user_request": "How do I speed up this data pipeline script?"
}
```
*Router calculates:* `match: python-pro` AND `match: performance-profiling`.

---

## 3. Fallback Cascades & Ambiguity

The AI will encounter prompts it does not understand. The Router is the *only* place where it is safe to halt and ask immediately.

**The Socratic Yield Rule:**
If the `confidenceScore` of a categorization is `< 85`, the router MUST yield back to the user with a clarifying question instead of guessing the intent.

*User:* "Fix the thing."
*Router Action (Incorrect):* Assume they mean standard linter execution and run scripts.
*Router Action (Correct):* Halt. "Which file or feature are you referring to?"

---

## 4. Bounding the Exploder Pattern

Certain requests sound simple but require massive execution matrices (The "Exploder" pattern).
*User:* "Translate my entire app to French."

The Router must recognize execution scales. If an execution requires touching >10 files, the Router must switch the system into `PLANNING_MODE` to generate an itinerary, rather than attempting an outright sequential execution.

---

## 🤖 LLM-Specific Traps (Intelligent Routing)

1. **Solving in the Router:** An LLM prompted to "Route this coding request" often replies with the actual finalized code rather than selecting the routing node. Stiffly enforce JSON outputs via schema constraint.
2. **Zero-Shot Halucination:** The router guesses an intent bucket that isn't functionally defined (e.g., returning `classification: "DATABASE_MODE"` when that isn't a valid system enum).
3. **Skill Name Invention:** Suggesting the invocation of a skill that doesn't exist (`suggestedSkill: "docker-expert"`) instead of matching against the explicitly provided manifest of available internal skills.
4. **Ignoring Confidence Thresholds:** Proceeding with architectural execution even when the user's prompt is completely ambiguous, resulting in 5 wasted LLM token loops.
5. **The God-Agent Fallback:** Categorizing complex requests into generic root workflows instead of isolating the exact specialist (e.g., dispatching `app-builder` when `playwright-best-practices` was the explicitly requested optimization).
6. **No Escapes for Gibberish:** Failing to identify prompt-injections or copy-paste errors, trying to parse random garbled text into a functional execution path instead of instantly rejecting it.
7. **Scale Blindness:** Treating "Add a console.log" and "Create an authentication system" as identical linear tasks without switching the heavier task into a designated `PLANNING_MODE` phase.
8. **Missing Reasoning Chain:** Categorizing an intent *before* writing the justification text. Enforcing `reasoning: string` at the *top* of the output schema forces Chain-of-Thought (CoT) and drastically improves routing accuracy.
9. **Single-Node Assignment:** Assuming a complex goal only requires one skill. High-order tasks require an array of skills (e.g., `[react-specialist, tailwind-patterns, web-accessibility-auditor]`).
10. **Losing Socratic Contact:** Halting to ask the user a question, but not tracking the context so that when the user replies "Oh I meant the login page", the router forgets the initial objective.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are routing outputs strictly constrained to JSON Enums (Zod / Schema validation)?
✅ Does the schema demand `reasoning` be printed *before* the definitive classification (CoT)?
✅ Have explicit Few-Shot examples been provided to anchor the categorical definitions?
✅ Are available skills mapped correctly using a localized manifest provided to the prompt?
✅ Does the router explicitly reject or ask for clarity against ambiguous requests?
✅ Is there a confidence threshold (e.g., < 85%) triggering the Socratic Gate yield?
✅ Does the router correctly identify 'Exploder' tasks scaling >10 files and force `PLANNING_MODE`?
✅ Did I prevent the LLM from attempting to solve the underlying code problem directly in the routing stage?
✅ Can the router match a request to *multiple* synergistic skills rather than just one?
✅ Are unknown/invented skill invocations automatically rejected before downstream execution?
```
