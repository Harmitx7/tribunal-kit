# Implementation Plan: Framework-Aware Security Skills

## 1. Objective Context
Create two specialized agent skill files, `frontend-security-expert` and `backend-security-expert`, focusing on modern meta-framework security (Option B from brainstorm). This will provide targeted, framework-aware security auditing for Tribunal-kit agents without overlapping with existing generic vulnerability scanners.

## 2. Architectural Handoff
- **Target Location**: `.agent/skills/` directory.
- **Format**: Standard SKILL.md format (markdown with YAML frontmatter).
- **Stack Focus**: 
  - *Frontend*: React, Next.js UI components, local storage, XSS in modern frameworks, third-party script supply chain.
  - *Backend*: Node.js, API routes, Server Actions, Edge computing, ORM injection, JWTs.
- **Constraints**: Must integrate Tribunal guardrails (LLM Traps, Pre-Flight checklist, VBC Protocol) as per the `strengthen-skills.md` standards. Must avoid duplicating the generic `vulnerability-scanner`.

## 3. Dependency Tree Execution Order
1. **Wave 1:** Scaffold and draft `.agent/skills/frontend-security-expert/SKILL.md`.
2. **Wave 2:** Scaffold and draft `.agent/skills/backend-security-expert/SKILL.md`.
3. **Wave 3:** Verify that Tribunal guardrails (VBC Protocol, Pre-Flight Checklist) are correctly integrated into both files, aligning with the `strengthen-skills` initiative.

## 4. File Blueprint
- `[NEW] .agent/skills/frontend-security-expert/SKILL.md`
- `[NEW] .agent/skills/backend-security-expert/SKILL.md`

## 5. What Could Go Wrong (Failure Modes & Mitigation)
- **Overlap**: The new skills might duplicate instructions already present in `nextjs-react-expert` or `api-security-auditor`. *Mitigation: Strictly confine these new skills to security audits and defensive architecture, avoiding general framework advice.*
- **Validation**: Failing to adhere to the strict YAML frontmatter requirement for Tribunal-kit skills, breaking the skill loading script. *Mitigation: Follow the exact frontmatter format of existing skills.*
- **Context Bloat**: Packing too many generic security rules instead of highly specific, modern framework rules. *Mitigation: Exclude generic OWASP advice that `vulnerability-scanner` already covers.*

## 6. Verification Protocol
1. **File Existence**: Ensure both `SKILL.md` files are written to their respective directories.
2. **Integration Test**: The skill files must be parsed successfully without breaking the skill integrator.
3. **Guardrail Verification**: Manually verify that the VBC protocol, Pre-Flight Checklist, and Hallucination Traps are present in both files.
