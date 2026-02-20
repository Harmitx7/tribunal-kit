#!/usr/bin/env python3
"""
checklist.py — Priority-based project audit runner for the Tribunal Agent Kit.

Runs a tiered audit sequence:
  Priority 1: Security
  Priority 2: Lint
  Priority 3: Schema validation
  Priority 4: Tests
  Priority 5: UX / Accessibility
  Priority 6: SEO
  Priority 7: Lighthouse / E2E (requires --url)

Usage:
  python .agent/scripts/checklist.py .
  python .agent/scripts/checklist.py . --url http://localhost:3000
  python .agent/scripts/checklist.py . --skip security,seo
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# ━━━ ANSI color output ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_header(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def print_ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def print_fail(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


def print_skip(msg: str) -> None:
    print(f"  {YELLOW}⏭️  Skipped: {msg}{RESET}")


def run_check(label: str, cmd: list[str], cwd: str) -> bool:
    """Run a shell command and return True if it exits with code 0."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            print_ok(f"{label} passed")
            return True
        else:
            print_fail(f"{label} failed")
            if result.stdout.strip():
                print(f"    {result.stdout.strip()[:500]}")
            if result.stderr.strip():
                print(f"    {result.stderr.strip()[:500]}")
            return False
    except FileNotFoundError:
        print_skip(f"{label} — command not found (tool not installed)")
        return True  # Don't block on tools that aren't installed
    except subprocess.TimeoutExpired:
        print_fail(f"{label} — timed out after 60s")
        return False


def check_secrets(project_root: str) -> bool:
    """Scan for hardcoded secrets in source files."""
    print_header("Security — Secret Scan")
    dangerous_patterns = [
        "password=",
        "secret=",
        "api_key=",
        "apikey=",
        "AUTH_TOKEN=",
        "PRIVATE_KEY=",
    ]
    found_issues = False
    source_extensions = {".ts", ".tsx", ".js", ".jsx", ".py", ".env"}

    for root, dirs, files in os.walk(project_root):
        # Skip known-safe directories
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", ".agent", "dist", "__pycache__"}]
        for filename in files:
            if not any(filename.endswith(ext) for ext in source_extensions):
                continue
            if filename.startswith(".env"):
                continue  # .env files are allowed to have these
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        line_lower = line.lower().strip()
                        if any(pattern in line_lower for pattern in dangerous_patterns):
                            # Only flag if it looks like an actual value (contains = and a non-empty value)
                            if "=" in line and not line_lower.strip().startswith("#"):
                                rel = os.path.relpath(filepath, project_root)
                                print_fail(f"Possible secret: {rel}:{line_num} → {line.strip()[:80]}")
                                found_issues = True
            except (IOError, PermissionError):
                pass

    if not found_issues:
        print_ok("No hardcoded secrets detected")
    return not found_issues


def run_all(project_root: str, url: str | None, skip: list[str]) -> int:
    """Run all checklist tiers. Returns number of failures."""
    failures = 0

    # Priority 1 — Security
    if "security" not in skip:
        print_header("Priority 1 — Security")
        if not check_secrets(project_root):
            failures += 1
    else:
        print_skip("Security tier")

    # Priority 2 — Lint
    if "lint" not in skip:
        print_header("Priority 2 — Lint")
        if not run_check("ESLint", ["npx", "eslint", ".", "--max-warnings=0"], project_root):
            failures += 1
        if not run_check("TypeScript", ["npx", "tsc", "--noEmit"], project_root):
            failures += 1
    else:
        print_skip("Lint tier")

    # Priority 3 — Schema
    if "schema" not in skip:
        print_header("Priority 3 — Schema")
        print_skip("Schema check — run manually if you have DB migrations")
    else:
        print_skip("Schema tier")

    # Priority 4 — Tests
    if "tests" not in skip:
        print_header("Priority 4 — Tests")
        if not run_check("Test suite", ["npm", "test", "--", "--passWithNoTests"], project_root):
            failures += 1
    else:
        print_skip("Tests tier")

    # Priority 5 — UX
    if "ux" not in skip:
        print_header("Priority 5 — UX / Accessibility")
        print_skip("UX audit — run /preview start then check manually or with Lighthouse")
    else:
        print_skip("UX tier")

    # Priority 6 — SEO
    if "seo" not in skip:
        print_header("Priority 6 — SEO")
        print_skip("SEO check — use /ui-ux-pro-max for SEO-sensitive pages")
    else:
        print_skip("SEO tier")

    # Priority 7 — Lighthouse / E2E
    if url and "e2e" not in skip:
        print_header("Priority 7 — Lighthouse / E2E")
        if not run_check("Playwright E2E", ["npx", "playwright", "test"], project_root):
            failures += 1
    elif not url:
        print_skip("E2E / Lighthouse — pass --url to enable")

    # ━━━ Summary ━━━
    print(f"\n{BOLD}━━━ Checklist Summary ━━━{RESET}")
    if failures == 0:
        print_ok(f"All checks passed — ready to proceed")
    else:
        print_fail(f"{failures} tier(s) failed — fix Critical issues before proceeding")

    return failures


def main() -> None:
    parser = argparse.ArgumentParser(description="Tribunal project checklist runner")
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--url", help="Local server URL for Lighthouse/E2E checks", default=None)
    parser.add_argument("--skip", help="Comma-separated tiers to skip (security,lint,schema,tests,ux,seo,e2e)", default="")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        print_fail(f"Directory not found: {project_root}")
        sys.exit(1)

    skip = [s.strip().lower() for s in args.skip.split(",") if s.strip()]

    print(f"{BOLD}Tribunal Checklist — {project_root}{RESET}")
    failures = run_all(project_root, args.url, skip)
    sys.exit(1 if failures > 0 else 0)


if __name__ == "__main__":
    main()
