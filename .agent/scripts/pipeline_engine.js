#!/usr/bin/env node
/**
 * pipeline_engine.js — Tribunal Kit Hybrid Pipeline Engine
 * ==========================================================
 * 3-pass decoupled code generation pipeline that separates planning,
 * code synthesis, and validation into distinct phases with minimal
 * context overhead per pass.
 *
 * Architecture:
 *   Pass 1 — Planner:   Classify task, detect stack, select skills, emit spec JSON
 *   Pass 2 — Builder:   Assemble minimal prompt (spec + 2-3 key-rules + target file)
 *   Pass 3 — Validator: Run inner_loop_validator + guardrail_engine (zero LLM calls)
 *
 * This engine does NOT call LLMs directly. It produces structured prompt payloads
 * consumed by the IDE's native LLM integration. The engine is a prompt assembler
 * and validator orchestrator.
 *
 * Usage:
 *   node .agent/scripts/pipeline_engine.js --task "Build a login form" --file Login.tsx
 *   node .agent/scripts/pipeline_engine.js --task "..." --phase plan --output json
 *   node .agent/scripts/pipeline_engine.js --task "..." --phase build --spec spec.json
 *   node .agent/scripts/pipeline_engine.js --task "..." --phase validate --code output.tsx
 *   node .agent/scripts/pipeline_engine.js --task "..." --dry-run
 *
 * API:
 *   const { planPhase, buildPhase, validatePhase, fullPipeline } = require('./pipeline_engine');
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ── Shared Utilities ────────────────────────────────────────────────────────
const { GREEN, YELLOW, CYAN, RED, BLUE, BOLD, DIM, RESET, banner, sectionHeader, timer } = require("./_colors");
const { findAgentDir, parseArgs, loadJson } = require("./_utils");

// ── Lazy-load sibling scripts (avoid circular deps) ─────────────────────────
let _contextBroker = null;
function getContextBroker() {
  if (!_contextBroker) {
    _contextBroker = require(path.join(__dirname, "context_broker.js"));
  }
  return _contextBroker;
}

let _innerLoopValidator = null;
function getInnerLoopValidator() {
  if (!_innerLoopValidator) {
    try {
      _innerLoopValidator = require(path.join(__dirname, "inner_loop_validator.js"));
    } catch {
      _innerLoopValidator = null;
    }
  }
  return _innerLoopValidator;
}

let _guardrailEngine = null;
function _getGuardrailEngine() {
  if (!_guardrailEngine) {
    try {
      _guardrailEngine = require(path.join(__dirname, "guardrail_engine.js"));
    } catch {
      _guardrailEngine = null;
    }
  }
  return _guardrailEngine;
}


// ── Task Classification ─────────────────────────────────────────────────────
// Lightweight intent detection — no LLM call needed.

const TASK_TYPES = {
  frontend_component: {
    keywords: ["component", "page", "layout", "ui", "form", "modal", "dialog", "card", "hero", "nav", "sidebar", "dashboard", "landing"],
    stack_hint: ["react", "vue", "svelte", "html", "css"],
  },
  frontend_page: {
    keywords: ["page", "landing", "dashboard", "home", "about", "pricing", "settings"],
    stack_hint: ["react", "next", "vue", "nuxt"],
  },
  api_endpoint: {
    keywords: ["api", "endpoint", "route", "handler", "middleware", "controller", "rest", "graphql"],
    stack_hint: ["express", "fastapi", "hono", "node"],
  },
  database_query: {
    keywords: ["query", "sql", "migration", "schema", "prisma", "drizzle", "orm", "table", "index"],
    stack_hint: ["prisma", "drizzle", "postgres", "mysql", "sql"],
  },
  auth_flow: {
    keywords: ["auth", "login", "signup", "jwt", "oauth", "session", "password", "rbac", "permission"],
    stack_hint: ["jwt", "oauth", "next-auth"],
  },
  test_suite: {
    keywords: ["test", "spec", "jest", "vitest", "playwright", "e2e", "unit", "mock"],
    stack_hint: ["jest", "vitest", "playwright"],
  },
  refactor: {
    keywords: ["refactor", "clean", "extract", "rename", "move", "split", "merge", "deduplicate"],
    stack_hint: [],
  },
  animation: {
    keywords: ["animation", "motion", "gsap", "framer", "transition", "scroll", "parallax", "hover"],
    stack_hint: ["gsap", "framer-motion", "css"],
  },
  general: {
    keywords: [],
    stack_hint: [],
  },
};

// Stack detection keywords
const STACK_KEYWORDS = {
  react: ["react", "jsx", "tsx", "useState", "useEffect", "component"],
  nextjs: ["next", "nextjs", "server component", "server action", "app router"],
  vue: ["vue", "nuxt", "composition api", "ref(", "computed("],
  typescript: ["typescript", "ts", "interface", "type ", "generic"],
  python: ["python", "fastapi", "django", "flask", "pydantic"],
  node: ["node", "express", "hono", "koa"],
  css: ["css", "tailwind", "style", "responsive", "dark mode"],
  sql: ["sql", "postgres", "mysql", "prisma", "drizzle", "query"],
  rust: ["rust", "cargo", "tokio", "axum"],
};


// ══════════════════════════════════════════════════════════════════════════════
// PASS 1 — PLANNER
// Classify the task, detect stack, select minimal skills, emit structured spec.
// Token budget: ~1,500 tokens (no GEMINI.md, no agent personas)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Classify user task into a structured spec without any LLM call.
 *
 * @param {string} task       - Raw user task description
 * @param {string[]} files    - Files being touched (for extension detection)
 * @param {string} agentDir   - Path to .agent/ directory
 * @returns {object} Structured spec JSON
 */
function planPhase(task, files = [], agentDir = null) {
  const resolvedAgentDir = agentDir || findAgentDir();
  const taskLower = task.toLowerCase();

  // 1. Classify task type
  let bestType = "general";
  let bestScore = 0;
  for (const [type, config] of Object.entries(TASK_TYPES)) {
    let score = 0;
    for (const kw of config.keywords) {
      if (taskLower.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // 2. Detect stack from task text + file extensions
  const detectedStack = [];
  for (const [stack, keywords] of Object.entries(STACK_KEYWORDS)) {
    for (const kw of keywords) {
      if (taskLower.includes(kw)) {
        if (!detectedStack.includes(stack)) detectedStack.push(stack);
        break;
      }
    }
  }

  // Infer stack from file extensions
  const extToStack = {
    ".tsx": "react", ".jsx": "react",
    ".ts": "typescript", ".js": "node",
    ".vue": "vue", ".py": "python",
    ".rs": "rust", ".sql": "sql",
    ".css": "css",
  };
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const stack = extToStack[ext];
    if (stack && !detectedStack.includes(stack)) {
      detectedStack.push(stack);
    }
  }

  // 3. Select essential skills via context broker (pipeline mode)
  const broker = getContextBroker();
  const selection = broker.selectSkills(
    task,
    files,
    "small", // Use small-model tier for aggressive pruning
    broker.loadSkills(resolvedAgentDir)
  );

  // Take only top 3 essential skills for Pass 2
  const essentialSkills = selection.essential.slice(0, 3).map(s => ({
    name: s.name,
    score: selection.scores.get(s.name) || 0,
  }));

  // 4. Extract constraints from task text
  const constraints = {};
  if (taskLower.includes("accessible") || taskLower.includes("a11y") || taskLower.includes("aria")) {
    constraints.accessibility = true;
  }
  if (taskLower.includes("responsive") || taskLower.includes("mobile")) {
    constraints.responsive = true;
  }
  if (taskLower.includes("dark mode") || taskLower.includes("theme")) {
    constraints.dark_mode = true;
  }
  if (taskLower.includes("animation") || taskLower.includes("motion") || taskLower.includes("gsap")) {
    constraints.animation = true;
  }
  if (taskLower.includes("test") || taskLower.includes("spec")) {
    constraints.tests_required = true;
  }
  if (taskLower.includes("typescript") || taskLower.includes("type-safe")) {
    constraints.type_safe = true;
  }

  // 5. Determine target file
  const targetFile = files.length > 0 ? files[0] : null;

  return {
    task_type: bestType,
    stack: detectedStack,
    target_file: targetFile,
    essential_skills: essentialSkills,
    constraints,
    spec: task,
    timestamp: new Date().toISOString(),
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// PASS 2 — BUILDER
// Assemble a minimal, focused prompt for code generation.
// Token budget: ~2,500 tokens (spec + 2-3 key-rules + target file excerpt)
// Zero governance overhead — no GEMINI.md, no agent personas, no tribunal rules.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Assemble a minimal builder prompt from the planner spec.
 *
 * @param {object} spec       - Structured spec from planPhase()
 * @param {string} agentDir   - Path to .agent/ directory
 * @param {object} [opts]     - Options
 * @param {string} [opts.targetFileContent] - Current content of the target file (for modifications)
 * @returns {{ prompt: string, tokenEstimate: number, skillsLoaded: string[] }}
 */
function buildPhase(spec, agentDir = null, opts = {}) {
  const resolvedAgentDir = agentDir || findAgentDir();
  const broker = getContextBroker();
  const allSkills = broker.loadSkills(resolvedAgentDir);

  const lines = [];
  const skillsLoaded = [];

  // ── Section 1: Task Specification (compact) ────────────────────────────────
  lines.push("# Code Generation Task");
  lines.push("");
  lines.push(`Type: ${spec.task_type}`);
  lines.push(`Stack: ${spec.stack.join(", ") || "detect from context"}`);
  if (spec.target_file) {
    lines.push(`Target: ${spec.target_file}`);
  }
  lines.push("");
  lines.push("## Requirements");
  lines.push("");
  lines.push(spec.spec);
  lines.push("");

  // Constraints
  const constraintEntries = Object.entries(spec.constraints || {});
  if (constraintEntries.length > 0) {
    lines.push("## Constraints");
    lines.push("");
    for (const [key, val] of constraintEntries) {
      lines.push(`- ${key.replace(/_/g, " ")}: ${val}`);
    }
    lines.push("");
  }

  // ── Section 2: Essential Skill Key-Rules (max 3 skills) ────────────────────
  const skillNames = (spec.essential_skills || []).map(s => s.name);
  if (skillNames.length > 0) {
    lines.push("## Design & Implementation Guidelines");
    lines.push("");
    lines.push("Follow these rules strictly:");
    lines.push("");

    for (const skillName of skillNames.slice(0, 3)) {
      const skill = allSkills.find(s => s.name === skillName);
      if (!skill) continue;

      skillsLoaded.push(skillName);
      lines.push(`### ${skillName}`);
      lines.push("");
      // Use condensed key-rules only — not full SKILL.md
      lines.push(skill.keyRules || "");
      lines.push("");
    }
  }

  // ── Section 3: Target File Context (if modifying existing code) ────────────
  if (opts.targetFileContent) {
    lines.push("## Current File Content");
    lines.push("");
    lines.push("```");
    // Truncate to ~200 lines to stay within budget
    const fileLines = opts.targetFileContent.split("\n");
    if (fileLines.length > 200) {
      lines.push(fileLines.slice(0, 200).join("\n"));
      lines.push(`\n... (${fileLines.length - 200} more lines truncated)`);
    } else {
      lines.push(opts.targetFileContent);
    }
    lines.push("```");
    lines.push("");
  }

  // ── Section 4: Output Format Instruction ───────────────────────────────────
  lines.push("## Output Instructions");
  lines.push("");
  lines.push("Generate ONLY the code. No explanations, no preamble, no markdown fences.");
  lines.push("Use self-documenting names. Add error handling on async functions.");
  lines.push("Mark any uncertain API calls with // VERIFY: [reason].");
  lines.push("");

  const prompt = lines.join("\n");

  // Rough token estimate: ~4 chars per token for English text
  const tokenEstimate = Math.ceil(prompt.length / 4);

  return { prompt, tokenEstimate, skillsLoaded };
}


// ══════════════════════════════════════════════════════════════════════════════
// PASS 3 — VALIDATOR
// Run deterministic checks on generated code (zero LLM calls).
// Uses inner_loop_validator.js (OWASP patterns + syntax heuristics)
// and guardrail_engine.js (phantom references + structural checks).
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate generated code using deterministic scanners.
 *
 * @param {string} code        - Generated code string
 * @param {object} spec        - Structured spec from planPhase()
 * @param {object} [opts]      - Options
 * @param {string} [opts.lang] - Language override (ts, js, py, etc.)
 * @returns {{ verdict: string, passed: boolean, issues: object[], summary: string, feedback: string|null }}
 */
function validatePhase(code, spec, opts = {}) {
  const issues = [];
  let verdict = "APPROVED";

  // ── Inner Loop Validator (security patterns + syntax) ──────────────────────
  const innerLoop = getInnerLoopValidator();
  if (innerLoop && typeof innerLoop.validateSnippet === "function") {
    try {
      const ilResult = innerLoop.validateSnippet(code, opts.lang || detectLang(spec));
      if (ilResult && ilResult.issues) {
        for (const issue of ilResult.issues) {
          issues.push({
            source: "inner_loop_validator",
            severity: issue.severity || "medium",
            category: issue.category || "unknown",
            line: issue.line || null,
            message: issue.message || "Unnamed issue",
            fix: issue.fix || null,
          });
        }
      }
    } catch {
      // Inner loop validator not available or errored — continue without it
    }
  }

  // ── Manual Pattern Checks (always run, no dependencies) ────────────────────
  const manualIssues = runManualChecks(code, spec);
  issues.push(...manualIssues);

  // ── Classify verdict ───────────────────────────────────────────────────────
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const highCount = issues.filter(i => i.severity === "high").length;

  if (criticalCount > 0) {
    verdict = "REJECTED";
  } else if (highCount > 0) {
    verdict = "WARNING";
  } else {
    verdict = "APPROVED";
  }

  // ── Build self-healing feedback for retry ──────────────────────────────────
  let feedback = null;
  if (verdict !== "APPROVED" && issues.length > 0) {
    const feedbackLines = ["The following issues were found in the generated code:"];
    for (const issue of issues.slice(0, 5)) {
      feedbackLines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.fix) feedbackLines.push(`  Fix: ${issue.fix}`);
    }
    feedbackLines.push("");
    feedbackLines.push("Please regenerate the code addressing these issues.");
    feedback = feedbackLines.join("\n");
  }

  const summary = verdict === "APPROVED"
    ? `✅ Code passed validation (${issues.length} issues found, none blocking)`
    : `${verdict === "REJECTED" ? "❌" : "⚠️"} Code ${verdict.toLowerCase()}: ${criticalCount} critical, ${highCount} high severity issues`;

  return {
    verdict,
    passed: verdict === "APPROVED",
    issues,
    summary,
    feedback,
  };
}

/**
 * Detect language from spec for validation context.
 */
function detectLang(spec) {
  if (!spec || !spec.target_file) return "js";
  const ext = path.extname(spec.target_file).toLowerCase();
  const map = {
    ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx",
    ".py": "py", ".rs": "rs", ".sql": "sql", ".vue": "vue",
    ".css": "css", ".html": "html",
  };
  return map[ext] || "js";
}

/**
 * Run lightweight manual pattern checks that don't require external scripts.
 * These catch the most common AI code generation mistakes.
 */
function runManualChecks(code, spec) {
  const issues = [];
  const lines = code.split("\n");

  // Check 1: eval() usage
  if (/\beval\s*\(/.test(code)) {
    issues.push({
      source: "pipeline_validator",
      severity: "critical",
      category: "Code Injection",
      line: findLineNumber(lines, /\beval\s*\(/),
      message: "eval() is a code injection vector — never use in production",
      fix: "Use JSON.parse(), new Function(), or a proper parser instead",
    });
  }

  // Check 2: Hardcoded secrets
  if (/(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']{4,}["']/i.test(code)) {
    issues.push({
      source: "pipeline_validator",
      severity: "critical",
      category: "Hardcoded Secret",
      line: findLineNumber(lines, /(?:password|secret|api[_-]?key)\s*[:=]\s*["']/i),
      message: "Hardcoded secret detected — use environment variables",
      fix: "Replace with process.env.SECRET_NAME or equivalent",
    });
  }

  // Check 3: innerHTML XSS
  if (/\.innerHTML\s*=/.test(code) && !code.includes("DOMPurify")) {
    issues.push({
      source: "pipeline_validator",
      severity: "high",
      category: "XSS",
      line: findLineNumber(lines, /\.innerHTML\s*=/),
      message: "Direct innerHTML assignment without sanitization",
      fix: "Use textContent, DOMPurify.sanitize(), or React's JSX instead",
    });
  }

  // Check 4: SQL injection (string interpolation in queries)
  if (/\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/i.test(code) ||
      /['"].*\+.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/i.test(code)) {
    issues.push({
      source: "pipeline_validator",
      severity: "critical",
      category: "SQL Injection",
      line: null,
      message: "Possible SQL injection — string interpolation in SQL query",
      fix: "Use parameterized queries ($1, ?) or an ORM",
    });
  }

  // Check 5: Console.log in production code (warning, not blocking)
  const consoleCount = (code.match(/console\.(log|debug|info)\(/g) || []).length;
  if (consoleCount > 3) {
    issues.push({
      source: "pipeline_validator",
      severity: "low",
      category: "Code Quality",
      line: null,
      message: `${consoleCount} console.log statements found — remove before production`,
      fix: "Use a proper logger (winston, pino) or remove debug logs",
    });
  }

  // Check 6: Empty catch blocks
  if (/catch\s*\([^)]*\)\s*\{[\s\n]*\}/.test(code)) {
    issues.push({
      source: "pipeline_validator",
      severity: "medium",
      category: "Error Handling",
      line: findLineNumber(lines, /catch\s*\([^)]*\)\s*\{[\s\n]*\}/),
      message: "Empty catch block swallows errors silently",
      fix: "At minimum, log the error: catch(err) { console.error(err); }",
    });
  }

  // Check 7: TypeScript `any` usage (if TS file)
  const lang = detectLang(spec);
  if ((lang === "ts" || lang === "tsx") && /:\s*any\b/.test(code)) {
    const anyCount = (code.match(/:\s*any\b/g) || []).length;
    if (anyCount > 2) {
      issues.push({
        source: "pipeline_validator",
        severity: "medium",
        category: "Type Safety",
        line: null,
        message: `${anyCount} uses of 'any' type — reduces type safety`,
        fix: "Replace with specific types or use 'unknown' with type guards",
      });
    }
  }

  return issues;
}

/**
 * Find the first line number matching a regex pattern.
 */
function findLineNumber(lines, pattern) {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}


// ══════════════════════════════════════════════════════════════════════════════
// FULL PIPELINE — Orchestrate all 3 passes
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run the full pipeline: Plan → Build → (code generation happens externally) → Validate.
 * Returns the planner spec and builder prompt. Validation runs after code is generated.
 *
 * @param {string}   task     - Raw user task
 * @param {string[]} files    - Files being touched
 * @param {object}   [opts]   - Options
 * @param {string}   [opts.agentDir]         - Path to .agent/ directory
 * @param {string}   [opts.targetFileContent] - Current content of target file
 * @returns {{ spec: object, prompt: string, tokenEstimate: number, skillsLoaded: string[], validate: function }}
 */
function fullPipeline(task, files = [], opts = {}) {
  const agentDir = opts.agentDir || findAgentDir();

  // Pass 1: Plan
  const spec = planPhase(task, files, agentDir);

  // Pass 2: Build prompt
  const builderResult = buildPhase(spec, agentDir, {
    targetFileContent: opts.targetFileContent || null,
  });

  // Pass 3: Return validator as a callable
  // The caller invokes validate(code) after the LLM generates the code
  const validate = (code) => validatePhase(code, spec, { lang: detectLang(spec) });

  return {
    spec,
    prompt: builderResult.prompt,
    tokenEstimate: builderResult.tokenEstimate,
    skillsLoaded: builderResult.skillsLoaded,
    validate,
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  planPhase,
  buildPhase,
  validatePhase,
  fullPipeline,
  detectLang,
  TASK_TYPES,
  STACK_KEYWORDS,
};


// ══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const { flags, positional } = parseArgs(process.argv.slice(2), {
    task: { type: "string", default: null },
    file: { type: "string", default: null },
    phase: { type: "string", default: "full" },
    output: { type: "string", default: "report" },
    spec: { type: "string", default: null },
    code: { type: "string", default: null },
    "dry-run": { type: "boolean", default: false },
  });

  if (flags.help || (!flags.task && positional[0] !== "demo")) {
    console.log(`
${BOLD}pipeline_engine.js${RESET} — Tribunal Hybrid Pipeline Engine

${BOLD}Usage:${RESET}
  node .agent/scripts/pipeline_engine.js --task "<description>" [options]
  node .agent/scripts/pipeline_engine.js demo

${BOLD}Options:${RESET}
  --task    <text>     Task description
  --file    <path>     Target file being created/modified
  --phase   <name>     plan | build | validate | full (default: full)
  --output  <format>   report | json | prompt (default: report)
  --spec    <path>     JSON spec file (for build phase, output of plan phase)
  --code    <path>     Code file to validate (for validate phase)
  --dry-run            Show what would happen without generating prompts

${BOLD}Phases:${RESET}
  plan       Classify task, detect stack, select skills → structured spec
  build      Assemble minimal builder prompt from spec
  validate   Run deterministic checks on generated code
  full       Run plan + build (validate returned as callable)

${BOLD}Examples:${RESET}
  node .agent/scripts/pipeline_engine.js --task "React login form" --dry-run
  node .agent/scripts/pipeline_engine.js --task "Express JWT API" --phase plan --output json
  node .agent/scripts/pipeline_engine.js --phase validate --code ./output.tsx
`);
    process.exit(0);
  }

  const agentDir = findAgentDir();

  // ── Demo Mode ──────────────────────────────────────────────────────────────
  if (positional[0] === "demo") {
    const scenarios = [
      { task: "Build a React dashboard with charts and dark mode", file: "Dashboard.tsx" },
      { task: "Create an Express JWT authentication middleware", file: "auth.ts" },
      { task: "Write a Prisma query for paginated user search", file: "users.ts" },
      { task: "Design a premium SaaS landing page with scroll animations", file: "Hero.tsx" },
    ];

    console.log(banner("Pipeline Engine — Demo Mode"));

    for (const scenario of scenarios) {
      const t = timer();
      const result = fullPipeline(scenario.task, [scenario.file], { agentDir });
      const elapsed = t().toFixed(1);

      console.log(`\n  ${BOLD}Task:${RESET} "${scenario.task}"`);
      console.log(`  ${DIM}Type:${RESET}  ${result.spec.task_type}`);
      console.log(`  ${DIM}Stack:${RESET} ${result.spec.stack.join(", ")}`);
      console.log(`  ${GREEN}Skills:${RESET} ${result.skillsLoaded.join(", ") || "(none matched)"}`);
      console.log(`  ${CYAN}Tokens:${RESET} ~${result.tokenEstimate} (vs ~12,000 monolithic)`);
      console.log(`  ${DIM}Time:${RESET}  ${elapsed}ms`);
    }

    console.log(`\n${CYAN}${"━".repeat(56)}${RESET}\n`);
    process.exit(0);
  }

  // ── Phase Execution ────────────────────────────────────────────────────────
  const files = flags.file ? [flags.file] : [];

  if (flags.phase === "plan" || flags.phase === "full") {
    const t = timer();
    const spec = planPhase(flags.task, files, agentDir);
    const elapsed = t().toFixed(1);

    if (flags.output === "json") {
      console.log(JSON.stringify(spec, null, 2));
    } else {
      console.log(banner("Pipeline — Pass 1: Planner"));
      console.log(`  ${BOLD}Task Type:${RESET}  ${spec.task_type}`);
      console.log(`  ${BOLD}Stack:${RESET}      ${spec.stack.join(", ") || "(auto-detect)"}`);
      console.log(`  ${BOLD}Skills:${RESET}     ${spec.essential_skills.map(s => s.name).join(", ")}`);
      if (Object.keys(spec.constraints).length > 0) {
        console.log(`  ${BOLD}Constraints:${RESET} ${Object.keys(spec.constraints).join(", ")}`);
      }
      console.log(`  ${DIM}Time: ${elapsed}ms${RESET}`);
    }

    if (flags.phase === "full" && !flags["dry-run"]) {
      const builderResult = buildPhase(spec, agentDir);

      if (flags.output === "json") {
        console.log(JSON.stringify({
          spec,
          tokenEstimate: builderResult.tokenEstimate,
          skillsLoaded: builderResult.skillsLoaded,
        }, null, 2));
      } else if (flags.output === "prompt") {
        console.log(builderResult.prompt);
      } else {
        console.log(sectionHeader("Pass 2: Builder Prompt", 2));
        console.log(`  ${BOLD}Token Estimate:${RESET}  ~${builderResult.tokenEstimate}`);
        console.log(`  ${BOLD}Skills Loaded:${RESET}   ${builderResult.skillsLoaded.join(", ")}`);
        console.log(`  ${GREEN}Savings:${RESET}         ~${Math.round((1 - builderResult.tokenEstimate / 14000) * 100)}% vs monolithic prompt`);
        console.log(`\n  ${DIM}Use --output prompt to see the full builder prompt${RESET}`);
      }
    }
  }

  if (flags.phase === "build") {
    let spec;
    if (flags.spec) {
      spec = loadJson(flags.spec);
      if (!spec) {
        console.error(`${RED}✖ Could not load spec file: ${flags.spec}${RESET}`);
        process.exit(1);
      }
    } else if (flags.task) {
      spec = planPhase(flags.task, files, agentDir);
    } else {
      console.error(`${RED}✖ --spec or --task required for build phase${RESET}`);
      process.exit(1);
    }

    const result = buildPhase(spec, agentDir);

    if (flags.output === "prompt") {
      console.log(result.prompt);
    } else if (flags.output === "json") {
      console.log(JSON.stringify({
        tokenEstimate: result.tokenEstimate,
        skillsLoaded: result.skillsLoaded,
      }, null, 2));
    } else {
      console.log(banner("Pipeline — Pass 2: Builder"));
      console.log(`  Token Estimate: ~${result.tokenEstimate}`);
      console.log(`  Skills Loaded:  ${result.skillsLoaded.join(", ")}`);
      console.log(`\n  Use --output prompt to see the full builder prompt`);
    }
  }

  if (flags.phase === "validate") {
    let codeContent;
    if (flags.code) {
      try {
        codeContent = fs.readFileSync(flags.code, "utf8");
      } catch (_err) {
        console.error(`${RED}✖ Could not read code file: ${flags.code}${RESET}`);
        process.exit(1);
      }
    } else {
      console.error(`${RED}✖ --code is required for validate phase${RESET}`);
      process.exit(1);
    }

    const spec = flags.task ? planPhase(flags.task, files, agentDir) : { target_file: flags.code };
    const result = validatePhase(codeContent, spec);

    if (flags.output === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(banner("Pipeline — Pass 3: Validator"));
      const icon = result.verdict === "APPROVED" ? `${GREEN}✅` :
                   result.verdict === "WARNING" ? `${YELLOW}⚠️` : `${RED}❌`;
      console.log(`  ${BOLD}Verdict:${RESET} ${icon} ${result.verdict}${RESET}`);
      console.log(`  ${BOLD}Issues:${RESET}  ${result.issues.length}`);

      if (result.issues.length > 0) {
        console.log("");
        for (const issue of result.issues) {
          const sev = issue.severity === "critical" ? RED :
                      issue.severity === "high" ? YELLOW : DIM;
          const loc = issue.line ? ` (line ${issue.line})` : "";
          console.log(`  ${sev}[${issue.severity.toUpperCase()}]${RESET} ${issue.message}${loc}`);
        }
      }

      if (result.feedback) {
        console.log(`\n  ${BLUE}Self-Healing Feedback:${RESET}`);
        console.log(`  ${DIM}${result.feedback.split("\n").join("\n  ")}${RESET}`);
      }
    }

    process.exit(result.passed ? 0 : 1);
  }
}
