import os
import re

def minify_markdown(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)

    # 1. Strip repetitive Output Format templates (These are huge and the LLM already knows how to output the Tribunal format from GEMINI.md)
    content = re.sub(r'## Output Format\n\n```[\s\S]*?```\n', '', content)

    # 2. Convert bloated Cross-Workflow Navigation tables to dense YAML lists
    # Find tables under Cross-Workflow Navigation
    def replace_table_with_list(match):
        table_text = match.group(0)
        lines = table_text.strip().split('\n')
        out = []
        for line in lines:
            if line.startswith('|') and not line.startswith('|:') and not line.startswith('| After'):
                parts = [p.strip() for p in line.split('|') if p.strip()]
                if len(parts) >= 2:
                    out.append(f"- {parts[0]} -> {parts[1]}")
        return "\n".join(out) + "\n"

    content = re.sub(r'## Cross-Workflow Navigation\n\n\|.*?\|[\s\S]*?(?=\n## |\Z)', lambda m: '## Cross-Workflow Navigation\n' + replace_table_with_list(m), content)

    # 3. Collapse multiple empty lines into a single one
    content = re.sub(r'\n{3,}', '\n\n', content)

    # 4. Remove padding from remaining tables to save space tokens
    def unpad_table(match):
        line = match.group(0)
        # remove spaces around |
        line = re.sub(r'\s+\|\s+', '|', line)
        line = re.sub(r'\|\s+', '|', line)
        line = re.sub(r'\s+\|', '|', line)
        return line
    content = re.sub(r'^\|.+|$', unpad_table, content, flags=re.MULTILINE)

    # 5. Remove conversational blockquotes > if they don't contain WARNING/NOTE/IMPORTANT
    def remove_conversational_quotes(match):
        text = match.group(0)
        if '⚠️' in text or 'WARNING' in text or 'CRITICAL' in text or '!' in text:
            return text
        # Otherwise just return the text without quote
        return text.replace('> ', '').replace('>', '')
    content = re.sub(r'^>.*$', remove_conversational_quotes, content, flags=re.MULTILINE)

    # 6. Dense Examples (convert ❌ Bad: and ✅ Good: blocks to single lines)
    content = content.replace('\n❌ Bad:', ' ❌')
    content = content.replace('\n✅ Good:', ' ✅')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return original_len, len(content)

def main():
    agent_dir = os.path.join('.agent')
    total_original = 0
    total_new = 0

    for root, _, files in os.walk(agent_dir):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                orig, new = minify_markdown(file_path)
                total_original += orig
                total_new += new

    saved = total_original - total_new
    percent = (saved / total_original * 100) if total_original > 0 else 0
    print(f"Minification Complete.")
    print(f"Original size: {total_original} bytes")
    print(f"New size: {total_new} bytes")
    print(f"Saved: {saved} bytes ({percent:.1f}%)")

if __name__ == '__main__':
    main()
