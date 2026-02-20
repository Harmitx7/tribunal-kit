#!/usr/bin/env python3
"""
auto_preview.py — Start, stop, or check a local development server.

Usage:
  python .agent/scripts/auto_preview.py start
  python .agent/scripts/auto_preview.py stop
  python .agent/scripts/auto_preview.py status
  python .agent/scripts/auto_preview.py restart
"""

import os
import sys
import json
import time
import signal
import socket
import subprocess
from pathlib import Path

PID_FILE = ".preview.pid"
DEFAULT_PORT = 3000
TIMEOUT_SECONDS = 30

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def find_start_command() -> tuple[list[str], bool]:
    """
    Read package.json for a dev/start script.
    Returns (command, found) — found=False if no package.json or no scripts.
    """
    pkg_path = Path("package.json")
    if not pkg_path.exists():
        return [], False

    try:
        with open(pkg_path) as f:
            pkg = json.load(f)
        scripts = pkg.get("scripts", {})
        if "dev" in scripts:
            return ["npm", "run", "dev"], True
        elif "start" in scripts:
            return ["npm", "run", "start"], True
        else:
            return [], False
    except (json.JSONDecodeError, IOError):
        return [], False


def get_port_from_env() -> int:
    env_path = Path(".env")
    if env_path.exists():
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("PORT="):
                        return int(line.split("=")[1].strip())
        except (ValueError, IOError):
            pass
    return DEFAULT_PORT


def is_port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("localhost", port)) == 0


def read_pid() -> int | None:
    pid_file = Path(PID_FILE)
    if pid_file.exists():
        try:
            return int(pid_file.read_text().strip())
        except (ValueError, IOError):
            pass
    return None


def write_pid(pid: int) -> None:
    Path(PID_FILE).write_text(str(pid))


def clear_pid() -> None:
    pid_file = Path(PID_FILE)
    if pid_file.exists():
        pid_file.unlink()


def start_server() -> None:
    port = get_port_from_env()

    if is_port_open(port):
        print(f"{YELLOW}⚠️  Port {port} is already in use.{RESET}")
        pid = read_pid()
        if pid:
            print(f"   Known PID: {pid}")
        return

    cmd, found = find_start_command()
    if not found:
        print(f"{RED}❌ No dev/start script found.{RESET}")
        print(f"   This project has no package.json, or its package.json has no 'dev' or 'start' script.")
        print(f"   Add a script to package.json, or start your server manually.")
        return

    print(f"{BOLD}Starting: {' '.join(cmd)}{RESET}")
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    write_pid(proc.pid)

    print(f"Waiting for port {port}…", end="", flush=True)
    for _ in range(TIMEOUT_SECONDS):
        if is_port_open(port):
            print()
            print(f"\n{GREEN}✅ Server started{RESET}")
            print(f"   URL:     http://localhost:{port}")
            print(f"   PID:     {proc.pid}")
            print(f"   Command: {' '.join(cmd)}")
            print(f"\nStop with: python .agent/scripts/auto_preview.py stop")
            return
        print(".", end="", flush=True)
        time.sleep(1)

    print()
    print(f"{RED}❌ Server did not start within {TIMEOUT_SECONDS}s{RESET}")
    proc.terminate()
    clear_pid()


def stop_server() -> None:
    pid = read_pid()
    if not pid:
        print(f"{YELLOW}⚠️  No stored server PID found{RESET}")
        return
    try:
        os.kill(pid, signal.SIGTERM)
        time.sleep(1)
        print(f"{GREEN}✅ Server stopped (PID {pid}){RESET}")
    except ProcessLookupError:
        print(f"{YELLOW}Process {pid} was not running{RESET}")
    finally:
        clear_pid()


def show_status() -> None:
    port = get_port_from_env()
    pid = read_pid()
    if is_port_open(port):
        print(f"{GREEN}🟢 Running — http://localhost:{port}{RESET}")
        if pid:
            print(f"   PID: {pid}")
    else:
        print(f"{RED}🔴 Not running on port {port}{RESET}")


def main() -> None:
    actions = {"start", "stop", "status", "restart"}
    if len(sys.argv) < 2 or sys.argv[1] not in actions:
        print(f"Usage: auto_preview.py [start|stop|status|restart]")
        sys.exit(1)

    action = sys.argv[1]
    if action == "start":
        start_server()
    elif action == "stop":
        stop_server()
    elif action == "status":
        show_status()
    elif action == "restart":
        stop_server()
        time.sleep(1)
        start_server()


if __name__ == "__main__":
    main()
