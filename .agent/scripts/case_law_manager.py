#!/usr/bin/env python3
"""
case_law_manager.py — Tribunal Kit Case Law Engine
=====================================================
Records rejected code patterns as "Cases" and surfaces them as
binding Legal Precedence during future Tribunal reviews.

Usage:
  python .agent/scripts/case_law_manager.py add-case
  python .agent/scripts/case_law_manager.py search-cases --query "forEach side effects"
  python .agent/scripts/case_law_manager.py list
  python .agent/scripts/case_law_manager.py show --id 7
  python .agent/scripts/case_law_manager.py export
  python .agent/scripts/case_law_manager.py stats

Storage:
  .agent/history/case-law/index.json    ← master index of all cases
  .agent/history/case-law/cases/        ← one JSON file per case
"""

import os
import sys
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RED    = "\033[91m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

# ── Paths ─────────────────────────────────────────────────────────────────────
def find_agent_dir() -> Path:
    """Walk up until we find .agent/"""
    current = Path.cwd()
    while current != current.parent:
        candidate = current / ".agent"
        if candidate.is_dir():
            return candidate
        current = current.parent
    
    print("\033[91m✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.\033[0m")
    sys.exit(1)

AGENT_DIR  = find_agent_dir()
HISTORY_DIR = AGENT_DIR / "history" / "case-law"
CASES_DIR  = HISTORY_DIR / "cases"
INDEX_FILE = HISTORY_DIR / "index.json"

VALID_DOMAINS = {
    "backend", "frontend", "database", "security",
    "performance", "mobile", "testing", "devops", "general"
}

VALID_VERDICTS = {"REJECTED", "APPROVED_WITH_CONDITIONS", "PRECEDENT_SET"}

# ── Trivial-change filter (Semantic Delta) ────────────────────────────────────
TRIVIAL_PATTERNS = [
    r"^\s*$",                        # blank lines
    r"^\s*//.*$",                    # comment-only lines
    r"^\s*#.*$",                     # python comments
    r"^\s*\*.*$",                    # JSDoc lines
    r"^[\+\-]\s*(import\s+\{[^}]+\}|from\s+['\"])", # import reorders
]

def is_trivial_line(line: str) -> bool:
    for pattern in TRIVIAL_PATTERNS:
        if re.match(pattern, line):
            return True
    return False

def semantic_delta(diff_text: str) -> str:
    """
    Strip trivial changes from a diff and return only the meaningful
    architectural delta. This is the core token-saving mechanism:
    80% of whitespace/comment/import-order noise is removed before
    any LLM sees the content.
    """
    lines = diff_text.splitlines()
    meaningful = []
    for line in lines:
        if line.startswith(("+++", "---", "@@")):
            meaningful.append(line)
            continue
        if line.startswith(("+", "-")):
            code_part = line[1:]
            if not is_trivial_line(code_part):
                meaningful.append(line)
        else:
            meaningful.append(line)

    filtered = "\n".join(meaningful)
    # Collapse runs of 3+ blank context lines into separator
    filtered = re.sub(r"(\n[ ]{0,1}\n){3,}", "\n\n", filtered)
    return filtered.strip()

def content_hash(text: str) -> str:
    """Stable 8-char fingerprint of meaningful content."""
    cleaned = semantic_delta(text)
    return hashlib.sha256(cleaned.encode()).hexdigest()[:8]

# ── Index helpers ─────────────────────────────────────────────────────────────
def load_index() -> dict:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    CASES_DIR.mkdir(parents=True, exist_ok=True)
    if INDEX_FILE.exists():
        try:
            return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            pass
    return {"version": "1.0", "cases": [], "next_id": 1}

def save_index(index: dict) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2), encoding="utf-8")

def load_case(case_id: int) -> dict | None:
    path = CASES_DIR / f"case-{case_id:04d}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

def save_case(case: dict) -> None:
    path = CASES_DIR / f"case-{case['id']:04d}.json"
    path.write_text(json.dumps(case, indent=2), encoding="utf-8")

# ── Keyword/tag extraction ─────────────────────────────────────────────────────
def extract_tags(text: str) -> list[str]:
    """Extract meaningful code-level keywords from diff/reason text."""
    # Pull identifiers: camelCase, snake_case, method calls
    tokens = re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b", text)
    stop_words = {
        "the", "and", "for", "was", "this", "with", "that",
        "from", "are", "not", "use", "but", "also", "code",
        "have", "will", "should", "must", "can", "may", "any",
        "all", "new", "old", "add", "get", "set", "var", "let",
        "const", "function", "return", "import", "export", "class",
        "async", "await", "true", "false", "null", "undefined"
    }
    seen = set()
    tags = []
    for token in tokens:
        lower = token.lower()
        if lower not in stop_words and lower not in seen:
            seen.add(lower)
            tags.append(lower)
        if len(tags) >= 20:
            break
    return tags

# ── Similarity scoring ────────────────────────────────────────────────────────
def jaccard_similarity(tags_a: list[str], tags_b: list[str]) -> float:
    """Simple token overlap — no LLM required."""
    if not tags_a or not tags_b:
        return 0.0
    set_a, set_b = set(tags_a), set(tags_b)
    return len(set_a & set_b) / len(set_a | set_b)

# ── Commands ──────────────────────────────────────────────────────────────────
def cmd_add_case(args: list[str]) -> None:
    """
    Interactive case recording. All fields collected via prompts so the
    agent can call this without any arguments — the script does the rest.
    """
    print(f"\n{BOLD}{CYAN}━━━ Recording New Case ━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")

    # ── Gather fields ─────
    diff_text = prompt_multiline("Paste the REJECTED diff (code snippet):", "END_DIFF")
    if not diff_text.strip():
        print(f"{RED}✖ Diff cannot be empty. Aborting.{RESET}")
        sys.exit(1)

    reason = prompt_line("Rejection reason (1-2 sentences):")
    if not reason.strip():
        print(f"{RED}✖ Reason cannot be empty. Aborting.{RESET}")
        sys.exit(1)

    domain = prompt_choice(
        "Domain",
        sorted(VALID_DOMAINS),
        default="general"
    )

    verdict = prompt_choice(
        "Verdict",
        sorted(VALID_VERDICTS),
        default="REJECTED"
    )

    pr_ref = prompt_line("PR / commit reference (optional, e.g. PR-404):").strip() or None
    reviewer = prompt_line("Reviewer agent (optional, e.g. security-auditor):").strip() or None

    # ── Build delta ──────
    delta = semantic_delta(diff_text)
    fingerprint = content_hash(diff_text)
    tags = extract_tags(diff_text + " " + reason)

    # ── Persist ──────────
    index = load_index()
    case_id = index["next_id"]

    case = {
        "id": case_id,
        "fingerprint": fingerprint,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "domain": domain,
        "verdict": verdict,
        "reason": reason.strip(),
        "pr_ref": pr_ref,
        "reviewer": reviewer,
        "tags": tags,
        "diff_raw": diff_text.strip(),
        "diff_delta": delta
    }

    save_case(case)

    # Update index
    index["cases"].append({
        "id": case_id,
        "fingerprint": fingerprint,
        "domain": domain,
        "verdict": verdict,
        "tags": tags,
        "timestamp": case["timestamp"],
        "reason_summary": reason.strip()[:120]
    })
    index["next_id"] = case_id + 1
    save_index(index)

    print(f"\n{GREEN}✔ Case #{case_id:04d} recorded{RESET}")
    print(f"  {DIM}Fingerprint : {fingerprint}{RESET}")
    print(f"  {DIM}Domain      : {domain}{RESET}")
    print(f"  {DIM}Tags        : {', '.join(tags[:8])}{RESET}")
    print(f"  {DIM}Stored at   : {CASES_DIR / f'case-{case_id:04d}.json'}{RESET}")
    print()


def cmd_search_cases(args: list[str]) -> None:
    """
    Search past cases by query text using Jaccard tag similarity.
    Token-free — no LLM call required.
    """
    query = " ".join(args)
    if not query:
        # Try reading from --query flag
        try:
            qi = sys.argv.index("--query")
            query = " ".join(sys.argv[qi + 1:])
        except (ValueError, IndexError):
            pass

    if not query:
        print(f"{RED}✖ Provide a search query: search-cases --query \"forEach side effects\"{RESET}")
        sys.exit(1)

    query_tags = extract_tags(query)
    index = load_index()

    if not index["cases"]:
        print(f"{YELLOW}No cases recorded yet. Use 'add-case' to record your first rejection.{RESET}")
        return

    # Score every case
    scored = []
    for entry in index["cases"]:
        score = jaccard_similarity(query_tags, entry.get("tags", []))
        if score > 0.0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:5]

    if not top:
        print(f"{YELLOW}No matching cases found for: \"{query}\"{RESET}")
        print(f"  {DIM}Try broader terms or check 'list' for available cases.{RESET}")
        return

    print(f"\n{BOLD}{CYAN}━━━ Case Law Search Results ━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  Query  : {BOLD}{query}{RESET}")
    print(f"  Matches: {len(top)} of {len(index['cases'])} cases\n")

    for score, entry in top:
        verdict_color = RED if entry["verdict"] == "REJECTED" else YELLOW
        print(f"  {BOLD}Case #{entry['id']:04d}{RESET}  {verdict_color}[{entry['verdict']}]{RESET}  "
              f"{DIM}{entry['timestamp'][:10]}{RESET}  score={score:.2f}")
        print(f"  {DIM}Domain: {entry['domain']}{RESET}")
        print(f"  {entry['reason_summary']}")
        print(f"  {DIM}Tags: {', '.join(entry['tags'][:8])}{RESET}")
        print()

    print(f"  {DIM}Run 'show --id <N>' to see the full diff for any case.{RESET}")
    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def cmd_list(args: list[str]) -> None:
    index = load_index()
    cases = index.get("cases", [])
    if not cases:
        print(f"{YELLOW}No cases recorded yet.{RESET}")
        return

    domain_filter = None
    if "--domain" in args:
        try:
            domain_filter = args[args.index("--domain") + 1].lower()
        except IndexError:
            pass

    filtered = [c for c in cases if not domain_filter or c["domain"] == domain_filter]
    total = len(filtered)

    print(f"\n{BOLD}{CYAN}━━━ Case Law Index ({total} cases) ━━━━━━━━━━━━━━━━━━━━{RESET}")
    if domain_filter:
        print(f"  {DIM}Filtered by domain: {domain_filter}{RESET}\n")

    for entry in reversed(filtered[-20:]):
        verdict_color = RED if entry["verdict"] == "REJECTED" else YELLOW
        print(f"  {BOLD}#{entry['id']:04d}{RESET}  "
              f"{verdict_color}[{entry['verdict']}]{RESET}  "
              f"{DIM}{entry['domain'].upper()}{RESET}  "
              f"{entry['timestamp'][:10]}")
        print(f"       {entry['reason_summary'][:80]}")

    if total > 20:
        print(f"\n  {YELLOW}... showing last 20 of {total}. Use 'export' for full history.{RESET}")
    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def cmd_show(args: list[str]) -> None:
    case_id = None
    if "--id" in args:
        try:
            case_id = int(args[args.index("--id") + 1])
        except (IndexError, ValueError):
            pass

    if case_id is None:
        print(f"{RED}✖ Provide a case ID: show --id 7{RESET}")
        sys.exit(1)

    case = load_case(case_id)
    if not case:
        print(f"{RED}✖ Case #{case_id:04d} not found.{RESET}")
        sys.exit(1)

    verdict_color = RED if case["verdict"] == "REJECTED" else YELLOW
    print(f"\n{BOLD}{CYAN}━━━ Case #{case['id']:04d} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  Verdict    : {verdict_color}{BOLD}{case['verdict']}{RESET}")
    print(f"  Domain     : {case['domain']}")
    print(f"  Recorded   : {case['timestamp']}")
    if case.get("pr_ref"):
        print(f"  PR / Ref   : {case['pr_ref']}")
    if case.get("reviewer"):
        print(f"  Reviewer   : {case['reviewer']}")
    print(f"\n  {BOLD}Reason:{RESET}")
    print(f"  {case['reason']}")
    print(f"\n  {BOLD}Semantic Delta (meaningful changes only):{RESET}")
    print(f"  {DIM}─────────────────────────────────────────{RESET}")
    for line in case.get("diff_delta", case["diff_raw"]).splitlines()[:40]:
        if line.startswith("+"):
            print(f"  {GREEN}{line}{RESET}")
        elif line.startswith("-"):
            print(f"  {RED}{line}{RESET}")
        else:
            print(f"  {DIM}{line}{RESET}")
    print(f"\n  {BOLD}Tags:{RESET} {', '.join(case.get('tags', []))}")
    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def cmd_export(args: list[str]) -> None:
    to_stdout = "--stdout" in args
    index = load_index()
    cases = index.get("cases", [])

    if not cases:
        print(f"{YELLOW}No cases to export.{RESET}")
        return

    lines = [
        "# Tribunal Case Law — Full Export\n",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Total Cases: {len(cases)}\n",
        "---\n"
    ]

    for entry in cases:
        case = load_case(entry["id"]) or entry
        verdict_badge = f"[{case.get('verdict', 'REJECTED')}]"
        lines.append(f"## Case #{entry['id']:04d} {verdict_badge}")
        lines.append(f"**Domain:** {entry['domain']}  ")
        lines.append(f"**Recorded:** {entry['timestamp'][:10]}  ")
        if case.get("pr_ref"):
            lines.append(f"**PR/Ref:** {case['pr_ref']}  ")
        lines.append(f"\n**Reason:** {entry['reason_summary']}\n")
        lines.append(f"**Tags:** `{', '.join(entry['tags'][:8])}`\n")
        lines.append("---\n")

    content = "\n".join(lines)

    if to_stdout:
        print(content)
    else:
        out_path = HISTORY_DIR / "case-law-export.md"
        out_path.write_text(content, encoding="utf-8")
        print(f"{GREEN}✔ Exported {len(cases)} cases to {out_path}{RESET}")


def cmd_stats(args: list[str]) -> None:
    index = load_index()
    cases = index.get("cases", [])

    domain_counts: dict[str, int] = {}
    verdict_counts: dict[str, int] = {}
    for c in cases:
        domain_counts[c["domain"]] = domain_counts.get(c["domain"], 0) + 1
        verdict_counts[c["verdict"]] = verdict_counts.get(c["verdict"], 0) + 1

    print(f"\n{BOLD}{CYAN}━━━ Case Law Statistics ━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  Total cases: {BOLD}{len(cases)}{RESET}")
    print(f"\n  {BOLD}By Verdict:{RESET}")
    for verdict, count in sorted(verdict_counts.items()):
        color = RED if verdict == "REJECTED" else YELLOW
        print(f"    {color}{verdict:<30}{RESET} {count}")
    print(f"\n  {BOLD}By Domain:{RESET}")
    for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1]):
        print(f"    {CYAN}{domain:<20}{RESET} {count}")
    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


# ── Input helpers ─────────────────────────────────────────────────────────────
def prompt_multiline(prompt: str, sentinel: str) -> str:
    print(f"  {BOLD}{prompt}{RESET}")
    print(f"  {DIM}(Type or paste content. Type '{sentinel}' on its own line when done.){RESET}")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == sentinel:
            break
        lines.append(line)
    return "\n".join(lines)


def prompt_line(prompt: str) -> str:
    print(f"  {BOLD}{prompt}{RESET}", end=" ")
    try:
        return input()
    except EOFError:
        return ""


def prompt_choice(label: str, choices: list[str], default: str) -> str:
    opts = " / ".join(
        f"{BOLD}{c}{RESET}" if c == default else c
        for c in choices
    )
    print(f"  {BOLD}{label}{RESET} [{opts}] (default: {default}): ", end="")
    try:
        value = input().strip().lower()
    except EOFError:
        return default
    if not value or value not in choices:
        return default
    return value


# ── Main ──────────────────────────────────────────────────────────────────────
COMMANDS = {
    "add-case":     cmd_add_case,
    "search-cases": cmd_search_cases,
    "list":         cmd_list,
    "show":         cmd_show,
    "export":       cmd_export,
    "stats":        cmd_stats,
}

def main() -> None:
    # Ensure Unicode output works on Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(f"""
{BOLD}case_law_manager.py{RESET} — Tribunal Case Law Engine

{BOLD}Commands:{RESET}
  add-case                      Record a new rejected pattern
  search-cases --query <text>   Find relevant precedents (token-free)
  list [--domain <domain>]      List all recorded cases
  show --id <N>                 Show full diff for a case
  export [--stdout]             Export all cases to Markdown
  stats                         Show breakdown by domain/verdict

{BOLD}Domains:{RESET}  {', '.join(sorted(VALID_DOMAINS))}
{BOLD}Verdicts:{RESET} {', '.join(sorted(VALID_VERDICTS))}
""")
        return

    cmd = argv[0]
    rest = argv[1:]

    if cmd not in COMMANDS:
        print(f"{RED}✖ Unknown command: '{cmd}'{RESET}")
        print(f"  Valid: {', '.join(COMMANDS)}")
        sys.exit(1)

    COMMANDS[cmd](rest)


if __name__ == "__main__":
    main()
