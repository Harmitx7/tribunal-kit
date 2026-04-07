import os
import re

def strip_boilerplate(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)

    # Regex to find everything from "## 🏛️ Tribunal Integration" (or without emojis) to the end of the file or next major H1
    # Often it appears at the end of agents
    content = re.sub(r'## 🏛️ Tribunal Integration[\s\S]*?(?=\n# |\Z)', '', content)
    content = re.sub(r'## Tribunal Integration[\s\S]*?(?=\n# |\Z)', '', content)
    
    # Strip Cross-Workflow Navigation since GEMINI.md has global handling
    content = re.sub(r'## Cross-Workflow Navigation[\s\S]*?(?=\n# |\Z)', '', content)

    # Strip What the Maker Is Not Allowed to Do (it's in GEMINI.md)
    content = re.sub(r'## What the Maker Is Not Allowed to Do[\s\S]*?(?=\n# |\Z)', '', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

    return original_len, len(content)

def main():
    dirs_to_check = ['.agent/agents', '.agent/workflows']
    total_stripped = 0

    for d in dirs_to_check:
        if not os.path.exists(d): continue
        for file in os.listdir(d):
            if file.endswith('.md'):
                file_path = os.path.join(d, file)
                orig, new = strip_boilerplate(file_path)
                total_stripped += (orig - new)

    print(f"Stripped {total_stripped} bytes of repetitive boilerplate.")

if __name__ == '__main__':
    main()
