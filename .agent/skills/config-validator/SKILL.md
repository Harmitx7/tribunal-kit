---
name: config-validator
description: Self-validation skill for the .agent directory. Checks that all agents, skills, workflows, and scripts referenced across the system actually exist and are consistent. Use after modifying agent configuration files.
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
