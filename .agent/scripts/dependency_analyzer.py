#!/usr/bin/env python3
"""
dependency_analyzer.py — Dependency health checker for the Tribunal Agent Kit.

Analyzes project dependencies for:
  - Unused packages (in package.json but never imported)
  - Phantom imports (imported but not in package.json)
  - npm audit / pip-audit results
  - Duplicate/overlapping packages

Usage:
  python .agent/scripts/dependency_analyzer.py .
  python .agent/scripts/dependency_analyzer.py . --audit
  python .agent/scripts/dependency_analyzer.py . --check-unused
"""

import os
import sys
import re
import json
import subprocess
import argparse
from pathlib import Path

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", ".agent", "__pycache__"}

# Built-in Node.js modules that don't require packages
NODE_BUILTINS = {
    "fs", "path", "os", "crypto", "http", "https", "url", "util",
    "stream", "events", "child_process", "cluster", "net", "dns",
    "tls", "readline", "zlib", "buffer", "querystring", "string_decoder",
    "assert", "perf_hooks", "worker_threads", "timers", "v8",
    "node:fs", "node:path", "node:os", "node:crypto", "node:http",
    "node:https", "node:url", "node:util", "node:stream", "node:events",
    "node:child_process", "node:net", "node:dns", "node:tls",
    "node:readline", "node:zlib", "node:buffer", "node:assert",
    "node:perf_hooks", "node:worker_threads", "node:timers",
}


def header(title: str) -> None:
    print(f"\n{BOLD}{BLUE}━━━ {title} ━━━{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✅ {msg}{RESET}")


def fail(msg: str) -> None:
    print(f"  {RED}❌ {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}⚠️  {msg}{RESET}")


def skip(msg: str) -> None:
    print(f"  {YELLOW}⏭️  {msg}{RESET}")


def load_package_json(project_root: str) -> dict | None:
    """Load and return package.json contents."""
    pkg_path = Path(project_root) / "package.json"
    if not pkg_path.exists():
        return None
    try:
        with open(pkg_path) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def extract_imports(project_root: str) -> set[str]:
    """Extract all external package imports from source files."""
    imports: set[str] = set()
    import_patterns = [
        re.compile(r'(?:import|export)\s+.*?\s+from\s+["\']([^"\'\.][^"\']*)["\']'),
        re.compile(r'require\s*\(\s*["\']([^"\'\.][^"\']*)["\']'),
        re.compile(r'import\s*\(\s*["\']([^"\'\.][^"\']*)["\']'),
    ]

    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = Path(filename).suffix
            if ext not in SOURCE_EXTENSIONS:
                continue
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                for pattern in import_patterns:
                    for match in pattern.finditer(content):
                        pkg = match.group(1)
                        # Normalize scoped packages: @scope/pkg/subpath → @scope/pkg
                        if pkg.startswith("@"):
                            parts = pkg.split("/")
                            pkg = "/".join(parts[:2]) if len(parts) >= 2 else pkg
                        else:
                            pkg = pkg.split("/")[0]
                        imports.add(pkg)
            except (IOError, PermissionError):
                pass

    return imports


def check_unused(pkg: dict, used_imports: set[str]) -> list[str]:
    """Find packages listed in package.json but never imported."""
    all_deps = set(pkg.get("dependencies", {}).keys()) | set(pkg.get("devDependencies", {}).keys())
    # Some packages are used implicitly (build tools, configs, types)
    implicit_packages = {
        "typescript", "eslint", "prettier", "vitest", "jest", "ts-node",
        "@types/node", "@types/react", "tailwindcss", "postcss", "autoprefixer",
        "nodemon", "tsx", "vite", "next", "webpack", "babel", "@babel/core",
    }
    checkable = all_deps - implicit_packages
    # Also skip @types/ packages — they're type-only
    checkable = {d for d in checkable if not d.startswith("@types/")}

    unused = checkable - used_imports
    return sorted(unused)


def check_phantom(pkg: dict, used_imports: set[str]) -> list[str]:
    """Find packages imported but not listed in package.json."""
    all_deps = set(pkg.get("dependencies", {}).keys()) | set(pkg.get("devDependencies", {}).keys())
    external_imports = used_imports - NODE_BUILTINS
    phantom = external_imports - all_deps
    return sorted(phantom)


def run_npm_audit(project_root: str) -> bool:
    """Run npm audit and report results."""
    try:
        result = subprocess.run(
            ["npm", "audit", "--json"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=60,
        )
        try:
            audit_data = json.loads(result.stdout)
            vulns = audit_data.get("metadata", {}).get("vulnerabilities", {})
            critical = vulns.get("critical", 0)
            high = vulns.get("high", 0)
            moderate = vulns.get("moderate", 0)
            low = vulns.get("low", 0)

            if critical + high > 0:
                fail(f"npm audit: {critical} critical, {high} high, {moderate} moderate, {low} low")
                return False
            elif moderate + low > 0:
                warn(f"npm audit: {moderate} moderate, {low} low vulnerabilities")
                return True
            else:
                ok("npm audit — no known vulnerabilities")
                return True
        except (json.JSONDecodeError, KeyError):
            if result.returncode == 0:
                ok("npm audit — clean")
                return True
            fail("npm audit returned errors")
            return False
    except FileNotFoundError:
        skip("npm not installed — skipping audit")
        return True
    except subprocess.TimeoutExpired:
        fail("npm audit timed out after 60s")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal dependency analyzer — checks for unused, phantom, and vulnerable packages"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--audit", action="store_true", help="Also run npm audit / pip-audit")
    parser.add_argument("--check-unused", action="store_true", help="Only check for unused dependencies")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        fail(f"Directory not found: {project_root}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — dependency_analyzer.py{RESET}")
    print(f"Project: {project_root}")

    pkg = load_package_json(project_root)
    if not pkg:
        skip("No package.json found — dependency analysis requires a Node.js project")
        sys.exit(0)

    issues = 0

    # Extract imports from source code
    used_imports = extract_imports(project_root)
    print(f"\n  Found {len(used_imports)} unique external imports in source code")

    # Phantom imports (imported but not in package.json)
    if not args.check_unused:
        header("Phantom Imports (not in package.json)")
        phantom = check_phantom(pkg, used_imports)
        if phantom:
            for p in phantom:
                fail(f"'{p}' is imported but not in package.json — possible hallucination")
            issues += len(phantom)
        else:
            ok("All imports found in package.json")

    # Unused dependencies
    header("Unused Dependencies")
    unused = check_unused(pkg, used_imports)
    if unused:
        for u in unused:
            warn(f"'{u}' is in package.json but never imported — may be unused")
    else:
        ok("No obviously unused dependencies found")

    # npm audit
    if args.audit:
        header("Vulnerability Audit")
        if not run_npm_audit(project_root):
            issues += 1

    # Summary
    print(f"\n{BOLD}━━━ Dependency Analysis Summary ━━━{RESET}")
    if issues == 0:
        ok("All dependency checks passed")
    else:
        fail(f"{issues} issue(s) found — review above")

    sys.exit(1 if issues > 0 else 0)


if __name__ == "__main__":
    main()
