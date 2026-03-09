---
name: brainstorming
description: Socratic questioning protocol + user communication. MANDATORY for complex requests, new features, or unclear requirements. Includes progress reporting and error handling.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Brainstorming & Discovery Protocol

> The most expensive part of building software is building the wrong thing.
> Ask the questions that prevent that.

---

## When This Skill Is Required

Activate before generating any implementation plan when:

- A new feature or system is being created
- The request is vague or uses words like "something like" or "maybe"
- Multiple valid technical approaches exist and the right one depends on context
- The user hasn't described their users, scale, or constraints

---

## The Socratic Method Applied to Software

The goal is not to interrogate. It is to surface hidden assumptions before they become hard-coded decisions.

### Discovery Questions by Layer

**Purpose (What problem does this solve?)**
- What outcome does the user need — not what feature do they want?
- What happens today without this?
- What does success look like in 30 days?

**Users (Who is this for?)**
- Who are the actual end users?
- What is their technical level?
- Are there multiple user types with different needs?

**Scope (What is and isn't included?)**
- What is explicitly out of scope for this version?
- What data already exists vs. what needs to be created?
- Are there integrations with other systems?

**Market & Psychology (Why will they use it?)**
- Who are the current competitors or alternatives, and how are we different?
- What is the launch strategy and monetization approach?
- What emotional state is the user in when they need this product?

**Superpowers & Creative Constraints (Breaking the mold)**
- If we had to solve this without writing any code, how would we do it?
- What is the most unconventional, "fun", or high-leverage way to achieve this outcome?
- Can we leverage existing external super-APIs (LLMs, edge networks, managed integrations) to bypass traditional development?

**Constraints (What limits the design?)**
- Existing tech stack?
- Performance requirements? (users, requests/sec, data volume)
- Deadline?
- Budget for paid services?

---

## Question Protocol

For complex requests: ask **minimum 3 strategic questions** before proposing anything.

For simple but vague requests: ask **1 focused question** on the most blocking unknown.

**Format:**
```
Before I propose a solution, a few questions:

1. [Most critical unknown]
2. [Second most important]
3. [Clarifies scope or constraints]

[Optional: brief note on why these matter]
```

**Rules:**
- Ask about one topic per question — not compound questions (`and`/`or` in a question = split it)
- Numbered list, not a wall of text
- Never more than 5 questions at once
- Always inject at least one highly creative, out-of-the-box alternative approach ("Superpower Option") when proposing paths.
- If answers create new unknowns, ask a follow-up round

---

## Anti-Patterns in Discovery

**What to avoid:**

| Pattern | Why It's Harmful |
|---|---|
| Assuming the tech stack | Leads to architecture that fits you, not the project |
| Solving the stated feature, not the problem | User asks for X but needs Y — you build X |
| Treating "I want a dashboard" as a spec | Dashboards have hundreds of valid forms |
| Jumping to implementation to seem helpful | Wastes both parties' time if direction is wrong |
| Asking leading questions | "Should we use Next.js?" vs "What matters most for deployment?" |

---

## Reporting During Complex Work

When working on multi-step tasks, report progress proactively.

**Status update format:**
```
✅ [Completed step]
🔄 [Current step — what you're doing right now]
⏳ [Next step]
```

Report at natural breakpoints — not after every file edit.

---

## Error Handling During Implementation

When something fails or an assumption is proven wrong mid-task:

1. Stop immediately — don't continue building on a broken assumption
2. State what was expected vs. what was found
3. Propose 2–3 corrected approaches with trade-offs
4. Ask which direction to proceed

```
❌ Found an issue:
   Expected: users table has an `email` column
   Found: email is in a separate `user_contacts` table

Options:
   A) Join through user_contacts (correct but slower queries)
   B) Denormalize email onto users table (faster, requires migration)
   C) Ask what the schema decision was intended to be

Which should I proceed with?
```

---

## File Index

| File | Covers | Load When |
|---|---|---|
| `dynamic-questioning.md` | Advanced question frameworks by domain | Discovery for complex systems |
