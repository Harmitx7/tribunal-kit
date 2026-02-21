#!/usr/bin/env python3
"""
lint_runner.py — Standalone lint runner for the Tribunal Agent Kit.

Detects and runs available linters in the project:
  - ESLint (JS/TS)
  - Prettier (formatting)
  - Ruff / Flake8 (Python)

Usage:
  python .agent/scripts/lint_runner.py .
  python .agent/scripts/lint_runner.py . --fix
  python .agent/scripts/lint_runner.py . --files src/index.ts src/utils.ts
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def header(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def fail(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


def skip(msg: str) -> None:
    print(f"  {YELLOW}⏭️  {msg}{RESET}")


def run_linter(label: str, cmd: list[str], cwd: str) -> bool:
    """Run a linter command and return True if it passes."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            ok(f"{label} — clean")
            return True
        fail(f"{label} — issues found")
        output = (result.stdout + result.stderr).strip()
        if output:
            for line in output.split("\n")[:15]:
                print(f"    {line}")
            total_lines = len(output.split("\n"))
            if total_lines > 15:
                print(f"    ... and {total_lines - 15} more lines")
        return False
    except FileNotFoundError:
        skip(f"{label} — tool not installed")
        return True
    except subprocess.TimeoutExpired:
        fail(f"{label} — timed out after 120s")
        return False


def detect_linters(project_root: str) -> dict[str, bool]:
    """Detect which linters are available in the project."""
    root = Path(project_root)
    available: dict[str, bool] = {}

    # JS/TS linters
    pkg_json = root / "package.json"
    if pkg_json.exists():
        available["eslint"] = any(
            (root / f).exists()
            for f in [".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js", "eslint.config.mjs"]
        ) or pkg_json.exists()  # ESLint can be configured in package.json too
        available["prettier"] = any(
            (root / f).exists()
            for f in [".prettierrc", ".prettierrc.js", ".prettierrc.json", "prettier.config.js"]
        )

    # Python linters
    available["ruff"] = (root / "pyproject.toml").exists() or (root / "ruff.toml").exists()
    available["flake8"] = (root / ".flake8").exists() or (root / "setup.cfg").exists()

    return available


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal lint runner — detects and runs available linters"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--fix", action="store_true", help="Auto-fix issues where supported")
    parser.add_argument("--files", nargs="*", help="Specific files to lint (instead of entire project)")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        fail(f"Directory not found: {project_root}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — lint_runner.py{RESET}")
    print(f"Project: {project_root}")

    available = detect_linters(project_root)
    if not any(available.values()):
        skip("No linter configuration detected in this project")
        sys.exit(0)

    failures = 0
    file_args = args.files or []

    # ESLint
    if available.get("eslint"):
        header("ESLint")
        cmd = ["npx", "eslint"]
        if args.fix:
            cmd.append("--fix")
        if file_args:
            cmd.extend(file_args)
        else:
            cmd.extend([".", "--max-warnings=0"])
        if not run_linter("ESLint", cmd, project_root):
            failures += 1

    # Prettier
    if available.get("prettier"):
        header("Prettier")
        cmd = ["npx", "prettier"]
        if args.fix:
            cmd.extend(["--write", "."])
        else:
            cmd.extend(["--check", "."])
        if file_args:
            cmd = ["npx", "prettier", "--write" if args.fix else "--check"] + file_args
        if not run_linter("Prettier", cmd, project_root):
            failures += 1

    # Ruff (Python)
    if available.get("ruff"):
        header("Ruff (Python)")
        cmd = ["ruff", "check"]
        if args.fix:
            cmd.append("--fix")
        if file_args:
            cmd.extend(file_args)
        else:
            cmd.append(".")
        if not run_linter("Ruff", cmd, project_root):
            failures += 1

    # Flake8 (Python fallback)
    if available.get("flake8") and not available.get("ruff"):
        header("Flake8 (Python)")
        cmd = ["flake8"]
        if file_args:
            cmd.extend(file_args)
        else:
            cmd.append(".")
        if not run_linter("Flake8", cmd, project_root):
            failures += 1

    # TypeScript type check (always run if package.json exists)
    if Path(project_root, "package.json").exists():
        header("TypeScript")
        if not run_linter("tsc --noEmit", ["npx", "tsc", "--noEmit"], project_root):
            failures += 1

    # Summary
    print(f"\n{BOLD}━━━ Lint Summary ━━━{RESET}")
    if failures == 0:
        ok("All linters passed")
    else:
        fail(f"{failures} linter(s) reported issues")

    sys.exit(1 if failures > 0 else 0)


if __name__ == "__main__":
    main()
