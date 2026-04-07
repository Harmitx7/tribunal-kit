#!/usr/bin/env python3
"""
consolidate_skills.py
Merges all sub-files in skill directories into the main SKILL.md.
Strips: verbose intros, output format blocks, run scripts tables,
        mandatory read tables, empty headers, redundant boilerplate.
Keeps:  all code blocks, hallucination traps, checklist items.

Usage:
  python .agent/scripts/consolidate_skills.py [skill_name]
  python .agent/scripts/consolidate_skills.py               # all skills
"""

import os, re, sys

BASE = '.agent/skills'

# These patterns are global (GEMINI.md) — strip from sub-files before merge
STRIP_PATTERNS = [
    r'(?ms)^## 🏛️ Tribunal Integration.*?(?=^## |\Z)',
    r'(?ms)^## Tribunal Integration.*?(?=^## |\Z)',
    r'(?ms)^### ✅ Pre-Flight Self-Audit.*?(?=^###|^## |\Z)',
    r'(?ms)^## Pre-Flight Self-Audit.*?(?=^## |\Z)',
    r'(?ms)^## Output Format\b.*?(?=^## |\Z)',
    r'(?ms)^## 🔧 Runtime Scripts.*?(?=^## |\Z)',
    r'(?ms)^## 🔴 MANDATORY.*?(?=^## |\Z)',
    r'(?ms)^## ⚠️ CRITICAL: ASK BEFORE ASSUMING.*?(?=^## |\Z)',
    r'(?ms)^## 📝 CHECKPOINT \(MANDATORY.*?(?=^## |\Z)',
    r'(?ms)^## Output Format.*?```\n[^`]*```\n?(?=^## |\Z)',
    r'(?ms)^\*\*Execute these for validation.*?---\n',
    r'(?ms)^\*\*VBC \(Verification-Before-Completion\).*?\n',
    # MANDATORY read tables
    r'(?ms)^\*\*⛔ DO NOT start.*?---\n?',
    r'(?ms)^> 🧠 \*\*mobile-design.*?\n',
    r'(?ms)^> \*\*STOP.*?\n',
]

# Heading level adjustment (sub-files use H1 — convert to H2 in merged output)
def adjust_headings(content, offset=1):
    """Promote headings by adding # chars"""
    lines = content.split('\n')
    out = []
    for line in lines:
        m = re.match(r'^(#{1,5}) ', line)
        if m:
            level = len(m.group(1))
            new_level = min(level + offset, 6)
            line = '#' * new_level + line[level:]
        out.append(line)
    return '\n'.join(out)

def clean_content(content):
    """Apply strip patterns"""
    for p in STRIP_PATTERNS:
        content = re.sub(p, '', content)
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content.strip()

def extract_frontmatter(content):
    """Return (frontmatter_dict_str, body)"""
    m = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
    if m:
        return m.group(1), content[m.end():]
    return '', content

def get_sub_title(content):
    """Get first H1 from a sub-file"""
    m = re.search(r'^# (.+)', content, re.MULTILINE)
    return m.group(1) if m else None

def consolidate(skill_dir):
    skill_name = os.path.basename(skill_dir)
    main_path = os.path.join(skill_dir, 'SKILL.md')
    if not os.path.exists(main_path):
        return False

    # Find sub-files (non-SKILL.md markdown files)
    sub_files = sorted([
        f for f in os.listdir(skill_dir)
        if f.endswith('.md') and f != 'SKILL.md'
    ])

    if not sub_files:
        return False

    print(f'\n  → Consolidating: {skill_name} ({len(sub_files)} sub-files)')

    # Read main SKILL.md
    main_content = open(main_path, 'r', encoding='utf-8', errors='ignore').read()
    frontmatter, main_body = extract_frontmatter(main_content)

    # Clean & update frontmatter version
    fm_lines = frontmatter.split('\n')
    new_fm = []
    for line in fm_lines:
        if line.startswith('version:'):
            new_fm.append('version: 3.1.0')
        elif line.startswith('last-updated:'):
            new_fm.append('last-updated: 2026-04-06')
        else:
            new_fm.append(line)
    frontmatter = '\n'.join(new_fm)

    # Clean main body
    main_body = clean_content(main_body)

    # Remove MANDATORY read table from main body
    # (links like [file.md](file.md) in tables)
    main_body = re.sub(r'\|.*?\.md.*?\|.*?\|.*?\|\n', '', main_body)
    main_body = re.sub(r'^\|[-| ]+\|\n', '', main_body, flags=re.MULTILINE)
    main_body = re.sub(r'\n{3,}', '\n\n', main_body)

    # Merge sub-files
    merged_sections = []
    for fname in sub_files:
        fpath = os.path.join(skill_dir, fname)
        raw = open(fpath, 'r', encoding='utf-8', errors='ignore').read()
        _, body = extract_frontmatter(raw)
        body = clean_content(body)
        # Adjust headings: H1→H2, H2→H3, etc.
        body = adjust_headings(body, offset=1)
        if body.strip():
            merged_sections.append(body.strip())

    # Build final output
    combined = f'---\n{frontmatter}\n---\n\n{main_body}'
    if merged_sections:
        combined += '\n\n---\n\n' + '\n\n---\n\n'.join(merged_sections)

    # Final cleanup
    combined = re.sub(r'\n{3,}', '\n\n', combined)
    combined = combined.strip() + '\n'

    # Measure savings
    total_sub_bytes = sum(os.path.getsize(os.path.join(skill_dir, f)) for f in sub_files)
    print(f'     Sub-files total: {total_sub_bytes//1024}KB')

    # Write consolidated SKILL.md
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(combined)

    new_size = os.path.getsize(main_path)
    print(f'     New SKILL.md:    {new_size//1024}KB  (from {len(main_content)//1024}KB main + {total_sub_bytes//1024}KB subs → {new_size//1024}KB)')

    # Delete sub-files
    for fname in sub_files:
        os.remove(os.path.join(skill_dir, fname))
        print(f'     Deleted: {fname}')

    return True

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None

    total_saved = 0
    processed = 0

    for skill_name in os.listdir(BASE):
        skill_dir = os.path.join(BASE, skill_name)
        if not os.path.isdir(skill_dir):
            continue
        if target and skill_name != target:
            continue
        if consolidate(skill_dir):
            processed += 1

    if processed == 0:
        print('No skills with sub-files found (or target not matched).')
    else:
        print(f'\n✅ Consolidated {processed} skills.')

if __name__ == '__main__':
    main()
