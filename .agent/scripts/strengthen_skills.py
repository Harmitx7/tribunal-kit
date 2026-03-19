#!/usr/bin/env python3
"""
strengthen_skills.py — Appends Tribunal guardrails to SKILL.md files missing them.

Adds the following sections if not already present:
  - ## 🤖 LLM-Specific Traps
  - ## 🏛️ Tribunal Integration (Anti-Hallucination)
    - ❌ Forbidden AI Tropes
    - ✅ Pre-Flight Self-Audit
    - 🛑 Verification-Before-Completion (VBC) Protocol

Usage:
  python .agent/scripts/strengthen_skills.py .
  python .agent/scripts/strengthen_skills.py . --dry-run
  python .agent/scripts/strengthen_skills.py . --skill python-pro
  python .agent/scripts/strengthen_skills.py . --path /custom/skills/dir
"""

import os
import sys
import argparse
from pathlib import Path

RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# ─── Rich guardrails block ────────────────────────────────────────────────────
# This is the canonical template appended to skills missing Tribunal sections.

GUARDRAILS_BLOCK = """

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
"""

# ─── Detection ───────────────────────────────────────────────────────────────

TRIBUNAL_MARKERS = [
    "Tribunal Integration",
    "Tribunal Integration (Anti-Hallucination)",
]

VBC_MARKERS = [
    "Verification-Before-Completion",
    "VBC Protocol",
]


def has_tribunal_block(content: str) -> bool:
    return any(marker in content for marker in TRIBUNAL_MARKERS)


def has_vbc_block(content: str) -> bool:
    return any(marker in content for marker in VBC_MARKERS)


# ─── Output helpers ───────────────────────────────────────────────────────────

def header(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def skip(msg: str) -> None:
    print(f"  {YELLOW}⏭️  {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠️  {msg}{RESET}")


def fail(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


# ─── Core ────────────────────────────────────────────────────────────────────

def process_skill(skill_md: Path, dry_run: bool) -> str:
    """Process a single SKILL.md. Returns 'updated', 'skipped', or 'error'."""
    skill_name = skill_md.parent.name
    try:
        content = skill_md.read_text(encoding="utf-8")

        has_tribunal = has_tribunal_block(content)
        has_vbc = has_vbc_block(content)

        if has_tribunal and has_vbc:
            skip(f"{skill_name} — already has Tribunal + VBC blocks")
            return "skipped"

        missing = []
        if not has_tribunal:
            missing.append("Tribunal Integration")
        if not has_vbc:
            missing.append("VBC Protocol")

        if dry_run:
            warn(f"[DRY RUN] {skill_name} — would add: {', '.join(missing)}")
            return "updated"

        with skill_md.open("a", encoding="utf-8") as f:
            f.write(GUARDRAILS_BLOCK)

        ok(f"{skill_name} — strengthened ({', '.join(missing)} added)")
        return "updated"

    except Exception as e:
        fail(f"{skill_name} — {e}")
        return "error"


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Appends Tribunal guardrails (LLM Traps + Pre-Flight + VBC) to skills missing them"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Project root directory (default: current directory)"
    )
    parser.add_argument("--dry-run", action="store_true", help="Show changes without writing")
    parser.add_argument("--skill", help="Only strengthen a specific skill by name")
    parser.add_argument(
        "--skills-path",
        help="Override the skills directory path (default: <path>/.agent/skills)"
    )
    args = parser.parse_args()

    project_root = Path(args.path).resolve()
    skills_dir = (
        Path(args.skills_path).resolve()
        if args.skills_path
        else project_root / ".agent" / "skills"
    )

    if not skills_dir.is_dir():
        fail(f"Skills directory not found: {skills_dir}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — strengthen_skills.py{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}DRY RUN — no files will be written{RESET}")
    print(f"Skills dir: {skills_dir}\n")

    counts: dict[str, int] = {"updated": 0, "skipped": 0, "error": 0}

    header("Strengthening Skills")
    for skill_dir in sorted(skills_dir.iterdir()):
        if not skill_dir.is_dir():
            continue
        if args.skill and skill_dir.name != args.skill:
            continue
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            warn(f"{skill_dir.name} — no SKILL.md found")
            continue
        result = process_skill(skill_md, args.dry_run)
        counts[result] += 1

    print(f"\n{BOLD}━━━ Summary ━━━{RESET}")
    print(f"  {GREEN}✅ Strengthened: {counts['updated']}{RESET}")
    print(f"  {YELLOW}⏭️  Skipped:      {counts['skipped']}{RESET}")
    if counts["error"]:
        print(f"  {RED}❌ Errors:       {counts['error']}{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}(dry-run — nothing written){RESET}")

    sys.exit(1 if counts["error"] > 0 else 0)


if __name__ == "__main__":
    main()
