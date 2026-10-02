'use strict';

/**
 * evidence_engine.js — System-1 Capability 1: Evidence Intelligence
 * =================================================================
 * Deterministic, explainable, bounded evidence ranking layer.
 * Determines what information is actually relevant to a decision.
 *
 * Evidence Hierarchy:
 * 1. Changed files (directly modified)
 * 2. Changed symbols/functions (extracted from diff/AST)
 * 3. Direct imports/dependencies
 * 4. Relevant tests (covering changed behavior)
 * 5. Relevant configuration (controlling behavior)
 * 6. Related security boundaries (auth, crypto, permissions)
 * 7. Relevant historical memory (procedural & semantic)
 * 8. Broader repository context (siblings, public entrypoints)
 */

const fs = require('fs');
const path = require('path');
const { normalizePath, estimateTokens } = require('../context/ranker');
const { HIGH_RISK_PATTERNS, HIGH_RISK_EXTENSIONS } = require('./constants');

// Security boundary patterns
const SECURITY_BOUNDARIES = [
  /[\\/](?:auth|security|jwt|crypto|secrets?|tokens?|passwords?|sessions?)[\\/.]/i,
  /[\\/](?:roles?|access-control|rbac|oauth|sso|permissions?)[\\/.]/i,
  /[\\/]SECURITY\.md$/i,
  /[\\/]\.env/i,
];

// Type hierarchy priority for deterministic ordering
const TYPE_PRIORITY = {
  changed_file: 1,
  changed_symbol: 2,
  direct_dependency: 3,
  direct_importer: 3,
  relevant_test: 4,
  configuration: 5,
  security_boundary: 6,
  historical_memory: 7,
  previous_finding: 8,
  repository_context: 9,
};

/**
 * Redact sensitive credentials and tokens from evidence snippets
 */
function redactSecrets(text) {
  if (!text) return '';
  return text
    .replace(
      /(?:-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----)/g,
      '[REDACTED_PRIVATE_KEY]',
    )
    .replace(/(eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+)/g, '[REDACTED_JWT_TOKEN]')
    .replace(/(Bearer\s+)[A-Za-z0-9-_.~+/]+=*/gi, '$1[REDACTED_BEARER_TOKEN]')
    .replace(
      /((?:api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token|credentials?|private[_-]?key)\s*[:=]\s*['"]?)[^'"\s\n,;]+/gi,
      '$1[REDACTED_SECRET]',
    );
}

/**
 * Extract symbols/functions modified in diff or file
 * @param {string} diff
 * @param {string} content
 * @returns {Array<{ name: string, type: string, line?: number }>}
 */
function extractChangedSymbols(diff = '', content = '') {
  const symbols = [];
  const symbolNames = new Set();
  const MAX_DIFF_LINES_TO_SCAN = 1000;
  const MAX_SYMBOLS_PER_FILE = 16;

  const functionRegex =
    /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{|class\s+([a-zA-Z0-9_$]+))/g;

  // 1. Extract from added diff lines (bounded scan)
  if (diff) {
    const lines = diff.split('\n');
    const scanLimit = Math.min(lines.length, MAX_DIFF_LINES_TO_SCAN);
    for (let idx = 0; idx < scanLimit; idx++) {
      if (symbols.length >= MAX_SYMBOLS_PER_FILE) break;
      const line = lines[idx];
      if (line.startsWith('+') && !line.startsWith('+++')) {
        let match;
        while ((match = functionRegex.exec(line)) !== null) {
          const sym = match[1] || match[2] || match[3] || match[4];
          if (sym && !symbolNames.has(sym) && sym.length > 1) {
            symbolNames.add(sym);
            symbols.push({
              name: sym,
              type: match[0].includes('class') ? 'class' : 'function',
              diff_line: idx + 1,
            });
            if (symbols.length >= MAX_SYMBOLS_PER_FILE) break;
          }
        }
      }
    }
  }

  // 2. If content is available and symbols are scarce, extract top definitions
  if (symbols.length === 0 && content) {
    const scanContent = content.length > 50000 ? content.slice(0, 50000) : content;
    let match;
    while ((match = functionRegex.exec(scanContent)) !== null) {
      const sym = match[1] || match[2] || match[3] || match[4];
      if (sym && !symbolNames.has(sym) && sym.length > 1) {
        symbolNames.add(sym);
        symbols.push({ name: sym, type: match[0].includes('class') ? 'class' : 'function' });
        if (symbols.length >= 8) break;
      }
    }
  }

  return symbols;
}

/**
 * Extract bounded snippet from file content around specific line or symbol
 */
function extractBoundedSnippet(content, targetLine = null, targetSymbol = null, maxLines = 10) {
  if (!content) return '';
  const MAX_SNIPPET_CHARS = 2000;
  const lines = content.split('\n');
  let snippet = content;
  if (lines.length > maxLines) {
    let center = 0;
    if (targetLine !== null && targetLine > 0 && targetLine <= lines.length) {
      center = targetLine - 1;
    } else if (targetSymbol) {
      const foundIdx = lines.findIndex(l => l.includes(targetSymbol));
      if (foundIdx !== -1) center = foundIdx;
    }

    const start = Math.max(0, center - Math.floor(maxLines / 2));
    const end = Math.min(lines.length, start + maxLines);
    snippet = lines.slice(start, end).join('\n');
  }
  if (snippet.length > MAX_SNIPPET_CHARS) {
    snippet = snippet.slice(0, MAX_SNIPPET_CHARS) + '\n... [TRUNCATED]';
  }
  return redactSecrets(snippet);
}

/**
 * Score and collect evidence items
 * @param {Object} options
 * @param {string} [options.task]
 * @param {string} [options.diff]
 * @param {string[]|string} [options.files]
 * @param {string} [options.repoRoot]
 * @param {Array} [options.memory]
 * @param {Array} [options.previousFindings]
 * @param {number} [options.maxItems]
 * @param {number} [options.maxTokens]
 * @returns {Object} Evidence Intelligence Result
 */
function collectAndRankEvidence(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const rawFiles = options.files;
  const changedFiles = (
    Array.isArray(rawFiles) ? rawFiles : typeof rawFiles === 'string' ? rawFiles.split(',') : []
  )
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(Boolean)
    .map(normalizePath);

  const task = typeof options.task === 'string' ? options.task : '';
  const diff = typeof options.diff === 'string' ? options.diff : '';
  const memoryItems = Array.isArray(options.memory) ? options.memory : [];
  const prevFindings = Array.isArray(options.previousFindings) ? options.previousFindings : [];
  const maxItems =
    typeof options.maxItems === 'number' && options.maxItems > 0 ? options.maxItems : 20;
  const maxTokens =
    typeof options.maxTokens === 'number' && options.maxTokens > 0 ? options.maxTokens : 4000;

  const rawEvidence = [];
  const visitedPaths = new Set();

  const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for bounded evidence extraction

  function isPathInsideRepo(absPath, root) {
    const rel = path.relative(root, absPath);
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  // Helper to load file safely
  const evidenceTimestamp = Date.now();
  const fileCache = new Map();
  function readFileSafe(relPath) {
    let norm = normalizePath(relPath);
    try {
      norm = decodeURIComponent(norm);
    } catch (_) {}
    if (fileCache.has(norm)) return fileCache.get(norm);
    const abs = path.resolve(repoRoot, norm);
    try {
      if (!isPathInsideRepo(abs, repoRoot)) {
        fileCache.set(norm, null);
        return null;
      }
      if (fs.existsSync(abs)) {
        const stat = fs.statSync(abs);
        if (stat.isFile() && stat.size <= MAX_FILE_SIZE) {
          const text = fs.readFileSync(abs, 'utf8');
          fileCache.set(norm, text);
          return text;
        }
      }
    } catch (_) {}
    fileCache.set(norm, null);
    return null;
  }

  // Helper to check if file exists
  function fileExists(relPath) {
    let norm = normalizePath(relPath);
    try {
      norm = decodeURIComponent(norm);
    } catch (_) {}
    const abs = path.resolve(repoRoot, norm);
    try {
      if (!isPathInsideRepo(abs, repoRoot)) return false;
      return fs.existsSync(abs) && fs.statSync(abs).isFile();
    } catch (_) {
      return false;
    }
  }

  // 1. Process Directly Changed Files with Priority & Budgeting
  const MAX_DEEP_INSPECT_FILES = 50;

  // Prioritize security boundaries and critical schema files first
  changedFiles.sort((a, b) => {
    const aRisk =
      SECURITY_BOUNDARIES.some(p => p.test('/' + a)) || HIGH_RISK_EXTENSIONS.test(a) ? 1 : 0;
    const bRisk =
      SECURITY_BOUNDARIES.some(p => p.test('/' + b)) || HIGH_RISK_EXTENSIONS.test(b) ? 1 : 0;
    return bRisk - aRisk;
  });

  for (let fIdx = 0; fIdx < changedFiles.length; fIdx++) {
    const file = changedFiles[fIdx];
    visitedPaths.add(file);
    const isDeep = fIdx < MAX_DEEP_INSPECT_FILES;
    const content = isDeep ? readFileSafe(file) : null;
    const isSecurity =
      SECURITY_BOUNDARIES.some(p => p.test('/' + file)) || HIGH_RISK_PATTERNS.test(file);
    const isHighRiskExt = HIGH_RISK_EXTENSIONS.test(file);
    const exists = isDeep ? fileExists(file) : true;

    const reasons = ['directly modified file in change set'];
    let score = 0.95;
    const confidence = exists ? 'L1' : 'L2';

    if (isSecurity || isHighRiskExt) {
      score = 1.0;
      reasons.push('touches critical security / schema boundary');
    }

    const snippet = content
      ? extractBoundedSnippet(content, 1, null, 12)
      : redactSecrets(diff.slice(0, 500) || '');

    rawEvidence.push({
      id: `file:${file}`,
      type: 'changed_file',
      path: file,
      score,
      reasons,
      confidence,
      provenance: 'OBSERVED',
      timestamp: evidenceTimestamp,
      is_mandatory: true,
      estimated_tokens: estimateTokens(snippet || 100),
      snippet,
    });

    if (!isDeep) continue; // For overflow files beyond capacity, skip deep AST symbol & dependency checks

    // 2. Extract changed symbols/functions for this file
    const symbols = extractChangedSymbols(diff, content);
    for (const sym of symbols) {
      const symSnippet = content ? extractBoundedSnippet(content, sym.diff_line, sym.name, 8) : '';
      const symIsSecurity = HIGH_RISK_PATTERNS.test(sym.name);
      const symReasons = [`modified ${sym.type} "${sym.name}" in ${file}`];
      let symScore = 0.88;
      if (symIsSecurity) {
        symScore = 0.96;
        symReasons.push('symbol name matches high-risk pattern');
      }

      rawEvidence.push({
        id: `symbol:${file}:${sym.name}`,
        type: 'changed_symbol',
        path: file,
        symbol: sym.name,
        score: symScore,
        reasons: symReasons,
        confidence: exists ? 'L1' : 'L2',
        provenance: 'INFERRED',
        timestamp: evidenceTimestamp,
        is_mandatory: false,
        estimated_tokens: estimateTokens(symSnippet || 60),
        snippet: symSnippet,
      });
    }

    // 3. Direct imports & dependencies
    if (content) {
      const scanContent = content.length > 50000 ? content.slice(0, 50000) : content;
      const importRegex =
        /(?:import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
      let match;
      while ((match = importRegex.exec(scanContent)) !== null) {
        const importTarget = match[1] || match[2];
        if (importTarget && (importTarget.startsWith('.') || importTarget.startsWith('/'))) {
          // Resolve relative to file directory
          const fileDir = path.dirname(file);
          const resolvedRel = normalizePath(path.join(fileDir, importTarget));
          // Check extensions (.js, .ts, /index.js, etc.)
          const candidates = [
            resolvedRel,
            `${resolvedRel}.js`,
            `${resolvedRel}.ts`,
            `${resolvedRel}.json`,
            `${resolvedRel}/index.js`,
            `${resolvedRel}/index.ts`,
          ];
          const actualTarget = candidates.find(c => fileExists(c)) || resolvedRel;

          if (!visitedPaths.has(actualTarget)) {
            visitedPaths.add(actualTarget);
            const depContent = readFileSafe(actualTarget);
            const depIsSecurity = SECURITY_BOUNDARIES.some(p => p.test('/' + actualTarget));
            const depReasons = [`direct dependency imported by ${file}`];
            const depScore = depIsSecurity ? 0.9 : 0.8;
            if (depIsSecurity) depReasons.push('dependency operates in security boundary');

            rawEvidence.push({
              id: `dep:${actualTarget}`,
              type: 'direct_dependency',
              path: actualTarget,
              score: depScore,
              reasons: depReasons,
              confidence: fileExists(actualTarget) ? 'L2' : 'L3',
              provenance: 'INFERRED',
              timestamp: evidenceTimestamp,
              is_mandatory: depIsSecurity,
              estimated_tokens: estimateTokens(
                depContent ? extractBoundedSnippet(depContent, 1, null, 8) : 80,
              ),
              snippet: depContent ? extractBoundedSnippet(depContent, 1, null, 8) : '',
            });
          }
        }
      }
    }

    // 4. Relevant tests for this changed file
    const baseName = path.basename(file).replace(/\.[^.]+$/, '');
    const possibleTestPaths = [
      `test/unit/${baseName}.test.js`,
      `test/unit/${baseName}.spec.js`,
      `test/integration/${baseName}.test.js`,
      `test/${baseName}.test.js`,
      `tests/${baseName}.test.js`,
      `${path.dirname(file)}/__tests__/${baseName}.test.js`,
      `${path.dirname(file)}/${baseName}.test.js`,
    ];

    for (const testPath of possibleTestPaths) {
      const normTest = normalizePath(testPath);
      if (fileExists(normTest) && !visitedPaths.has(normTest)) {
        visitedPaths.add(normTest);
        const testContent = readFileSafe(normTest);
        rawEvidence.push({
          id: `test:${normTest}`,
          type: 'relevant_test',
          path: normTest,
          score: 0.78,
          reasons: [`test suite covering modified behavior in ${file}`],
          confidence: 'L1',
          provenance: 'OBSERVED',
          timestamp: evidenceTimestamp,
          is_mandatory: false,
          estimated_tokens: estimateTokens(
            testContent ? extractBoundedSnippet(testContent, 1, null, 10) : 100,
          ),
          snippet: testContent ? extractBoundedSnippet(testContent, 1, null, 10) : '',
        });
      }
    }
  }

  // 5. Relevant configuration files (package.json, tsconfig.json, docker, etc.)
  const commonConfigs = [
    'package.json',
    'tsconfig.json',
    '.eslintrc.js',
    'eslint.config.js',
    'Dockerfile',
    '.github/workflows/ci.yml',
  ];
  for (const cfg of commonConfigs) {
    if (fileExists(cfg) && !visitedPaths.has(cfg)) {
      const cfgContent = readFileSafe(cfg);
      const isConfigRelevant =
        changedFiles.some(cf => cf.endsWith('.json') || cf.endsWith('.js') || cf.endsWith('.ts')) ||
        task.toLowerCase().includes('dependency') ||
        task.toLowerCase().includes('package');

      if (isConfigRelevant || cfg === 'package.json') {
        visitedPaths.add(cfg);
        rawEvidence.push({
          id: `config:${cfg}`,
          type: 'configuration',
          path: cfg,
          score: cfg === 'package.json' ? 0.72 : 0.65,
          reasons: [`project configuration controlling runtime behavior (${cfg})`],
          confidence: 'L1',
          provenance: 'OBSERVED',
          timestamp: evidenceTimestamp,
          is_mandatory: false,
          estimated_tokens: estimateTokens(
            cfgContent ? extractBoundedSnippet(cfgContent, 1, null, 10) : 100,
          ),
          snippet: cfgContent ? extractBoundedSnippet(cfgContent, 1, null, 10) : '',
        });
      }
    }
  }

  // 6. Security Boundaries (Root SECURITY.md, auth policies)
  const rootSecurityFiles = ['SECURITY.md', '.env.example'];
  for (const secFile of rootSecurityFiles) {
    if (fileExists(secFile) && !visitedPaths.has(secFile)) {
      visitedPaths.add(secFile);
      const secContent = readFileSafe(secFile);
      rawEvidence.push({
        id: `security:${secFile}`,
        type: 'security_boundary',
        path: secFile,
        score: 0.85,
        reasons: [`repository root security and credential policy (${secFile})`],
        confidence: 'L1',
        provenance: 'OBSERVED',
        timestamp: evidenceTimestamp,
        is_mandatory: true,
        estimated_tokens: estimateTokens(
          secContent ? extractBoundedSnippet(secContent, 1, null, 10) : 120,
        ),
        snippet: secContent ? extractBoundedSnippet(secContent, 1, null, 10) : '',
      });
    }
  }

  // 7. Historical Memory from Memory Engine
  for (const mem of memoryItems) {
    const memContent = typeof mem === 'string' ? mem : mem.content || mem.summary || '';
    if (!memContent) continue;
    const memTags = Array.isArray(mem.tags) ? mem.tags : [];
    const memIsRelevant =
      changedFiles.some(f => {
        const baseNoExt = path.basename(f, path.extname(f)).toLowerCase();
        const baseWithExt = path.basename(f).toLowerCase();
        return (
          memContent.toLowerCase().includes(baseNoExt) ||
          memContent.toLowerCase().includes(baseWithExt) ||
          memTags.some(
            t => baseNoExt.includes(t.toLowerCase()) || f.toLowerCase().includes(t.toLowerCase()),
          )
        );
      }) ||
      (task &&
        (memContent.toLowerCase().includes(task.toLowerCase().slice(0, 15)) ||
          memTags.some(t => task.toLowerCase().includes(t.toLowerCase()))));

    if (memIsRelevant) {
      rawEvidence.push({
        id: `memory:${mem.id || Math.abs(memContent.length)}`,
        type: 'historical_memory',
        path: mem.tags ? mem.tags.join(',') : 'memory-store',
        score: 0.68,
        reasons: ['relevant historical memory from past sessions/decisions'],
        confidence: 'L2',
        provenance: 'REPORTED',
        timestamp: evidenceTimestamp,
        is_mandatory: false,
        estimated_tokens: estimateTokens(memContent),
        snippet: memContent.slice(0, 200),
      });
    }
  }

  // 8. Previous Findings
  for (const f of prevFindings) {
    const fDesc = f.desc || f.description || f.message || '';
    if (!fDesc) continue;
    rawEvidence.push({
      id: `finding:${f.id || 'prev'}`,
      type: 'previous_finding',
      path: f.location || f.file || 'audit-result',
      score: f.severity === 'Critical' ? 0.92 : f.severity === 'Important' ? 0.82 : 0.65,
      reasons: [`previous finding: [${f.severity || 'Finding'}] ${fDesc}`],
      confidence: 'L2',
      provenance: 'REPORTED',
      timestamp: evidenceTimestamp,
      is_mandatory: f.severity === 'Critical',
      estimated_tokens: estimateTokens(fDesc),
      snippet: fDesc,
    });
  }

  // Deterministic stable sorting:
  // 1. score DESCENDING
  // 2. TYPE_PRIORITY ASCENDING (1 to 9)
  // 3. id / path ASCENDING (alphabetic)
  rawEvidence.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    const prioA = TYPE_PRIORITY[a.type] || 99;
    const prioB = TYPE_PRIORITY[b.type] || 99;
    if (prioA !== prioB) return prioA - prioB;
    return a.id.localeCompare(b.id);
  });

  // Apply budget constraints (maxItems & maxTokens)
  const selectedEvidence = [];
  const truncatedEvidence = [];
  let tokenCount = 0;

  // Step 1: Retain all mandatory items first
  for (const item of rawEvidence) {
    if (item.is_mandatory) {
      selectedEvidence.push(item);
      tokenCount += item.estimated_tokens;
    }
  }

  // Step 2: Include non-mandatory items up to budget
  for (const item of rawEvidence) {
    if (item.is_mandatory) continue;
    if (selectedEvidence.length < maxItems && tokenCount + item.estimated_tokens <= maxTokens) {
      selectedEvidence.push(item);
      tokenCount += item.estimated_tokens;
    } else {
      truncatedEvidence.push(item);
    }
  }

  // Deterministic re-sort of selected items
  selectedEvidence.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
    const prioA = TYPE_PRIORITY[a.type] || 99;
    const prioB = TYPE_PRIORITY[b.type] || 99;
    if (prioA !== prioB) return prioA - prioB;
    return a.id.localeCompare(b.id);
  });

  // Aggregate overall confidence and risk indicators
  const touchesSecurityBoundary =
    changedFiles.some(
      f => SECURITY_BOUNDARIES.some(p => p.test('/' + f)) || HIGH_RISK_PATTERNS.test(f),
    ) ||
    (diff && HIGH_RISK_PATTERNS.test(diff));
  const criticalCount = selectedEvidence.filter(e => e.is_mandatory).length;

  let overallConfidence = 'L1';
  if (selectedEvidence.length === 0) {
    overallConfidence = 'L4';
  } else if (selectedEvidence.some(e => e.confidence === 'L4')) {
    overallConfidence = 'L3';
  } else if (selectedEvidence.some(e => e.confidence === 'L3')) {
    overallConfidence = 'L2';
  }

  return {
    evidence: selectedEvidence,
    truncated: truncatedEvidence,
    summary: {
      total_items_evaluated: rawEvidence.length,
      total_items_selected: selectedEvidence.length,
      total_tokens: tokenCount,
      critical_evidence_count: criticalCount,
      has_security_boundary: touchesSecurityBoundary,
      confidence: overallConfidence,
    },
  };
}

module.exports = {
  collectAndRankEvidence,
  extractChangedSymbols,
  extractBoundedSnippet,
  redactSecrets,
  TYPE_PRIORITY,
  SECURITY_BOUNDARIES,
};
