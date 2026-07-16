# Contributing to Tribunal Kit

Thank you for your interest in contributing to Tribunal Kit! This guide will help you get started.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Harmitx7/tribunal-kit.git
cd tribunal-kit

# Install dependencies
npm install

# Run tests
npm run test:unit

# Run the CLI locally
node bin/wrapper.js --help
```

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0 (LTS recommended)
- **npm** >= 9
- **Rust** (optional) — Only needed if modifying the Rust core engine in `crates/`

### Project Structure

```
tribunal-kit/
├── bin/                    # CLI entry points (JS monolith + MCP server)
│   ├── wrapper.js          # Main entry: routes to Rust binary or JS fallback
│   ├── tribunal-kit.js     # Legacy JS CLI (1,500+ lines)
│   └── mcp-server.js       # MCP server over JSON-RPC 2.0 / stdio
├── dist/                   # Modular CLI (lazy-loaded commands)
│   ├── cli.js              # CLI core with command routing
│   ├── commands/           # Individual command modules
│   ├── utils/              # Logger, helpers, version checker, hasher
│   └── index.d.ts          # TypeScript declarations
├── crates/core/            # Rust core engine (Tokio-based)
├── .agent/                 # The intelligence payload (agents, skills, workflows)
│   ├── agents/             # 43 specialist agent definitions
│   ├── skills/             # Reusable skill packs
│   ├── workflows/          # 34 workflow definitions
│   └── scripts/            # Automation scripts
├── test/
│   ├── unit/               # Unit tests (Jest)
│   └── integration/        # Integration tests
└── scripts/                # Build & release scripts
```

### Running Tests

```bash
# Unit tests with coverage
npm run test:unit

# All tests
npm test

# Run a specific test file
npx jest test/unit/memory.test.js
```

### Building the Rust Core (Optional)

```bash
# Build in release mode
cargo build --release

# Run benchmarks comparing Rust vs JS
npm run benchmark:rust
```

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/Harmitx7/tribunal-kit/issues) first
2. Use the bug report template
3. Include: Node.js version, OS, steps to reproduce, expected vs actual behavior

### Suggesting Features

1. Open a [GitHub Discussion](https://github.com/Harmitx7/tribunal-kit/discussions) first
2. Describe the use case, not just the solution
3. Be specific about which command or workflow this affects

### Submitting Pull Requests

1. **Fork** the repository and create a branch from `main`
2. **Write tests** for any new functionality
3. **Run the test suite** — all tests must pass: `npm run test:unit`
4. **Follow existing code style** — the project uses ESLint
5. **Write clear commit messages** following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add --json flag to status command
   fix: handle symlinks in init --force
   docs: update CLI reference for memory command
   test: add coverage for marathon harness
   ```
6. **Open a PR** with a clear description of what changed and why

### Contributing Agents or Skills

Tribunal Kit's value comes from its agent and skill library. To contribute:

1. **Agents** go in `.agent/agents/` as markdown files
2. **Skills** go in `.agent/skills/<skill-name>/SKILL.md`
3. Follow the existing format — check any existing agent/skill for the structure
4. Include the YAML frontmatter (`name`, `description`)
5. Add practical, non-obvious guidance — not generic advice

### Code Style

- **JavaScript**: CommonJS (`require`/`module.exports`), no transpilation needed
- **Naming**: `camelCase` for functions/variables, `UPPER_SNAKE` for constants
- **Error handling**: Always handle errors in async functions
- **Comments**: Explain *why*, not *what*
- **No new dependencies**: Zero production dependencies is a feature, not a limitation

## Review Process

1. All PRs are reviewed by a maintainer
2. CI must pass (tests + lint)
3. Changes to `.agent/` content are reviewed for accuracy and usefulness
4. Breaking changes require a discussion before implementation

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
