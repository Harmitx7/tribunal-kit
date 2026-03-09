# Plan: Strengthen Overall Skills

## What Done Looks Like
All skills in the `.agent/skills` directory will be enhanced with robust anti-hallucination guardrails, LLM-specific trap identification, and pre-flight self-audit checklists, ensuring uniform quality across the Tribunal kit.

## Won't Include in This Version
- Modifying the core logic of specific skills that already have these guardrails (e.g., `clean-code`, `code-review-checklist`).
- Rewriting the content of the existing skills, only appending missing guardrails.

## Unresolved Questions
- None. The generic guardrail format is derived from the foundational skills upgraded previously.

## Estimates (Ranges + Confidence)
- Script creation and execution: 10-15 mins (High confidence)
- Manual review of the diffs: 5 mins (High confidence)

## Task Table
| # | Task | Agent | Depends on | Done when |
|---|------|-------|-----------|-----------|
| 1 | Create update script | logic-reviewer | none | `scripts/strengthen_skills.py` is written |
| 2 | Run script over `.agent/skills` | devops-engineer | #1 | Script executes successfully and modifies the files |
| 3 | Run tests / checks | security-auditor | #2 | All `SKILL.md` files contain the Tribunal Integration section |

## Review Gates
| Task | Tribunal |
|---|---|
| All tasks | `/review-ai` (system prompt engineering review) |

## Enhancement Sequence (Impact Zone)
**Files to change:** All `SKILL.md` files in `.agent/skills/` that do NOT currently contain the string "Tribunal Integration". Currently, 33 skills have it, and 27 do not.
**Adding:**
A standard block containing:
- `## 🤖 LLM-Specific Traps`
- `## 🏛️ Tribunal Integration (Anti-Hallucination)`
- `### ❌ Forbidden AI Tropes`
- `### ✅ Pre-Flight Self-Audit`
**Preserving:** All existing content in the `SKILL.md` files.

## Regression Safety Check
- Existing skills will not lose their instructions.
- All new prompts will simply strengthen the AI's resistance to hallucination and generic advice when that skill is injected.
