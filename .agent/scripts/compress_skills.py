#!/usr/bin/env python3
"""
compress_skills.py - Aggressive token reduction for .agent/skills/**/*.md files
WHAT IT DOES:
  1. Strips ## 🏛️ Tribunal Integration sections (in GEMINI.md globally)
  2. Strips ## ✅ Pre-Flight Self-Audit sections (duplication)
  3. Strips ## Cross-Workflow Navigation sections
  4. Strips ## Output Format sections
  5. Strips inline comment blocks inside code (// Description of obvious stuff)
  6. Collapses 3+ empty lines → 1
  7. Removes chatty intro paragraphs (patterns like "X is Y. If you Z, you're Z.")
"""

import os, re, sys

# ─── Section strippers ──────────────────────────────────────────────────────

SECTION_PATTERNS = [
    # Tribunal / pre-flight boilerplate (global in GEMINI.md)
    r'(?m)^## 🏛️ Tribunal Integration[\s\S]*?(?=\n## |\n# |\Z)',
    r'(?m)^## Tribunal Integration[\s\S]*?(?=\n## |\n# |\Z)',
    r'(?m)^### ✅ Pre-Flight Self-Audit[\s\S]*?(?=\n## |\n### |\n# |\Z)',
    r'(?m)^## Pre-Flight Self-Audit[\s\S]*?(?=\n## |\n# |\Z)',
    r'(?m)^## Cross-Workflow Navigation[\s\S]*?(?=\n## |\n# |\Z)',
    r'(?m)^## Output Format\s*\n```[\s\S]*?```\s*\n',
    r'(?m)^## VBC Protocol[\s\S]*?(?=\n## |\n# |\Z)',
    r'(?m)^## LLM Traps[\s\S]*?(?=\n## |\n# |\Z)',
]

# ─── Chatty intro line patterns ───────────────────────────────────────────
# e.g. "React 19 is a paradigm shift. Server Components are the default."
# These are after the frontmatter H1 title — motivational filler.
CHATTY_INTRO = re.compile(
    r'(?m)^(# .+\n)\n[A-Z][^#\n]{60,}\n[A-Z][^#\n]{40,}\n\n---',
)

def strip_chatty_intro(content):
    def replace(m):
        return m.group(1) + '\n---'
    return CHATTY_INTRO.sub(replace, content)

# ─── Trim verbose inline comments in code blocks ─────────────────────────
# Removes "// comment that just restates the surrounding code name"
OBVIOUS_COMMENT = re.compile(
    r'(?m)^(\s*)(// (default for most properties|shorthand|number of repeats|default: \d+|spring tension|resistance|weight|approximate duration|deceleration rate)[^\n]*)\n'
)

def strip_obvious_comments(content):
    return OBVIOUS_COMMENT.sub('', content)

# ─── Long repetitive ✅/❌ rule blocks that repeat main section ────────────
# These are usually "Performance Rules" text blocks restating code above
PERF_TEXT_BLOCK = re.compile(
    r'(?m)^```\n(✅ Use \w[^\n]*\n   → [^\n]*\n\n?){3,}```\n'
)
def compress_perf_blocks(content):
    def to_bullets(m):
        text = m.group(0)
        lines = text.strip('`\n').splitlines()
        bullets = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('✅') or stripped.startswith('❌'):
                bullets.append(f'- {stripped}')
            elif stripped.startswith('→'):
                bullets[-1] += f' ({stripped[1:].strip()})'
        return '\n'.join(bullets) + '\n'
    return PERF_TEXT_BLOCK.sub(to_bullets, content)

# ─── Collapse empty lines ────────────────────────────────────────────────
def collapse_blanks(content):
    return re.sub(r'\n{3,}', '\n\n', content)

# ─── Remove "This is X — not Y" filler sentences before the first ## ─────
FILLER_BEFORE_SECTION = re.compile(
    r'(?m)(^# .+\n\n)([A-Z][^\n]+\n){1,4}(\n---\n)',
    re.MULTILINE
)
def remove_filler_between_title_and_hr(content):
    def replacement(m):
        return m.group(1) + m.group(3)
    return FILLER_BEFORE_SECTION.sub(replacement, content)

# ─── Strip redundant version comment banners ────────────────────────────
# e.g. "// motion.div, motion.span, motion.button, motion.svg, motion.path, etc."
# "// Any HTML or SVG element can be prefixed with `motion.`" - obvious
REDUNDANT_NOTE = re.compile(r'(?m)^// (motion\.\w+|Any HTML|Note:|Variant names propagate|// )[^\n]*\n')

def strip_redundant_notes(content):
    return REDUNDANT_NOTE.sub('', content)

# ─── Main pipeline ────────────────────────────────────────────────────────

def compress_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        original = f.read()

    content = original

    # 1. Strip global boilerplate sections
    for pattern in SECTION_PATTERNS:
        content = re.sub(pattern, '', content)

    # 2. Remove chatty intro paragraphs
    content = strip_chatty_intro(content)

    # 3. Remove filler between title and first ---
    content = remove_filler_between_title_and_hr(content)

    # 4. Strip obvious inline comments from code
    content = strip_obvious_comments(content)

    # 5. Strip redundant notes
    content = strip_redundant_notes(content)

    # 6. Compress verbose perf rule text blocks to bullet lists
    content = compress_perf_blocks(content)

    # 7. Collapse 3+ blank lines
    content = collapse_blanks(content)

    # Write back
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

    saved = len(original) - len(content)
    return len(original), len(content), saved

def main():
    base = '.agent/skills'
    if not os.path.exists(base):
        print(f"ERROR: '{base}' not found. Run from tribunal-kit root.", file=sys.stderr)
        sys.exit(1)

    total_orig = 0
    total_new = 0
    results = []

    for root, _, files in os.walk(base):
        for fname in files:
            if fname.endswith('.md'):
                path = os.path.join(root, fname)
                orig, new, saved = compress_file(path)
                total_orig += orig
                total_new += new
                if saved > 0:
                    results.append((saved, path))

    results.sort(reverse=True)

    print(f"\n{'='*55}")
    print(f"  Skill Compression Complete")
    print(f"{'='*55}")
    print(f"  Original : {total_orig:,} bytes ({total_orig//1024}KB)")
    print(f"  After    : {total_new:,} bytes ({total_new//1024}KB)")
    saved_total = total_orig - total_new
    pct = saved_total / total_orig * 100 if total_orig else 0
    print(f"  Saved    : {saved_total:,} bytes ({saved_total//1024}KB) — {pct:.1f}%")
    print(f"\n  Top savings:")
    for saved, path in results[:15]:
        skill = os.path.basename(os.path.dirname(path))
        fname = os.path.basename(path)
        print(f"    -{saved//1024:2}KB  {skill}/{fname}")
    print()

if __name__ == '__main__':
    main()
