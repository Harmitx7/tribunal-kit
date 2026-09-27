import os
import re
from pathlib import Path

BOOTSTRAP_MARKER = "tribunal-kit:master-governance bootstrap for hermes"


def _skills_dir() -> str:
    """Locate the .agent/skills tree for either supported install layout."""
    here = os.path.dirname(os.path.realpath(__file__))
    candidates = (
        os.path.realpath(os.path.join(here, "..", ".agent", "skills")),
        os.path.realpath(os.path.join(here, ".agent", "skills")),
        os.path.realpath(os.path.join(here, "..", "skills")),
        os.path.realpath(os.path.join(here, "skills")),
    )
    for cand in candidates:
        if os.path.isdir(cand) and os.path.isfile(os.path.join(cand, "clean-code", "SKILL.md")):
            return cand
    raise RuntimeError(
        "tribunal-kit plugin: cannot find the .agent/skills/ tree "
        f"(looked at {candidates})."
    )


def _rules_file() -> str:
    here = os.path.dirname(os.path.realpath(__file__))
    candidates = (
        os.path.realpath(os.path.join(here, "..", ".agent", "rules", "GEMINI.md")),
        os.path.realpath(os.path.join(here, ".agent", "rules", "GEMINI.md")),
    )
    for cand in candidates:
        if os.path.isfile(cand):
            return cand
    return ""


def _strip_frontmatter(content: str) -> str:
    match = re.match(r"^---\n[\s\S]*?\n---\n([\s\S]*)$", content)
    return (match.group(1) if match else content).strip()


def _build_bootstrap(skills_dir: str) -> str:
    rules_file = _rules_file()
    body = ""
    if rules_file and os.path.isfile(rules_file):
        with open(rules_file, encoding="utf-8") as f:
            body = _strip_frontmatter(f.read())
    else:
        body = "# Tribunal Master Governance\nEnforce strict TDD, out-of-band reviews, and 28-specialist waves."

    tool_mapping = """## Hermes Tool Mapping for Tribunal-Kit
When skills request actions, map them to Hermes tools:
- Read files: `read_file(path)`
- Write / edit files: `write_file(path, content)` or `patch_file(path, ...)`
- Run shell commands: `exec(command)`
- Invoke a skill: `skill_view("tribunal-kit:skill-name")` or inspect `skill-name/SKILL.md` directly.
- Subagent / tasks: Use Hermes subagent delegation.
- Tribunal CLI: `exec("tk sdd brief <plan> <task>")` or `exec("tk sdd diff <plan> <base> <head>")`."""

    return (
        f"<EXTREMELY_IMPORTANT>\n"
        f"{BOOTSTRAP_MARKER}\n\n"
        f"Tribunal Agent Kit Master Governance is active.\n"
        f"You are governed by the strict rules and verification guardrails below. Follow them now.\n\n"
        f"{body}\n\n"
        f"## Loading Skills on Hermes\n\n"
        f"Tribunal skills are registered with Hermes' native skill loader: "
        f'invoke one with `skill_view("skill-name")` '
        f'(for example `skill_view("tdd-workflow")`).\n'
        f"Skills directory: `{skills_dir}`\n\n"
        f"{tool_mapping}\n"
        f"</EXTREMELY_IMPORTANT>"
    )


def register(ctx):
    skills_dir = _skills_dir()
    bootstrap = _build_bootstrap(skills_dir)

    for name in sorted(os.listdir(skills_dir)):
        skill_md = os.path.join(skills_dir, name, "SKILL.md")
        if os.path.isfile(skill_md):
            try:
                ctx.register_skill(name, Path(skill_md))
            except Exception:
                pass

    def pre_llm_call(
        session_id=None,
        user_message=None,
        conversation_history=None,
        is_first_turn=None,
        model=None,
        platform=None,
        **kwargs,
    ):
        if is_first_turn:
            return {"context": bootstrap}
        return None

    ctx.register_hook("pre_llm_call", pre_llm_call)
