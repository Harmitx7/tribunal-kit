#!/usr/bin/env python3
"""
session_manager.py — Agent session state tracking for multi-conversation work.

Usage:
  python .agent/scripts/session_manager.py save "working on auth"
  python .agent/scripts/session_manager.py load
  python .agent/scripts/session_manager.py show
  python .agent/scripts/session_manager.py clear
  python .agent/scripts/session_manager.py status
  python .agent/scripts/session_manager.py tag <label>
  python .agent/scripts/session_manager.py list [--all]
  python .agent/scripts/session_manager.py export [--stdout]
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

STATE_FILE = ".agent_session.json"

GREEN  = "\033[92m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
CYAN   = "\033[96m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

VALID_COMMANDS = {"save", "load", "show", "clear", "status", "tag", "list", "export"}
LIST_PAGE_SIZE = 10


def load_state() -> dict:
    path = Path(STATE_FILE)
    if not path.exists():
        return {}
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_state(state: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def cmd_save(note: str) -> None:
    state = load_state()
    entry = {
        "timestamp": datetime.now().isoformat(),
        "note": note,
        "session": len(state.get("history", [])) + 1,
        "tags": [],
    }
    state.setdefault("history", []).append(entry)
    state["current"] = entry
    save_state(state)
    print(f"{GREEN}✅ Session saved:{RESET} {note}")
    print(f"   Time:    {entry['timestamp']}")
    print(f"   Session: #{entry['session']}")


def cmd_load() -> None:
    state = load_state()
    current = state.get("current")
    if not current:
        print(f"{YELLOW}No active session — use 'save' first.{RESET}")
        return
    tags_str = (", ".join(current.get("tags", []))) or "none"
    print(f"{BOLD}Current session:{RESET}")
    print(f"  Session: #{current['session']}")
    print(f"  Time:    {current['timestamp']}")
    print(f"  Note:    {current['note']}")
    print(f"  Tags:    {tags_str}")


def cmd_show() -> None:
    state = load_state()
    history = state.get("history", [])
    if not history:
        print(f"{YELLOW}No session history.{RESET}")
        return
    print(f"{BOLD}Session History ({len(history)} total):{RESET}")
    for entry in reversed(history[-10:]):
        tags_str = (", ".join(entry.get("tags", []))) or ""
        tags_display = f"  [{tags_str}]" if tags_str else ""
        print(f"\n  {BLUE}#{entry['session']}{RESET} — {entry['timestamp'][:16]}{tags_display}")
        print(f"  {entry['note']}")


def cmd_clear() -> None:
    path = Path(STATE_FILE)
    if path.exists():
        path.unlink()
        print(f"{GREEN}✅ Session state cleared.{RESET}")
    else:
        print(f"{YELLOW}No session file found — nothing to clear.{RESET}")


def cmd_status() -> None:
    """Print a compact status summary of the last 3 sessions."""
    state = load_state()
    history = state.get("history", [])
    current = state.get("current")

    if not history:
        print(f"{YELLOW}No session history — use 'save' to start tracking.{RESET}")
        return

    total = len(history)
    recent = history[-3:]

    print(f"\n{BOLD}{CYAN}━━━ Session Status ━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  Total sessions: {total}")
    if current:
        print(f"  Active:         #{current['session']} — {current['note'][:60]}")
    print(f"\n{BOLD}  Last 3 sessions:{RESET}")
    for entry in reversed(recent):
        tags_str = (", ".join(entry.get("tags", []))) or ""
        tags_display = f"  [{tags_str}]" if tags_str else ""
        ts = entry["timestamp"][:16]
        print(f"    {BLUE}#{entry['session']}{RESET} {ts}{tags_display}")
        print(f"    {entry['note'][:70]}")
    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def cmd_tag(label: str) -> None:
    """Add a tag label to the current session entry."""
    if not label:
        print(f"{RED}Error: provide a tag label. Example: session_manager.py tag v2-feature{RESET}")
        sys.exit(1)

    state = load_state()
    current = state.get("current")
    if not current:
        print(f"{YELLOW}No active session — use 'save' first before tagging.{RESET}")
        sys.exit(1)

    # Tag must be applied to the same entry in history
    current.setdefault("tags", [])
    if label in current["tags"]:
        print(f"{YELLOW}Tag '{label}' already exists on session #{current['session']}.{RESET}")
        return

    current["tags"].append(label)
    state["current"] = current

    # Also update the matching entry in history
    for entry in state.get("history", []):
        if entry.get("session") == current["session"]:
            entry.setdefault("tags", [])
            if label not in entry["tags"]:
                entry["tags"].append(label)
            break

    save_state(state)
    print(f"{GREEN}✅ Tagged session #{current['session']} with '{label}'.{RESET}")


def cmd_list(show_all: bool = False) -> None:
    """Paginated list of all session history."""
    state = load_state()
    history = state.get("history", [])
    if not history:
        print(f"{YELLOW}No session history.{RESET}")
        return

    total = len(history)
    page_size = len(history) if show_all else LIST_PAGE_SIZE
    recent = list(reversed(history))[:page_size]

    print(f"\n{BOLD}{CYAN}━━━ Session List ({total} total, showing {len(recent)}) ━━━━━━━{RESET}")
    for entry in recent:
        tags_str = (", ".join(entry.get("tags", []))) or ""
        tags_display = f"  [{YELLOW}{tags_str}{RESET}]" if tags_str else ""
        ts = entry["timestamp"][:16]
        print(f"\n  {BOLD}{BLUE}#{entry['session']}{RESET} — {ts}{tags_display}")
        print(f"  {entry['note']}")

    if not show_all and total > page_size:
        remaining = total - page_size
        print(f"\n  {YELLOW}... {remaining} older session(s) not shown. Use 'list --all' to see all.{RESET}")

    print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def cmd_export(to_stdout: bool = False) -> None:
    """Export all session history to a Markdown file or stdout."""
    state = load_state()
    history = state.get("history", [])
    if not history:
        print(f"{YELLOW}No session history to export.{RESET}")
        return

    lines = ["# Session Export\n"]
    lines.append(f"Generated: {datetime.now().isoformat()[:16]}\n")
    lines.append(f"Total sessions: {len(history)}\n\n---\n")

    for entry in reversed(history):
        session_num = entry.get("session", "?")
        ts = entry.get("timestamp", "")[:16]
        note = entry.get("note", "")
        tags = entry.get("tags", [])
        tags_str = f"\n**Tags:** {', '.join(tags)}" if tags else ""
        lines.append(f"## Session #{session_num} — {ts}\n")
        lines.append(f"{note}{tags_str}\n\n---\n")

    content = "\n".join(lines)

    if to_stdout:
        print(content)
    else:
        export_path = Path("session_export.md")
        with open(export_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"{GREEN}✅ Exported {len(history)} sessions to{RESET} {export_path}")


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: session_manager.py [save <note>|load|show|clear|status|tag <label>|list [--all]|export [--stdout]]")
        sys.exit(1)

    cmd = sys.argv[1].lower()

    if cmd not in VALID_COMMANDS:
        print(f"{RED}Unknown command: '{cmd}'{RESET}")
        print(f"Valid commands: {', '.join(sorted(VALID_COMMANDS))}")
        sys.exit(1)

    if cmd == "save":
        note = " ".join(sys.argv[2:]).strip()
        if not note:
            note = f"session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        cmd_save(note)
    elif cmd == "load":
        cmd_load()
    elif cmd == "show":
        cmd_show()
    elif cmd == "clear":
        cmd_clear()
    elif cmd == "status":
        cmd_status()
    elif cmd == "tag":
        label = " ".join(sys.argv[2:]).strip()
        cmd_tag(label)
    elif cmd == "list":
        show_all = "--all" in sys.argv
        cmd_list(show_all)
    elif cmd == "export":
        to_stdout = "--stdout" in sys.argv
        cmd_export(to_stdout)


if __name__ == "__main__":
    main()
