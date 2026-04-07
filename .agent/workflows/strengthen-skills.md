---
description: Strengthen skills by appending Tribunal guardrails (LLM Traps, Pre-Flight checklist, VBC Protocol) to any SKILL.md missing them. Reads each skill, checks for guardrails, appends if missing, skips if present.
---

# /strengthen-skills — Skill Hardening Pipeline

$ARGUMENTS

---

## When to Use /strengthen-skills

|Use `/strengthen-skills` when...||
|:---|:---|
|New skills were just created|Append guardrails|
|Auditing existing skills|Check which are missing guardrails|
|After adding skills from external sources|Harden before activating|

---

## Phase 1 — Skill Inventory

```bash
# Find all SKILL.md files
find .agent/skills/ -name "SKILL.md" | sort

# Count total
find .agent/skills/ -name "SKILL.md" | wc -l
```

---

## Phase 2 — Guardrail Check

For each SKILL.md, check if it already has guardrails:

```bash
# Check which skills are MISSING LLM Trap table
grep -rL "LLM Trap\|LLM Traps\|\*\*Trap\|TRAP TABLE" .agent/skills/*/SKILL.md

# Check which skills are MISSING Pre-Flight checklist
grep -rL "Pre-Flight\|Pre-flight\|Preflight\|Self-Audit" .agent/skills/*/SKILL.md

# Check which skills are MISSING VBC Protocol
grep -rL "VBC\|Verify.*Build.*Confirm\|verify.*build.*confirm" .agent/skills/*/SKILL.md
```

---

## Phase 3 — Append Guardrails (For Missing Skills Only)

For each skill missing guardrails, append the three sections:

```markdown
---

## 🚨 LLM Trap Table

|Pattern|What AI Does Wrong|What Is Actually Correct|
|:---|:---|:---|
|[domain-specific trap 1]|[hallucination]|[correct behavior]|
|[domain-specific trap 2]|[hallucination]|[correct behavior]|
|[domain-specific trap 3]|[hallucination]|[correct behavior]|

---

## ✅ Pre-Flight Self-Audit

Before producing any output, verify:
```
✅ Did I read the actual files before making claims about them?
✅ Did I verify all method names against official documentation?
✅ Did I add // VERIFY: on any uncertain API calls?
✅ Are all imports from packages that actually exist in package.json?
✅ Did I test my logic with edge cases (null, empty, 0, max)?
✅ Did I avoid generating code for more than one module at a time?
✅ Am I working from evidence, not assumption?
```

---

## 🔁 VBC Protocol (Verify → Build → Confirm)

```
VERIFY:  Read the actual codebase before writing anything
BUILD:   Generate the smallest meaningful unit of code
CONFIRM: Verify the output is correct before presenting
```
```

---

## Phase 4 — Report

After processing all skills:

```
━━━ Skill Strengthening Report ━━━━━━━━━━━━

Total skills found:     [N]
Already have guardrails: [N] (skipped)
Guardrails added:       [N]
Failed:                  [N]

━━━ Strengthened Skills ━━━━━━━━━━━━━━━━━━
✅ [skill-name] — LLM Trap + Pre-Flight + VBC added

━━━ Already Hardened (Skipped) ━━━━━━━━━━━
⏭️ [skill-name]
⏭️ [skill-name]
```

---

## Guardrail Quality Guidelines

LLM Trap tables should be domain-specific — not generic:

```
❌ Generic (useless):
"Don't use wrong method names"

✅ Specific (valuable):
"React 19: useFormState() was renamed to useActionState(). 
  AI generates old name — import fails at runtime."
```

The Pre-Flight checklist should match the skill's specific domain — add domain-specific checks beyond the universal ones.

---

## Usage Examples

```
/strengthen-skills              → Check and harden all skills
/strengthen-skills nextjs-react-expert → Harden only this skill
/strengthen-skills --check-only → Audit without modifying
```
