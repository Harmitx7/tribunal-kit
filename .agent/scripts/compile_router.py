import os
import re
import json
import logging
from pathlib import Path

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

AGENT_DIR = Path(__file__).parent.parent
SKILLS_DIR = AGENT_DIR / "skills"
ROUTING_INDEX_PATH = AGENT_DIR / "routing_index.json"

FRONTMATTER_REGEX = re.compile(r"^---\n(.*?)\n---", re.DOTALL | re.MULTILINE)

def parse_yaml_frontmatter(content: str) -> dict:
    """Very basic YAML parser specifically for the expected frontmatter."""
    match = FRONTMATTER_REGEX.search(content)
    if not match:
        return {}
    
    frontmatter_text = match.group(1)
    data = {}
    current_key = None
    
    lines = frontmatter_text.split("\n")
    for line in lines:
        if not line.strip() or line.startswith("#"):
            continue
            
        # Check if this line is part of a nested block (like routing:)
        if line.startswith("  ") and current_key:
            if not isinstance(data[current_key], dict):
                data[current_key] = {}
            
            sub_line = line.strip()
            if ":" in sub_line:
                k, v = [x.strip() for x in sub_line.split(":", 1)]
                # Basic array parsing for triggers, co-requires, etc: [a, b, c]
                if v.startswith("[") and v.endswith("]"):
                    items = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
                    data[current_key][k] = items
                else:
                    data[current_key][k] = v
            continue
            
        # Top-level keys
        if ":" in line:
            k, v = [x.strip() for x in line.split(":", 1)]
            current_key = k
            if not v:
                # Value is on the next indented lines
                data[k] = {}
            else:
                data[k] = v

    return data

def main():
    if not SKILLS_DIR.exists():
        logging.error(f"Skills directory not found: {SKILLS_DIR}")
        return

    index = []
    skill_dirs = [d for d in SKILLS_DIR.iterdir() if d.is_dir()]
    
    logging.info(f"Scanning {len(skill_dirs)} skill directories...")
    
    for skill_dir in skill_dirs:
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
            
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()
            
        frontmatter = parse_yaml_frontmatter(content)
        if not frontmatter:
            continue
            
        name = frontmatter.get("name", skill_dir.name)
        desc = frontmatter.get("description", "")
        routing = frontmatter.get("routing", {})
        
        # Build the compressed index entry
        entry = {
            "name": name,
            "description": desc,
        }
        
        # Only include routing metadata if it exists
        if routing:
            if isinstance(routing, dict):
                for k, v in routing.items():
                    entry[f"routing_{k}"] = v
            else:
                entry["routing"] = routing
                
        index.append(entry)

    # Sort alphabetically for deterministic output
    index.sort(key=lambda x: x["name"])

    # Write the index
    with open(ROUTING_INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump({"skills": index}, f, indent=2)
        
    logging.info(f"Compiled {len(index)} skills into {ROUTING_INDEX_PATH}")
    logging.info(f"File size: {os.path.getsize(ROUTING_INDEX_PATH)} bytes")

if __name__ == "__main__":
    main()
