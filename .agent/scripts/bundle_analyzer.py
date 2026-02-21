#!/usr/bin/env python3
"""
bundle_analyzer.py — JS/TS bundle size analyzer for the Tribunal Agent Kit.

Analyzes build output for:
  - Total bundle size
  - Largest files in dist/
  - Suggested tree-shaking opportunities
  - Bundler-specific analysis (Vite / Webpack)

Usage:
  python .agent/scripts/bundle_analyzer.py .
  python .agent/scripts/bundle_analyzer.py . --build
  python .agent/scripts/bundle_analyzer.py . --threshold 500
"""

import os
import sys
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

# Common large dependencies that often have lighter alternatives
HEAVY_PACKAGES: dict[str, str] = {
    "moment": "Use date-fns or dayjs instead (~2KB vs ~230KB)",
    "lodash": "Import specific functions: lodash/debounce instead of full lodash",
    "rxjs": "Import specific operators to enable tree-shaking",
    "aws-sdk": "Use @aws-sdk/client-* v3 modular imports",
    "firebase": "Use modular imports: firebase/auth, firebase/firestore",
    "chart.js": "Register only needed components",
    "three": "Import specific modules from three/examples/jsm/",
    "@mui/material": "Ensure babel-plugin-import or modular imports",
    "@mui/icons-material": "Import specific icons, never the barrel",
    "antd": "Use modular imports with babel-plugin-import",
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


def format_size(size_bytes: int) -> str:
    """Format bytes into human-readable size."""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f}MB"


def detect_bundler(project_root: str) -> str | None:
    """Detect the bundler used in the project."""
    root = Path(project_root)
    pkg_path = root / "package.json"
    if not pkg_path.exists():
        return None

    try:
        with open(pkg_path) as f:
            pkg = json.load(f)
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

        if "vite" in deps:
            return "vite"
        if "next" in deps:
            return "next"
        if "webpack" in deps:
            return "webpack"
        if any(f.exists() for f in [root / "webpack.config.js", root / "webpack.config.ts"]):
            return "webpack"
    except (json.JSONDecodeError, IOError):
        pass

    return None


def find_dist_dir(project_root: str) -> str | None:
    """Find the build output directory."""
    root = Path(project_root)
    candidates = ["dist", "build", ".next", "out", "public/build"]
    for candidate in candidates:
        d = root / candidate
        if d.is_dir():
            return str(d)
    return None


def analyze_dist(dist_dir: str, threshold_kb: int) -> tuple[int, list[tuple[str, int]]]:
    """Analyze the dist directory. Returns (total_size, list of (file, size) sorted by size desc)."""
    files: list[tuple[str, int]] = []
    total = 0

    for root, dirs, filenames in os.walk(dist_dir):
        for fname in filenames:
            fpath = os.path.join(root, fname)
            size = os.path.getsize(fpath)
            total += size
            rel = os.path.relpath(fpath, dist_dir)
            files.append((rel, size))

    files.sort(key=lambda x: x[1], reverse=True)
    return total, files


def check_heavy_dependencies(project_root: str) -> list[tuple[str, str]]:
    """Check if any known-heavy packages are in dependencies."""
    pkg_path = Path(project_root) / "package.json"
    if not pkg_path.exists():
        return []

    try:
        with open(pkg_path) as f:
            pkg = json.load(f)
        deps = set(pkg.get("dependencies", {}).keys())
        found: list[tuple[str, str]] = []
        for pkg_name, suggestion in HEAVY_PACKAGES.items():
            if pkg_name in deps:
                found.append((pkg_name, suggestion))
        return found
    except (json.JSONDecodeError, IOError):
        return []


def run_build(project_root: str) -> bool:
    """Run npm run build."""
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            ok("Build completed successfully")
            return True
        fail("Build failed")
        output = (result.stdout + result.stderr).strip()
        if output:
            for line in output.split("\n")[:10]:
                print(f"    {line}")
        return False
    except FileNotFoundError:
        fail("npm not installed")
        return False
    except subprocess.TimeoutExpired:
        fail("Build timed out after 120s")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal bundle analyzer — checks build output size and suggests optimizations"
    )
    parser.add_argument("path", help="Project root directory")
    parser.add_argument("--build", action="store_true", help="Run npm run build before analyzing")
    parser.add_argument("--threshold", type=int, default=250, help="File size warning threshold in KB (default: 250)")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        fail(f"Directory not found: {project_root}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — bundle_analyzer.py{RESET}")
    print(f"Project: {project_root}")

    bundler = detect_bundler(project_root)
    if bundler:
        print(f"  Bundler: {bundler}")

    # Optionally build first
    if args.build:
        header("Building project")
        if not run_build(project_root):
            sys.exit(1)

    # Find and analyze dist directory
    dist_dir = find_dist_dir(project_root)
    if not dist_dir:
        skip("No build output directory found (dist/, build/, .next/, out/)")
        skip("Run with --build to create a build first, or build manually")
    else:
        header(f"Bundle Size Analysis ({os.path.relpath(dist_dir, project_root)}/)")

        total_size, files = analyze_dist(dist_dir, args.threshold)
        print(f"\n  Total bundle size: {BOLD}{format_size(total_size)}{RESET}")

        threshold_bytes = args.threshold * 1024

        # Show top 10 largest files
        print(f"\n  {BOLD}Top files by size:{RESET}")
        for filepath, size in files[:10]:
            if size > threshold_bytes:
                warn(f"{format_size(size):>10s}  {filepath}")
            else:
                print(f"  {'':>4s}{format_size(size):>10s}  {filepath}")

        # Count JS/CSS files above threshold
        large_js = [(f, s) for f, s in files if f.endswith((".js", ".mjs")) and s > threshold_bytes]
        if large_js:
            print(f"\n  {YELLOW}{len(large_js)} JS file(s) exceed {args.threshold}KB threshold{RESET}")

    # Check for heavy dependencies
    header("Dependency Weight Check")
    heavy = check_heavy_dependencies(project_root)
    if heavy:
        for pkg_name, suggestion in heavy:
            warn(f"'{pkg_name}' is a heavy dependency")
            print(f"      → {suggestion}")
    else:
        ok("No known-heavy packages detected")

    # Summary
    print(f"\n{BOLD}━━━ Bundle Analysis Summary ━━━{RESET}")
    if dist_dir:
        total_size_val = analyze_dist(dist_dir, args.threshold)[0]
        size_str = format_size(total_size_val)
        if total_size_val > 5 * 1024 * 1024:
            fail(f"Total bundle: {size_str} — consider code splitting")
        elif total_size_val > 2 * 1024 * 1024:
            warn(f"Total bundle: {size_str} — review for optimization opportunities")
        else:
            ok(f"Total bundle: {size_str}")
    if heavy:
        warn(f"{len(heavy)} heavy dependency suggestion(s) — see above")
    elif not heavy and dist_dir:
        ok("No optimization suggestions")

    sys.exit(0)


if __name__ == "__main__":
    main()
