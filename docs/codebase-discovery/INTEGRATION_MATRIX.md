# Integration Matrix

| Integration | Source configuration | State |
|---|---|---|
| npm CLI (`tribunal-kit`, `tk`) | package bin -> `bin/wrapper.js` | source verified |
| native platform packages | optional dependencies + wrapper candidates | configuration verified, binary execution unverified |
| MCP | `bin/mcp-server.js`, `mcp_config.json`, `.agent/config/*` | unit-tested; live client unverified |
| Claude/Aider adapters | `bin/adapter-install.js` | source verified, not installed |
| Cursor/Windsurf/Gemini/Copilot bridges | init Rust/JS and payload config | source verified, not generated |
| OpenCode/Hermes/Pi | `plugins/**` | present, no e2e test found in audit |
| browser/CDP | `src/browser/**` | source wired through commands, unverified live |
| Git hooks | `hooks/session-start.js`, command hook | source verified, not installed |
| GitHub Actions | CI/release YAML | configuration verified |

No remote API key, database schema or production deployment integration was detected in the inspected manifests/configuration.
