#!/usr/bin/env python3
"""
skill_evolution.py — Tribunal Kit Skill Evolution Forge
=========================================================
Analyzes the delta between what the AI proposed and what the developer
actually committed, then distills those decisions into evolving
project-specific SKILL idioms — WITHOUT sending full files to any LLM.

Core Strategy: Semantic Delta Extraction
  1. Read the raw git diff of staged/recent changes
  2. Strip trivial noise (whitespace, comments, import renames)
  3. Score remaining lines for "Architectural Weight"
  4. Only high-weight deltas reach the LLM reflection prompt
  5. LLM returns structured YAML idiom entries (not prose)
  6. Idioms are merged into .agent/skills/project-idioms/SKILL.md

This keeps token consumption minimal — typically < 500 tokens per digest.

Usage:
  python .agent/scripts/skill_evolution.py digest
  python .agent/scripts/skill_evolution.py digest --dry-run
  python .agent/scripts/skill_evolution.py show
  python .agent/scripts/skill_evolution.py reset
  python .agent/scripts/skill_evolution.py status
"""

import os
import sys
import re
import json
import subprocess
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
    current = Path.cwd()
    while current != current.parent:
        candidate = current / ".agent"
        if candidate.is_dir():
            return candidate
        current = current.parent
    
    print("\033[91m✖ Error: '.agent' directory not found. Please run 'npx tribunal-kit init' first.\033[0m")
    sys.exit(1)

AGENT_DIR   = find_agent_dir()
SKILL_DIR   = AGENT_DIR / "skills" / "project-idioms"
SKILL_FILE  = SKILL_DIR / "SKILL.md"
HISTORY_DIR = AGENT_DIR / "history" / "skill-evolution"
LOG_FILE    = HISTORY_DIR / "digest-log.json"

# ── Semantic Delta Thresholds ─────────────────────────────────────────────────
# Lines with any of these patterns score HIGH architectural weight
HIGH_WEIGHT_PATTERNS = [
    r"\bclass\b",
    r"\binterface\b",
    r"\btype\s+\w+\s*=",
    r"\bextends\b",
    r"\bimplements\b",
    r"\bthrow\b",
    r"\bcatch\b",
    r"\btry\b",
    r"\bprisma\.\w+\(",
    r"\bsupabase\.",
    r"\bfetch\(",
    r"\baxios\.",
    r"\bReturnType\b",
    r"\bPromise<",
    r"\basync\s+function",
    r"\bawait\b",
    r"\bexport\s+(default\s+)?(class|function|const)",
    r"\bmodule\.exports\b",
    r"\bRouter\b|\bapp\.(get|post|put|delete|patch)\(",
    r"\buse[A-Z]\w+\(",           # React hooks
    r"\bcreateContext\(",
    r"\bz\.object\(",             # Zod schemas
    r"\bPrisma\b|\bdrizzle\b",
    r"\benv\.\w+",
    r"\bprocess\.env\.",
]

# Lines that are definitely noise — never escalate to LLM
NOISE_PATTERNS = [
    r"^\s*$",
    r"^\s*(//|#|/\*).*$",
    r"^\s*\*",
    r"^\s*import\s+\{[^}]+\}\s+from\s+['\"](?!\.)",
    r"^\s*(console\.(log|warn|error)|print\()",
    r"^\s*\w+\s*[:,]?\s*$",
]

def architectural_weight(line: str) -> int:
    """Return 0 (noise), 1 (low), or 2 (high) for a diff line."""
    code = line.lstrip("+-").strip()
    for p in NOISE_PATTERNS:
        if re.match(p, code):
            return 0
    for p in HIGH_WEIGHT_PATTERNS:
        if re.search(p, code):
            return 2
    return 1

def semantic_delta(diff_text: str, min_weight: int = 2) -> str:
    """
    Filter diff to only architectural lines. Returns the trimmed delta
    that will be sent to the LLM — minimal tokens, maximum signal.
    """
    lines = diff_text.splitlines()
    kept = []
    current_hunk_has_high = False
    hunk_lines: list[str] = []

    for line in lines:
        if line.startswith(("---", "+++", "diff --git")):
            kept.append(line)
            continue
        if line.startswith("@@"):
            # Flush previous hunk if it had high-weight lines
            if current_hunk_has_high:
                kept.extend(hunk_lines)
            current_hunk_has_high = False
            hunk_lines = [line]
            continue
        if line.startswith(("+", "-")):
            w = architectural_weight(line)
            hunk_lines.append(line)
            if w >= min_weight:
                current_hunk_has_high = True
        else:
            hunk_lines.append(line)

    # Flush final hunk
    if current_hunk_has_high:
        kept.extend(hunk_lines)

    result = "\n".join(kept)
    # Collapse 3+ blank context lines
    result = re.sub(r"\n([ ]{0,1}\n){3,}", "\n\n", result)
    return result.strip()

# ── Git helpers ────────────────────────────────────────────────────────────────
def get_git_diff(mode: str = "staged") -> str:
    """
    Get the current diff. mode = 'staged' | 'head' | 'all'
    Returns empty string if git is unavailable.
    """
    try:
        if mode == "staged":
            cmd = ["git", "diff", "--cached", "--unified=3"]
        elif mode == "head":
            cmd = ["git", "diff", "HEAD~1", "HEAD", "--unified=3"]
        else:
            cmd = ["git", "diff", "--unified=3"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.stdout if result.returncode == 0 else ""
    except (subprocess.SubprocessError, FileNotFoundError):
        return ""

def count_tokens_estimate(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 chars for code."""
    return max(1, len(text) // 4)

# ── Idiom management ──────────────────────────────────────────────────────────
def load_existing_idioms() -> list[dict]:
    """Parse the SKILL.md idiom table into structured dicts."""
    if not SKILL_FILE.exists():
        return []

    content = SKILL_FILE.read_text(encoding="utf-8")
    idioms = []
    # Match rows in the idiom table: | ID | Pattern | Reason | Domain | Since |
    pattern = re.compile(
        r"\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|"
    )
    for m in pattern.finditer(content):
        idioms.append({
            "id": int(m.group(1)),
            "pattern": m.group(2).strip(),
            "reason": m.group(3).strip(),
            "domain": m.group(4).strip(),
            "since": m.group(5).strip(),
        })
    return idioms

def next_idiom_id(idioms: list[dict]) -> int:
    if not idioms:
        return 1
    return max(i["id"] for i in idioms) + 1

def render_skill_md(idioms: list[dict], digest_count: int) -> str:
    """Render the full SKILL.md content from idiom list."""
    now = datetime.now().strftime("%Y-%m-%d")
    rows = []
    for idiom in idioms:
        rows.append(
            f"| {idiom['id']} | `{idiom['pattern']}` "
            f"| {idiom['reason']} "
            f"| {idiom['domain']} "
            f"| {idiom['since']} |"
        )
    table = "\n".join(rows) if rows else "_No idioms recorded yet._"

    return f"""---
name: project-idioms
description: >
  Auto-evolved skill containing project-specific architectural idioms.
  Generated by skill_evolution.py — do not edit manually. Commit this
  file to share your Engineering Culture across the team.
version: auto
last-updated: {now}
digest-cycles: {digest_count}
pattern: generator
---

# Project Idioms — Auto-Evolved Skill

> **Authority Level: ABSOLUTE**
> These idioms were extracted from the developer's own code decisions.
> They override generic agent defaults. Every agent MUST respect them.

---

## How Idioms Are Born

1. Developer commits code that differs from the AI proposal.
2. `skill_evolution.py digest` extracts architectural deltas only.
3. A minimal LLM reflection prompt (< 500 tokens) identifies the "WHY."
4. The idiom is recorded here with a stable pattern + reason pair.

---

## Recorded Idioms

| ID | Pattern | Why This Project Uses It | Domain | Since |
|:---|:--------|:-------------------------|:-------|:------|
{table}

---

## Enforcement Rules for All Agents

```
□ Before proposing code: scan this skill's idiom table
□ If your proposal contradicts an idiom → flag it explicitly
□ Never override an idiom silently — always ask the developer first
□ When citing an idiom: "Per Project Idiom #N: [pattern] — [reason]"
```

---

## Digest History

Last digest: `{now}`
Total cycles: `{digest_count}`

Run `python .agent/scripts/skill_evolution.py status` to see the full log.
"""

def generate_reflection_prompt(delta: str) -> str:
    """
    Minimal, structured prompt for the LLM. Returns YAML idioms only.
    Designed to consume < 500 tokens total (prompt + response).
    """
    return f"""You are analyzing a code delta from a developer who changed an AI-proposed solution.
Your only job: identify the ARCHITECTURAL IDIOM this change reveals about their project.

Rules:
- Return ONLY a YAML list of idioms. No prose. No explanation outside YAML.
- Each idiom: pattern (code signature), reason (1 sentence WHY), domain (backend/frontend/database/general)
- Ignore whitespace, comment, import changes — only architectural choices
- If no meaningful idiom can be extracted, return: "idioms: []"
- Maximum 3 idioms per delta.

Delta:
```
{delta[:1500]}
```

Output format (YAML only):
idioms:
  - pattern: "<code pattern or convention>"
    reason: "<why this project uses this pattern>"
    domain: "<backend|frontend|database|security|performance|general>"
"""

def parse_llm_yaml_response(response: str) -> list[dict]:
    """Parse structured YAML from LLM response without pyyaml dependency."""
    idioms = []
    in_idioms = False
    current: dict = {}

    for line in response.splitlines():
        stripped = line.strip()
        if stripped == "idioms:":
            in_idioms = True
            continue
        if not in_idioms:
            continue
        if stripped.startswith("- pattern:"):
            if current:
                idioms.append(current)
            current = {"pattern": stripped.split(":", 1)[1].strip().strip('"')}
        elif stripped.startswith("reason:") and current:
            current["reason"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("domain:") and current:
            current["domain"] = stripped.split(":", 1)[1].strip().strip('"')

    if current and "pattern" in current:
        idioms.append(current)

    return idioms

# ── Log helpers ────────────────────────────────────────────────────────────────
def load_log() -> dict:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    if LOG_FILE.exists():
        try:
            return json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"cycles": [], "total_tokens_saved": 0, "total_idioms": 0}

def save_log(log: dict) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text(json.dumps(log, indent=2), encoding="utf-8")

# ── Commands ──────────────────────────────────────────────────────────────────
def cmd_digest(args: list[str]) -> None:
    dry_run = "--dry-run" in args
    diff_mode = "head" if "--head" in args else "staged"

    print(f"\n{BOLD}{CYAN}━━━ Skill Evolution — Digest Cycle ━━━━━━━━━━━━━━━━{RESET}")
    if dry_run:
        print(f"  {YELLOW}DRY RUN — no files will be written{RESET}\n")

    # Step 1: Get diff
    print(f"  {DIM}[1/5] Fetching git diff ({diff_mode})...{RESET}")
    raw_diff = get_git_diff(diff_mode)
    if not raw_diff.strip():
        print(f"  {YELLOW}⚠ No diff found. Commit or stage changes first.{RESET}")
        print(f"  {DIM}Tip: Use --head to diff against the last commit.{RESET}\n")
        return

    raw_tokens = count_tokens_estimate(raw_diff)
    print(f"  {DIM}   Raw diff: ~{raw_tokens} tokens ({len(raw_diff)} chars){RESET}")

    # Step 2: Extract semantic delta
    print(f"  {DIM}[2/5] Extracting architectural delta (Semantic Filter)...{RESET}")
    delta = semantic_delta(raw_diff, min_weight=2)
    if not delta.strip():
        print(f"  {GREEN}✔ Delta is 100% trivial (whitespace/comments/imports only).{RESET}")
        print(f"  {DIM}  No LLM call needed. Zero tokens consumed.{RESET}\n")
        return

    delta_tokens = count_tokens_estimate(delta)
    saved_tokens = raw_tokens - delta_tokens
    saved_pct = int((saved_tokens / max(raw_tokens, 1)) * 100)
    print(f"  {GREEN}✔ Filtered to ~{delta_tokens} tokens  "
          f"({saved_pct}% reduction, saved ~{saved_tokens} tokens){RESET}")

    # Step 3: Show delta preview
    print(f"\n  {BOLD}Architectural Delta Preview:{RESET}")
    preview_lines = delta.splitlines()[:20]
    for line in preview_lines:
        if line.startswith("+"):
            print(f"    {GREEN}{line}{RESET}")
        elif line.startswith("-"):
            print(f"    {RED}{line}{RESET}")
        elif line.startswith("@@"):
            print(f"    {BLUE}{line}{RESET}")
        else:
            print(f"    {DIM}{line}{RESET}")
    if len(delta.splitlines()) > 20:
        print(f"    {DIM}... ({len(delta.splitlines()) - 20} more lines){RESET}")

    if dry_run:
        print(f"\n  {YELLOW}[DRY RUN] Would send {delta_tokens} tokens to LLM for reflection.{RESET}")
        print(f"  {DIM}Run without --dry-run to complete the digest.{RESET}\n")
        return

    # Step 4: LLM reflection (user pastes response)
    print(f"\n  {DIM}[3/5] LLM Reflection — copy the prompt below and paste the response{RESET}")
    print(f"\n  {BOLD}{'─'*60}{RESET}")
    prompt = generate_reflection_prompt(delta)
    print(prompt)
    print(f"  {BOLD}{'─'*60}{RESET}")
    print(f"\n  {BOLD}Paste LLM response below (type END_RESPONSE when done):{RESET}")

    response_lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == "END_RESPONSE":
            break
        response_lines.append(line)
    llm_response = "\n".join(response_lines)

    # Step 5: Parse + merge
    print(f"\n  {DIM}[4/5] Parsing idioms...{RESET}")
    new_idioms = parse_llm_yaml_response(llm_response)
    if not new_idioms:
        print(f"  {YELLOW}⚠ No idioms extracted from LLM response.{RESET}")
        print(f"  {DIM}  The LLM may have returned idioms: [] — no architectural pattern detected.{RESET}\n")
        return

    print(f"  {GREEN}✔ Extracted {len(new_idioms)} idiom(s){RESET}")
    for idiom in new_idioms:
        print(f"    {CYAN}• {idiom.get('pattern', '?')}{RESET}  — {idiom.get('reason', '')}")

    print(f"\n  {DIM}[5/5] Merging into project-idioms/SKILL.md...{RESET}")
    existing = load_existing_idioms()
    log = load_log()
    next_id = next_idiom_id(existing)

    today = datetime.now().strftime("%Y-%m-%d")
    merged = existing.copy()
    added = 0
    for idiom in new_idioms:
        # Deduplicate: skip if pattern is highly similar (simple substring check)
        pattern = idiom.get("pattern", "").lower()
        if any(pattern in ex["pattern"].lower() or ex["pattern"].lower() in pattern
               for ex in existing):
            print(f"  {DIM}  Skipped duplicate: {idiom.get('pattern')}{RESET}")
            continue
        merged.append({
            "id": next_id,
            "pattern": idiom.get("pattern", "?"),
            "reason": idiom.get("reason", "No reason provided."),
            "domain": idiom.get("domain", "general"),
            "since": today,
        })
        next_id += 1
        added += 1

    if added == 0:
        print(f"  {YELLOW}⚠ All extracted idioms were duplicates. SKILL.md unchanged.{RESET}\n")
        return

    # Write SKILL.md
    log["total_idioms"] = len(merged)
    skill_md = render_skill_md(merged, len(log["cycles"]) + 1)
    SKILL_DIR.mkdir(parents=True, exist_ok=True)
    SKILL_FILE.write_text(skill_md, encoding="utf-8")

    # Update log
    log["cycles"].append({
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "raw_tokens": raw_tokens,
        "delta_tokens": delta_tokens,
        "tokens_saved": saved_tokens,
        "idioms_added": added,
    })
    log["total_tokens_saved"] = log.get("total_tokens_saved", 0) + saved_tokens
    save_log(log)

    print(f"\n  {GREEN}✔ {added} new idiom(s) added to SKILL.md{RESET}")
    print(f"  {DIM}   File: {SKILL_FILE}{RESET}")
    print(f"  {DIM}   Total idioms: {len(merged)}{RESET}")
    print(f"  {DIM}   Lifetime tokens saved: {log['total_tokens_saved']}{RESET}\n")
    print(f"  {CYAN}Commit {SKILL_FILE.name} to share your Engineering Culture with the team.{RESET}\n")


def cmd_show(args: list[str]) -> None:
    if not SKILL_FILE.exists():
        print(f"{YELLOW}No project-idioms skill found. Run 'digest' first.{RESET}")
        return
    print(SKILL_FILE.read_text(encoding="utf-8"))


def cmd_reset(args: list[str]) -> None:
    if SKILL_FILE.exists():
        SKILL_FILE.unlink()
        print(f"{GREEN}✔ project-idioms/SKILL.md deleted.{RESET}")
    if LOG_FILE.exists():
        LOG_FILE.unlink()
        print(f"{GREEN}✔ Digest log cleared.{RESET}")
    print(f"{DIM}Run 'digest' to start a fresh evolution cycle.{RESET}")


def cmd_status(args: list[str]) -> None:
    log = load_log()
    cycles = log.get("cycles", [])
    total_saved = log.get("total_tokens_saved", 0)
    total_idioms = log.get("total_idioms", 0)

    idioms_exist = SKILL_FILE.exists()

    print(f"\n{BOLD}{CYAN}━━━ Skill Evolution Status ━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  Digest cycles    : {BOLD}{len(cycles)}{RESET}")
    print(f"  Total idioms     : {BOLD}{total_idioms}{RESET}")
    print(f"  Tokens saved     : {GREEN}{total_saved:,} tokens{RESET}  "
          f"(≈ ${total_saved / 1_000_000 * 3:.4f} at $3/M)")
    print(f"  SKILL.md exists  : {'✔' if idioms_exist else '✗'}")

    if cycles:
        print(f"\n  {BOLD}Last 5 digest cycles:{RESET}")
        for cycle in reversed(cycles[-5:]):
            ts = cycle.get("timestamp", "?")[:16]
            delta_t = cycle.get("delta_tokens", 0)
            saved = cycle.get("tokens_saved", 0)
            added = cycle.get("idioms_added", 0)
            pct = int((saved / max(cycle.get("raw_tokens", 1), 1)) * 100)
            print(f"    {DIM}{ts}{RESET}  "
                  f"delta={delta_t}tok  saved={saved}tok ({pct}%)  "
                  f"idioms+={added}")

    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


# ── Main ──────────────────────────────────────────────────────────────────────
COMMANDS = {
    "digest": cmd_digest,
    "show":   cmd_show,
    "reset":  cmd_reset,
    "status": cmd_status,
}

def main() -> None:
    # Ensure Unicode output works on Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(f"""
{BOLD}skill_evolution.py{RESET} — Tribunal Skill Evolution Forge

{BOLD}Commands:{RESET}
  digest [--dry-run] [--head]   Analyze latest git diff and evolve SKILL.md
                                 --dry-run  : preview without writing
                                 --head     : diff last commit instead of staged
  show                           Print current project-idioms/SKILL.md
  status                         Show digest history and token savings
  reset                          Clear all idioms and start fresh

{BOLD}Token Budget:{RESET}
  Raw diff -> Semantic Filter -> Only architectural lines -> LLM
  Typical savings: 70–90% of tokens. Most trivial commits = 0 tokens.
""")
        return

    cmd = argv[0]
    rest = argv[1:]
    if cmd not in COMMANDS:
        print(f"{RED}✖ Unknown command: '{cmd}'{RESET}")
        sys.exit(1)
    COMMANDS[cmd](rest)


if __name__ == "__main__":
    main()
