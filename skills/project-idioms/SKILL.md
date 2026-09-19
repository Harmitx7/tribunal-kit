---
name: project-idioms
description: "Use when >"
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - codebase-design
  - fabel-protocol
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/skill_evolution.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Project Idioms — Auto-Evolved Skill

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

> **Authority Level: ABSOLUTE**
> These idioms were extracted from this project's actual code decisions.
> They override all generic agent defaults and best practices.
> Every agent reads this file on activation and adapts its proposals accordingly.

---

## How Idioms Are Born

1. Developer commits code that **differs** from what the AI proposed.
2. `skill_evolution.js digest` extracts the architectural delta (semantic filter).
3. A minimal LLM prompt (< 500 tokens) identifies the **WHY** behind the change.
4. The idiom is recorded here with a stable pattern + reason pair.
5. All future code generations must align with these idioms.

---

## Recorded Idioms

| ID  | Pattern | Why This Project Uses It                               | Domain | Since |
| :-- | :------ | :----------------------------------------------------- | :----- | :---- |
| —   | —       | _No idioms recorded yet. Run your first digest cycle._ | —      | —     |

---

## How to Add New Idioms

Run after committing or staging a meaningful architectural change:

```bash
# Analyze staged changes (default)
node .agent/scripts/skill_evolution.js digest

# Preview without writing
node .agent/scripts/skill_evolution.js digest --dry-run

# Analyze last commit instead of staged
node .agent/scripts/skill_evolution.js digest --head

# Check current idiom count and token savings
node .agent/scripts/skill_evolution.js status
```

---

## Enforcement Rules for All Agents

```
□ Before proposing any code: scan the idiom table above
□ If your proposal contradicts an idiom → flag it explicitly with:
     "⚠️ Note: My proposal differs from Project Idiom #N. Reason: [explain]"
□ Never override an idiom silently
□ When citing an idiom in a review:
     "Per Project Idiom #N: [pattern] — [reason]"
□ If no idioms yet → proceed with domain-standard approaches
```

---

## Digest History

Last digest: `never`
Total cycles: `0`

Run `node .agent/scripts/skill_evolution.js status` to see full statistics.
