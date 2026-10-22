'use strict';

/**
 * evidence_resolver.js — Centralized Reviewer Evidence Acquisition & Resolution Pipeline
 * =======================================================================================
 * Tribunal Kit System-1 — Phase 5: Reviewer Evidence Requests
 *
 * Guarantees:
 * 1. Versioned schema contract enforcement (schema_version: 1) on every evidence request.
 * 2. Active reviewer identity and review-run correlation verification.
 * 3. Canonical repository containment and symlink escape defense via safeContainedPath.
 * 4. Fast-path lookup against Phase 3 Shared Evidence Pack to eliminate redundant disk reads.
 * 5. Deterministic canonical fingerprinting and central duplicate detection.
 * 6. AST-aware slicing bounded by strict line (50) and byte (4000) limits.
 * 7. Automated secret redaction for credentials, API tokens, passwords, and JWTs.
 * 8. Trust-state preservation: newly acquired code is strictly OBSERVED, never VALIDATED.
 * 9. Centrally enforced per-reviewer and run-level token, byte, and record budgets.
 * 10. Loop and cyclic request termination via per-target failure tracking.
 * 11. Structured status outcomes: fulfilled, partial, duplicate, unavailable, rejected, budget_exhausted.
 * 12. Selective reviewer resumption re-evaluating only requesting reviewers with new evidence.
 */

const fs = require('fs');
const crypto = require('crypto');
const {
  validateEvidenceRequest,
  computeRequestFingerprint,
  EvidenceRequestBudgetManager,
  DEFAULT_BUDGETS,
} = require('./evidence_request_schema');
const { progressiveContextExpansion } = require('./progressive_context');
const { safeContainedPath } = require('../utils/path_containment');
const { extractAstUnits } = require('../context/ast_context_packer');
const { countTokens } = require('../context/token_accounting');

/**
 * Redacts common sensitive patterns from source snippets.
 *
 * @param {string} content
 * @returns {string} Redacted content
 */
function sanitizeSnippetSecrets(content) {
  if (typeof content !== 'string') return '';
  return content
    .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
    .replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]')
    .replace(/((?:password|secret|key|token|auth|bearer)\w*)\s*([:=])\s*['"][^'"]+['"]/gi, '$1 $2 "[REDACTED]"');
}

/**
 * Validates, deduplicates, and resolves reviewer evidence requests.
 *
 * @param {Array<Object>} requests - Reviewer evidence requests
 * @param {Array<string>} [existingFiles=[]] - Files already in review scope
 * @param {string} [_repoRoot] - Repository root directory
 * @param {Object} [options={}] - Configuration options
 * @param {Object} [options.evidencePack] - Phase 3 Shared Evidence Pack
 * @param {EvidenceRequestBudgetManager} [options.budgetManager] - Central budget tracker
 * @param {Set<string>|Array<string>} [options.activeReviewers] - Permitted reviewers in current run
 * @param {string} [options.reviewRunId] - Correlation run ID
 * @param {number} [options.maxTokensPerRequest=300] - Hard token budget per expansion slice
 * @param {number} [options.maxSourceLines=50] - Maximum source lines per slice
 * @param {number} [options.maxSourceBytes=4000] - Maximum source bytes per slice
 * @returns {{
 *   resolvedFiles: Array<string>,
 *   validatedRequests: Array<Object>,
 *   newEvidenceItems: Array<Object>,
 *   budgetManager: EvidenceRequestBudgetManager
 * }}
 */
function resolveEvidenceRequests(requests = [], existingFiles = [], _repoRoot, options = {}) {
  const resolvedFiles = new Set(existingFiles);
  const validatedRequests = [];
  const newEvidenceItems = [];
  const repoRoot = _repoRoot || process.cwd();

  const maxTokensPerReq = options.maxTokensPerRequest || DEFAULT_BUDGETS.maxTokensPerRequest;
  const maxSourceLines = options.maxSourceLines || DEFAULT_BUDGETS.maxSourceLines;
  const maxSourceBytes = options.maxSourceBytes || DEFAULT_BUDGETS.maxSourceBytes;

  const budgetManager = options.budgetManager instanceof EvidenceRequestBudgetManager
    ? options.budgetManager
    : new EvidenceRequestBudgetManager(options);

  // Deterministically sort requests to avoid ordering anomalies
  const sortedReqs = [...requests].sort((a, b) => {
    const rA = `${a.reviewer_id || ''}:${a.target || ''}:${a.symbol || ''}:${a.category || ''}`;
    const rB = `${b.reviewer_id || ''}:${b.target || ''}:${b.symbol || ''}:${b.category || ''}`;
    return rA.localeCompare(rB);
  });

  for (const rawReq of sortedReqs) {
    const startTime = Date.now();

    // 1. Contract & Schema Validation
    const validation = validateEvidenceRequest(rawReq, {
      activeReviewers: options.activeReviewers,
      reviewRunId: options.reviewRunId,
    });

    if (!validation.valid) {
      const fallbackFingerprint = crypto
        .createHash('sha256')
        .update(String(rawReq.target || rawReq.reviewer_id || Date.now()))
        .digest('hex');

      validatedRequests.push({
        request_id: rawReq.request_id || `req_rej_${fallbackFingerprint.slice(0, 8)}`,
        schema_version: 1,
        reviewer_id: rawReq.reviewer_id || 'anonymous',
        review_run_id: options.reviewRunId || null,
        category: rawReq.category || 'CROSS_FILE_REFERENCE',
        justification: rawReq.justification || rawReq.reason || 'Invalid request',
        target_type: rawReq.target_type || rawReq.evidence_type || 'file',
        target: String(rawReq.target || ''),
        symbol: rawReq.symbol || null,
        requested_lines: rawReq.requested_lines || null,
        evidence_ids: rawReq.evidence_ids || [],
        evidence_type: rawReq.target_type || rawReq.evidence_type || 'file',
        priority: rawReq.priority || 'NORMAL',
        status: 'rejected',
        rejection_reason: validation.error,
        rejection_code: validation.code,
        accounting: {
          token_cost: 0,
          byte_cost: 0,
          lines_retrieved: 0,
          remaining_budget: budgetManager.getRemainingTokens(rawReq.reviewer_id || 'anonymous'),
          retrieval_duration_ms: Date.now() - startTime,
        },
        provenance: {
          fingerprint: fallbackFingerprint,
          source: 'schema_validator',
          timestamp: Date.now(),
        },
      });
      continue;
    }

    const req = validation.request;
    const fingerprint = req.provenance.fingerprint;
    const target = req.target;
    const reviewerId = req.reviewer_id;

    // 2. Path Containment & Symlink Escape Verification
    const containment = safeContainedPath(target, repoRoot, {
      operation: 'read',
      strictChars: true,
    });

    if (!containment.ok) {
      req.status = 'rejected';
      req.rejection_reason = containment.error || containment.reason || 'Path containment check failed';
      req.rejection_code = containment.code || 'ERR_PATH_CONTAINMENT';
      req.accounting.retrieval_duration_ms = Date.now() - startTime;
      req.accounting.remaining_budget = budgetManager.getRemainingTokens(reviewerId);
      budgetManager.recordFailure(target);
      validatedRequests.push(req);
      continue;
    }

    const normalizedTarget = containment.relativePath;
    req.target = normalizedTarget;
    req.requested_source = normalizedTarget;

    // Compute canonical fingerprint using normalized target path
    const canonicalFingerprint = computeRequestFingerprint({
      ...req,
      target: normalizedTarget,
    });
    req.provenance.fingerprint = canonicalFingerprint;
    req.fingerprint = canonicalFingerprint;

    // 3. Central Budget, Deduplication & Loop Check
    const budgetCheck = budgetManager.canExecute(reviewerId, normalizedTarget, canonicalFingerprint);
    if (!budgetCheck.allowed) {
      req.status = budgetCheck.status || 'budget_exhausted';
      req.rejection_reason = budgetCheck.reason;
      req.accounting.retrieval_duration_ms = Date.now() - startTime;
      req.accounting.remaining_budget = budgetManager.getRemainingTokens(reviewerId);

      // If duplicate and previously fulfilled in this run, reuse existing item for context mapping
      if (req.status === 'duplicate') {
        const existingRecord = budgetManager.getFulfilledRecord(canonicalFingerprint);
        if (existingRecord) {
          newEvidenceItems.push({
            ...existingRecord,
            requesting_reviewer: reviewerId,
            description: `[Reused Dynamic Evidence] ${existingRecord.description}`,
          });
        }
      }

      validatedRequests.push(req);
      continue;
    }

    // Register active attempt in budget manager
    budgetManager.recordAttempt(reviewerId, canonicalFingerprint);

    // 4. Fast-Path: Phase 3 Evidence Pack Reusability Check
    let packMatch = null;
    if (options.evidencePack && Array.isArray(options.evidencePack.records)) {
      packMatch = options.evidencePack.records.find(r => {
        // Match by evidence_id if requested
        if (req.evidence_ids && req.evidence_ids.length > 0 && req.evidence_ids.includes(r.evidence_id)) {
          return true;
        }
        // Match by target path and optional symbol
        if (r.source === normalizedTarget) {
          if (!req.symbol) return true;
          return r.source_range?.symbol === req.symbol;
        }
        return false;
      });
    }

    let tokenCost = 0;
    let byteCost = 0;
    let linesRetrieved = 0;
    let fulfilledSource = 'unresolved';

    if (packMatch) {
      // Reused directly from validated Phase 3 Evidence Pack without disk access
      req.status = 'fulfilled';
      fulfilledSource = 'evidence_pack';
      tokenCost = packMatch.metadata?.estimated_tokens || 50;
      byteCost = packMatch.snippet ? Buffer.byteLength(packMatch.snippet, 'utf8') : 120;
      linesRetrieved = packMatch.snippet ? packMatch.snippet.split(/\r?\n/).length : 5;

      const reusedItem = {
        id: packMatch.evidence_id,
        type: packMatch.kind || 'evidence_pack_record',
        description: `[Resolved from Pack] ${packMatch.claim || packMatch.description || normalizedTarget}`,
        path: packMatch.source,
        snippet: packMatch.snippet,
        trust_status: packMatch.trust_status || 'OBSERVED',
        digest: packMatch.source_digest ? packMatch.source_digest.slice(0, 12) : null,
        is_mandatory: false,
        requesting_reviewer: reviewerId,
        producer: packMatch.producer || 'system1:evidence_pack',
        estimated_tokens: tokenCost,
      };

      newEvidenceItems.push(reusedItem);
      resolvedFiles.add(normalizedTarget);

      budgetManager.recordSuccess(reviewerId, fingerprint, {
        tokens: tokenCost,
        bytes: byteCost,
        records: 1,
        evidenceItem: reusedItem,
      });
    } else {
      // 5. AST-Aware Disk Extraction / Path Containment Resolution
      const absPath = containment.resolvedPath;
      let fileExists = false;

      try {
        fileExists = fs.existsSync(absPath) && fs.statSync(absPath).isFile();
      } catch (_) {
        fileExists = false;
      }

      if (fileExists) {
        try {
          let fileContent = fs.readFileSync(absPath, 'utf8');
          fileContent = sanitizeSnippetSecrets(fileContent);

          let sliceContent = '';
          let startLine = 1;
          let endLine = 1;
          let symbolFound = req.symbol || null;
          let isPartial = false;

          if (req.target_type === 'symbol' || req.symbol) {
            const targetSymbol = req.symbol || normalizedTarget;
            const { units } = extractAstUnits(fileContent, normalizedTarget);
            const match = units.find(
              u => u.name === targetSymbol || (u.id && u.id.includes(targetSymbol)),
            );

            if (match) {
              const allLines = match.content.split(/\r?\n/);
              if (allLines.length > maxSourceLines) {
                sliceContent = allLines.slice(0, maxSourceLines).join('\n');
                startLine = match.startLine;
                endLine = match.startLine + maxSourceLines - 1;
                isPartial = true;
              } else {
                sliceContent = match.content;
                startLine = match.startLine;
                endLine = match.endLine;
              }
              symbolFound = match.name;
            } else {
              // Symbol not found in AST of existing file
              req.status = 'unavailable';
              req.rejection_reason = `Symbol "${targetSymbol}" not found in "${normalizedTarget}".`;
              req.rejection_code = 'ERR_SYMBOL_NOT_FOUND';
              budgetManager.recordFailure(normalizedTarget);
            }
          } else if (req.requested_lines) {
            const parts = String(req.requested_lines).split('-').map(Number);
            const s = Math.max(1, parts[0] || 1);
            const lines = fileContent.split(/\r?\n/);
            const requestedEnd = parts.length === 2 ? parts[1] : s;
            const maxAllowedEnd = Math.min(lines.length, s + maxSourceLines - 1);
            const e = Math.min(requestedEnd, maxAllowedEnd);

            if (requestedEnd > maxAllowedEnd) {
              isPartial = true;
            }

            sliceContent = lines.slice(s - 1, e).join('\n');
            startLine = s;
            endLine = e;
          } else {
            // Default bounded slice
            const lines = fileContent.split(/\r?\n/);
            const e = Math.min(lines.length, maxSourceLines);
            sliceContent = lines.slice(0, e).join('\n');
            startLine = 1;
            endLine = e;
            if (lines.length > maxSourceLines) {
              isPartial = true;
            }
          }

          // Enforce max source bytes limit
          if (sliceContent) {
            const byteLen = Buffer.byteLength(sliceContent, 'utf8');
            if (byteLen > maxSourceBytes) {
              sliceContent = sliceContent.slice(0, maxSourceBytes);
              isPartial = true;
            }

            fulfilledSource = 'ast_expansion';
            req.status = isPartial ? 'partial' : 'fulfilled';

            const counted = countTokens(sliceContent);
            tokenCost = Math.min(counted.tokens, maxTokensPerReq);
            byteCost = Buffer.byteLength(sliceContent, 'utf8');
            linesRetrieved = sliceContent.split(/\r?\n/).length;

            const digest = crypto.createHash('sha256').update(sliceContent, 'utf8').digest('hex').slice(0, 12);
            const evidenceRecordId = `exp_${reviewerId}_${fingerprint.slice(0, 8)}`;

            const newItem = {
              id: evidenceRecordId,
              type: req.target_type === 'symbol' ? 'ast_slice' : 'file_snippet',
              description: `[Dynamic Context] ${normalizedTarget}:${startLine}-${endLine}${symbolFound ? `:${symbolFound}` : ''} (${req.justification})`,
              path: normalizedTarget,
              snippet: sliceContent,
              startLine,
              endLine,
              symbol: symbolFound,
              trust_status: 'OBSERVED', // Invariant: dynamic evidence is NEVER marked VALIDATED
              digest,
              source: fulfilledSource,
              requesting_reviewer: reviewerId,
              estimated_tokens: tokenCost,
            };

            newEvidenceItems.push(newItem);
            resolvedFiles.add(normalizedTarget);

            budgetManager.recordSuccess(reviewerId, fingerprint, {
              tokens: tokenCost,
              bytes: byteCost,
              records: 1,
              evidenceItem: newItem,
            });
          }
        } catch (readErr) {
          req.status = 'unavailable';
          req.rejection_reason = `Failed to read target: ${readErr.message}`;
          req.rejection_code = 'ERR_READ_FAILURE';
          budgetManager.recordFailure(normalizedTarget);
        }
      } else {
        // Target path is contained in repository root. If symbol was explicitly requested on non-existent file:
        if (req.symbol && req.target_type === 'symbol') {
          req.status = 'unavailable';
          req.rejection_reason = `Target file "${normalizedTarget}" does not exist to resolve symbol "${req.symbol}".`;
          req.rejection_code = 'ERR_TARGET_NOT_FOUND';
          budgetManager.recordFailure(normalizedTarget);
        } else {
          // Fulfilled at path level for progressive context expansion
          req.status = 'fulfilled';
          fulfilledSource = 'path_expansion';
          resolvedFiles.add(normalizedTarget);
          tokenCost = 20; // Nominal path expansion token cost
          byteCost = Buffer.byteLength(normalizedTarget, 'utf8');
          budgetManager.recordSuccess(reviewerId, fingerprint, {
            tokens: tokenCost,
            bytes: byteCost,
            records: 1,
          });
        }
      }
    }

    req.accounting.token_cost = tokenCost;
    req.accounting.byte_cost = byteCost;
    req.accounting.lines_retrieved = linesRetrieved;
    req.accounting.remaining_budget = budgetManager.getRemainingTokens(reviewerId);
    req.accounting.retrieval_duration_ms = Date.now() - startTime;
    req.provenance.source = fulfilledSource;

    // Top-level aliases for backward compatibility
    req.token_cost = tokenCost;
    req.remaining_budget = req.accounting.remaining_budget;
    req.source = fulfilledSource;
    req.fingerprint = req.provenance.fingerprint;

    validatedRequests.push(req);
  }

  return {
    resolvedFiles: Array.from(resolvedFiles).sort(),
    validatedRequests,
    newEvidenceItems,
    budgetManager,
  };
}

/**
 * Orchestrates reviewer execution with iterative evidence request loops.
 * Resumes ONLY the requesting reviewers who received newly fulfilled evidence.
 *
 * @param {Object} params
 * @param {Object} params.executor - ReviewExecutor instance
 * @param {Object} params.decision - Decision payload
 * @param {Object} params.decisionPlan - Validated Decision Plan
 * @param {string} params.customDiff - Diff under review
 * @param {string} params.task - Task description
 * @param {Array<string>} params.selectedReviewers - Active reviewers selected in Phase 2
 * @param {Object} params.initialContextExpansion - Initial Progressive Context result
 * @param {number} [params.maxRounds=2] - Maximum review expansion rounds (hard capped at 3)
 * @param {string} [params.repoRoot] - Repository root directory
 * @param {Object} [params.budgetOptions] - Custom budget manager options
 * @returns {Promise<{
 *   reviewRunId: string,
 *   results: Array<Object>,
 *   durationMs: number,
 *   telemetry: Object,
 *   evidence_requests: Array<Object>,
 *   final_context_expansion: Object,
 *   roundsExecuted: number
 * }>}
 */
async function executeWithEvidenceRequests({
  executor,
  decision,
  decisionPlan,
  customDiff,
  task,
  selectedReviewers,
  initialContextExpansion,
  maxRounds = 2,
  repoRoot,
  budgetOptions = {},
}) {
  const effectiveMaxRounds = Math.min(3, Math.max(1, maxRounds || 2));
  let currentRound = 1;
  let currentFiles = (decisionPlan && decisionPlan.files) || [];
  let currentContextExpansion = initialContextExpansion;
  const effectiveRepoRoot = repoRoot || (decisionPlan && decisionPlan.repoRoot) || process.cwd();

  const budgetManager = new EvidenceRequestBudgetManager({
    ...budgetOptions,
    maxExpansionRounds: effectiveMaxRounds,
  });

  let reviewersToRun = [...selectedReviewers];
  const reviewerResultsMap = {};
  const allRequests = [];

  let totalDurationMs = 0;
  let runCorrelationId = null;

  const aggregatedTelemetry = {
    reviewerCount: 0,
    successCount: 0,
    failureCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    concurrencyLimit: executor.maxConcurrency,
    roundsExecuted: 0,
    duplicatesPrevented: 0,
    requestsFulfilled: 0,
    requestsRejected: 0,
  };

  while (currentRound <= effectiveMaxRounds && reviewersToRun.length > 0) {
    const execRes = await executor.executeReview({
      decision,
      code: customDiff,
      task,
      reviewers: reviewersToRun,
      evidence: currentContextExpansion.context,
      evidenceMap: currentContextExpansion.contextMap,
    });

    if (!runCorrelationId) runCorrelationId = execRes.reviewRunId;
    totalDurationMs += execRes.durationMs;

    if (execRes.telemetry) {
      aggregatedTelemetry.reviewerCount += execRes.telemetry.reviewerCount || 0;
      aggregatedTelemetry.successCount += execRes.telemetry.successCount || 0;
      aggregatedTelemetry.failureCount += execRes.telemetry.failureCount || 0;
      if (typeof execRes.telemetry.inputTokens === 'number') {
        aggregatedTelemetry.inputTokens += execRes.telemetry.inputTokens;
      }
      if (typeof execRes.telemetry.outputTokens === 'number') {
        aggregatedTelemetry.outputTokens += execRes.telemetry.outputTokens;
      }
      if (typeof execRes.telemetry.totalTokens === 'number') {
        aggregatedTelemetry.totalTokens += execRes.telemetry.totalTokens;
      }
    }

    // Capture results and collect new evidence requests
    const roundRequests = [];
    for (const res of execRes.results) {
      reviewerResultsMap[res.reviewerId] = res;

      if (Array.isArray(res.evidence_requests) && res.evidence_requests.length > 0) {
        for (const req of res.evidence_requests) {
          roundRequests.push({
            ...req,
            reviewer_id: res.reviewerId,
            review_run_id: runCorrelationId,
          });
        }
      }
    }

    if (roundRequests.length > 0 && currentRound < effectiveMaxRounds) {
      const packRef = decisionPlan?.evidencePack || initialContextExpansion?.evidencePack;

      // Resolve and validate requests through the Phase 5 pipeline
      const { resolvedFiles, validatedRequests, newEvidenceItems } = resolveEvidenceRequests(
        roundRequests,
        currentFiles,
        effectiveRepoRoot,
        {
          evidencePack: packRef,
          budgetManager,
          activeReviewers: selectedReviewers,
          reviewRunId: runCorrelationId,
        },
      );

      currentFiles = resolvedFiles;
      allRequests.push(...validatedRequests);

      // Track telemetry on request outcomes
      for (const vr of validatedRequests) {
        if (vr.status === 'fulfilled' || vr.status === 'partial') {
          aggregatedTelemetry.requestsFulfilled++;
        } else if (vr.status === 'duplicate') {
          aggregatedTelemetry.duplicatesPrevented++;
        } else {
          aggregatedTelemetry.requestsRejected++;
        }
      }

      // Identify requesting reviewers who had fulfilled or partial evidence requests
      const fulfilledReviewers = new Set(
        validatedRequests
          .filter(r => r.status === 'fulfilled' || r.status === 'partial')
          .map(r => r.reviewer_id),
      );

      if (fulfilledReviewers.size > 0) {
        // Expand progressive context with newly resolved files and evidence records
        currentContextExpansion = progressiveContextExpansion({
          decisionPlan,
          selectedReviewers,
          task,
          diff: customDiff,
          files: currentFiles,
          repoRoot: effectiveRepoRoot,
          evidencePack: packRef,
        });

        // Inject new dynamic items into respective reviewers' context
        for (const item of newEvidenceItems) {
          const reqReviewer = item.requesting_reviewer;
          if (reqReviewer && currentContextExpansion.contextMap && currentContextExpansion.contextMap[reqReviewer]) {
            currentContextExpansion.contextMap[reqReviewer].push(item);
          }
          if (currentContextExpansion.context) {
            currentContextExpansion.context.push(item);
          }
        }

        // Resume ONLY reviewers who received fulfilled evidence and have remaining budget
        reviewersToRun = Array.from(fulfilledReviewers).filter(
          rId => budgetManager.getRemainingTokens(rId) > 0,
        );
      } else {
        // No evidence could be fulfilled (all unavailable, rejected, or duplicate)
        reviewersToRun = [];
      }
    } else {
      // Reached round limit or no new requests emitted
      if (roundRequests.length > 0) {
        for (const req of roundRequests) {
          allRequests.push({
            ...req,
            status: 'unavailable',
            rejection_reason: 'Maximum expansion rounds reached',
            fingerprint: computeRequestFingerprint(req),
            source: 'round_ceiling',
          });
          aggregatedTelemetry.requestsRejected++;
        }
      }
      reviewersToRun = [];
    }

    aggregatedTelemetry.roundsExecuted = currentRound;
    currentRound++;
  }

  // Construct final ordered results strictly preserving original selectedReviewers order
  const finalResults = selectedReviewers.map(rId => reviewerResultsMap[rId]).filter(Boolean);

  return {
    reviewRunId: runCorrelationId,
    results: finalResults,
    durationMs: totalDurationMs,
    telemetry: aggregatedTelemetry,
    evidence_requests: allRequests,
    final_context_expansion: currentContextExpansion,
    roundsExecuted: aggregatedTelemetry.roundsExecuted,
    budget_manager: budgetManager,
  };
}

module.exports = {
  resolveEvidenceRequests,
  executeWithEvidenceRequests,
  sanitizeSnippetSecrets,
};
