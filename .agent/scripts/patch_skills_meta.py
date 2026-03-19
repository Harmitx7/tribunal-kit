#!/usr/bin/env python3
"""
patch_skills_meta.py — Injects version/freshness metadata into SKILL.md frontmatter.

Adds the following fields to YAML frontmatter if missing:
  version: 1.0.0
  last-updated: 2026-03-12
  applies-to-model: gemini-2.5-pro, claude-3-7-sonnet

Usage:
  python .agent/scripts/patch_skills_meta.py .
  python .agent/scripts/patch_skills_meta.py . --dry-run
  python .agent/scripts/patch_skills_meta.py . --skill python-pro
"""

import os
import sys
import argparse
import re
from pathlib import Path

RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

META_FIELDS = {
    "version":           "1.0.0",
    "last-updated":      "2026-03-12",
    "applies-to-model":  "gemini-2.5-pro, claude-3-7-sonnet",
}


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


def patch_frontmatter(content: str) -> tuple[str, list[str]]:
    """
    Parse the YAML frontmatter block and inject missing meta fields.
    Returns (patched_content, list_of_added_fields).
    If no frontmatter is found, injects a minimal one.
    """
    added: list[str] = []

    # Match frontmatter block: starts and ends with ---
    fm_pattern = re.compile(r"^---\r?\n(.*?)\r?\n---", re.DOTALL)
    match = fm_pattern.match(content)

    if not match:
        # No frontmatter — prepend a minimal block
        new_fm_lines = ["---"]
        for key, value in META_FIELDS.items():
            new_fm_lines.append(f"{key}: {value}")
            added.append(key)
        new_fm_lines.append("---")
        new_fm = "\n".join(new_fm_lines)
        return new_fm + "\n\n" + content, added

    fm_text = match.group(1)
    fm_end = match.end()

    # Parse existing lines preserving order
    existing_keys = set()
    for line in fm_text.splitlines():
        m = re.match(r"^([a-zA-Z0-9_-]+)\s*:", line)
        if m:
            existing_keys.add(m.group(1))

    # Build new frontmatter
    new_fm_lines = fm_text.rstrip().splitlines()
    for key, value in META_FIELDS.items():
        if key not in existing_keys:
            new_fm_lines.append(f"{key}: {value}")
            added.append(key)

    if not added:
        return content, []

    new_fm_block = "---\n" + "\n".join(new_fm_lines) + "\n---"
    patched = new_fm_block + content[fm_end:]
    return patched, added


def process_skill(skill_path: Path, dry_run: bool) -> str:
    """Process a single SKILL.md. Returns 'updated', 'skipped', or 'error'."""
    try:
        content = skill_path.read_text(encoding="utf-8")
        patched, added = patch_frontmatter(content)

        skill_name = skill_path.parent.name

        if not added:
            skip(f"{skill_name} — all meta fields present")
            return "skipped"

        field_list = ", ".join(added)
        if dry_run:
            warn(f"[DRY RUN] {skill_name} — would add: {field_list}")
            return "updated"

        skill_path.write_text(patched, encoding="utf-8")
        ok(f"{skill_name} — added: {field_list}")
        return "updated"

    except Exception as e:
        fail(f"{skill_path.parent.name} — {e}")
        return "error"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Injects version/freshness metadata into SKILL.md frontmatter"
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

    print(f"{BOLD}Tribunal — patch_skills_meta.py{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}DRY RUN — no files will be written{RESET}")
    print(f"Skills dir: {skills_dir}\n")

    counts = {"updated": 0, "skipped": 0, "error": 0}

    header("Patching Frontmatter")
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
    print(f"  {GREEN}✅ Updated:  {counts['updated']}{RESET}")
    print(f"  {YELLOW}⏭️  Skipped:  {counts['skipped']}{RESET}")
    if counts["error"]:
        print(f"  {RED}❌ Errors:   {counts['error']}{RESET}")
    if args.dry_run:
        print(f"  {YELLOW}(dry-run — nothing written){RESET}")

    sys.exit(1 if counts["error"] > 0 else 0)


if __name__ == "__main__":
    main()
