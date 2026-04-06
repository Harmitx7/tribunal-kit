---
name: bash-linux
description: Bash/Linux terminal mastery. Shell scripting, piping, stream redirection, process substitution, strict mode (set -euo pipefail), AWK, ripgrep parsing, and robust error handling. Use when writing CI scripts, debugging POSIX environments, or manipulating text pipelines.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Bash & Linux — Shell Scripting Mastery

---

## 1. Bash Strict Mode (Mandatory)

Always start every single bash script with strict compilation flags.

```bash
#!/usr/bin/env bash

# ❌ BAD: Default bash execution
# - Undefined variables evaluate to empty strings
# - Failed commands are ignored, execution continues blindly
# - Piped failures are hidden (only last command exit code matters)

# ✅ GOOD: Strict Mode
set -euo pipefail
IFS=$'\n\t'

# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error and exit immediately.
# -o pipefail: Pipeline returns the status of the rightmost command to exit with a non-zero status.
# IFS: Only split on newlines and tabs, not spaces (prevents terrifying globbing/array bugs).

# Example: Catching potential disasters
unset MY_VAR
rm -rf "/some/path/${MY_VAR}" # With 'set -u', this throws an error instead of running 'rm -rf /some/path/'
```

---

## 2. Advanced Stream Manipulation

Piping allows passing stdout from one program into stdin of another.

```bash
# ❌ VULNERABLE: Useless Use of Cat (UUOC)
cat file.txt | grep "error"

# ✅ EFFICIENT: Direct parsing
grep "error" file.txt
# Or modern ripgrep for huge repositories:
rg "error" file.txt

# Process Substitution: Treating tool outputs as if they were files
# Compare two remote JSON responses without writing to disk
diff <(curl -s api.com/v1) <(curl -s api.com/v2)

# Redirection Mastery
# 1> stdout, 2> stderr
command > output.txt 2> error.txt   # Split streams
command > all.txt 2>&1              # Combine streams (POSIX)
command &> all.txt                  # Combine streams (Bash shortcut)
command >/dev/null 2>&1             # Subdue all output cleanly
```

---

## 3. AWK and Stream Formatting

AWK is a complete programming language designed for text processing.

```bash
# Example: We have a ps aux output and we want the PIDs (column 2) of all Node processes
ps aux | grep node | awk '{print $2}'

# Example: Summing numbers in column 3 from a CSV
cat data.csv | awk -F ',' '{sum+=$3} END {print sum}'

# Extracting specific lines (e.g. line 5 to 10)
sed -n '5,10p' file.txt
```

---

## 4. Modern CLI Alternatives (The 2026 Stack)

Standard POSIX tools are reliable but slow. Use modern Rust-based alternatives when available in CI/CD.

|Task|Legacy POSIX|Modern Alternative|Why?|
|:---|:---|:---|:---|
|Find files|`find . -name "*.ts"`|`fd -e ts`|Context-aware, respects `.gitignore`, 10x faster.|
|Search text|`grep -r "auth"`|`rg "auth"`|Ripgrep uses multi-threading and SIMD instructions.|
|Inspect JSON|`grep / awk`|`jq '.users[].id'`|`jq` explicitly parses and filters valid JSON arrays/objects.|
|Process monitoring|`top`|`htop` / `btm`|Interactive metrics.|
|Check curl|`curl -i`|`httpie` / `xh`|Colorized, structured JSON networking.|

---

## 5. File System Traps & Quoting

If a filename contains a space and you didn't quote your variable, your script will crash or delete the wrong files.

```bash
# Let FILE="my backup.tar"

# ❌ BAD: Evaluates as `rm my` AND `backup.tar` -> Two different files!
rm $FILE

# ✅ GOOD: Always quote string variables
rm "$FILE"

# ✅ GOOD: Array iteration (Using quotes specifically formatted with @)
FILES=("file 1.txt" "file 2.txt")
for file in "${FILES[@]}"; do
  echo "Processing: $file"
done
```

---
