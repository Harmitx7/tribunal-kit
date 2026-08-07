# Tribunal-Kit MCP Server Guide (Protocol 2025-03-26)

`tribunal-kit` exposes a high-performance Model Context Protocol (MCP) server that enables AI clients (Cursor, Windsurf, Claude Code, Antigravity) to natively query case law, audit code, recall persistent memories, inspect agents/skills, and execute workflows.

---

## Configuration

Add `tribunal-kit` to your MCP configuration (`mcp_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tribunal-kit": {
      "command": "node",
      "args": ["bin/mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## Capabilities

### 1. MCP Tools
- **`run_tribunal_audit`**: Workspace anti-hallucination audit.
- **`sync_ide_bridges`**: Re-generate `.cursorrules`, `.windsurfrules`, `.gemini/GEMINI.md`, etc.
- **`search_case_law`**: Query past code rejections and legal precedents.
- **`list_tribunal_agents`** & **`get_tribunal_agent`**: Inspect agent definitions.
- **`list_tribunal_skills`** & **`get_tribunal_skill`**: Inspect skill instructions.
- **`recall_memory`** & **`store_memory`**: 4-Type Taxonomy Memory Engine access.
- **`align_output`**: Clean AI output slop and validate anti-patterns.

### 2. MCP Resources (`tribunal://`)
Agents, skills, and workflows can be read directly as native MCP Resources:

- `tribunal://agent/{name}` — Read agent markdown file (e.g., `tribunal://agent/security-auditor`).
- `tribunal://skill/{name}` — Read skill instruction file (e.g., `tribunal://skill/react-specialist`).
- `tribunal://workflow/{name}` — Read workflow guide (e.g., `tribunal://workflow/audit`).

### 3. MCP Prompts
Workflow instructions are available as native MCP prompts (e.g., `/audit`, `/enhance`, `/generate`, `/pipeline`, `/refactor`).
