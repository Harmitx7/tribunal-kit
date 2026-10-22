'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { collectAndRankEvidence, TYPE_PRIORITY } = require('./evidence_engine');
const { REVIEWER_CATALOG } = require('./reviewer_orchestrator');
const { safeContainedPath } = require('../utils/path_containment');
const {
  extractAstUnits,
  extractAstUnitsWithCache,
  extractDiffFocalWindows,
  isSecurityBoundary,
} = require('../context/ast_context_packer');
const { countTokens } = require('../context/token_accounting');

/**
 * Parses modified lines per file from a unified diff string.
 *
 * @param {string} diffText
 * @returns {Record<string, number[]>} Map of filePath -> array of 1-indexed line numbers
 */
function parseDiffModifiedLines(diffText) {
  const fileLines = {};
  if (!diffText || typeof diffText !== 'string') return fileLines;

  const lines = diffText.split(/\r?\n/);
  let currentFile = null;
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim();
      if (!fileLines[currentFile]) fileLines[currentFile] = [];
    } else if (line.startsWith('+++ ') && !line.startsWith('+++ b/')) {
      currentFile = line.slice(4).trim().replace(/^[ab]\//, '');
      if (!fileLines[currentFile]) fileLines[currentFile] = [];
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@\s+-[0-9]+(?:,[0-9]+)?\s+\+([0-9]+)(?:,[0-9]+)?\s+@@/);
      if (match) {
        currentNewLine = parseInt(match[1], 10);
      }
    } else if (currentFile && currentNewLine > 0) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        fileLines[currentFile].push(currentNewLine);
        currentNewLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // deletion line
      } else {
        currentNewLine++;
      }
    }
  }

  return fileLines;
}

function progressiveContextExpansion(options = {}) {
  const {
    decisionPlan,
    selectedReviewers = [],
    task = '',
    diff = '',
    files = [],
    repoRoot,
    memory = [],
    previousFindings = [],
  } = options;

  if (!decisionPlan || decisionPlan.schema_version !== 1) {
    return _buildFallbackContext(options, 'INVALID_DECISION_PLAN');
  }

  try {
    let allEvidence;
    if (options.evidencePack && Array.isArray(options.evidencePack.records)) {
      // Reuse shared Evidence Pack records directly to eliminate duplicate repository reads
      const kindToType = {
        file_snippet: 'changed_file',
        ast_symbol: 'changed_symbol',
        dependency: 'direct_dependency',
        test_coverage: 'relevant_test',
        configuration: 'configuration',
        security_policy: 'security_boundary',
        test_result: 'relevant_test',
        command_output: 'historical_memory',
        reviewer_claim: 'previous_finding',
      };
      allEvidence = options.evidencePack.records.map(r => ({
        id: r.evidence_id,
        type: kindToType[r.kind] || 'changed_file',
        description: `${r.claim}${r.source ? ` [${r.source}${r.source_range?.symbol ? `:${r.source_range.symbol}` : ''}]` : ''}`,
        path: r.source,
        score: r.metadata?.score || 1.0,
        reasons: [r.claim],
        confidence: r.trust_status === 'VALIDATED' || r.trust_status === 'OBSERVED' ? 'L1' : 'L2',
        provenance: r.trust_status,
        is_mandatory: Boolean(r.metadata?.is_mandatory),
        estimated_tokens: r.metadata?.estimated_tokens || 50,
        snippet: r.snippet,
        symbol: r.source_range?.symbol,
      }));
    } else {
      const allEvidenceResult = collectAndRankEvidence({
        task,
        diff,
        files,
        repoRoot,
        memory,
        previousFindings,
        maxItems: 1000,
        maxTokens: 100000,
      });
      allEvidence = allEvidenceResult.evidence;
    }

    const effectiveRepoRoot = repoRoot || process.cwd();
    const diffModifiedLines = parseDiffModifiedLines(diff);
    const hasDiff = typeof diff === 'string' && diff.trim().length > 0;

    // Phase 4: AST-Aware Slicing and Compact Manifest Optimization
    const processedEvidence = allEvidence.map(item => {
      const processed = { ...item };
      const itemPath = processed.path ? processed.path.replace(/\\/g, '/').replace(/^\.\//, '') : '';
      const isChangedInDiff = Boolean(itemPath && diffModifiedLines[itemPath] && diffModifiedLines[itemPath].length > 0);
      const isChangedFile = hasDiff ? isChangedInDiff : (Array.isArray(files) && files.some(f => f.replace(/\\/g, '/').replace(/^\.\//, '') === itemPath));

      if (isChangedFile) {
        // 1. Changed focal file: extract enclosing AST unit or diff focal window
        const modLines = isChangedInDiff ? diffModifiedLines[itemPath] : [1];
        let fileContent = processed.snippet || '';
        try {
          const containment = safeContainedPath(itemPath, effectiveRepoRoot, { operation: 'read' });
          if (containment && containment.ok && fs.existsSync(containment.resolvedPath)) {
            fileContent = fs.readFileSync(containment.resolvedPath, 'utf8');
          }
        } catch (_) {}

        if (fileContent) {
          const { units } = options.cache
            ? extractAstUnitsWithCache(fileContent, itemPath, options.cache)
            : extractAstUnits(fileContent, itemPath);
          const enclosingUnit = units.find(
            u =>
              u.unitType !== 'whole_file' &&
              u.unitType !== 'window_block' &&
              modLines.some(line => line >= u.startLine && line <= u.endLine),
          );

          if (enclosingUnit) {
            processed.snippet = enclosingUnit.content;
            processed.start_line = enclosingUnit.startLine;
            processed.end_line = enclosingUnit.endLine;
            processed.symbol = enclosingUnit.name;
            processed.slicing_method = 'AST_STRUCTURAL';
            const counted = countTokens(enclosingUnit.content);
            processed.estimated_tokens = Math.max(30, counted.tokens);
          } else {
            const focalWindows = extractDiffFocalWindows(fileContent, itemPath, modLines, 10);
            if (focalWindows.length > 0) {
              processed.snippet = focalWindows[0].content;
              processed.start_line = focalWindows[0].startLine;
              processed.end_line = focalWindows[0].endLine;
              processed.slicing_method = 'DIFF_FOCAL_WINDOW';
              const counted = countTokens(focalWindows[0].content);
              processed.estimated_tokens = Math.max(30, counted.tokens);
            } else if (processed.snippet) {
              const lines = processed.snippet.split(/\r?\n/).slice(0, 40);
              processed.snippet = lines.join('\n');
              processed.slicing_method = 'BOUNDED_LINES';
              processed.estimated_tokens = Math.max(30, countTokens(processed.snippet).tokens);
            }
          }
        }
      } else {
        // 2. Unchanged or auxiliary evidence
        const isSecurity = processed.type === 'security_boundary' || isSecurityBoundary(itemPath);
        if (isSecurity) {
          if (processed.snippet) {
            const lines = processed.snippet.split(/\r?\n/).slice(0, 35);
            processed.snippet = lines.join('\n');
            processed.estimated_tokens = Math.min(200, countTokens(processed.snippet).tokens);
          }
          processed.slicing_method = 'SECURITY_POLICY_BOUNDED';
        } else {
          // Compact manifest item: preserve ID, claim, digest, path, provenance without heavy code body
          processed.snippet = null;
          processed.estimated_tokens = 25;
          processed.slicing_method = 'COMPACT_MANIFEST';
        }
      }

      return processed;
    });

    let targetLevel = 0;
    if (decisionPlan.tier >= 3) {
      targetLevel = 3;
    } else {
      const ambScore =
        decisionPlan.ambiguity === 'HIGH' ? 2 : decisionPlan.ambiguity === 'MEDIUM' ? 1 : 0;
      const riskScore = decisionPlan.risk === 'HIGH' ? 2 : decisionPlan.risk === 'MEDIUM' ? 1 : 0;
      const total = ambScore + riskScore;
      if (total >= 4) targetLevel = 3;
      else if (total >= 2) targetLevel = 2;
      else if (total >= 1) targetLevel = 1;
      else targetLevel = 0;
    }

    const levelTypes = {
      0: ['changed_file', 'security_boundary', 'previous_finding'],
      1: [
        'changed_file',
        'security_boundary',
        'previous_finding',
        'changed_symbol',
        'direct_dependency',
        'configuration',
      ],
      2: [
        'changed_file',
        'security_boundary',
        'previous_finding',
        'changed_symbol',
        'direct_dependency',
        'configuration',
        'relevant_test',
        'historical_memory',
      ],
      3: Object.keys(TYPE_PRIORITY),
    };

    const maxTokens = decisionPlan.context_budget?.max_tokens || 4000;
    const maxItems = decisionPlan.context_budget?.max_items || 10;

    const contextMap = {};
    const globalSelected = new Set();
    let globalTokens = 0;

    for (const rName of selectedReviewers) {
      const reviewerId = typeof rName === 'string' ? rName : rName.reviewer;
      const rObj = REVIEWER_CATALOG.find(rc => rc.name === reviewerId);

      const reviewerDomains = new Set();
      if (rObj) {
        rObj.primary_domains.forEach(d => reviewerDomains.add(d));
        rObj.secondary_domains.forEach(d => reviewerDomains.add(d));
      }
      if (reviewerDomains.size === 0) reviewerDomains.add('logic');
      const hasSecurityReviewer =
        reviewerId === 'security-auditor' || reviewerDomains.has('security');

      const selected = [];
      let currentTokens = 0;

      const addItem = item => {
        if (selected.length < maxItems && currentTokens + item.estimated_tokens <= maxTokens) {
          selected.push(item);
          currentTokens += item.estimated_tokens;
          globalSelected.add(item.id);
          return true;
        }
        return false;
      };

      // Add mandatory items (Security / Config) first across all levels
      for (const item of processedEvidence) {
        const isSecurity = item.type === 'security_boundary' || isSecurityBoundary(item.path);
        if (item.is_mandatory && isSecurity) {
          if (!selected.includes(item)) {
            if (!addItem(item)) {
              // PHASE_01_BUDGET_INVARIANT:
              // Policy: Configured budget is a hard limit.
              // Override: If mandatory security context exceeds budget -> explicit safe failure.
              throw new Error(
                `Mandatory context exceeds configured Decision Plan budget (Tokens: ${currentTokens + item.estimated_tokens} > ${maxTokens})`,
              );
            }
          }
        }
      }

      let reachedLimit = false;

      for (let l = 0; l <= targetLevel; l++) {
        const allowed = levelTypes[l] || [];
        for (const item of processedEvidence) {
          if (selected.includes(item)) continue;
          if (allowed.includes(item.type)) {
            let isRelevantToReviewer = true;
            if (
              item.type === 'relevant_test' &&
              !reviewerDomains.has('logic') &&
              !reviewerDomains.has('frontend') &&
              !reviewerDomains.has('backend') &&
              !reviewerDomains.has('all')
            ) {
              isRelevantToReviewer = false;
            }
            if (
              item.type === 'configuration' &&
              !reviewerDomains.has('dependency') &&
              !reviewerDomains.has('devops') &&
              !reviewerDomains.has('all')
            ) {
              isRelevantToReviewer = false;
            }
            if (
              item.type === 'security_boundary' &&
              !hasSecurityReviewer &&
              !reviewerDomains.has('all')
            ) {
              isRelevantToReviewer = true; // mandatory security boundaries are preserved for all
            }
            // Domain-specific relevance filtering
            if (
              (item.path?.includes('schema.prisma') || item.path?.includes('migration') || item.path?.endsWith('.sql')) &&
              !reviewerDomains.has('database') &&
              !reviewerDomains.has('backend') &&
              !reviewerDomains.has('logic') &&
              !reviewerDomains.has('all')
            ) {
              isRelevantToReviewer = false;
            }
            if (
              (item.path?.endsWith('.css') || item.path?.endsWith('.scss') || item.path?.includes('/ui/') || item.path?.endsWith('.jsx') || item.path?.endsWith('.tsx')) &&
              !reviewerDomains.has('frontend') &&
              !reviewerDomains.has('ui') &&
              !reviewerDomains.has('all')
            ) {
              isRelevantToReviewer = false;
            }

            if (isRelevantToReviewer) {
              if (!addItem(item)) {
                reachedLimit = true;
                break;
              }
            }
          }
        }
        if (reachedLimit) break;
      }

      selected.sort((a, b) => a.id.localeCompare(b.id));
      contextMap[reviewerId] = selected;
    }

    // Default context for non-reviewer specific parts (e.g. general execution)
    const fallbackIds = Object.keys(contextMap);
    const defaultContext = fallbackIds.length > 0 ? contextMap[fallbackIds[0]] : [];

    globalTokens = Array.from(globalSelected).reduce((sum, id) => {
      const item = processedEvidence.find(e => e.id === id);
      return sum + (item ? item.estimated_tokens : 0);
    }, 0);

    const fingerprintStr = JSON.stringify(
      Object.keys(contextMap)
        .sort()
        .map(k => `${k}:${contextMap[k].map(e => e.id).join(',')}`),
    );
    const fingerprint = crypto.createHash('sha256').update(fingerprintStr).digest('hex');

    return {
      expansion_level: `T${targetLevel}`,
      stop_condition: 'context isolated',
      context: defaultContext,
      contextMap,
      budget: {
        max_tokens: maxTokens,
        max_items: maxItems,
        actual_tokens: globalTokens, // Note: tokens used uniquely across all reviewers
        actual_items: globalSelected.size,
      },
      fingerprint,
      source: 'progressive_expansion',
    };
  } catch (err) {
    return _buildFallbackContext(options, err.message);
  }
}

function _buildFallbackContext(options, reason) {
  const fallbackEvidence = collectAndRankEvidence({
    task: options.task,
    diff: options.diff,
    files: options.files,
    repoRoot: options.repoRoot,
    maxItems: 1000,
    maxTokens: 100000,
  }).evidence;

  const maxFallbackTokens = 4000;
  const maxFallbackItems = 5;

  const mandatoryItems = fallbackEvidence.filter(e => e.is_mandatory);
  const mandatoryTokens = mandatoryItems.reduce((acc, c) => acc + c.estimated_tokens, 0);

  if (mandatoryItems.length > maxFallbackItems || mandatoryTokens > maxFallbackTokens) {
    const error = new Error(
      `SYSTEM_ERROR: Mandatory security context exceeds hard fallback limit (${mandatoryTokens} > ${maxFallbackTokens} tokens, or ${mandatoryItems.length} > ${maxFallbackItems} items).`,
    );
    error.status = 'SYSTEM_ERROR';
    throw error;
  }

  const selected = [...mandatoryItems];
  let currentTokens = mandatoryTokens;

  for (const item of fallbackEvidence) {
    if (item.is_mandatory) continue;
    if (
      selected.length < maxFallbackItems &&
      currentTokens + item.estimated_tokens <= maxFallbackTokens
    ) {
      selected.push(item);
      currentTokens += item.estimated_tokens;
    }
  }

  selected.sort((a, b) => a.id.localeCompare(b.id));
  const fingerprintStr = JSON.stringify(selected.map(e => e.id));
  const fingerprint = crypto.createHash('sha256').update(fingerprintStr).digest('hex');

  const contextMap = {};
  for (const r of options.selectedReviewers || []) {
    const id = typeof r === 'string' ? r : r.reviewer;
    contextMap[id] = selected;
  }

  return {
    expansion_level: 'T0',
    stop_condition: 'fallback activated',
    context: selected,
    contextMap,
    budget: {
      max_tokens: maxFallbackTokens,
      max_items: maxFallbackItems,
      actual_tokens: currentTokens,
      actual_items: selected.length,
    },
    fingerprint,
    source: 'deterministic_fallback',
    fallback_reason: reason,
  };
}

module.exports = {
  progressiveContextExpansion,
  parseDiffModifiedLines,
};

