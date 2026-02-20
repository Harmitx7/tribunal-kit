---
name: bash-linux
description: Bash/Linux terminal patterns. Critical commands, piping, error handling, scripting. Use when working on macOS or Linux systems.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Bash & Linux Shell Patterns

> The terminal is a tool, not a magic box. Understand what a command does before you run it with elevated privileges.

---

## Ground Rules

1. **Never suggest `sudo` without explaining why it's necessary**
2. **Test destructive commands with `--dry-run` or `echo` first**
3. **`rm -rf` on a variable that might be empty = disaster** — guard it
4. **Pipe chains fail silently unless you use `set -euo pipefail`**

---

## Essential Patterns

### Safe Script Header

Every shell script should start with:

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

- `set -e` — exit on any error
- `set -u` — exit on undefined variable
- `set -o pipefail` — fail if any command in a pipe fails
- `IFS` — safer word splitting

### Variable Safety

```bash
# ❌ Unsafe — if DIR is empty, this deletes /
rm -rf "$DIR/"

# ✅ Safe — guard before destructive operation
if [[ -z "$DIR" ]]; then
  echo "Error: DIR is not set" >&2
  exit 1
fi
rm -rf "$DIR/"
```

### Testing Conditions

```bash
# File/directory checks
[[ -f "$file" ]]    # exists and is a regular file
[[ -d "$dir" ]]     # exists and is a directory
[[ -z "$var" ]]     # string is empty
[[ -n "$var" ]]     # string is not empty

# Numeric comparison (use (( )) for integers)
(( count > 0 ))
(( $? == 0 ))
```

### Error Handling

```bash
# Trap errors and print context
trap 'echo "Error on line $LINENO" >&2' ERR

# Run a command and handle failure explicitly
if ! command_that_might_fail; then
  echo "Command failed — aborting" >&2
  exit 1
fi

# Or with ||
do_something || { echo "Failed"; exit 1; }
```

---

## Common Operations

### Find Files

```bash
# Files modified in last 24h
find . -mtime -1 -type f

# Files matching pattern, excluding directories
find . -name "*.log" -not -path "*/node_modules/*"

# Search contents
grep -r "pattern" . --include="*.ts" -l   # list files
grep -r "pattern" . --include="*.ts" -n   # with line numbers
```

### Process & Resource Management

```bash
# Find process using a port
lsof -i :3000
ss -tlnp | grep :3000   # on Linux

# Kill by port
kill -9 $(lsof -ti :3000)

# Background + disown
long_running_command &
disown $!
```

### Text Processing Pipeline

```bash
# Count occurrences
cat file.log | grep "ERROR" | wc -l

# Extract column from CSV
cut -d',' -f2 data.csv

# Unique sorted values
sort file.txt | uniq -c | sort -rn
```

---

## Script Structure Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-}"

# ── Validate ────────────────────────────
if [[ -z "$TARGET" ]]; then
  echo "Usage: $(basename "$0") <target>" >&2
  exit 1
fi

# ── Main ────────────────────────────────
main() {
  echo "Processing: $TARGET"
  # ... logic here
}

main "$@"
```

---

## Platform Notes

- `date` syntax differs between macOS BSD and Linux GNU — use `python3 -c "..."` for portable date math
- `sed -i` needs an empty string argument on macOS: `sed -i '' 's/old/new/' file`
- Prefer `#!/usr/bin/env bash` over `#!/bin/bash` for portability
