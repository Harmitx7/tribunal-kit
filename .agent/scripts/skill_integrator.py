#!/usr/bin/env python3
"""
skill_integrator.py — Automated Skill-Script Integration Analyzer

This script scans active skills in `.agent/skills/` and maps them to their 
corresponding executable scripts in `.agent/scripts/`. It helps the Orchestrator
and other agents know which skills have automated CLI actions available.

Usage:
  python .agent/scripts/skill_integrator.py
  python .agent/scripts/skill_integrator.py --skill <skill-name>
"""

import os
import sys
import re
import argparse
from pathlib import Path

# Colors for terminal output
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"


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
                # Basic parsing for frontmatter
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
    
    for item in skills_dir.iterdir():
        if item.is_dir():
            script_path = get_associated_script(item, scripts_dir)
            if script_path:
                integrated_skills[item.name] = script_path
                
    return integrated_skills


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


def main():
    parser = argparse.ArgumentParser(description="Skill-Script Integrator")
    parser.add_argument("--skill", type=str, help="Validate a specific skill by name")
    parser.add_argument("--workspace", type=str, default=".", help="Workspace root directory")
    
    args = parser.parse_args()
    workspace_root = Path(args.workspace).resolve()
    
    agent_dir = find_agent_dir(workspace_root)
    if not agent_dir:
        print(f"{YELLOW}Error: Could not find .agent directory starting from {workspace_root}{RESET}")
        sys.exit(1)
        
    if args.skill:
        check_skill(args.skill, agent_dir)
    else:
        integrated_skills = scan_all_skills(agent_dir)
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
