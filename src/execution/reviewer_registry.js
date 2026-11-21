// @ts-nocheck
'use strict';

/**
 * reviewer_registry.js — Reviewer Persona Registry & Instruction Resolver
 * =======================================================================
 * Resolves domain-specific review instructions from .agent/agents/*.md
 * with canonical registry fallback, lifecycle redirects, and robust zero-dependency catalog.
 */

const fs = require('fs');
const path = require('path');
const { resolveAgent } = require('./canonical_registry');

const BUILTIN_CATALOG = {
  'security-auditor': {
    name: 'Security Auditor (OWASP 2025 Enforcer)',
    instructions: `Audit code for injection vulnerabilities (SQL, NoSQL, Command, XSS), broken authentication, weak JWT algorithms, insecure credential handling, SSRF, missing rate limiting, IDOR, and prompt injection vectors. Reject any unparameterized database queries or unverified crypto algorithms.`,
    domains: ['security', 'auth'],
  },
  'logic-reviewer': {
    name: 'Logic & Integrity Reviewer',
    instructions: `Verify state transitions, control flow, boundary conditions, off-by-one errors, null/undefined safety, unhandled edge cases, asynchronous race conditions, and business logic adherence. Reject hallucinations and invented API methods.`,
    domains: ['logic'],
  },
  'sql-reviewer': {
    name: 'SQL & Database Architect',
    instructions: `Verify database query parameterization, transactional atomicity, table lock implications, missing indexes on foreign keys, N+1 query patterns, and schema migration backward compatibility.`,
    domains: ['database', 'sql'],
  },
  'schema-reviewer': {
    name: 'Input Schema & Validation Reviewer',
    instructions: `Verify runtime request validation schemas (Zod, Pydantic, Joi), DTO boundaries, payload sanitization, type coercion vulnerabilities, and strict input schema enforcement at API boundaries.`,
    domains: ['schema', 'validation'],
  },
  'resilience-reviewer': {
    name: 'Resilience & Fault Tolerance Reviewer',
    instructions: `Audit timeout configurations, circuit breakers, backoff retry policies, unhandled promise rejections, connection pool limits, and graceful degradation during downstream service failures.`,
    domains: ['resilience'],
  },
  'dependency-reviewer': {
    name: 'Dependency & Supply Chain Reviewer',
    instructions: `Audit imports against package manifests, detect phantom/ghost dependencies, unpinned wildcards, deprecated packages, CVE advisories, and lockfile tampering.`,
    domains: ['dependency'],
  },
  'type-safety-reviewer': {
    name: 'Type Safety & Soundness Reviewer',
    instructions: `Enforce TypeScript/type strictness, eliminate unsafe "any" or "as unknown" casts, verify nullability guards, generic type constraints, and public API interface soundness.`,
    domains: ['type_safety'],
  },
  'frontend-reviewer': {
    name: 'Frontend & UI Lifecycle Reviewer',
    instructions: `Audit React/UI lifecycle patterns, hook dependency array completeness, re-render efficiency, state synchronization, memory leaks from event listeners, and hydration consistency.`,
    domains: ['frontend', 'ui'],
  },
  'accessibility-reviewer': {
    name: 'Accessibility & WCAG Reviewer',
    instructions: `Enforce WCAG 2.2 AA standards: semantic HTML elements, ARIA role verification, keyboard navigability, focus management, color contrast, and screen-reader accessibility.`,
    domains: ['accessibility'],
  },
  'pipeline-reviewer': {
    name: 'CI/CD & Infrastructure Pipeline Reviewer',
    instructions: `Audit GitHub Actions and CI workflows for script injection vectors, insecure action pins (unpinned SHA), credential exposure in logs, artifact poisoning, and least-privilege token permissions.`,
    domains: ['devops', 'ci_cd'],
  },
  'ai-code-reviewer': {
    name: 'AI Code Reviewer & Model Auditor',
    instructions: `Audit code that integrates LLM APIs for hallucinated model names, invented parameters, prompt injection vulnerabilities, missing streaming error handling, cost explosion patterns, and context window overflow risks.`,
    domains: ['ai', 'llm'],
  },
};

/**
 * Strips YAML frontmatter from a markdown string.
 * @param {string} content
 * @returns {string}
 */
function stripFrontmatter(content) {
  if (typeof content !== 'string') return '';
  const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+([\s\S]*)$/);
  if (match && match[2]) {
    return match[2].trim();
  }
  return content.trim();
}

/**
 * Parses frontmatter fields from markdown string.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseFrontmatterFields(content) {
  if (typeof content !== 'string') return {};
  const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match || !match[1]) return {};
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      const val = line
        .slice(idx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (key && val) fields[key] = val;
    }
  }
  return fields;
}

/**
 * Resolves reviewer specification and instructions for a reviewer ID.
 * Handles ghost alias translation, deprecated redirects, and experimental isolation.
 *
 * @param {string} reviewerId
 * @param {string} [repoRoot]
 * @param {Object} [options]
 * @returns {{ id: string, name: string, instructions: string, source: string, redirectedFrom?: string, isDeprecated?: boolean, isExperimental?: boolean }}
 */
function resolveReviewerSpec(reviewerId, repoRoot = process.cwd(), options = {}) {
  let normId = String(reviewerId).toLowerCase().trim();
  let redirectedFrom = null;

  // 1. Resolve via canonical registry (handles ghost aliases, deprecated redirects, experimental opt-in)
  try {
    const canonSpec = resolveAgent(normId, options, repoRoot);
    if (canonSpec) {
      if (canonSpec.redirectedFrom) {
        redirectedFrom = canonSpec.redirectedFrom;
        normId = canonSpec.name;
      } else if (canonSpec.aliasedFrom) {
        redirectedFrom = canonSpec.aliasedFrom;
        normId = canonSpec.name;
      }
    }
  } catch (err) {
    if (err.code === 'EXPERIMENTAL_OPT_IN_REQUIRED') {
      throw err;
    }
  }

  // 2. Search repo .agent/agents/<id>.md
  const candidatePaths = [
    path.join(repoRoot, '.agent', 'agents', `${normId}.md`),
    path.join(repoRoot, 'agents', `${normId}.md`),
    path.join(__dirname, '..', '..', '.agent', 'agents', `${normId}.md`),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const instructions = stripFrontmatter(raw);
        const fm = parseFrontmatterFields(raw);
        const displayName = fm.name
          ? fm.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : normId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        return {
          id: normId,
          name: displayName,
          instructions:
            instructions || BUILTIN_CATALOG[normId]?.instructions || 'Perform code review.',
          source: p,
          ...(redirectedFrom ? { redirectedFrom } : {}),
        };
      } catch (_) {}
    }
  }

  // 3. Fall back to builtin catalog
  if (BUILTIN_CATALOG[normId]) {
    return {
      id: normId,
      name: BUILTIN_CATALOG[normId].name,
      instructions: BUILTIN_CATALOG[normId].instructions,
      source: 'builtin_catalog',
      ...(redirectedFrom ? { redirectedFrom } : {}),
    };
  }

  // 4. Generic fallback
  return {
    id: normId,
    name: normId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    instructions: `Audit the code change for correctness, security, and standards compliance in the ${normId} domain.`,
    source: 'generic_fallback',
    ...(redirectedFrom ? { redirectedFrom } : {}),
  };
}

module.exports = {
  BUILTIN_CATALOG,
  stripFrontmatter,
  resolveReviewerSpec,
};
