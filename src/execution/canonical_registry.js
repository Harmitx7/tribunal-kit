// @ts-nocheck
'use strict';

/**
 * canonical_registry.js — Single Source of Truth for Tribunal Kit Agents & Reviewers
 * ===================================================================================
 * Governs all agent metadata, reviewer categorizations, lifecycle transitions
 * (production, deprecated, experimental), ghost reference remediation,
 * and canonical count synchronizations.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_RELATIVE_PATH = path.join('.agent', 'config', 'specialist-registry.json');

// Ghost reference capability mapping table
const GHOST_AGENT_REPLACEMENTS = {
  'python-pro': {
    target: 'backend-specialist',
    skill: 'python-pro',
    reason:
      'Python/FastAPI/Django code generation handled by backend-specialist with python-pro skill.',
  },
  'csharp-developer': {
    target: 'backend-specialist',
    skill: 'csharp-developer',
    reason:
      'C#/.NET/Blazor code generation handled by backend-specialist with csharp-developer skill.',
  },
  'sql-pro': {
    target: 'database-architect',
    skill: 'sql-pro',
    reason: 'SQL query design and tuning handled by database-architect with sql-pro skill.',
  },
  'vue-expert': {
    target: 'frontend-specialist',
    skill: 'vue-expert',
    reason: 'Vue/Nuxt component engineering handled by frontend-specialist with vue-expert skill.',
  },
  'react-specialist': {
    target: 'frontend-specialist',
    skill: 'react-specialist',
    reason:
      'React/Next.js architecture handled by frontend-specialist with react-specialist skill.',
  },
  'review-animations': {
    target: 'frontend-reviewer',
    skill: 'review-animations',
    reason: 'Animation, micro-interaction, and visual layout review handled by frontend-reviewer.',
  },
};

let cachedRegistry = null;
let cachedRepoRoot = null;

function getRepoRoot(customRoot) {
  if (customRoot) return customRoot;
  if (cachedRepoRoot) return cachedRepoRoot;

  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (
      fs.existsSync(path.join(current, 'package.json')) &&
      fs.existsSync(path.join(current, '.agent'))
    ) {
      cachedRepoRoot = current;
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  cachedRepoRoot = process.cwd();
  return cachedRepoRoot;
}

function loadRegistry(repoRoot) {
  const root = getRepoRoot(repoRoot);
  const fullPath = path.join(root, REGISTRY_RELATIVE_PATH);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`CANONICAL_REGISTRY_ERROR: Registry not found at ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function getCanonicalRegistry(repoRoot, forceReload = false) {
  if (!cachedRegistry || forceReload) {
    cachedRegistry = loadRegistry(repoRoot);
  }
  return cachedRegistry;
}

function listAllAgents(repoRoot) {
  const reg = getCanonicalRegistry(repoRoot);
  return reg.specialists || [];
}

function listProductionAgents(repoRoot) {
  return listAllAgents(repoRoot).filter(s => s.status === 'production' && s.active !== false);
}

function listReviewers(options = {}, repoRoot) {
  const { includeDeprecated = false, includeExperimental = false } = options;
  return listAllAgents(repoRoot).filter(s => {
    if (s.type !== 'reviewer') return false;
    if (s.status === 'deprecated') return Boolean(includeDeprecated);
    if (s.status === 'experimental') return Boolean(includeExperimental);
    return s.status === 'production' && s.active !== false;
  });
}

function listSpecialists(options = {}, repoRoot) {
  const { includeDeprecated = false, includeExperimental = false } = options;
  return listAllAgents(repoRoot).filter(s => {
    if (s.type === 'reviewer') return false;
    if (s.status === 'deprecated') return Boolean(includeDeprecated);
    if (s.status === 'experimental') return Boolean(includeExperimental);
    return s.status === 'production' && s.active !== false;
  });
}

function resolveAgent(name, options = {}, repoRoot) {
  if (!name || typeof name !== 'string') return null;
  const normName = name.trim().toLowerCase();
  const reg = getCanonicalRegistry(repoRoot);
  const spec = (reg.specialists || []).find(s => s.name.toLowerCase() === normName);

  // 1. Ghost reference handling
  if (!spec && GHOST_AGENT_REPLACEMENTS[normName]) {
    const ghost = GHOST_AGENT_REPLACEMENTS[normName];
    const targetSpec = resolveAgent(ghost.target, options, repoRoot);
    if (targetSpec) {
      return {
        ...targetSpec,
        aliasedFrom: normName,
        requiredSkill: ghost.skill,
        aliasReason: ghost.reason,
      };
    }
  }

  if (!spec) return null;

  // 2. Deprecated handling
  if (spec.status === 'deprecated') {
    if (options.allowDeprecated) {
      return { ...spec, isDeprecated: true };
    }
    if (spec.successor) {
      const successor = resolveAgent(spec.successor, options, repoRoot);
      if (successor) {
        return {
          ...successor,
          redirectedFrom: spec.name,
          deprecationNotice:
            spec.deprecation_notice ||
            `Agent '${spec.name}' is deprecated. Redirected to successor '${spec.successor}'.`,
        };
      }
    }
  }

  // 3. Experimental handling
  if (spec.status === 'experimental') {
    if (!options.enableExperimental && !options.optIn) {
      const err = new Error(
        `EXPERIMENTAL_AGENT_REJECTED: Agent '${spec.name}' is experimental and requires explicit opt-in.`,
      );
      err.code = 'EXPERIMENTAL_OPT_IN_REQUIRED';
      err.agentName = spec.name;
      throw err;
    }
    return { ...spec, isExperimental: true };
  }

  return spec;
}

function getRegistrySummary(repoRoot) {
  const all = listAllAgents(repoRoot);
  const reviewers = all.filter(s => s.type === 'reviewer');
  const specialists = all.filter(s => s.type !== 'reviewer');
  const production = all.filter(s => s.status === 'production');
  const deprecated = all.filter(s => s.status === 'deprecated');
  const experimental = all.filter(s => s.status === 'experimental');

  return {
    total: all.length,
    active_production: production.length,
    reviewers: reviewers.length,
    active_reviewers: reviewers.filter(r => r.status === 'production').length,
    specialists: specialists.length,
    active_specialists: specialists.filter(s => s.status === 'production').length,
    deprecated: deprecated.length,
    experimental: experimental.length,
  };
}

module.exports = {
  GHOST_AGENT_REPLACEMENTS,
  getRepoRoot,
  getCanonicalRegistry,
  listAllAgents,
  listProductionAgents,
  listReviewers,
  listSpecialists,
  resolveAgent,
  getRegistrySummary,
};
