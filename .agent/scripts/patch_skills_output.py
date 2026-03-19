#!/usr/bin/env python3
"""
patch_skills_output.py — Adds structured Output Format sections to SKILL.md files.

Inserts a domain-tailored '## Output Format' block before the Tribunal Integration
section (or appends to the end if no Tribunal section is present).

Skills already containing '## Output Format', '## Output', or '## Report Format'
are skipped automatically.

Usage:
  python .agent/scripts/patch_skills_output.py .
  python .agent/scripts/patch_skills_output.py . --dry-run
  python .agent/scripts/patch_skills_output.py . --skill python-pro
"""

import os
import sys
import re
import argparse
from pathlib import Path

RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

# ─── Templates ───────────────────────────────────────────────────────────────

CODE_QUALITY_TEMPLATE = """\
## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ {skill_name} Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       {skill_name}
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

"""

DECISION_CARD_TEMPLATE = """\
## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ {skill_name} Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```

"""

GENERIC_TEMPLATE = """\
## Output Format

When this skill completes a task, structure your output as:

```
━━━ {skill_name} Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```

"""

# ─── Skill → template routing ────────────────────────────────────────────────

CODE_GEN_SKILLS = {
    "python-pro", "clean-code", "dotnet-core-expert", "rust-pro",
    "nextjs-react-expert", "vue-expert", "react-specialist",
    "csharp-developer", "nodejs-best-practices", "python-patterns",
    "tailwind-patterns", "bash-linux", "powershell-windows",
    "llm-engineering", "mcp-builder", "game-development",
    "edge-computing", "local-first", "realtime-patterns",
    "tdd-workflow", "testing-patterns", "lint-and-validate",
}

DECISION_SKILLS = {
    "api-patterns", "database-design", "architecture", "observability",
    "devops-engineer", "platform-engineer", "deployment-procedures",
    "server-management", "security-auditor", "vulnerability-scanner",
    "red-team-tactics", "performance-profiling", "i18n-localization",
    "geo-fundamentals", "seo-fundamentals", "sql-pro",
    "brainstorming", "plan-writing", "behavioral-modes",
    "app-builder", "intelligent-routing", "mobile-design",
    "frontend-design", "ui-ux-pro-max", "ui-ux-researcher",
    "web-design-guidelines", "trend-researcher",
}

# Skills that already have output format sections — SKIP
ALREADY_HAVE_OUTPUT = {
    "whimsy-injector", "workflow-optimizer",
}

# Markers indicating an existing output section
EXISTING_OUTPUT_MARKERS = [
    "## Output Format",
    "## Output\n",
    "## Report Format",
    "## Output Card",
    "Whimsy Injection Report",
    "Workflow Optimization Report",
]

# ─── Logic ───────────────────────────────────────────────────────────────────

def get_template(skill_name: str) -> str:
    if skill_name in CODE_GEN_SKILLS:
        return CODE_QUALITY_TEMPLATE
    if skill_name in DECISION_SKILLS:
        return DECISION_CARD_TEMPLATE
    return GENERIC_TEMPLATE


def has_output_section(content: str) -> bool:
    for marker in EXISTING_OUTPUT_MARKERS:
        if marker in content:
            return True
    return False


def get_skill_name_from_frontmatter(content: str) -> str | None:
    """Extract the 'name:' field from YAML frontmatter."""
    match = re.search(r"^name:\s*(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else None


def build_block(template: str, skill_name: str) -> str:
    # Capitalise display name
    display = skill_name.replace("-", " ").title()
    return template.replace("{skill_name}", display)


def inject_output_block(content: str, block: str) -> str:
    """
    Insert block before '## 🏛️ Tribunal Integration' if present,
    otherwise append to end of file.
    """
    tribunal_markers = [
        "## 🏛️ Tribunal Integration",
        "## Tribunal Integration",
    ]
    for marker in tribunal_markers:
        idx = content.find(marker)
        if idx != -1:
            return content[:idx] + block + "\n---\n\n" + content[idx:]

    # Append to end with a separator
    return content.rstrip() + "\n\n---\n\n" + block


def process_skill(skill_dir: Path, dry_run: bool) -> str:
    """Returns 'updated', 'skipped', or 'error'."""
    skill_name = skill_dir.name
    skill_md = skill_dir / "SKILL.md"

    if not skill_md.exists():
        return "skipped"

    try:
        content = skill_md.read_text(encoding="utf-8")

        if skill_name in ALREADY_HAVE_OUTPUT or has_output_section(content):
            skip(f"{skill_name} — output format already present")
            return "skipped"

        # Determine display name
        display_name = get_skill_name_from_frontmatter(content) or skill_name
        template = get_template(skill_name)
        block = build_block(template, display_name)
        patched = inject_output_block(content, block)

        if dry_run:
            template_type = (
                "Code Quality" if skill_name in CODE_GEN_SKILLS
                else "Decision Card" if skill_name in DECISION_SKILLS
                else "Generic"
            )
            warn(f"[DRY RUN] {skill_name} — would add Output Format ({template_type})")
            return "updated"

        skill_md.write_text(patched, encoding="utf-8")
        template_type = (
            "Code Quality" if skill_name in CODE_GEN_SKILLS
            else "Decision Card" if skill_name in DECISION_SKILLS
            else "Generic"
        )
        ok(f"{skill_name} — added Output Format ({template_type})")
        return "updated"

    except Exception as e:
        fail(f"{skill_name} — {e}")
        return "error"


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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Adds Output Format sections to SKILL.md files that are missing them"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--dry-run", action="store_true", help="Show changes without writing")
    parser.add_argument("--skill", help="Only patch a specific skill by name")
    args = parser.parse_args()

    project_root = Path(args.path).resolve()
    skills_dir = project_root / ".agent" / "skills"

    if not skills_dir.is_dir():
        fail(f"Skills directory not found: {skills_dir}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — patch_skills_output.py{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}DRY RUN — no files will be written{RESET}")
    print(f"Skills dir: {skills_dir}\n")

    counts: dict[str, int] = {"updated": 0, "skipped": 0, "error": 0}

    header("Patching Output Format Sections")
    for skill_dir in sorted(skills_dir.iterdir()):
        if not skill_dir.is_dir():
            continue
        if args.skill and skill_dir.name != args.skill:
            continue
        result = process_skill(skill_dir, args.dry_run)
        counts[result] += 1

    print(f"\n{BOLD}━━━ Summary ━━━{RESET}")
    print(f"  {GREEN}✅ Updated:  {counts['updated']}{RESET}")
    print(f"  {YELLOW}⏭️  Skipped:  {counts['skipped']}{RESET}")
    if counts["error"]:
        print(f"  {RED}❌ Errors:   {counts['error']}{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}(dry-run — nothing written){RESET}")

    sys.exit(1 if counts["error"] > 0 else 0)


if __name__ == "__main__":
    main()
