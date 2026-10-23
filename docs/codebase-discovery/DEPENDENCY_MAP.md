# Dependency Map

| Source | Target | Relation | Required | Verified |
|---|---|---|---|---|
| package bins | wrapper/adapter/MCP JS | executable mapping | yes | yes |
| wrapper | optional `@tribunal-kit/core-*` / local Rust | native acceleration | optional | source only |
| JS CLI | command modules | lazy `require` | yes for command | parser tested |
| command modules | engines and `.agent` scripts | service execution | feature-specific | partial |
| MCP server | `.agent` payload and containment utils | protocol resources/tools | yes | MCP test |
| Rust core | tokio/clap/serde/oxc/sha2 etc. | native execution | yes native | manifest only |
| System-1 | `@receptron/laya`, `onnxruntime-node` | model/inference capability | optional/runtime-specific | unverified |
| CI | npm/Cargo/CodeQL/GitHub Actions | quality/release gates | CI-only | configuration inspected |

Direct dependency version declarations are in `package.json` and `crates/core/Cargo.toml`; lockfiles are present. No version-conflict conclusion was possible without a dependency installation/audit run. The documented `skill-intel` command-to-router dependency is missing (FIND-001).
