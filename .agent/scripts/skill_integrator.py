#!/usr/bin/env python3
"""
skill_integrator.py — Automated Skill-Script Integration Analyzer

This script scans active skills in `.agent/skills/` and maps them to their 
corresponding executable scripts in `.agent/scripts/`. It helps the Orchestrator
and other agents know which skills have automated CLI actions available.

Usage:
  python .agent/scripts/skill_integrator.py
  python .agent/scripts/skill_integrator.py --skill <skill-name>
  python .agent/scripts/skill_integrator.py --report
  python .agent/scripts/skill_integrator.py --verify
  python .agent/scripts/skill_integrator.py --report --verify
"""

import ast
import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Colors for terminal output
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
BOLD    = "\033[1m"
RESET   = "\033[0m"

REPORT_FILE = "skill-integration-report.md"


def find_agent_dir(start_path: Path) -> Path:
    current = start_path.resolve()
    while current != current.parent:
        agent_dir = current / '.agent'
        if agent_dir.exists() and agent_dir.is_dir():
            return agent_dir
        current = current.parent
    return None


def get_associated_script(skill_dir: Path, scripts_dir: Path) -> str:
    """Check if the skill has an explicit frontmatter script or an implicit script file."""
    skill_name = skill_dir.name

    # 1. Implicit check: does a script with the same name exist?
    implicit_script = scripts_dir / f"{skill_name}.py"
    if implicit_script.exists():
        return f".agent/scripts/{skill_name}.py"

    # 2. Explicit check: does the SKILL.md define 'script:' in its frontmatter?
    skill_md = skill_dir / "SKILL.md"
    if skill_md.exists():
        try:
            with open(skill_md, "r", encoding="utf-8") as f:
                content = f.read()
                match = re.search(r"---(.*?)---", content, re.DOTALL)
                if match:
                    frontmatter = match.group(1)
                    script_match = re.search(r"(?:^|\n)script:\s*([^\n]+)", frontmatter)
                    if script_match:
                        return script_match.group(1).strip()
        except Exception:
            pass

    return None


def scan_all_skills(agent_dir: Path) -> dict:
    skills_dir = agent_dir / "skills"
    scripts_dir = agent_dir / "scripts"

    if not skills_dir.exists() or not scripts_dir.exists():
        print(f"{YELLOW}Warning: '.agent/skills' or '.agent/scripts' directory not found.{RESET}")
        return {}

    integrated_skills = {}

    for item in sorted(skills_dir.iterdir()):
        if item.is_dir():
            script_path = get_associated_script(item, scripts_dir)
            if script_path:
                integrated_skills[item.name] = script_path

    return integrated_skills


def verify_script(script_path_str: str, workspace_root: Path) -> tuple[bool, str]:
    """
    Verify a mapped script exists on disk and has valid Python syntax.
    Returns (is_valid: bool, message: str).
    """
    # Resolve relative path from workspace root
    script_path = workspace_root / script_path_str

    if not script_path.exists():
        return False, f"File not found: {script_path}"

    try:
        source = script_path.read_text(encoding="utf-8")
        ast.parse(source)
        return True, "Syntax OK"
    except SyntaxError as e:
        return False, f"Syntax error at line {e.lineno}: {e.msg}"
    except Exception as e:
        return False, f"Parse error: {e}"


def check_skill(skill_name: str, agent_dir: Path) -> None:
    skill_dir = agent_dir / "skills" / skill_name
    scripts_dir = agent_dir / "scripts"

    if not skill_dir.exists():
        print(f"{YELLOW}Skill '{skill_name}' not found in .agent/skills/{RESET}")
        return

    script_path = get_associated_script(skill_dir, scripts_dir)
    if script_path:
        print(f"{GREEN}✓ Associated script found:{RESET} {script_path}")
        print(f"\nTo execute:\n  python {script_path}")
    else:
        print(f"No executable script mapped for '{skill_name}'.")


def cmd_report(integrated_skills: dict, workspace_root: Path) -> None:
    """Write a Markdown integration report to REPORT_FILE."""
    lines = [
        "# Skill-Script Integration Report\n",
        f"Generated: {datetime.now().isoformat()[:16]}\n",
        f"Integrated skills: {len(integrated_skills)}\n",
        "\n---\n",
        "\n| Skill | Script | Exists |\n",
        "|---|---|---|\n",
    ]

    for skill, script in sorted(integrated_skills.items()):
        script_path = workspace_root / script
        exists = "✅" if script_path.exists() else "❌ Missing"
        lines.append(f"| `{skill}` | `{script}` | {exists} |\n")

    lines.append("\n---\n")
    lines.append(f"\n_Run `python .agent/scripts/skill_integrator.py --verify` to validate syntax of all mapped scripts._\n")

    content = "".join(lines)
    report_path = workspace_root / REPORT_FILE
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"{GREEN}✅ Report written to:{RESET} {report_path}")


def cmd_verify(integrated_skills: dict, workspace_root: Path) -> bool:
    """
    Validate each mapped script: check existence and Python syntax.
    Returns True if all pass, False if any fail.
    """
    if not integrated_skills:
        print(f"{YELLOW}No integrated scripts found to verify.{RESET}")
        return True

    print(f"\n{BOLD}{CYAN}━━━ Skill-Script Verification ({len(integrated_skills)} scripts) ━━━{RESET}\n")

    all_passed = True
    for skill, script in sorted(integrated_skills.items()):
        ok, msg = verify_script(script, workspace_root)
        if ok:
            print(f"  {GREEN}✅ PASS{RESET}  {BOLD}{skill}{RESET} → {script}")
        else:
            print(f"  {RED}❌ FAIL{RESET}  {BOLD}{skill}{RESET} → {script}")
            print(f"         {RED}{msg}{RESET}")
            all_passed = False

    print(f"\n{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    if all_passed:
        print(f"{GREEN}All {len(integrated_skills)} mapped scripts passed verification.{RESET}\n")
    else:
        failed = sum(1 for s, p in integrated_skills.items() if not verify_script(p, workspace_root)[0])
        print(f"{RED}{failed} script(s) failed verification. Fix before deploying.{RESET}\n")

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Skill-Script Integrator")
    parser.add_argument("--skill",     type=str, help="Validate a specific skill by name")
    parser.add_argument("--workspace", type=str, default=".", help="Workspace root directory")
    parser.add_argument("--report",    action="store_true",
                        help=f"Generate a Markdown integration report ({REPORT_FILE})")
    parser.add_argument("--verify",    action="store_true",
                        help="Validate syntax of all mapped scripts (exits 1 on any failure)")

    args = parser.parse_args()
    workspace_root = Path(args.workspace).resolve()

    agent_dir = find_agent_dir(workspace_root)
    if not agent_dir:
        print(f"{YELLOW}Error: Could not find .agent directory starting from {workspace_root}{RESET}")
        sys.exit(1)

    if args.skill:
        check_skill(args.skill, agent_dir)
        return

    integrated_skills = scan_all_skills(agent_dir)

    # --report: always runs first (independent of --verify)
    if args.report:
        cmd_report(integrated_skills, workspace_root)

    # --verify: validate all mapped scripts
    if args.verify:
        passed = cmd_verify(integrated_skills, workspace_root)
        if not passed:
            sys.exit(1)
        return

    # Default: print to terminal (original behaviour)
    if not args.report and not args.verify:
        if not integrated_skills:
            print("No integrated scripts found for any active skills.")
        else:
            print(f"\n{BOLD}{CYAN}--- Skill-Script Integrations ({len(integrated_skills)}) ---{RESET}\n")
            for skill, script in sorted(integrated_skills.items()):
                print(f" {BOLD}{skill}{RESET}")
                print(f"   ↳ {GREEN}{script}{RESET}\n")
            print(f"{CYAN}To run a skill script, use: python <path>{RESET}\n")


if __name__ == "__main__":
    main()
