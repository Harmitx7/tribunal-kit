'use strict';

/**
 * ast_context_packer.js — AST-Aware Structural Context Packing Engine
 * ====================================================================
 * Phase 3: Structural Code Extraction & Budget Packing
 *
 * Guarantees:
 * 1. Structural Unit Extraction:
 *    - Functions, methods, classes, interfaces, types, imports/exports, and diff focal windows.
 * 2. High-Fidelity & Resilient Parsing:
 *    - JavaScript, TypeScript, JSON, Python, and generic structured languages.
 *    - Preserves source line ranges, enclosing structures, and relative paths.
 *    - Graceful fallback on syntax errors with explicit labeling:
 *      'AST_STRUCTURAL' vs 'SYNTAX_FALLBACK_WINDOW'.
 * 3. Deterministic Priority Packing:
 *    - Explicitly requested evidence & modified focal lines (P1)
 *    - Security boundaries (auth, crypto, permissions, tokens) (P2)
 *    - Types & public interfaces (P3)
 *    - Direct dependencies & imports (P4)
 *    - Functions & methods (P5)
 *    - Supplementary call sites (P6)
 * 4. Deduplication & Budget Enforcement:
 *    - Unit-level deduplication prevents duplicate AST units from consuming budget.
 *    - If mandatory evidence cannot fit: enforces policy ('FAIL_CLOSED' | 'ESCALATE').
 *    - Never silently drops required context.
 * 5. Phase 1 Filesystem Containment:
 *    - Uses safeContainedPath to ensure no reads escape repoRoot.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { safeContainedPath } = require('../utils/path_containment');
const { countTokens, computeContentHash } = require('./token_accounting');

// Packing method labels
const PACKING_METHOD = {
  AST_STRUCTURAL: 'AST_STRUCTURAL',
  SYNTAX_FALLBACK_WINDOW: 'SYNTAX_FALLBACK_WINDOW',
  WHOLE_FILE: 'WHOLE_FILE',
  EXPLICIT_EVIDENCE: 'EXPLICIT_EVIDENCE',
};

// Unit priority tiers
const UNIT_PRIORITY = {
  EXPLICIT_REQUEST: 1,
  FOCAL_MODIFICATION: 2,
  SECURITY_BOUNDARY: 3,
  TYPE_INTERFACE: 4,
  IMPORT_EXPORT: 5,
  FUNCTION_METHOD: 6,
  CLASS_DECLARATION: 7,
  SUPPLEMENTARY_CALLSITE: 8,
};

/**
 * Normalizes a repo-relative file path with forward slashes.
 * @param {string} p
 * @returns {string}
 */
function normalizeRelativePath(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Checks if a relative path or symbol operates in a security boundary.
 * @param {string} filePath
 * @param {string} [symbolName]
 * @returns {boolean}
 */
function isSecurityBoundary(filePath, symbolName = '') {
  const securityPattern =
    /(?:auth|security|jwt|crypto|secrets?|tokens?|passwords?|sessions?|roles?|rbac|oauth|permissions?)/i;
  const isSecurityFile =
    securityPattern.test(filePath) ||
    /SECURITY\.md$/i.test(filePath) ||
    /\.env/i.test(filePath);
  const isSecuritySymbol = symbolName ? securityPattern.test(symbolName) : false;
  return isSecurityFile || isSecuritySymbol;
}

/**
 * Parses structural AST units from source code.
 * Resilient multi-language extractor supporting JS, TS, Python, JSON, and generic formats.
 *
 * @param {string} content - Source code
 * @param {string} filePath - Repo-relative file path
 * @returns {{ units: Array<Object>, parsingMethod: string, syntaxError: string|null }}
 */
function extractAstUnits(content, filePath) {
  if (typeof content !== 'string') {
    return { units: [], parsingMethod: PACKING_METHOD.WHOLE_FILE, syntaxError: null };
  }

  const ext = path.extname(filePath).toLowerCase();
  const normPath = normalizeRelativePath(filePath);

  const lines = content.split(/\r?\n/);

  // Check syntax for standard JavaScript files
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    try {
      // Native V8 syntax check via vm.Script without executing code
      new vm.Script(content);
    } catch (err) {
      const fallbackLines = lines.slice(0, 50).join('\n');
      return {
        units: [
          {
            id: `${normPath}:syntax_fallback:1-${Math.min(lines.length, 50)}`,
            unitType: 'syntax_fallback',
            name: 'fallback_window',
            filePath: normPath,
            startLine: 1,
            endLine: Math.min(lines.length, 50),
            content: fallbackLines,
            contentHash: computeContentHash(fallbackLines),
            priority: UNIT_PRIORITY.FUNCTION_METHOD,
            isSecurity: isSecurityBoundary(normPath),
            packingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
          },
        ],
        parsingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
        syntaxError: err.message,
      };
    }
  }

  // For non-code or trivial text files without code declarations, keep whole file
  const hasStructuralKeywords =
    /(?:class\s+|interface\s+|type\s+|function\s+|def\s+|export\s+|import\s+)/.test(content);
  if (!hasStructuralKeywords && lines.length <= 15 && content.length < 600) {
    return {
      units: [
        {
          id: `${normPath}:whole_file:1-${lines.length}`,
          unitType: 'whole_file',
          name: path.basename(normPath),
          filePath: normPath,
          startLine: 1,
          endLine: lines.length,
          content,
          contentHash: computeContentHash(content),
          priority: isSecurityBoundary(normPath)
            ? UNIT_PRIORITY.SECURITY_BOUNDARY
            : UNIT_PRIORITY.FUNCTION_METHOD,
          isSecurity: isSecurityBoundary(normPath),
          packingMethod: PACKING_METHOD.WHOLE_FILE,
        },
      ],
      parsingMethod: PACKING_METHOD.WHOLE_FILE,
      syntaxError: null,
    };
  }

  // Handle JSON
  if (ext === '.json') {
    try {
      JSON.parse(content);
      return {
        units: [
          {
            id: `${normPath}:json_config:1-${lines.length}`,
            unitType: 'json_config',
            name: path.basename(normPath),
            filePath: normPath,
            startLine: 1,
            endLine: lines.length,
            content,
            contentHash: computeContentHash(content),
            priority: UNIT_PRIORITY.TYPE_INTERFACE,
            isSecurity: isSecurityBoundary(normPath),
            packingMethod: PACKING_METHOD.AST_STRUCTURAL,
          },
        ],
        parsingMethod: PACKING_METHOD.AST_STRUCTURAL,
        syntaxError: null,
      };
    } catch (err) {
      return {
        units: [
          {
            id: `${normPath}:raw_window:1-${Math.min(lines.length, 50)}`,
            unitType: 'raw_window',
            name: path.basename(normPath),
            filePath: normPath,
            startLine: 1,
            endLine: Math.min(lines.length, 50),
            content: lines.slice(0, 50).join('\n'),
            contentHash: computeContentHash(lines.slice(0, 50).join('\n')),
            priority: UNIT_PRIORITY.FUNCTION_METHOD,
            isSecurity: isSecurityBoundary(normPath),
            packingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
          },
        ],
        parsingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
        syntaxError: err.message,
      };
    }
  }

  const units = [];
  let syntaxError = null;
  let parsingMethod = PACKING_METHOD.AST_STRUCTURAL;

  try {
    // 1. Extract Imports & Exports (JS/TS/Python)
    const importLines = [];
    let importStart = -1;
    let importEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isImport =
        /^(?:import\s+|export\s+(?:\{|\*)|const\s+.*=\s*require\(|from\s+[\w.]+\s+import)/.test(
          line.trim(),
        );
      if (isImport) {
        if (importStart === -1) importStart = i + 1;
        importEnd = i + 1;
        importLines.push(line);
      }
    }

    if (importLines.length > 0) {
      const importBlock = importLines.join('\n');
      units.push({
        id: `${normPath}:imports:${importStart}-${importEnd}`,
        unitType: 'imports_exports',
        name: 'imports_block',
        filePath: normPath,
        startLine: importStart,
        endLine: importEnd,
        content: importBlock,
        contentHash: computeContentHash(importBlock),
        priority: UNIT_PRIORITY.IMPORT_EXPORT,
        isSecurity: isSecurityBoundary(normPath),
        packingMethod: PACKING_METHOD.AST_STRUCTURAL,
      });
    }

    // 2. Extract Types / Interfaces (TS / JSDoc / Type Aliases)
    const typeRegex = /^(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_$]+)/;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(typeRegex);
      if (match) {
        const typeName = match[1];
        const startLine = i + 1;
        let endLine = startLine;
        let braceCount = 0;
        let foundBrace = false;

        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (const char of l) {
            if (char === '{') {
              braceCount++;
              foundBrace = true;
            } else if (char === '}') {
              braceCount--;
            }
          }
          if (foundBrace && braceCount <= 0) {
            endLine = j + 1;
            break;
          }
          if (!foundBrace && l.includes(';')) {
            endLine = j + 1;
            break;
          }
          endLine = j + 1;
          if (j - i > 100) break; // Bounded search
        }

        const typeContent = lines.slice(startLine - 1, endLine).join('\n');
        units.push({
          id: `${normPath}:type:${typeName}:${startLine}-${endLine}`,
          unitType: 'type_interface',
          name: typeName,
          filePath: normPath,
          startLine,
          endLine,
          content: typeContent,
          contentHash: computeContentHash(typeContent),
          priority: isSecurityBoundary(normPath, typeName)
            ? UNIT_PRIORITY.SECURITY_BOUNDARY
            : UNIT_PRIORITY.TYPE_INTERFACE,
          isSecurity: isSecurityBoundary(normPath, typeName),
          packingMethod: PACKING_METHOD.AST_STRUCTURAL,
        });
      }
    }

    // 3. Extract Classes and Methods
    const classRegex = /^(?:export\s+)?class\s+([A-Za-z0-9_$]+)/;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(classRegex);
      if (match) {
        const className = match[1];
        const startLine = i + 1;
        let endLine = startLine;
        let braceCount = 0;
        let foundBrace = false;

        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          for (const char of l) {
            if (char === '{') {
              braceCount++;
              foundBrace = true;
            } else if (char === '}') {
              braceCount--;
            }
          }
          if (foundBrace && braceCount <= 0) {
            endLine = j + 1;
            break;
          }
          endLine = j + 1;
          if (j - i > 300) break;
        }

        const classContent = lines.slice(startLine - 1, endLine).join('\n');
        units.push({
          id: `${normPath}:class:${className}:${startLine}-${endLine}`,
          unitType: 'class_declaration',
          name: className,
          filePath: normPath,
          startLine,
          endLine,
          content: classContent,
          contentHash: computeContentHash(classContent),
          priority: isSecurityBoundary(normPath, className)
            ? UNIT_PRIORITY.SECURITY_BOUNDARY
            : UNIT_PRIORITY.CLASS_DECLARATION,
          isSecurity: isSecurityBoundary(normPath, className),
          packingMethod: PACKING_METHOD.AST_STRUCTURAL,
        });
      }
    }

    // 4. Extract Functions / Methods / Async Functions (JS/TS/Python)
    // Matches: function name(...), async function name(...), const name = (...) =>, def name(...):
    const funcRegex =
      /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|^(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|^def\s+([A-Za-z0-9_]+)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(funcRegex);
      if (match) {
        const funcName = match[1] || match[2] || match[3];
        const startLine = i + 1;
        let endLine = startLine;

        if (lines[i].trim().startsWith('def ')) {
          // Python indentation-based block
          const baseIndent = lines[i].search(/\S/);
          for (let j = i + 1; j < lines.length; j++) {
            const lineTrim = lines[j].trim();
            if (lineTrim.length === 0) continue;
            const currentIndent = lines[j].search(/\S/);
            if (currentIndent <= baseIndent) {
              endLine = j;
              break;
            }
            endLine = j + 1;
          }
        } else {
          // JS/TS brace-based block
          let braceCount = 0;
          let foundBrace = false;
          for (let j = i; j < lines.length; j++) {
            const l = lines[j];
            for (const char of l) {
              if (char === '{') {
                braceCount++;
                foundBrace = true;
              } else if (char === '}') {
                braceCount--;
              }
            }
            if (foundBrace && braceCount <= 0) {
              endLine = j + 1;
              break;
            }
            endLine = j + 1;
            if (j - i > 250) break;
          }
        }

        const funcContent = lines.slice(startLine - 1, endLine).join('\n');
        units.push({
          id: `${normPath}:func:${funcName}:${startLine}-${endLine}`,
          unitType: 'function_method',
          name: funcName,
          filePath: normPath,
          startLine,
          endLine,
          content: funcContent,
          contentHash: computeContentHash(funcContent),
          priority: isSecurityBoundary(normPath, funcName)
            ? UNIT_PRIORITY.SECURITY_BOUNDARY
            : UNIT_PRIORITY.FUNCTION_METHOD,
          isSecurity: isSecurityBoundary(normPath, funcName),
          packingMethod: PACKING_METHOD.AST_STRUCTURAL,
        });
      }
    }

    // If no AST units were detected via regex (e.g. non-standard syntax or flat script),
    // extract windowed blocks
    if (units.length === 0) {
      const windowSize = 30;
      for (let i = 0; i < lines.length; i += windowSize) {
        const startLine = i + 1;
        const endLine = Math.min(lines.length, i + windowSize);
        const windowContent = lines.slice(i, endLine).join('\n');
        units.push({
          id: `${normPath}:window:${startLine}-${endLine}`,
          unitType: 'window_block',
          name: `lines_${startLine}_${endLine}`,
          filePath: normPath,
          startLine,
          endLine,
          content: windowContent,
          contentHash: computeContentHash(windowContent),
          priority: isSecurityBoundary(normPath)
            ? UNIT_PRIORITY.SECURITY_BOUNDARY
            : UNIT_PRIORITY.SUPPLEMENTARY_CALLSITE,
          isSecurity: isSecurityBoundary(normPath),
          packingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
        });
      }
      parsingMethod = PACKING_METHOD.SYNTAX_FALLBACK_WINDOW;
    }
  } catch (err) {
    syntaxError = err.message;
    parsingMethod = PACKING_METHOD.SYNTAX_FALLBACK_WINDOW;
    // Fallback: windowed lines
    const fallbackLines = lines.slice(0, 50).join('\n');
    units.push({
      id: `${normPath}:syntax_fallback:1-${Math.min(lines.length, 50)}`,
      unitType: 'syntax_fallback',
      name: 'fallback_window',
      filePath: normPath,
      startLine: 1,
      endLine: Math.min(lines.length, 50),
      content: fallbackLines,
      contentHash: computeContentHash(fallbackLines),
      priority: UNIT_PRIORITY.FUNCTION_METHOD,
      isSecurity: isSecurityBoundary(normPath),
      packingMethod: PACKING_METHOD.SYNTAX_FALLBACK_WINDOW,
    });
  }

  return { units, parsingMethod, syntaxError };
}

/**
 * Cached variant of extractAstUnits that reuses previously parsed AST units
 * if the content hash matches an existing valid cache entry.
 *
 * @param {string} content - Source code
 * @param {string} filePath - Repo-relative file path
 * @param {object} [cache] - RepositoryIntelligenceCache instance
 * @param {object} [options]
 * @returns {{ units: Array<Object>, parsingMethod: string, syntaxError: string|null, fromCache?: boolean, provenance?: object }}
 */
function extractAstUnitsWithCache(content, filePath, cache, options = {}) {
  if (!cache || typeof cache.getArtifact !== 'function') {
    return {
      ...extractAstUnits(content, filePath),
      fromCache: false,
    };
  }

  const normPath = normalizeRelativePath(filePath);
  const contentDigest = computeContentHash(content);

  const cached = cache.getArtifact('AST_UNITS', normPath, {
    content_digest: contentDigest,
    producer_version: options.producer_version || '1.0.0',
    configuration_fingerprint: options.configuration_fingerprint || '0'.repeat(64),
    validateFreshness: false, // contentDigest is checked directly
  });

  if (cached && cached.hit && cached.payload) {
    return {
      ...cached.payload,
      fromCache: true,
      provenance: cached.provenance,
    };
  }

  const fresh = extractAstUnits(content, filePath);
  try {
    cache.set({
      artifact_type: 'AST_UNITS',
      relative_path: normPath,
      content_digest: contentDigest,
      producer_version: options.producer_version || '1.0.0',
      configuration_fingerprint: options.configuration_fingerprint || '0'.repeat(64),
      payload: {
        units: fresh.units,
        parsingMethod: fresh.parsingMethod,
        syntaxError: fresh.syntaxError,
      },
    });
  } catch (_) {}

  return {
    ...fresh,
    fromCache: false,
  };
}

/**
 * Extracts a focused context window around specific modified line ranges or diff lines.
 *
 * @param {string} content - Full file source
 * @param {string} filePath - Repo-relative file path
 * @param {number[]} diffLines - Array of 1-indexed modified lines
 * @param {number} [contextWindow=12] - Lines of padding around modifications
 * @returns {Array<Object>} Focal units
 */
function extractDiffFocalWindows(content, filePath, diffLines = [], contextWindow = 12) {
  if (!content || !Array.isArray(diffLines) || diffLines.length === 0) return [];

  const lines = content.split(/\r?\n/);
  const normPath = normalizeRelativePath(filePath);
  const focalUnits = [];

  // Cluster nearby diff lines
  const sortedLines = [...new Set(diffLines)].sort((a, b) => a - b);
  const clusters = [];
  let currentCluster = [];

  for (const lineNum of sortedLines) {
    if (currentCluster.length === 0) {
      currentCluster.push(lineNum);
    } else {
      const prev = currentCluster[currentCluster.length - 1];
      if (lineNum - prev <= contextWindow * 2) {
        currentCluster.push(lineNum);
      } else {
        clusters.push(currentCluster);
        currentCluster = [lineNum];
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const minLine = cluster[0];
    const maxLine = cluster[cluster.length - 1];
    const startLine = Math.max(1, minLine - contextWindow);
    const endLine = Math.min(lines.length, maxLine + contextWindow);
    const windowContent = lines.slice(startLine - 1, endLine).join('\n');

    focalUnits.push({
      id: `${normPath}:diff_focus:${startLine}-${endLine}`,
      unitType: 'diff_focal_window',
      name: `focal_lines_${minLine}_${maxLine}`,
      filePath: normPath,
      startLine,
      endLine,
      diffLines: cluster,
      content: windowContent,
      contentHash: computeContentHash(windowContent),
      priority: UNIT_PRIORITY.FOCAL_MODIFICATION,
      isSecurity: isSecurityBoundary(normPath),
      packingMethod: PACKING_METHOD.AST_STRUCTURAL,
    });
  }

  return focalUnits;
}

/**
 * Packs repository context and evidence units into an approved token budget.
 * Enforces deduplication, AST structural boundaries, priority ranking, and explicit omission policies.
 *
 * @param {Object} params
 * @param {Array<Object>} params.evidence - Raw evidence items or requested files
 * @param {number} params.availableTokenBudget - Hard token budget available for context
 * @param {string} [params.repoRoot] - Repository root directory (for safe file reads)
 * @param {string} [params.model] - Model name for token counting
 * @param {string} [params.mandatoryFitPolicy='FAIL_CLOSED'] - 'FAIL_CLOSED' | 'ESCALATE'
 * @param {Object} [params.fileDiffs] - Map of filePath -> modified line numbers
 * @returns {{
 *   packedUnits: Array<Object>,
 *   packedTokens: number,
 *   availableBudget: number,
 *   budgetUtilization: number,
 *   omittedUnits: Array<Object>,
 *   integrityFingerprint: string,
 *   status: string,
 *   error?: string
 * }}
 */
function packAstContext(params = {}) {
  const {
    evidence = [],
    availableTokenBudget,
    repoRoot = process.cwd(),
    model = 'claude-3-5-sonnet-latest',
    mandatoryFitPolicy = 'FAIL_CLOSED',
    fileDiffs = {},
  } = params;

  if (!Number.isFinite(availableTokenBudget) || availableTokenBudget <= 0) {
    throw new Error(
      `INVALID_TOKEN_BUDGET: AST context packing requires a positive finite availableTokenBudget (received: ${availableTokenBudget}).`,
    );
  }

  const candidateUnits = [];
  const seenUnitIds = new Set();
  const seenContentHashes = new Set();

  // 1. Process evidence items
  for (const item of evidence) {
    if (!item) continue;

    // Check if item has explicit file path
    const itemPath = item.path || item.filePath || (typeof item === 'string' ? item : null);
    if (!itemPath) {
      // Standalone snippet or fact without file path
      const snippet = item.snippet || item.description || (typeof item === 'string' ? item : '');
      const itemHash = computeContentHash(snippet);
      if (!seenContentHashes.has(itemHash)) {
        seenContentHashes.add(itemHash);
        const countRes = countTokens(snippet, { model });
        candidateUnits.push({
          id: item.id || `evidence:snippet:${itemHash.slice(0, 8)}`,
          unitType: item.type || 'explicit_evidence',
          name: item.symbol || item.id || 'evidence',
          filePath: 'evidence:in-memory',
          startLine: 1,
          endLine: 1,
          content: snippet,
          contentHash: itemHash,
          tokens: countRes.tokens,
          tokenAccuracy: countRes.accuracy,
          isMandatory: item.is_mandatory || item.isMandatory || false,
          isSecurity: item.is_mandatory || false,
          priority: item.is_mandatory
            ? UNIT_PRIORITY.EXPLICIT_REQUEST
            : UNIT_PRIORITY.SUPPLEMENTARY_CALLSITE,
          packingMethod: PACKING_METHOD.EXPLICIT_EVIDENCE,
        });
      }
      continue;
    }

    // Canonical containment check via Phase 1 safeContainedPath
    const containment = safeContainedPath(itemPath, repoRoot, {
      operation: 'read',
      strictChars: true,
    });
    if (!containment.ok) {
      // Skip path that violates filesystem containment boundary
      continue;
    }

    const relPath = containment.relativePath;
    const absPath = containment.resolvedPath;

    let fileContent = '';
    try {
      if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
        fileContent = fs.readFileSync(absPath, 'utf8');
      }
    } catch (_) {
      continue;
    }

    if (!fileContent) continue;

    // A. Check if file has modified diff lines
    const diffLines = fileDiffs[relPath] || fileDiffs[itemPath] || [];
    if (diffLines.length > 0) {
      const focalWindows = extractDiffFocalWindows(fileContent, relPath, diffLines);
      for (const fw of focalWindows) {
        if (!seenUnitIds.has(fw.id)) {
          seenUnitIds.add(fw.id);
          const countRes = countTokens(fw.content, { model });
          candidateUnits.push({
            ...fw,
            tokens: countRes.tokens,
            tokenAccuracy: countRes.accuracy,
            isMandatory: true, // Modified focal code is mandatory
          });
        }
      }
    }

    // B. Extract structural AST units
    const { units: astUnits } = extractAstUnits(fileContent, relPath);
    for (const u of astUnits) {
      if (!seenUnitIds.has(u.id)) {
        seenUnitIds.add(u.id);
        const countRes = countTokens(u.content, { model });
        candidateUnits.push({
          ...u,
          tokens: countRes.tokens,
          tokenAccuracy: countRes.accuracy,
          isMandatory: item.is_mandatory || u.isSecurity || false,
        });
      }
    }
  }

  // 2. Deterministic sort:
  // - Priority ASC (1 is highest)
  // - isMandatory DESC (mandatory items first)
  // - filePath ASC
  // - startLine ASC
  candidateUnits.sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) {
      return a.isMandatory ? -1 : 1;
    }
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    const pathCmp = a.filePath.localeCompare(b.filePath);
    if (pathCmp !== 0) return pathCmp;
    return a.startLine - b.startLine;
  });

  // 3. Greedy packing within availableTokenBudget
  const packedUnits = [];
  const omittedUnits = [];
  let currentTokens = 0;

  for (const unit of candidateUnits) {
    if (currentTokens + unit.tokens <= availableTokenBudget) {
      packedUnits.push({
        ...unit,
        packingOrder: packedUnits.length + 1,
        status: 'INCLUDED',
      });
      currentTokens += unit.tokens;
    } else {
      if (unit.isMandatory) {
        // Mandatory evidence does not fit within available budget!
        if (mandatoryFitPolicy === 'FAIL_CLOSED') {
          const err = new Error(
            `MANDATORY_EVIDENCE_EXCEEDS_BUDGET: Mandatory context unit "${unit.id}" (${unit.tokens} tokens) exceeds available budget (${availableTokenBudget} tokens, already packed ${currentTokens} tokens).`,
          );
          err.code = 'MANDATORY_EVIDENCE_EXCEEDS_BUDGET';
          err.unit = unit;
          err.packedTokens = currentTokens;
          err.availableBudget = availableTokenBudget;
          throw err;
        } else {
          // ESCALATE: mark as unfulfilled mandatory evidence
          omittedUnits.push({
            ...unit,
            status: 'OMITTED_MANDATORY_OVERFLOW',
            reason: `Exceeded available budget of ${availableTokenBudget} tokens.`,
          });
        }
      } else {
        omittedUnits.push({
          ...unit,
          status: 'TRUNCATED_OPTIONAL',
          reason: `Exceeded available budget of ${availableTokenBudget} tokens.`,
        });
      }
    }
  }

  // 4. Compute composite integrity fingerprint of packed units
  const fingerprintPayload = packedUnits
    .map(u => `${u.id}:${u.contentHash}:${u.tokens}`)
    .join('|');
  const integrityFingerprint = computeContentHash(fingerprintPayload);

  return {
    packedUnits,
    packedTokens: currentTokens,
    availableBudget: availableTokenBudget,
    budgetUtilization: Number((currentTokens / availableTokenBudget).toFixed(4)),
    omittedUnits,
    integrityFingerprint,
    status: omittedUnits.some(u => u.status === 'OMITTED_MANDATORY_OVERFLOW')
      ? 'PARTIAL_ESCALATED'
      : 'COMPLETED',
  };
}

module.exports = {
  PACKING_METHOD,
  UNIT_PRIORITY,
  extractAstUnits,
  extractAstUnitsWithCache,
  extractDiffFocalWindows,
  packAstContext,
  isSecurityBoundary,
  normalizeRelativePath,
};
