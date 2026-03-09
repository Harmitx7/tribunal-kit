import os

def append_guardrails():
    skills_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'skills')
    
    guardrails_content = """

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```
"""

    updated_count = 0
    skipped_count = 0

    for root, dirs, files in os.walk(skills_dir):
        for file in files:
            if file == "SKILL.md":
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    if "Tribunal Integration" not in content and "Tribunal Integration (Anti-Hallucination)" not in content:
                        with open(file_path, 'a', encoding='utf-8') as f:
                            f.write(guardrails_content)
                        print(f"✅ Strengthened: {file_path}")
                        updated_count += 1
                    else:
                        print(f"⏭️ Skipped (already has guardrails): {file_path}")
                        skipped_count += 1
                except Exception as e:
                    print(f"❌ Error processing {file_path}: {e}")

    print(f"\nSummary: {updated_count} skills strengthened, {skipped_count} skipped.")

if __name__ == "__main__":
    append_guardrails()
