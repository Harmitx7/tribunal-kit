'use strict';

/**
 * reviewer_registry.js — Reviewer Persona Registry & Instruction Resolver
 * =======================================================================
 * Resolves domain-specific review instructions from .agent/agents/*.md
 * with robust zero-dependency catalog fallbacks.
 */

const fs = require('fs');
const path = require('path');

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
 * Resolves reviewer specification and instructions for a reviewer ID.
 * Checks `.agent/agents/<id>.md`, then `agents/<id>.md`, then BUILTIN_CATALOG.
 *
 * @param {string} reviewerId
 * @param {string} [repoRoot]
 * @returns {{ id: string, name: string, instructions: string, source: string }}
 */
function resolveReviewerSpec(reviewerId, repoRoot = process.cwd()) {
  const normId = String(reviewerId).toLowerCase().trim();

  // 1. Search repo .agent/agents/<id>.md
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
        return {
          id: normId,
          name: normId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          instructions:
            instructions || BUILTIN_CATALOG[normId]?.instructions || 'Perform code review.',
          source: p,
        };
      } catch (_) {}
    }
  }

  // 2. Fall back to builtin catalog
  if (BUILTIN_CATALOG[normId]) {
    return {
      id: normId,
      name: BUILTIN_CATALOG[normId].name,
      instructions: BUILTIN_CATALOG[normId].instructions,
      source: 'builtin_catalog',
    };
  }

  // 3. Generic fallback
  return {
    id: normId,
    name: normId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    instructions: `Audit the code change for correctness, security, and standards compliance in the ${normId} domain.`,
    source: 'generic_fallback',
  };
}

module.exports = {
  BUILTIN_CATALOG,
  stripFrontmatter,
  resolveReviewerSpec,
};
