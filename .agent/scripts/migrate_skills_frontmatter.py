import os
import re
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

AGENT_DIR = Path(__file__).parent.parent
SKILLS_DIR = AGENT_DIR / "skills"

FRONTMATTER_REGEX = re.compile(r"^---\n(.*?)\n---", re.DOTALL | re.MULTILINE)

def inject_routing_frontmatter(content: str) -> str:
    """Injects a baseline routing block into the YAML frontmatter if it doesn't exist."""
    match = FRONTMATTER_REGEX.search(content)
    if not match:
        return content
        
    frontmatter_text = match.group(1)
    
    if "\nrouting:" in frontmatter_text or frontmatter_text.startswith("routing:"):
        # Already migrated
        return content
        
    # Append the routing block to the end of the frontmatter
    new_routing_block = "\nrouting:\n  domain: general\n  tier: basic"
    new_frontmatter = frontmatter_text + new_routing_block
    
    # Replace the old frontmatter with the new one
    new_content = content[:match.start(1)] + new_frontmatter + content[match.end(1):]
    return new_content

def main():
    if not SKILLS_DIR.exists():
        logging.error(f"Skills directory not found: {SKILLS_DIR}")
        return

    skill_dirs = [d for d in SKILLS_DIR.iterdir() if d.is_dir()]
    migrated_count = 0
    skipped_count = 0
    
    logging.info(f"Scanning {len(skill_dirs)} skill directories for migration...")
    
    for skill_dir in skill_dirs:
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
            
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        new_content = inject_routing_frontmatter(content)
        
        if new_content != content:
            with open(skill_file, "w", encoding="utf-8") as f:
                f.write(new_content)
            migrated_count += 1
        else:
            skipped_count += 1

    logging.info(f"Migration complete: {migrated_count} files updated, {skipped_count} skipped.")

if __name__ == "__main__":
    main()
