---
name: config-validator
description: Self-validation skill for the .agent directory. Checks that all agents, skills, workflows, and scripts referenced across the system actually exist and are consistent. Use after modifying agent configuration files.
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Config Validator — Agent System Self-Check

This skill validates the internal consistency of the `.agent/` directory itself. When the agent system references files that don't exist, behavior becomes unpredictable. This skill catches those gaps.

---

## When to Use

- After adding, renaming, or removing any agent, skill, workflow, or script
- After copying the `.agent/` directory to a new project
- When something "should work" but the agent seems to ignore it
- As part of `/audit` to ensure the agent system itself is healthy

---

## What Gets Checked

### 1. Agent File Existence

Every agent referenced in `rules/GEMINI.md` routing table must have a corresponding `.md` file in `agents/`.

```
For each agent in the routing table:
  → Does agents/{agent-name}.md exist?
  → If not: report as MISSING AGENT
```

### 2. Skill References in Agent Frontmatter

Every skill listed in an agent's `skills:` frontmatter field must exist as a directory in `skills/` with a `SKILL.md` file.

```
For each agent file:
  → Read YAML frontmatter
  → For each skill in skills: field
    → Does skills/{skill-name}/SKILL.md exist?
    → If not: report as MISSING SKILL
```

### 3. Workflow File Existence

Every slash command listed in `GEMINI.md` or `ARCHITECTURE.md` must have a corresponding `.md` file in `workflows/`.

```
For each /command referenced:
  → Does workflows/{command}.md exist?
  → If not: report as MISSING WORKFLOW
```

### 4. Script File Existence

Every script referenced in `rules/GEMINI.md` script table must exist in `scripts/`.

```
For each script in the reference table:
  → Does scripts/{script-name} exist?
  → If not: report as MISSING SCRIPT
```

### 5. Cross-Reference Consistency

- Agent names in the routing table match filenames in `agents/`
- Workflow names in the command table match filenames in `workflows/`
- No orphan files (files that exist but are never referenced anywhere)

---

## Validation Process

Run this check manually or mentally when modifying the `.agent/` structure:

```
Step 1: Read rules/GEMINI.md → Extract agent names, script names
Step 2: Read GEMINI.md → Extract slash command names
Step 3: Read ARCHITECTURE.md → Extract all references
Step 4: Read each agent .md → Extract skill references from frontmatter
Step 5: Cross-check every reference against the filesystem
Step 6: Report any mismatches
```

### Report Format

```
🔧 Config Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━

Agents:    27 found, 27 referenced ✅
Skills:    37 found, 34 referenced ⚠️ (3 unreferenced)
Workflows: 22 found, 22 referenced ✅
Scripts:   10 found, 10 referenced ✅

Issues:
  ❌ MISSING: skills/some-removed-skill/SKILL.md (referenced by agents/backend-specialist.md)
  ⚠️ ORPHAN: agents/old-unused-agent.md (not referenced in routing table)
```

---

## Fixing Common Issues

| Issue | Fix |
|---|---|
| Missing agent file | Create the agent `.md` file or remove from routing table |
| Missing skill directory | Create `skills/{name}/SKILL.md` or remove from agent `skills:` field |
| Missing workflow file | Create `workflows/{name}.md` or remove from slash command table |
| Missing script | Create the script or remove from script reference table |
| Orphan file | Either reference it somewhere or delete it |

---

## Hallucination Guard

- Never report a file as "existing" without actually checking the filesystem
- Never report a reference as "valid" without reading the referencing file
- If a file exists but has different content than expected, flag it rather than assuming it's correct


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
