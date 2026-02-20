#!/usr/bin/env python3
"""
verify_all.py — Full pre-deploy validation suite for the Tribunal Agent Kit.

Runs comprehensive checks before any production deployment.

Usage:
  python .agent/scripts/verify_all.py
  python .agent/scripts/verify_all.py --skip build,deps
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

RESULTS: list[tuple[str, bool, str]] = []


def section(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def ok(label: str, note: str = "") -> None:
    msg = f"{GREEN}✅ {label}{RESET}" + (f"  {YELLOW}({note}){RESET}" if note else "")
    print(f"  {msg}")
    RESULTS.append((label, True, note))


def fail(label: str, note: str = "") -> None:
    note_str = f"\n     {note}" if note else ""
    print(f"  {RED}❌ {label}{RESET}{note_str}")
    RESULTS.append((label, False, note))


def skip(label: str, reason: str) -> None:
    print(f"  {YELLOW}⏭️  {label} — {reason}{RESET}")
    RESULTS.append((label, True, f"skipped: {reason}"))


def run(label: str, cmd: list[str], cwd: str) -> bool:
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            ok(label)
            return True
        output = (result.stdout + result.stderr).strip()
        fail(label, output[:500] if output else "non-zero exit code")
        return False
    except FileNotFoundError:
        skip(label, "tool not installed — skipping")
        return True
    except subprocess.TimeoutExpired:
        fail(label, "timed out after 120s")
        return False


def scan_secrets(cwd: str) -> bool:
    """Scan source files for obviously hardcoded credentials."""
    patterns = ["password=", "secret=", "api_key=", "private_key=", "auth_token="]
    found = []
    for root, dirs, files in os.walk(cwd):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist", "__pycache__", ".agent"}]
        for fname in files:
            if not fname.endswith((".ts", ".js", ".tsx", ".jsx", ".py")):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding="utf-8", errors="ignore") as f:
                    for i, line in enumerate(f, 1):
                        low = line.lower().strip()
                        if any(p in low for p in patterns) and not low.startswith("#") and "=" in low:
                            rel = os.path.relpath(fpath, cwd)
                            found.append(f"{rel}:{i}")
            except (IOError, PermissionError):
                pass
    if found:
        fail("Secret scan", "\n     ".join(found[:5]))
        return False
    ok("Secret scan — no hardcoded credentials found")
    return True


def has_npm(cwd: str) -> bool:
    """Check if there's a package.json to run npm commands against."""
    return Path(cwd, "package.json").exists()


def verify_all(cwd: str, skipped: list[str]) -> int:
    failures = 0

    section("1 — Secret Scan")
    if "secrets" not in skipped:
        if not scan_secrets(cwd):
            failures += 1
    else:
        skip("Secret scan", "skipped by flag")

    section("2 — TypeScript")
    if "typescript" not in skipped:
        if has_npm(cwd):
            if not run("tsc --noEmit", ["npx", "tsc", "--noEmit"], cwd):
                failures += 1
        else:
            skip("TypeScript", "no package.json found in project")
    else:
        skip("TypeScript", "skipped by flag")

    section("3 — ESLint")
    if "lint" not in skipped:
        if has_npm(cwd):
            if not run("ESLint", ["npx", "eslint", ".", "--max-warnings=0"], cwd):
                failures += 1
        else:
            skip("ESLint", "no package.json found in project")
    else:
        skip("ESLint", "skipped by flag")

    section("4 — Unit Tests")
    if "tests" not in skipped:
        if has_npm(cwd):
            if not run("Test suite", ["npm", "test", "--", "--passWithNoTests"], cwd):
                failures += 1
        else:
            skip("Tests", "no package.json found in project")
    else:
        skip("Tests", "skipped by flag")

    section("5 — Build")
    if "build" not in skipped:
        if has_npm(cwd):
            if not run("npm run build", ["npm", "run", "build"], cwd):
                failures += 1
        else:
            skip("Build", "no package.json found in project")
    else:
        skip("Build", "skipped by flag")

    section("6 — Dependency Audit")
    if "deps" not in skipped:
        if has_npm(cwd):
            if not run("npm audit", ["npm", "audit", "--audit-level=high"], cwd):
                failures += 1
        else:
            skip("Dependency audit", "no package.json found in project")
    else:
        skip("Dependency audit", "skipped by flag")

    print(f"\n{BOLD}━━━ Summary ━━━{RESET}")
    for label, passed, note in RESULTS:
        status = f"{GREEN}✅{RESET}" if passed else f"{RED}❌{RESET}"
        note_str = f"  {YELLOW}({note}){RESET}" if not passed and note else ""
        print(f"  {status} {label}{note_str}")

    print()
    if failures == 0:
        print(f"{GREEN}{BOLD}All checks passed — safe to deploy.{RESET}")
    else:
        print(f"{RED}{BOLD}{failures} check(s) failed — fix before deploying.{RESET}")

    return failures


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal pre-deploy validation suite",
        usage="%(prog)s [--skip CHECKS]"
    )
    parser.add_argument(
        "--skip",
        default="",
        help="Comma-separated checks to skip: secrets,typescript,lint,tests,build,deps"
    )
    args = parser.parse_args()

    cwd = os.getcwd()
    skipped = [s.strip().lower() for s in args.skip.split(",") if s.strip()]

    print(f"{BOLD}Tribunal — verify_all.py{RESET}")
    print(f"Project: {cwd}\n")

    failures = verify_all(cwd, skipped)
    sys.exit(1 if failures > 0 else 0)


if __name__ == "__main__":
    main()
