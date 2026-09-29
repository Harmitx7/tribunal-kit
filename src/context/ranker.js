'use strict';

/**
 * ranker.js — Deterministic Evidence-Driven Context Ranking Engine
 * =================================================================
 * System-1 Capability 2:
 * Evaluates repository evidence deterministically to rank candidate files
 * for prompt context selection, ensuring maximum relevant evidence and
 * minimum unnecessary context.
 *
 * Guarantees:
 * - Stable, deterministic ordering (score DESC, path ASC)
 * - Zero LLM dependency for ranking
 * - Critical security boundaries receive mandatory retention
 * - Configurable token and item budgets
 * - Explicit before/after measurement metrics
 */

const fs = require('fs');
const path = require('path');

const SECURITY_PATTERNS = [
  /[\\/](?:auth|security|permissions?|jwt|crypto|secrets?|tokens?|passwords?|sessions?)[\\/.]/i,
  /[\\/](?:roles?|access-control|rbac|oauth|sso)[\\/.]/i,
  /[\\/]SECURITY\.md$/i,
  /[\\/]\.env/i,
];

const CONFIG_PATTERNS = [
  /[\\/](?:package\.json|tsconfig\.json|Cargo\.toml|Cargo\.lock|go\.mod|pyproject\.toml)$/i,
  /[\\/](?:\.eslintrc|\.prettierrc|jest\.config|vitest\.config|webpack\.config|vite\.config)[^\\/]*$/i,
  /[\\/]Dockerfile/i,
  /[\\/](?:docker-compose|\.github[\\/]workflows)/i,
];

const DOC_PATTERNS = [
  /\.(?:md|markdown|txt|rst|adoc)$/i,
  /[\\/]docs[\\/]/i,
];

const TEST_PATTERNS = [
  /\.(?:test|spec)\.[a-zA-Z0-9]+$/i,
  /[\\/](?:__tests__|tests?|fixtures?)[\\/]/i,
];

const ENTRY_PATTERNS = [
  /[\\/](?:index|main|cli|app|server)\.[a-zA-Z0-9]+$/i,
  /[\\/]api[\\/]/i,
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function estimateTokens(textOrBytes) {
  if (typeof textOrBytes === 'number') {
    return Math.max(1, Math.ceil(textOrBytes / 4));
  }
  if (typeof textOrBytes === 'string') {
    return Math.max(1, Math.ceil(textOrBytes.length / 4));
  }
  return 1;
}

/**
 * Extract direct import / require targets from code text
 */
function extractImports(code) {
  const imports = new Set();
  const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const target = match[1] || match[2];
    if (target && (target.startsWith('.') || target.startsWith('/'))) {
      imports.add(target);
    }
  }
  return imports;
}

/**
 * Check if candidateFile is imported by targetFile or vice versa
 */
function checkImportRelation(candidateRel, targetRel, fileContents) {
  const targetContent = fileContents.get(targetRel) || '';
  const candidateContent = fileContents.get(candidateRel) || '';

  const targetBasename = path.basename(targetRel, path.extname(targetRel));
  const candidateBasename = path.basename(candidateRel, path.extname(candidateRel));

  let isDirectDependency = false;
  let isDirectImporter = false;

  // Check target -> candidate
  if (targetContent) {
    const targetImports = extractImports(targetContent);
    for (const imp of targetImports) {
      if (imp.includes(candidateBasename) || imp.endsWith(candidateBasename)) {
        isDirectDependency = true;
        break;
      }
    }
  }

  // Check candidate -> target
  if (candidateContent) {
    const candidateImports = extractImports(candidateContent);
    for (const imp of candidateImports) {
      if (imp.includes(targetBasename) || imp.endsWith(targetBasename)) {
        isDirectImporter = true;
        break;
      }
    }
  }

  return { isDirectDependency, isDirectImporter };
}

/**
 * Deterministic Context Ranking Engine
 * @param {Object} options
 * @param {string} [options.repoRoot] - Repository root directory
 * @param {string[]} [options.targetFiles] - Array of directly modified files
 * @param {string[]} [options.candidateFiles] - Array of candidate files to rank
 * @param {number} [options.maxTokens] - Maximum token budget for ranking
 * @param {number} [options.maxItems] - Maximum item count for ranking
 * @returns {Object} Ranking payload with scored items and measurement metrics
 */
function rankContext(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const rawTargetFiles = options.targetFiles || [];
  const targetFiles = (Array.isArray(rawTargetFiles) ? rawTargetFiles : [rawTargetFiles])
    .map(normalizePath)
    .filter(Boolean);

  let rawCandidates = options.candidateFiles || [];
  if (!Array.isArray(rawCandidates)) rawCandidates = [rawCandidates];

  // If candidates not provided, union of targetFiles
  const candidateSet = new Set(rawCandidates.map(normalizePath).filter(Boolean));
  for (const tf of targetFiles) {
    candidateSet.add(tf);
  }

  const allCandidatePaths = Array.from(candidateSet);

  // Pre-load content for import analysis if files exist on disk
  const fileContents = new Map();
  const fileStats = new Map();

  for (const relPath of allCandidatePaths) {
    const absPath = path.resolve(repoRoot, relPath);
    if (fs.existsSync(absPath)) {
      try {
        const stat = fs.statSync(absPath);
        if (stat.isFile()) {
          fileStats.set(relPath, stat);
          // Only read if reasonably sized (< 2MB)
          if (stat.size < 2 * 1024 * 1024) {
            fileContents.set(relPath, fs.readFileSync(absPath, 'utf8'));
          }
        }
      } catch (_) {}
    }
  }

  const scoredItems = [];
  let totalTokensBefore = 0;

  for (const relPath of allCandidatePaths) {
    const norm = normalizePath(relPath);
    const reasons = [];
    let score = 0.05; // Base baseline
    let isMandatory = false;

    const stat = fileStats.get(norm);
    const content = fileContents.get(norm);
    const sizeBytes = stat ? stat.size : 100;
    const estimatedTokens = content ? estimateTokens(content) : estimateTokens(sizeBytes);
    totalTokensBefore += estimatedTokens;

    const isDirectlyModified = targetFiles.includes(norm);
    const isRootSecurityBoundary = /[\\/]SECURITY\.md$/i.test('/' + norm) || /[\\/]\.env/i.test('/' + norm);
    const isSecurityDomain = SECURITY_PATTERNS.some(pat => pat.test('/' + norm));
    const isConfig = CONFIG_PATTERNS.some(pat => pat.test('/' + norm));
    const isDoc = DOC_PATTERNS.some(pat => pat.test('/' + norm));
    const isTest = TEST_PATTERNS.some(pat => pat.test('/' + norm));
    const isEntrypoint = ENTRY_PATTERNS.some(pat => pat.test('/' + norm));

    // Signal 1: Directly modified file (1.00, mandatory)
    if (isDirectlyModified) {
      score = Math.max(score, 1.00);
      reasons.push('directly modified');
      isMandatory = true;
    }

    // Signal 2: Security boundary (0.95, mandatory for root policy; 0.90 for security domain)
    if (isRootSecurityBoundary) {
      score = Math.max(score, 0.95);
      reasons.push('security boundary');
      isMandatory = true;
    } else if (isSecurityDomain && !isDirectlyModified) {
      score = Math.max(score, 0.90);
      reasons.push('security domain module');
    }

    // Signal 3 & 4: Import relationships with target files (0.85 importer, 0.80 dependency)
    for (const tf of targetFiles) {
      if (tf === norm) continue;
      const { isDirectDependency, isDirectImporter } = checkImportRelation(norm, tf, fileContents);
      if (isDirectImporter) {
        score = Math.max(score, 0.85);
        reasons.push(`direct importer of ${path.basename(tf)}`);
      }
      if (isDirectDependency) {
        score = Math.max(score, 0.80);
        reasons.push(`direct dependency of ${path.basename(tf)}`);
      }
    }

    // Signal 5: Test covering changed behavior (0.75 covering test; 0.20 unrelated test)
    if (isTest) {
      const targetBaseNames = targetFiles.map(tf => path.basename(tf).replace(/\.[^.]+$/, ''));
      const coversTarget = targetBaseNames.some(tb => norm.includes(tb));
      if (coversTarget) {
        score = Math.max(score, 0.75);
        reasons.push('test covering changed behavior');
      } else {
        score = Math.max(score, 0.20);
        reasons.push('unrelated test suite');
      }
    }

    // Signal 6: Configuration controlling behavior (0.70)
    if (isConfig) {
      score = Math.max(score, 0.70);
      reasons.push('configuration controlling behavior');
    }

    // Signal 7: Public API entry point (0.65)
    if (isEntrypoint && !isDirectlyModified) {
      score = Math.max(score, 0.65);
      reasons.push('public API surface');
    }

    // Signal 8: Architectural parent / sibling directory (0.50)
    if (!isDirectlyModified && targetFiles.some(tf => path.dirname(tf) === path.dirname(norm))) {
      score = Math.max(score, 0.50);
      reasons.push('architectural sibling/parent');
    }

    // Signal 9: Documentation (0.25)
    if (isDoc && !isRootSecurityBoundary && !isSecurityDomain) {
      score = Math.max(score, 0.25);
      reasons.push('documentation');
    }

    // Fallback: If no reasons matched, mark as unrelated (0.05 baseline)
    if (reasons.length === 0) {
      reasons.push('unrelated repository content');
    }

    const finalScore = parseFloat(Math.min(1.0, Math.max(0.05, score)).toFixed(2));

    scoredItems.push({
      path: norm,
      score: finalScore,
      reasons,
      is_mandatory: isMandatory,
      size_bytes: sizeBytes,
      estimated_tokens: estimatedTokens,
    });
  }

  // Deterministic stable sort: score DESCENDING, path ASCENDING
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.path.localeCompare(b.path);
  });

  // Apply budget constraints (maxTokens, maxItems)
  const maxTokens = typeof options.maxTokens === 'number' && options.maxTokens > 0 ? options.maxTokens : Infinity;
  const maxItems = typeof options.maxItems === 'number' && options.maxItems > 0 ? options.maxItems : Infinity;

  const rankedItems = [];
  const truncatedItems = [];
  let currentTokens = 0;

  // Step 1: Retain all mandatory items first
  const mandatoryItems = scoredItems.filter(item => item.is_mandatory);
  const optionalItems = scoredItems.filter(item => !item.is_mandatory);

  for (const item of mandatoryItems) {
    rankedItems.push(item);
    currentTokens += item.estimated_tokens;
  }

  // Step 2: Include optional items up to the budget limits
  for (const item of optionalItems) {
    const wouldExceedTokens = (currentTokens + item.estimated_tokens) > maxTokens;
    const wouldExceedItems = (rankedItems.length + 1) > maxItems;

    if (!wouldExceedTokens && !wouldExceedItems) {
      rankedItems.push(item);
      currentTokens += item.estimated_tokens;
    } else {
      truncatedItems.push(item);
    }
  }

  // Re-sort rankedItems so display follows deterministic score order
  rankedItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.path.localeCompare(b.path);
  });

  const totalTokensAfter = rankedItems.reduce((acc, it) => acc + it.estimated_tokens, 0);
  const criticalRetained = rankedItems.filter(it => it.is_mandatory).length;

  return {
    ranked_items: rankedItems,
    truncated_items: truncatedItems,
    metrics: {
      context_items_before: allCandidatePaths.length,
      context_items_after: rankedItems.length,
      estimated_tokens_before: totalTokensBefore,
      estimated_tokens_after: totalTokensAfter,
      critical_evidence_retained: criticalRetained,
    },
  };
}

module.exports = {
  rankContext,
  normalizePath,
  estimateTokens,
};
