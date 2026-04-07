#!/usr/bin/env python3
"""
deep_compress.py - Deep surgical compression for .agent/ markdown files (skills, agents, workflows).
Targets: repetitive boilerplate, verbose code comments, redundant example sections.
Safe: never removes H1/H2 headers, never removes HALLUCINATION TRAP lines, never removes code blocks entirely.
"""

import os, re, sys

BASE_DIRS = ['.agent/skills', '.agent/agents', '.agent/workflows']

# ─── SECTION REMOVAL ─────────────────────────────────────────────────────────
# These are globally covered by GEMINI.md — strip from all files

REMOVE_SECTIONS = [
    r'(?ms)^## 🏛️ Tribunal Integration.*?(?=^## |\Z)',
    r'(?ms)^## Tribunal Integration.*?(?=^## |\Z)',
    r'(?ms)^### ✅ Pre-Flight Self-Audit.*?(?=^### |^## |\Z)',
    r'(?ms)^## Pre-Flight Self-Audit.*?(?=^## |\Z)',
    r'(?ms)^## Cross-Workflow Navigation.*?(?=^## |\Z)',
    r'(?ms)^## LLM Traps.*?(?=^## |\Z)',
    r'(?ms)^## VBC Protocol.*?(?=^## |\Z)',
    r'(?ms)^## Output Format\n```[\s\S]*?```\n',
    r'(?ms)^## 🤖 LLM-Specific Traps.*?(?=^## |\Z)',    # covered in GEMINI.md
]

# ─── VERBOSE COMMENT REMOVAL IN CODE BLOCKS ──────────────────────────────────
# Removes lines that just restate the concept being shown — pure padding

VERBOSE_COMMENT_PATTERNS = [
    # e.g. "// Any HTML or SVG element can be prefixed with `motion.`"
    r"(?m)^(\s*)//\s*(?:Any HTML or SVG element|motion\.div, motion\.span|The MAGIC of|This is the key performance|The pattern that|Compound components share|Note that children|The action receives|Children inherit the|Import first|Parent controls when|It's always motion)\b[^\n]*\n",
    # e.g. "# TypedDict gives you autocomplete..."
    r"(?m)^(\s*)#\s*(?:TypedDict gives you|Usage:|Note:|Return user|Return None|Automatically)\b[^\n]*\n",
    # Obvious standalone "// Usage:" label inside code blocks
    r"(?m)^\s*//\s*Usage:\s*\n(?=\s*[<{])",
    r"(?m)^\s*#\s*Usage:\s*\n(?=\s*[{])",
    # "// When server responds..." style obvious follow-on comment
    r"(?m)^\s*//\s*When (?:server responds|a component|React can interrupt|the React Compiler)[^\n]*\n",
]

# ─── CHATTY SENTENCE REMOVAL BEFORE FIRST CODE BLOCK ─────────────────────────
# Removes motivational opener sentences: "X is a paradigm shift. If you..."

def strip_chatty_openers(content):
    """Remove 2-3 sentence filler paragraphs between H1 and first ---"""
    return re.sub(
        r'(^# .+\n)\n.{60,}\n.{30,}\n(?:\n---)',
        r'\1\n---',
        content,
        flags=re.MULTILINE
    )

# ─── COLLAPSE NESTED IDENTICAL EXAMPLES ──────────────────────────────────────
# Many files have "// Legacy" vs "// Modern" comments — compress to 1 block

def compress_legacy_modern_blocks(content):
    """Convert // LEGACY + // MODERN dual examples into compact diff-style"""
    # Pattern: code block with ❌ LEGACY followed immediately by ✅ MODERN
    pattern = re.compile(
        r'```(\w+)\n((?:.*\n)*?.*// ❌ LEGACY[^\n]*\n(?:.*\n)*?)```\n\n```\w+\n((?:.*\n)*?.*// ✅ MODERN[^\n]*\n(?:.*\n)*?)```',
        re.MULTILINE
    )
    # Only compress if the whole block is < 30 lines total
    def compress(m):
        total_lines = m.group(2).count('\n') + m.group(3).count('\n')
        if total_lines > 28:
            return m.group(0)  # too big to safely merge — leave alone
        lang = m.group(1)
        legacy = m.group(2).strip()
        modern = m.group(3).strip()
        return f'```{lang}\n// ❌ LEGACY\n{legacy}\n\n// ✅ MODERN\n{modern}\n```'
    return pattern.sub(compress, content)

# ─── STRIP EMPTY COMMENT LINES ───────────────────────────────────────────────
def strip_empty_comments(content):
    """Remove lines that are ONLY // or #"""
    content = re.sub(r'(?m)^\s*//\s*$\n', '', content)
    content = re.sub(r'(?m)^\s*#\s*$\n', '', content)
    return content

# ─── TRIM REPEATED RULES (dedup consecutive bullet points in same section) ───
def dedup_bullet_points(content):
    """Remove exact duplicate bullet point lines (often copy-pasted across sections)."""
    lines = content.split('\n')
    seen_bullets = {}
    output = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(('✅', '❌', '- ✅', '- ❌')):
            if stripped in seen_bullets and i - seen_bullets[stripped] < 80:
                continue  # skip duplicate within 80 lines
            seen_bullets[stripped] = i
        output.append(line)
    return '\n'.join(output)

# ─── COLLAPSE BLANKS ─────────────────────────────────────────────────────────
def collapse_blanks(content):
    return re.sub(r'\n{3,}', '\n\n', content)

# ─── REMOVE REDUNDANT IMPORTS IN COMMENTS ────────────────────────────────────
# Some files have // import { x } from "y" repeated in every example

def compress_import_repetition(content):
    """If same import line appears in 3+ separate code blocks, add a note and strip repetitions."""
    import_line = re.compile(r'import \{[^}]+\} from "[^"]+";')
    matches = import_line.findall(content)
    freq = {}
    for m in matches:
        freq[m] = freq.get(m, 0) + 1
    
    for imp, count in freq.items():
        if count >= 4:
            # First occurrence: keep it. Subsequent ones: replace with comment
            first_done = [False]
            def replacer(m, imp=imp, first_done=first_done):
                if m.group(0) == imp:
                    if not first_done[0]:
                        first_done[0] = True
                        return m.group(0)
                    return f'// {imp}  ← (already imported above)'
                return m.group(0)
            content = import_line.sub(replacer, content)
    return content

# ─── MAIN PIPELINE ──────────────────────────────────────────────────────────

def compress_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        original = f.read()
    
    content = original
    
    # 1. Strip global boilerplate sections
    for pattern in REMOVE_SECTIONS:
        content = re.sub(pattern, '', content)
    
    # 2. Strip chatty openers
    content = strip_chatty_openers(content)
    
    # 3. Compress legacy/modern dual blocks
    content = compress_legacy_modern_blocks(content)
    
    # 4. Verbose inline code comment removal
    for pattern in VERBOSE_COMMENT_PATTERNS:
        content = re.sub(pattern, '', content)
    
    # 5. Strip empty comment lines
    content = strip_empty_comments(content)
    
    # 6. Deduplicate bullet points
    content = dedup_bullet_points(content)
    
    # 7. Collapse 3+ blank lines
    content = collapse_blanks(content)
    
    # Write back only if changed
    if content.strip() != original.strip():
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
    
    return len(original), len(content)

def main():
    total_orig = 0
    total_new = 0
    file_results = []
    
    for base in BASE_DIRS:
        if not os.path.exists(base):
            continue
        for root, _, files in os.walk(base):
            for fname in files:
                if fname.endswith('.md'):
                    path = os.path.join(root, fname)
                    orig, new = compress_file(path)
                    total_orig += orig
                    total_new += new
                    saved = orig - new
                    if saved > 200:
                        rel = os.path.relpath(path, '.')
                        file_results.append((saved, rel))
    
    file_results.sort(reverse=True)
    
    saved_total = total_orig - total_new
    pct = saved_total / total_orig * 100 if total_orig else 0
    
    print(f"\n{'='*58}")
    print(f"  Deep Compression Complete")
    print(f"{'='*58}")
    print(f"  Original : {total_orig:,} bytes ({total_orig//1024}KB)")
    print(f"  After    : {total_new:,} bytes ({total_new//1024}KB)")
    print(f"  Saved    : {saved_total:,} bytes ({saved_total//1024}KB) — {pct:.1f}%")
    print(f"\n  Top savings:")
    for saved, path in file_results[:20]:
        skill = '/'.join(path.replace('\\','/').split('/')[-2:])
        print(f"    -{saved//1024:2}KB  {skill}")
    print()

if __name__ == '__main__':
    main()
