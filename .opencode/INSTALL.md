# Installing Tribunal Kit for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add Tribunal Kit to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["tribunal-kit@latest"]
}
```

Or install from git:

```json
{
  "plugin": ["tribunal-kit@git+https://github.com/sunrise/tribunal-kit.git"]
}
```

Restart OpenCode. The plugin registers all 184 Tribunal skills and auto-injects Master Governance rules on session start.

## Usage

Use OpenCode's native `skill` tool:

```
use skill tool to list skills
use skill tool to load tdd-workflow
use skill tool to load verification-before-completion
```

## Subagent-Driven Development (SDD)

OpenCode delegates tasks to subagents via the `task` tool:
- Implementers execute tasks following `.tribunal/sdd/<plan>/task-<N>-brief.md`.
- Reviewers evaluate diffs via `tk sdd diff` out-of-band.
