#!/usr/bin/env python3
"""
session_manager.py — Agent session state tracking for multi-conversation work.

Usage:
  python .agent/scripts/session_manager.py save "working on auth"
  python .agent/scripts/session_manager.py load
  python .agent/scripts/session_manager.py show
  python .agent/scripts/session_manager.py clear
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
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

VALID_COMMANDS = {"save", "load", "show", "clear"}


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
    print(f"{BOLD}Current session:{RESET}")
    print(f"  Session: #{current['session']}")
    print(f"  Time:    {current['timestamp']}")
    print(f"  Note:    {current['note']}")


def cmd_show() -> None:
    state = load_state()
    history = state.get("history", [])
    if not history:
        print(f"{YELLOW}No session history.{RESET}")
        return
    print(f"{BOLD}Session History ({len(history)} total):{RESET}")
    for entry in reversed(history[-10:]):
        print(f"\n  {BLUE}#{entry['session']}{RESET} — {entry['timestamp'][:16]}")
        print(f"  {entry['note']}")


def cmd_clear() -> None:
    path = Path(STATE_FILE)
    if path.exists():
        path.unlink()
        print(f"{GREEN}✅ Session state cleared.{RESET}")
    else:
        print(f"{YELLOW}No session file found — nothing to clear.{RESET}")


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: session_manager.py [save <note>|load|show|clear]")
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


if __name__ == "__main__":
    main()
