#!/usr/bin/env node
/**
 * skill_enhancement_engine.js — State-of-the-Art Skill Enhancement & Hardening Engine
 *
 * Implements the 18-Section Tribunal Governance Standard:
 * 1. Clean Frontmatter (name, triggers, version 6.0.0, tools, scripts-binding)
 * 2. Mandatory Pre-Flight Context Inspection (5 domain parameters)
 * 3. Activation Boundaries (Activate when vs DO NOT activate when)
 * 4. Multi-Pass Execution Protocol (Pass 1-7 + Adaptive Execution: Fast/Standard/Deep)
 * 5. High-Craft Domain Technical Architecture & Reference Recipes
 * 6. Edge-Case & Failure Mode Matrix
 * 7. LLM-Specific Traps Table (Anti-Patterns vs Correct Implementations)
 * 8. Tribunal Verification & Guardrails (Active Reviewers, Tri-State Evidence, VBC)
 *
 * Usage:
 *   node scripts/skill_enhancement_engine.js --all --fix
 *   node scripts/skill_enhancement_engine.js --all --fix --sync-to-root
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');
const WORKSPACE_ROOT = path.resolve(ROOT, '..');
const ROOT_SKILLS_DIR = path.join(WORKSPACE_ROOT, '.agent', 'skills');
const TOPIC_MAP_PATH = path.join(ROOT, '.agent', 'skill_topic_map.json');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FIX = ARGS.includes('--fix');
const SYNC_TO_ROOT = ARGS.includes('--sync-to-root');

const skillArgIdx = ARGS.indexOf('--skill');
const TARGET_SKILL = skillArgIdx !== -1 && ARGS[skillArgIdx + 1] ? ARGS[skillArgIdx + 1] : null;

const domainArgIdx = ARGS.indexOf('--domain');
const TARGET_DOMAIN = domainArgIdx !== -1 && ARGS[domainArgIdx + 1] ? ARGS[domainArgIdx + 1] : null;

// Domain mapping & Active Reviewers
let domainRoutes = {};
if (fs.existsSync(TOPIC_MAP_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(TOPIC_MAP_PATH, 'utf8'));
    domainRoutes = raw.domain_routes || {};
  } catch (e) {
    console.warn(`[WARN] Failed to load skill_topic_map.json: ${e.message}`);
  }
}

function getSkillDomain(skillName) {
  for (const [domain, list] of Object.entries(domainRoutes)) {
    if (list.includes(skillName)) return domain;
  }
  if (skillName.includes('anim') || skillName.includes('motion') || skillName.includes('gsap')) return 'motion';
  if (skillName.includes('react') || skillName.includes('ui') || skillName.includes('css') || skillName.includes('design') || skillName.includes('color') || skillName.includes('typeset')) return 'frontend';
  if (skillName.includes('sql') || skillName.includes('db') || skillName.includes('data') || skillName.includes('mongo') || skillName.includes('postgres') || skillName.includes('sqlite') || skillName.includes('redis') || skillName.includes('alembic')) return 'database';
  if (skillName.includes('security') || skillName.includes('audit') || skillName.includes('vulnerab') || skillName.includes('shield') || skillName.includes('passkey')) return 'security';
  if (skillName.includes('test') || skillName.includes('qa') || skillName.includes('playwright')) return 'testing';
  if (skillName.includes('devops') || skillName.includes('ci') || skillName.includes('cloud') || skillName.includes('bash') || skillName.includes('docker') || skillName.includes('infra')) return 'devops';
  if (skillName.includes('mobile') || skillName.includes('swift') || skillName.includes('expo')) return 'mobile';
  if (skillName.includes('api') || skillName.includes('python') || skillName.includes('rust') || skillName.includes('backend') || skillName.includes('fastapi') || skillName.includes('node')) return 'backend';
  if (skillName.startsWith('hf-') || skillName.startsWith('huggingface-') || skillName.includes('transformers') || skillName.includes('trl-')) return 'huggingface';
  return 'meta';
}

const DOMAIN_REVIEWERS = {
  frontend: ['frontend-reviewer', 'type-safety', 'ui-ux-auditor', 'complexity-reviewer'],
  motion: ['frontend-reviewer', 'motion-reviewer', 'ui-ux-auditor'],
  backend: ['logic-reviewer', 'security-auditor', 'api-architect', 'resilience-reviewer'],
  database: ['database-architect', 'sql-pro', 'security-auditor', 'schema-validator'],
  security: ['security-auditor', 'penetration-tester', 'backend-security-expert'],
  devops: ['pipeline-reviewer', 'devops-engineer', 'resilience-reviewer'],
  testing: ['test-engineer', 'qa-automation-engineer', 'logic-reviewer'],
  mobile: ['mobile-reviewer', 'frontend-reviewer', 'type-safety'],
  huggingface: ['ai-code-reviewer', 'python-pro', 'performance-optimizer'],
  meta: ['orchestrator', 'agent-organizer', 'logic-reviewer'],
};

const DOMAIN_PREFLIGHT = {
  frontend: [
    '✅ Are all component props strictly typed with zero implicit "any"?',
    '✅ Are responsive breakpoints, fluid typography, and optical balance verified?',
    '✅ Is accessibility (ARIA labels, keyboard navigation, contrast ratio >= 4.5:1) validated?',
    '✅ Are re-renders minimized and state lifecycles cleanly separated?',
    '✅ Did I verify all imported UI components and icon sets actually exist?',
  ],
  motion: [
    '✅ Does animation maintain 60fps/120fps using transform (translate3d, scale) and opacity?',
    '✅ Is optical mass conserved across state interpolations without volume collapse?',
    '✅ Is duration capped within micro-interaction budgets (150ms–280ms)?',
    '✅ Is prefers-reduced-motion respected with graceful instant fallbacks?',
    '✅ Did I prevent layout thrashing and continuous geometry mutations?',
  ],
  backend: [
    '✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?',
    '✅ Are SQL and database queries parameterized with zero string concatenation?',
    '✅ Are error boundaries and timeout/retry policies explicitly declared?',
    '✅ Are authentication and object-level authorization (IDOR/BOLA) checked before business logic?',
    '✅ Did I verify that imported dependencies exist in package manifests?',
  ],
  database: [
    '✅ Are all queries parameterized against SQL injection vulnerabilities?',
    '✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?',
    '✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?',
    '✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?',
    '✅ Did I verify table and column names against active schema definitions?',
  ],
  security: [
    '✅ Are user inputs sanitized and treated as untrusted data at system boundaries?',
    '✅ Are secrets loaded strictly via environment variables with zero hardcoding?',
    '✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?',
    '✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?',
    '✅ Did I verify encryption in transit and at rest for sensitive data?',
  ],
  devops: [
    '✅ Are strict execution modes (set -euo pipefail) active on all scripts?',
    '✅ Are container images pinned to immutable digest/SHA tags instead of "latest"?',
    '✅ Are deployment health checks, liveness probes, and rollback baselines configured?',
    '✅ Are CI secrets masked and unexposed to untrusted pull requests?',
    '✅ Did I verify environment compatibility across target runtimes?',
  ],
  testing: [
    '✅ Do tests follow behavioral GIVEN/WHEN/THEN specifications?',
    '✅ Are happy path, failure paths, and boundary conditions (0, null, max, unicode) covered?',
    '✅ Are test mocks isolated and reset between successive test cases?',
    '✅ Do E2E locators rely on stable ARIA attributes instead of brittle CSS selectors?',
    '✅ Did I verify test suite passes deterministically without flaky race conditions?',
  ],
  mobile: [
    '✅ Do touch targets satisfy the 44x44px minimum touch boundary standard?',
    '✅ Are gesture handlers and native animations offloaded via Reanimated worklets on the UI thread?',
    '✅ Are keyboard avoiding views, safe areas, and notch offsets handled?',
    '✅ Is offline storage and state hydration handled with optimistic sync?',
    '✅ Did I verify compatibility across iOS, Android, and varying screen densities?',
  ],
  huggingface: [
    '✅ Are model architectures and weights verified to fit within target hardware VRAM budgets?',
    '✅ Are pipeline requests guarded with bounded timeouts and retry backoffs?',
    '✅ Are dataset loading scripts operating in streaming mode to prevent out-of-memory errors?',
    '✅ Are API tokens and cache paths handled portably without assuming UNIX shell environments?',
    '✅ Are tokenizers and generation parameters (max_new_tokens, temperature) strictly bounded?',
  ],
  meta: [
    '✅ Did I deconstruct the root objective before proposing architecture?',
    '✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?',
    '✅ Did I avoid over-engineering and select the simplest effective pattern?',
    '✅ Did I verify assumptions with concrete file reads instead of speculation?',
    '✅ Did I establish measurable verification criteria before completion?',
  ],
};

const DOMAIN_TRAPS = {
  frontend: [
    {
      trope: 'Uncontrolled Re-render Loop',
      bad: 'Mutating state inside render bodies or omitting hook dependencies',
      good: 'Wrap effects with explicit deps and isolate reactive derivations in useMemo',
    },
    {
      trope: 'Accessibility Neglect',
      bad: 'Interactive <div> without role="button", tabIndex, or onKeyDown',
      good: 'Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring',
    },
    {
      trope: 'Layout Shift Flash',
      bad: 'Images/dynamic content without aspect-ratio or explicit dimensions',
      good: 'Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS',
    },
  ],
  motion: [
    {
      trope: 'The Instant Pop Trap',
      bad: 'Conditionally unmounting elements without animated interpolation',
      good: 'Use AnimatePresence or coordinate morphs with continuous geometry',
    },
    {
      trope: 'Layout Thrashing',
      bad: 'Animating width, height, top, or left inside animation loops',
      good: 'Animate composite-only transform (translate3d, scale) and opacity',
    },
    {
      trope: 'Sluggish Duration',
      bad: 'Setting micro-interaction transitions to 600ms+ causing interface lag',
      good: 'Cap interactive feedback at 160ms–240ms with snappy ease-out curves',
    },
  ],
  backend: [
    {
      trope: 'Unchecked Payload Cast',
      bad: 'Casting request bodies to TypeScript types without runtime schema validation',
      good: 'Parse request payloads through Zod/Pydantic schemas before business logic',
    },
    {
      trope: 'Silent Error Swallowing',
      bad: 'Catching errors with empty catch blocks or logging without rethrowing',
      good: 'Propagate structured errors with status codes and contextual stack traces',
    },
    {
      trope: 'Unparameterized Query',
      bad: 'Concatenating user inputs into SQL/Prisma query strings',
      good: 'Always use parameterized bindings or type-safe ORM query builders',
    },
  ],
  database: [
    {
      trope: 'Full Table Scan Blindspot',
      bad: 'Querying high-cardinality tables without index coverage',
      good: 'Verify query plans with EXPLAIN ANALYZE and add composite B-Tree indexes',
    },
    {
      trope: 'Non-Atomic Batch Mutation',
      bad: 'Executing multiple related DB writes sequentially without transaction wrapper',
      good: 'Wrap multi-table updates in an atomic transaction with automatic rollback',
    },
    {
      trope: 'Destructive Schema Migration',
      bad: 'Dropping or renaming columns in production without multi-phase migration',
      good: 'Use expand-and-contract: add new column, sync data, migrate callers, drop old',
    },
  ],
  security: [
    {
      trope: 'Hardcoded Secret Pattern',
      bad: 'Committing API keys, tokens, or private salts into source code',
      good: 'Load credentials strictly via runtime environment variables and secret stores',
    },
    {
      trope: 'Prompt Injection Surface',
      bad: 'Directly concatenating untrusted user input into LLM system prompts',
      good: 'Wrap user content in isolated delimiters and strip injection control sequences',
    },
    {
      trope: 'Missing Authorization Check',
      bad: 'Relying only on authentication token presence without checking tenant/object RBAC',
      good: 'Verify user permissions against the specific target record ID before mutation',
    },
  ],
  devops: [
    {
      trope: 'Silent Pipeline Failure',
      bad: 'Executing shell steps without set -euo pipefail, ignoring errors',
      good: 'Always initialize shell scripts with set -euo pipefail and trap handlers',
    },
    {
      trope: 'Unpinned Dependency Shift',
      bad: 'Installing packages with npm install or using :latest docker tags',
      good: 'Lock dependencies with npm ci / lockfiles and use immutable SHA256 image digests',
    },
    {
      trope: 'Leaking Build Secrets',
      bad: 'Passing secrets as Docker build arguments baked into image layers',
      good: 'Use Docker BuildKit secret mounts (--mount=type=secret) or runtime injection',
    },
  ],
  testing: [
    {
      trope: 'Testing Implementation Details',
      bad: 'Asserting on private component state or internal helper functions',
      good: 'Assert on observable user behaviors, DOM roles, and network outcomes',
    },
    {
      trope: 'Flaky Async Assertion',
      bad: 'Using arbitrary setTimeout delays before asserting on asynchronous state',
      good: 'Use waitFor or condition-based queries that poll with timeout bounds',
    },
    {
      trope: 'Shared Mutable State',
      bad: 'Reusing database records across concurrent test runners',
      good: 'Isolate test databases per worker or execute in rolled-back transactions',
    },
  ],
  mobile: [
    {
      trope: 'JS Thread Animation Lag',
      bad: 'Driving gestures and scrolling physics on the React Native JS thread',
      good: 'Use React Native Reanimated worklets running directly on the UI thread',
    },
    {
      trope: 'Missing Keyboard Offset',
      bad: 'Forms hidden behind native software keyboard on iOS/Android',
      good: 'Wrap form views in KeyboardAvoidingView with platform-calibrated behavior',
    },
    {
      trope: 'Uncached Image Flooding',
      bad: 'Rendering raw image URLs in list items without memory caching',
      good: 'Use FastImage or Expo Image with disk cache policies and thumbnail previews',
    },
  ],
  huggingface: [
    {
      trope: 'Platform-Dependent Shell Commands',
      bad: 'Hardcoding $(cat ~/.cache/huggingface/token) or piping to jq',
      good: 'Use platform-agnostic token checks via env var HF_TOKEN and native JSON parsing',
    },
    {
      trope: 'VRAM OOM Crash',
      bad: 'Loading 70B model weights on a consumer 16GB GPU without quantization',
      good: 'Calculate parameter bounds (fp16 = VRAM/2, Q4 = VRAM*2) and load with bitsandbytes/GGUF',
    },
    {
      trope: 'Blocking Batch Generation',
      bad: 'Generating large batches synchronously without streaming or yield',
      good: 'Use TextIteratorStreamer or asynchronous generate workers to prevent request timeouts',
    },
  ],
  meta: [
    {
      trope: 'Hallucinated Tool Capabilities',
      bad: 'Assuming an external library or CLI command exists without verification',
      good: 'Run a verification check or verify package.json before referencing tools',
    },
    {
      trope: 'Premature Completion Claim',
      bad: 'Declaring a task finished because code was generated without verification',
      good: 'Execute tests, linters, or terminal commands to provide concrete proof',
    },
    {
      trope: 'Context Bloat Dumping',
      bad: 'Pasting entire multi-thousand-line files into prompt context',
      good: 'Extract targeted excerpts, symbols, and signatures to preserve tokens',
    },
  ],
};

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, meta: {}, body: content };
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return { frontmatter: null, meta: {}, body: content };

  const rawYaml = content.slice(4, endIdx).trim();
  const body = content.slice(endIdx + 4).trim();
  const meta = {};

  const lines = rawYaml.split('\n');
  let currentKey = null;
  let isList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      const val = match[2].trim();
      if (!val) {
        meta[currentKey] = [];
        isList = true;
      } else {
        meta[currentKey] = val.replace(/^["']|["']$/g, '');
        isList = false;
      }
    } else if (isList && trimmed.startsWith('-')) {
      const item = trimmed.slice(1).trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(meta[currentKey])) {
        meta[currentKey].push(item);
      }
    }
  }

  return { frontmatter: rawYaml, meta, body };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function enrichDescription(skillName, domain, currentDesc) {
  let desc = (currentDesc || '').trim();
  desc = desc.replace(/^(use\s+when\s+)+/i, '').trim();
  if (desc.length > 35 && !desc.toLowerCase().endsWith('mastery.')) {
    return `Use when ${desc}`;
  }

  const cleanName = skillName.replace(/-/g, ' ');
  const domainSpecificIntents = {
    frontend: `building, styling, optimizing, and auditing ${cleanName} components, responsive layouts, design systems, and frontend state.`,
    motion: `implementing, optimizing, and timing 60fps/120fps ${cleanName} animations, transitions, gesture physics, and reduced-motion fallbacks.`,
    backend: `designing, implementing, auditing, and hardening ${cleanName} server logic, APIs, background jobs, and error boundaries.`,
    database: `designing schemas, querying, indexing, optimizing, and securing ${cleanName} databases and data models.`,
    security: `auditing, pen-testing, hardening, and verifying code against ${cleanName} vulnerabilities, injection vectors, and auth flaws.`,
    devops: `configuring, automating, deploying, and debugging ${cleanName} pipelines, containers, servers, and cloud infrastructure.`,
    testing: `writing, maintaining, executing, and auditing ${cleanName} test suites, assertions, mocks, and verification gates.`,
    mobile: `building, optimizing, and securing ${cleanName} mobile interfaces, native bridges, touch gestures, and offline states.`,
    huggingface: `loading, evaluating, fine-tuning, and deploying ${cleanName} machine learning models, datasets, and inference pipelines.`,
    meta: `executing, coordinating, planning, or reviewing ${cleanName} agent workflows, cognitive loops, and architecture standards.`,
  };

  const intent = domainSpecificIntents[domain] || `executing tasks in the ${cleanName} domain.`;
  return `Use when ${intent}`;
}

function buildEnhancedSkill(skillName, originalContent) {
  const { meta, body } = parseFrontmatter(originalContent);
  const domain = getSkillDomain(skillName);
  const reviewers = DOMAIN_REVIEWERS[domain] || DOMAIN_REVIEWERS.meta;
  const preflights = DOMAIN_PREFLIGHT[domain] || DOMAIN_PREFLIGHT.meta;
  const traps = DOMAIN_TRAPS[domain] || DOMAIN_TRAPS.meta;

  // Extract clean title
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${skillName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Engineering`;

  // Clean core body: strip existing redundant wrappers and headers to prevent duplication
  let coreBody = body;

  // Strip duplicate top title
  coreBody = coreBody.replace(new RegExp(`^#\\s+${escapeRegex(title)}\\r?\\n*`, 'm'), '').trim();

  // Strip broken duplicate horizontal rules or artifact headers
  coreBody = coreBody.replace(/^---\s*(\r?\n---\s*)+/g, '').trim();
  coreBody = coreBody.replace(/## 🛠️ Technical Architecture & Reference Recipes\s*(\r?\n---\s*)+/g, '## 🛠️ Technical Architecture & Reference Recipes\n\n').trim();

  // Detect existing sections
  const alreadyHasPreflight = coreBody.includes('## Mandatory Pre-Flight Context Inspection');
  const alreadyHasBoundaries = coreBody.includes('## Activation Boundaries');
  const alreadyHasProtocol = coreBody.includes('## 🔁 Multi-Pass Execution Protocol');
  const alreadyHasEdgeCases = coreBody.includes('## 🚨 Edge-Case & Failure Mode Matrix');
  const alreadyHasTraps = coreBody.includes('## 🤖 LLM-Specific Traps Table') || coreBody.includes('## Hallucination Traps');
  const alreadyHasTribunal = coreBody.includes('## 🏛️ Tribunal Verification & Guardrails');

  // Strip legacy footers
  const oldFooterRegex = /\n---\s*\n+(\*\*Slash command: `\/review`|## 🏛️ Tribunal Integration \(Anti-Hallucination\)|\*\*Active reviewers: `logic-reviewer` · `security-auditor`\*\*)[\s\S]*$/;
  coreBody = coreBody.replace(oldFooterRegex, '').trim();

  // Clean repetitive consecutive ---
  coreBody = coreBody.replace(/\n---\s*\n---\s*\n/g, '\n---\n');

  // Description
  const desc = enrichDescription(skillName, domain, meta.description);

  // Frontmatter formatting
  const scripts = Array.isArray(meta['scripts-binding']) && meta['scripts-binding'].length > 0
    ? meta['scripts-binding']
    : ['.agent/scripts/lint_runner.js', '.agent/scripts/verify_all.js'];
  if (!scripts.includes('.agent/scripts/lint_runner.js')) scripts.push('.agent/scripts/lint_runner.js');
  if (!scripts.includes('.agent/scripts/verify_all.js')) scripts.push('.agent/scripts/verify_all.js');

  const skillsList = Array.isArray(meta.skills) && meta.skills.length > 0
    ? `skills:\n${meta.skills.map(s => `  - ${s}`).join('\n')}`
    : null;

  const formattedFrontmatter = [
    '---',
    `name: ${skillName}`,
    `description: "${desc.replace(/"/g, '\\"')}"`,
    `version: 6.0.0`,
    `last-updated: 2026-09-29`,
    skillsList,
    `tools: Read, Grep, Glob, Bash, Edit, Write`,
    `scripts-binding:\n${scripts.map(s => `  - ${s}`).join('\n')}`,
    '---',
  ].filter(Boolean).join('\n');

  // Section templates
  const preflightSection = alreadyHasPreflight ? '' : `## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the \`${skillName}\` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).
`;

  const boundarySection = alreadyHasBoundaries ? '' : `## Activation Boundaries
- **Activate when:** ${desc}
- **DO NOT activate when:** The task falls outside the \`${skillName}\` domain or is managed by a different dedicated specialist agent.
`;

  const protocolSection = alreadyHasProtocol ? '' : `## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |
`;

  const edgeCasesSection = alreadyHasEdgeCases ? '' : `## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |
`;

  const trapsSection = alreadyHasTraps ? '' : `## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
${traps.map(t => `| **${t.trope}** | ${t.bad} | ${t.good} |`).join('\n')}
`;

  const tribunalSection = alreadyHasTribunal ? '' : `## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** ${reviewers.map(r => `\`${r}\``).join(' · ')}
**Slash Command:** \`/review\` or \`/tribunal-full\`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **\`[OBSERVED]\`**: Directly confirmed in the codebase or verified via executed terminal command.
- **\`[INFERRED]\`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **\`[UNVERIFIED]\`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
\`\`\`
${preflights.join('\n')}
\`\`\`

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
`;

  const parts = [
    formattedFrontmatter,
    '',
    `# ${title}`,
    '',
    preflightSection,
    boundarySection,
    protocolSection,
    coreBody,
    '',
    edgeCasesSection,
    trapsSection,
    tribunalSection
  ].filter(p => p !== '');

  let result = parts.join('\n\n').trim() + '\n';
  result = result.replace(/\n{4,}/g, '\n\n\n');
  return result;
}

function run() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`✖ Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let skillDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (TARGET_SKILL) {
    skillDirs = skillDirs.filter(s => s.toLowerCase() === TARGET_SKILL.toLowerCase());
    if (skillDirs.length === 0) {
      console.error(`✖ Skill not found: ${TARGET_SKILL}`);
      process.exit(1);
    }
  }

  if (TARGET_DOMAIN) {
    const domainSkills = domainRoutes[TARGET_DOMAIN] || [];
    skillDirs = skillDirs.filter(s => domainSkills.includes(s));
    console.log(`Filtering for domain: ${TARGET_DOMAIN} (${skillDirs.length} skills found)`);
  }

  console.log(`\n🚀 Tribunal Kit State-of-the-Art Skill Enhancement Engine v6.0.0`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target Skills: ${skillDirs.length}`);
  console.log(`Execution Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : FIX ? 'FIX (writing changes)' : 'VALIDATE ONLY'}`);
  console.log(`Sync to Root: ${SYNC_TO_ROOT ? 'YES' : 'NO'}\n`);

  let enhancedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const skillName of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      skippedCount++;
      continue;
    }

    try {
      const original = fs.readFileSync(skillPath, 'utf8');
      const enhanced = buildEnhancedSkill(skillName, original);

      if (!enhanced) {
        console.warn(`⚠️ [SKIP] Could not parse: ${skillName}`);
        skippedCount++;
        continue;
      }

      const isModified = original !== enhanced;

      if (isModified) {
        enhancedCount++;
        if (FIX) {
          fs.writeFileSync(skillPath, enhanced, 'utf8');
          if (SYNC_TO_ROOT && fs.existsSync(ROOT_SKILLS_DIR)) {
            const rootSkillDir = path.join(ROOT_SKILLS_DIR, skillName);
            if (!fs.existsSync(rootSkillDir)) fs.mkdirSync(rootSkillDir, { recursive: true });
            fs.writeFileSync(path.join(rootSkillDir, 'SKILL.md'), enhanced, 'utf8');
          }
          console.log(`✅ [ENHANCED] ${skillName} (v6.0.0, domain: ${getSkillDomain(skillName)})`);
        } else {
          console.log(`🔍 [PENDING] ${skillName} (would enhance)`);
        }
      } else {
        skippedCount++;
        console.log(`⏭️ [IDENTICAL] ${skillName}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`✖ [ERROR] Failed processing ${skillName}: ${err.message}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total Examined: ${skillDirs.length}`);
  console.log(`Enhanced:       ${enhancedCount}`);
  console.log(`Unchanged/Skip: ${skippedCount}`);
  console.log(`Errors:         ${errorCount}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

if (require.main === module) {
  run();
}

module.exports = { buildEnhancedSkill, getSkillDomain, DOMAIN_REVIEWERS, DOMAIN_PREFLIGHT, DOMAIN_TRAPS };
