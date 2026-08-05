# Getting Started with Tribunal Kit

Get from zero to governed AI coding in 5 minutes.

## Prerequisites

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- An AI coding tool: [Cursor](https://cursor.sh/), [VSCode](https://code.visualstudio.com/), [Windsurf](https://windsurf.ai/), [Claude Code](https://claude.ai/), or [Aider](https://aider.chat/)

## Step 1: Install

Open a terminal in your project root and run:

```bash
npx tribunal-kit init
```

This installs the `.agent/` intelligence payload into your project:
- **51 specialist agents** — domain-specific coding guidelines
- **27 parallel reviewers** — the Tribunal pipeline
- **171 reusable skills** — deep knowledge packs for every framework
- **37 slash workflows** — one-command operations
- **Automation scripts** — guardrails, checklist, and verification

> **Zero dependencies.** Tribunal Kit has zero production dependencies and makes no network requests at runtime.

## Step 2: Bridge with Your IDE

```bash
npx tribunal-kit sync
```

This creates configuration bridges for your IDE:
- `.cursorrules` — Cursor
- `.windsurfrules` — Windsurf
- `.github/copilot-instructions.md` — GitHub Copilot
- `.claude/CLAUDE.md` — Claude Code
- `.gemini/GEMINI.md` — Gemini / Antigravity

Your AI coding agent will automatically load these rules on its next conversation.

## Step 3: Verify

```bash
npx tribunal-kit status
```

You should see a green status report showing all agents, skills, and workflows are loaded correctly.

## Step 4: Catch Your First Hallucination

Now use your AI coding agent normally. When it generates code, run:

```bash
npx tribunal-kit guardrail
```

The guardrail engine scans for:
- **Phantom packages** — imports that don't exist in your `package.json`
- **Unresolved `// VERIFY` tags** — uncertain API calls the AI flagged itself
- **Numeric inconsistencies** — hallucinated count claims in documentation
- **Missing files** — references to agents, skills, or scripts that don't exist

## Step 5: Install the Git Hook (Optional)

```bash
npx tribunal-kit hook
```

This installs a `pre-push` Git hook that automatically runs `tk guardrail` before every push — catching hallucinated code before it reaches your remote repository.

---

## What Happens Next

Once the governance layer is installed, your AI coding agent automatically benefits from:

1. **Better code generation** — 171 skills teach your AI framework-specific best practices, preventing common mistakes (React 19 hook constraints, Next.js 15 route headers, Drizzle ORM filters)

2. **Multi-reviewer pipeline** — Use slash commands like `/generate`, `/tribunal-full`, or `/audit` to route code through parallel domain-specific reviewers

3. **Persistent memory** — Use `tk memory store` to save project context that survives across sessions

4. **Case law** — Use `tk case add` to record AI mistakes as permanent precedents, preventing the same hallucination from recurring

5. **Self-evolution** — Use `tk optimize-skill` to automatically improve your instruction files using a genetic optimization loop

---

## CLI Quick Reference

| Command | What It Does |
|:--|:--|
| `tk init` | Install the `.agent/` governance payload |
| `tk sync` | Bridge with Cursor / Windsurf / VSCode |
| `tk status` | Check workspace integrity |
| `tk guardrail` | Scan for AI hallucinations |
| `tk hook` | Install Git pre-push guardrail |
| `tk case add` | Record an AI mistake as precedent |
| `tk case search "query"` | Search case law database |
| `tk memory store` | Save project context |
| `tk memory recall` | Retrieve relevant memories |
| `tk learn` | Distill project idioms from Git history |
| `tk optimize-skill` | Self-evolve a skill file |
| `tk graph` | Map codebase dependencies |
| `tk marathon init` | Start a long-running autonomous task |

---

## MCP Server Setup

To connect Tribunal Kit as an MCP server (for dynamic tool access from your AI agent):

**Cursor / Claude Desktop** — Add to your MCP config:

```json
{
  "mcpServers": {
    "tribunal-kit": {
      "command": "node",
      "args": ["./node_modules/tribunal-kit/bin/wrapper.js"],
      "env": {
        "PROJECT_ROOT": "."
      }
    }
  }
}
```

This exposes tools like `run_tribunal_audit`, `search_case_law`, `get_tribunal_skill`, and `list_tribunal_agents` directly to your AI agent.

---

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/Harmitx7/tribunal-kit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Harmitx7/tribunal-kit/discussions)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security**: See [SECURITY.md](SECURITY.md)
