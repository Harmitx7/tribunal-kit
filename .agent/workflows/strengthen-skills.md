---
description: Strengthen skills by appending Tribunal guardrails (LLM Traps, Pre-Flight checklist, VBC Protocol) to any SKILL.md missing them.
---

# /strengthen-skills Workflow

Use this command to audit and harden all skills in `.agent/skills/` that are missing
the standard Tribunal guardrails block.

---

## What It Does

Runs `strengthen_skills.py` against all skill files.  
For each skill it checks:

1. **Tribunal Integration section** — does it have `🏛️ Tribunal Integration`?
2. **VBC Protocol** — does it have `Verification-Before-Completion`?

Skills missing either are strengthened by appending the full canonical block:
- `## 🤖 LLM-Specific Traps`
- `## 🏛️ Tribunal Integration (Anti-Hallucination)`
  - Forbidden AI Tropes
  - Pre-Flight Self-Audit checklist
  - VBC Protocol

Skills that already have both sections are skipped automatically.

---

## Steps

### Step 1 — Dry Run (Always First)

```powershell
python .agent/scripts/strengthen_skills.py . --dry-run
```

Review the output. All lines prefixed with `⚠️ [DRY RUN]` are skills that would be strengthened.

> **Human Gate:** If the dry-run output looks correct, continue to Step 2.
> If unexpected skills are listed, investigate before proceeding.

---

### Step 2 — Strengthen All Skills

```powershell
python .agent/scripts/strengthen_skills.py .
```

---

### Step 3 — Verify Summary

The script prints a final summary:
```
✅ Strengthened: N
⏭️  Skipped:     N
❌ Errors:       0
```

Errors must be zero before proceeding. If any errors appear, fix them and re-run.

---

### Step 4 — Strengthen a Single Skill (Optional)

To strengthen one specific skill only:

```powershell
python .agent/scripts/strengthen_skills.py . --skill <skill-name>
```

Example:
```powershell
python .agent/scripts/strengthen_skills.py . --skill brainstorming
```

---

### Step 5 — Custom Skills Directory (Optional)

If skills live in a non-standard location:

```powershell
python .agent/scripts/strengthen_skills.py . --skills-path /path/to/skills
```

---

## Related Commands

| Command | Purpose |
|---|---|
| `/audit` | Full project health audit (includes skills review) |
| `python .agent/scripts/patch_skills_meta.py .` | Inject version/freshness metadata into frontmatter |
| `python .agent/scripts/patch_skills_output.py .` | Add Output Format sections to skills missing them |
| `python .agent/scripts/config_validator.py .` | Validate all agent config consistency |
