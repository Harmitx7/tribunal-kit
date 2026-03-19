---
name: code-review-checklist
description: Code review guidelines covering code quality, security, and best practices.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Code Review Standards

> A code review is not a gatekeeping exercise.
> It is a knowledge transfer session that also catches bugs.

---

## Review Mindset

Reviews are collaborative. The goal is better code — not proof that the reviewer is smarter.

**Before commenting:**
- Understand what the code is trying to do before judging how it does it
- Distinguish between personal preference and objective problems
- Label your findings so the author understands the expected action

**Comment label convention:**
- `BLOCKER:` — must be fixed before merge (bug, security issue, broken behavior)
- `CONCERN:` — likely problem that needs discussion before proceeding
- `SUGGESTION:` — would improve the code but is not required
- `NOTE:` — observation or question, no action needed

---

## What to Check

### Correctness
- Does the code do what it claims to do?
- Are edge cases handled? (empty input, null, max value, concurrent execution)
- Does error handling cover realistic failure modes?
- Are there off-by-one errors? Integer overflow risks?

### Security
- Is user input validated before it's used?
- Are SQL queries parameterized — never string-concatenated?
- Are secrets in environment variables — not in code?
- Are auth checks happening before business logic executes?
- Is the OWASP API Top 10 considered for any API routes?

### Readability
- Can you understand the intent in under 30 seconds per function?
- Are names self-documenting at the right level of abstraction?
- Are complex sections commented with *why*, not *what*?
- Is nesting kept to a manageable depth (≤3 levels)?

### Design
- Is this code easy to change? Or would changing one thing break five others?
- Are there clear boundaries between concerns?
- Is logic duplicated anywhere that should be shared?
- Is the new code consistent with how the rest of the codebase does similar things?

### Tests
- Are tests testing behavior or implementation details?
- Do tests cover the happy path, edge cases, and known failure modes?
- Do test names describe the expected behavior in plain language?
- Would these tests catch a regression if someone broke this code?

### Performance
- Are there database queries inside loops?
- Are large datasets loaded into memory when they could be streamed?
- Are expensive operations (network, file I/O) done unnecessarily?

---

## Review Process

1. **Read the PR description first** — understand intent before reading code
2. **Read tests first** — they tell you what the code is supposed to do
3. **Read the implementation** — verify it matches what the tests describe
4. **Run it locally for significant changes** — static reading misses runtime behavior

---

## Giving Feedback

**Effective feedback is:**
- Specific — references the exact line and the exact concern
- Actionable — tells the author what to change, not just that something is wrong
- Explanatory — gives the reasoning, not just the verdict

```
# ❌ Unhelpful
This function is too long.

# ✅ Helpful
SUGGESTION: This function handles both data fetching and data transformation.
Splitting into `fetchUserData()` and `transformUserData()` would make each
half easier to test independently and reuse elsewhere.
```

---

## Receiving Feedback

- "We disagree" is not the same as "they're wrong"
- If a comment is unclear, ask for clarification before defending
- BLOCKER and CONCERN comments need resolution, not just a response
- SUGGESTION and NOTE are optional — you can explain why you're not acting on them

---

## 🛑 Context Window Discipline

When an AI acts as a reviewer, context bloat ruins reasoning:

1. **Never quote massive blocks of code back to the user.** Use line numbers or tiny 1-3 line snippets.
2. **Never attach the entire project context to a single file review.**
3. **Keep reviews scoped.** Do not suggest a full architecture rewrite if the PR is fixing a typo in a CSS class.

---

## 🤖 LLM-Specific Review Traps

AI reviewers frequently fail by focusing on the wrong things. Avoid these strict anti-patterns:

1. **Syntax Nitpicking:** Commenting on formatting, semicolons, or line length. Let `eslint` or Prettier handle this. Only comment if logic is affected.
2. **"Clean Code" Hallucinations:** Telling the author to extract a perfectly readable 10-line function into 3 separate abstract classes.
3. **Invented Methods:** Suggesting the author use `.toSortedMap()` when that method literally does not exist in the language or framework used.
4. **False Bottlenecks:** Claiming an `O(n^2)` loop is a performance critical error when `n` is a configuration array guaranteed to be < 10 items.
5. **The Compliment Sandwich:** You do not need to soften every critique with "Great job on the rest of the code!" Be direct, professional, and concise.

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Code Review Checklist Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review`, `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ✅ Pre-Flight Self-Audit

Review these questions before submitting your code review findings:
```
✅ Did I read the tests to understand the intended behavior before reading the implementation?
✅ Are my BLOCKER and CONCERN comments actionable and specific?
✅ Have I verified that any alternative methods or libraries I suggested actually exist?
✅ Have I refrained from quoting more than 3 lines of code in my response?
✅ Is my feedback focused on logic, edge cases, and security rather than aesthetic formatting?
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
