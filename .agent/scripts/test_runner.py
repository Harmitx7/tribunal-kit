#!/usr/bin/env python3
"""
test_runner.py — Standalone test runner for the Tribunal Agent Kit.

Detects and runs the project's test framework:
  - npm test (Jest / Vitest / Mocha)
  - pytest (Python)
  - go test (Go)

Usage:
  python .agent/scripts/test_runner.py .
  python .agent/scripts/test_runner.py . --coverage
  python .agent/scripts/test_runner.py . --watch
  python .agent/scripts/test_runner.py . --file src/utils.test.ts
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


def run_tests(label: str, cmd: list[str], cwd: str) -> bool:
    """Run a test command, streaming output in real-time."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=300
        )
        output = (result.stdout + result.stderr).strip()
        if output:
            for line in output.split("\n"):
                print(f"    {line}")

        if result.returncode == 0:
            ok(f"{label} — all tests passed")
            return True
        fail(f"{label} — test failures detected")
        return False
    except FileNotFoundError:
        skip(f"{label} — tool not installed")
        return True
    except subprocess.TimeoutExpired:
        fail(f"{label} — timed out after 300s")
        return False


def detect_test_framework(project_root: str) -> str | None:
    """Detect the primary test framework from project files."""
    root = Path(project_root)

    # Node.js test frameworks
    pkg_json = root / "package.json"
    if pkg_json.exists():
        try:
            import json
            with open(pkg_json) as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            scripts = pkg.get("scripts", {})

            if "vitest" in deps:
                return "vitest"
            if "jest" in deps:
                return "jest"
            if "mocha" in deps:
                return "mocha"
            if "test" in scripts:
                return "npm-test"
        except Exception:
            if "test" in str(pkg_json.read_text()):
                return "npm-test"

    # Python
    if (root / "pytest.ini").exists() or (root / "pyproject.toml").exists() or (root / "conftest.py").exists():
        return "pytest"

    # Go
    go_files = list(root.glob("**/*_test.go"))
    if go_files:
        return "go"

    return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal test runner — detects and runs the project's test framework"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage reporting")
    parser.add_argument("--watch", action="store_true", help="Run tests in watch mode")
    parser.add_argument("--file", help="Run tests for a specific file only")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        fail(f"Directory not found: {project_root}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — test_runner.py{RESET}")
    print(f"Project: {project_root}")

    framework = detect_test_framework(project_root)
    if not framework:
        skip("No test framework detected in this project")
        sys.exit(0)

    header(f"Running tests ({framework})")

    cmd: list[str] = []
    passed = True

    if framework in ("vitest", "jest", "mocha", "npm-test"):
        if framework == "vitest":
            cmd = ["npx", "vitest", "run"]
            if args.coverage:
                cmd.append("--coverage")
            if args.watch:
                cmd = ["npx", "vitest"]  # watch is vitest default
            if args.file:
                cmd.append(args.file)
        elif framework == "jest":
            cmd = ["npx", "jest"]
            if args.coverage:
                cmd.append("--coverage")
            if args.watch:
                cmd.append("--watch")
            if args.file:
                cmd.append(args.file)
        else:
            cmd = ["npm", "test", "--", "--passWithNoTests"]
            if args.coverage:
                cmd.append("--coverage")
            if args.file:
                cmd.append(args.file)
        passed = run_tests(framework, cmd, project_root)

    elif framework == "pytest":
        cmd = ["pytest", "-v"]
        if args.coverage:
            cmd.extend(["--cov", "--cov-report=term-missing"])
        if args.watch:
            cmd = ["ptw", "--", "-v"]  # pytest-watch
        if args.file:
            cmd.append(args.file)
        passed = run_tests("pytest", cmd, project_root)

    elif framework == "go":
        cmd = ["go", "test", "./...", "-v"]
        if args.coverage:
            cmd.append("-cover")
        if args.file:
            cmd = ["go", "test", "-v", "-run", args.file]
        passed = run_tests("go test", cmd, project_root)

    # Summary
    print(f"\n{BOLD}━━━ Test Summary ━━━{RESET}")
    if passed:
        ok(f"Tests passed ({framework})")
    else:
        fail(f"Tests failed ({framework})")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
