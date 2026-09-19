# How to Stop Your AI from Importing Ghost Packages

The scenario is familiar: you ask your AI coding assistant to implement a new feature. It confidently spits out a block of perfect-looking code, complete with an `import` statement for a utility library that sounds exactly like what you need.

You run your code. `ModuleNotFoundError`.

You check npm. The package doesn't exist. It's a **ghost package**—a dependency hallucinated entirely by the LLM.

While annoying in local development, ghost packages represent a severe security vulnerability. If a malicious actor registers that hallucinated package name on npm before you do, the next time someone runs your project, they'll execute arbitrary remote code. This is a known attack vector called **AI Package Hallucination Squatting**.

Here is how you stop your AI from importing ghost packages, forever.

## Why Do AIs Hallucinate Packages?

Large Language Models (LLMs) are predictive text engines. When generating code, if the most statistically probable next token is `import { parseUrl } from 'url-parser-pro'`, the model will generate it, regardless of whether `url-parser-pro` is a real package.

Models do not inherently know the state of the npm registry. Even if they have search tools, they often skip using them in favor of generating code quickly.

## The Flawed Solution: Linters and CI

Most teams try to solve this with standard CI/CD pipelines or IDE linters (like ESLint's `import/no-unresolved`).

The problem? **It's too late.**

1. **The Context Window is Poisoned:** Once the AI writes the hallucinated import into your file, that file enters the AI's context window. It will now assume that package exists in future prompts, creating a cascading hallucination loop.
2. **Security Risk in CI:** If a malicious package _was_ registered, running `npm install` in your CI pipeline immediately executes its post-install scripts. You are already compromised.

## The Correct Solution: AI Governance

To fix this, you need to intercept the AI's output _before_ it writes to disk. You need an **AI Governance Layer**.

### Enter Tribunal Kit

[Tribunal Kit](https://github.com/Harmitx7/tribunal-kit) is a zero-dependency governance layer that wraps around your AI agents (Cursor, Claude Code, Windsurf, Aider).

It operates via a strict protocol known as **Verification-Before-Completion (VBC)**.

Here is how Tribunal Kit stops ghost packages:

1. **Real-time Interception:** When your AI attempts to write code, Tribunal Kit's compiled Rust core intercepts the payload in under 10ms.
2. **AST & Manifest Cross-Reference:** Tribunal Kit parses the Abstract Syntax Tree (AST) of the proposed code and extracts all `import` or `require` statements.
3. **Dependency Validation:** It instantly cross-references those imports against your `package.json`.
4. **Hard Block:** If the AI proposes importing a package that is not in your manifest, Tribunal Kit rejects the code.
5. **Auto-Correction:** The AI is fed the rejection reason (`"Attempted to import undeclared dependency: url-parser-pro"`) and is forced to retry using native standard libraries or actual dependencies.

## Governing the Future

As developers increasingly rely on long-running AI agents to write code while they sleep, the risk of ghost packages moves from an annoyance to a critical supply-chain vulnerability.

Linters won't save you. You need governance.

_Prevent AI hallucinations and secure your supply chain today with [Tribunal Kit](https://github.com/Harmitx7/tribunal-kit)._
