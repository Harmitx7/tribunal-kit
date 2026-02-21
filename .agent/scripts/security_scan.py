#!/usr/bin/env python3
"""
security_scan.py — Deep security scanner for the Tribunal Agent Kit.

Checks for OWASP Top 10 patterns in source code:
  - Hardcoded secrets and credentials
  - SQL injection patterns (string concatenation in queries)
  - XSS-prone code (innerHTML, dangerouslySetInnerHTML)
  - Insecure eval() usage
  - Missing auth patterns
  - Insecure crypto usage

Usage:
  python .agent/scripts/security_scan.py .
  python .agent/scripts/security_scan.py . --severity high
  python .agent/scripts/security_scan.py . --files src/auth.ts src/db.ts
"""

import os
import sys
import re
import argparse
from pathlib import Path
from dataclasses import dataclass

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".java", ".rb"}
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__", ".agent", ".next", "vendor"}


@dataclass
class Finding:
    severity: str  # "critical", "high", "medium", "low"
    category: str
    file: str
    line: int
    message: str
    snippet: str


SEVERITY_COLORS = {
    "critical": RED + BOLD,
    "high": RED,
    "medium": YELLOW,
    "low": BLUE,
}

SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}

# Pattern definitions: (regex, severity, category, message)
PATTERNS: list[tuple[str, str, str, str]] = [
    # Secrets
    (r'(?:password|passwd|pwd)\s*=\s*["\'][^"\']+["\']', "critical", "Hardcoded Secret", "Hardcoded password detected"),
    (r'(?:api_key|apikey|api_secret)\s*=\s*["\'][^"\']+["\']', "critical", "Hardcoded Secret", "Hardcoded API key detected"),
    (r'(?:secret|token|auth_token)\s*=\s*["\'][A-Za-z0-9+/=]{16,}["\']', "critical", "Hardcoded Secret", "Hardcoded secret/token detected"),
    (r'(?:PRIVATE_KEY|private_key)\s*=\s*["\']', "critical", "Hardcoded Secret", "Hardcoded private key detected"),

    # SQL Injection
    (r'(?:query|execute|raw)\s*\(\s*[`"\'].*\$\{', "high", "SQL Injection", "String interpolation in SQL query — use parameterized queries"),
    (r'(?:query|execute|raw)\s*\(\s*["\'].*\+\s*(?:req|input|params|body)', "high", "SQL Injection", "String concatenation with user input in SQL"),
    (r'\.raw\s*\(\s*`', "medium", "SQL Injection", "Raw query with template literal — verify inputs are sanitized"),

    # XSS
    (r'\.innerHTML\s*=', "high", "XSS", "Direct innerHTML assignment — use textContent or a sanitizer"),
    (r'dangerouslySetInnerHTML', "medium", "XSS", "dangerouslySetInnerHTML used — ensure input is sanitized"),
    (r'document\.write\s*\(', "high", "XSS", "document.write() is an XSS vector"),

    # Insecure Functions
    (r'\beval\s*\(', "high", "Code Injection", "eval() is a code injection vector — avoid entirely"),
    (r'new\s+Function\s*\(', "high", "Code Injection", "new Function() is equivalent to eval()"),
    (r'child_process\.exec\s*\(', "medium", "Command Injection", "exec() with unsanitized input is a command injection vector"),
    (r'subprocess\.call\s*\(\s*[^,\]]*\bshell\s*=\s*True', "high", "Command Injection", "subprocess with shell=True — use shell=False and pass args as list"),

    # Crypto
    (r'createHash\s*\(\s*["\']md5["\']', "medium", "Weak Crypto", "MD5 is cryptographically broken — use SHA-256+"),
    (r'createHash\s*\(\s*["\']sha1["\']', "medium", "Weak Crypto", "SHA-1 is deprecated — use SHA-256+"),
    (r'Math\.random\s*\(', "low", "Weak Randomness", "Math.random() is not cryptographically secure — use crypto.randomBytes()"),

    # Auth Issues
    (r'algorithms\s*:\s*\[\s*["\']none["\']', "critical", "Auth Bypass", "JWT 'none' algorithm allows auth bypass"),
    (r'verify\s*:\s*false', "high", "Auth Bypass", "SSL/TLS verification disabled"),
    (r'rejectUnauthorized\s*:\s*false', "high", "Auth Bypass", "TLS certificate validation disabled"),

    # Information Disclosure
    (r'console\.log\s*\(.*(?:password|secret|token|key)', "medium", "Info Disclosure", "Sensitive data logged to console"),
    (r'\.env(?:\.local|\.production)', "low", "Info Disclosure", "Env file reference — ensure not committed to git"),
]


def scan_file(filepath: str, project_root: str) -> list[Finding]:
    """Scan a single file for security patterns."""
    findings: list[Finding] = []
    rel_path = os.path.relpath(filepath, project_root)

    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except (IOError, PermissionError):
        return findings

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        # Skip comments
        if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("*"):
            continue

        for pattern, severity, category, message in PATTERNS:
            if re.search(pattern, stripped, re.IGNORECASE):
                findings.append(Finding(
                    severity=severity,
                    category=category,
                    file=rel_path,
                    line=line_num,
                    message=message,
                    snippet=stripped[:120],
                ))

    return findings


def scan_directory(project_root: str, target_files: list[str] | None = None) -> list[Finding]:
    """Scan all source files in a directory."""
    all_findings: list[Finding] = []

    if target_files:
        for fpath in target_files:
            abs_path = os.path.join(project_root, fpath) if not os.path.isabs(fpath) else fpath
            if os.path.isfile(abs_path):
                all_findings.extend(scan_file(abs_path, project_root))
        return all_findings

    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = Path(filename).suffix
            if ext not in SOURCE_EXTENSIONS:
                continue
            filepath = os.path.join(root, filename)
            all_findings.extend(scan_file(filepath, project_root))

    return all_findings


def print_findings(findings: list[Finding], min_severity: str) -> int:
    """Print findings filtered by minimum severity. Returns count of displayed findings."""
    min_rank = SEVERITY_RANK.get(min_severity, 3)
    filtered = [f for f in findings if SEVERITY_RANK.get(f.severity, 3) <= min_rank]
    filtered.sort(key=lambda f: SEVERITY_RANK.get(f.severity, 3))

    if not filtered:
        print(f"\n  {GREEN}✅ No security issues found at severity '{min_severity}' or above{RESET}")
        return 0

    current_category = ""
    for finding in filtered:
        if finding.category != current_category:
            current_category = finding.category
            print(f"\n  {BOLD}{current_category}{RESET}")

        color = SEVERITY_COLORS.get(finding.severity, "")
        print(f"    {color}[{finding.severity.upper()}]{RESET} {finding.file}:{finding.line}")
        print(f"      {finding.message}")
        print(f"      {MAGENTA}→ {finding.snippet}{RESET}")

    return len(filtered)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tribunal security scanner — OWASP-aware source code analysis"
    )
    parser.add_argument("path", help="Project root directory to scan")
    parser.add_argument(
        "--severity",
        choices=["critical", "high", "medium", "low"],
        default="low",
        help="Minimum severity to report (default: low — show everything)",
    )
    parser.add_argument("--files", nargs="*", help="Specific files to scan")
    args = parser.parse_args()

    project_root = os.path.abspath(args.path)
    if not os.path.isdir(project_root):
        print(f"  {RED}❌ Directory not found: {project_root}{RESET}")
        sys.exit(1)

    print(f"{BOLD}Tribunal — security_scan.py{RESET}")
    print(f"Project: {project_root}")
    print(f"Severity filter: {args.severity}+")

    findings = scan_directory(project_root, args.files)
    count = print_findings(findings, args.severity)

    # Summary
    print(f"\n{BOLD}━━━ Security Scan Summary ━━━{RESET}")
    by_severity: dict[str, int] = {}
    for f in findings:
        by_severity[f.severity] = by_severity.get(f.severity, 0) + 1

    for sev in ["critical", "high", "medium", "low"]:
        c = by_severity.get(sev, 0)
        if c > 0:
            color = SEVERITY_COLORS.get(sev, "")
            print(f"  {color}{sev.upper()}: {c}{RESET}")

    if count == 0:
        print(f"  {GREEN}✅ No issues found — scan passed{RESET}")
    else:
        critical_high = by_severity.get("critical", 0) + by_severity.get("high", 0)
        if critical_high > 0:
            print(f"\n  {RED}{BOLD}⚠️  {critical_high} critical/high issue(s) require immediate attention{RESET}")

    sys.exit(1 if by_severity.get("critical", 0) > 0 else 0)


if __name__ == "__main__":
    main()
