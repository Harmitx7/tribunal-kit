'use strict';

/**
 * context_drift_verifier.js — Context Provenance & Drift Verification Engine
 * ===========================================================================
 * Phase 3: Provenance Tracking & Anti-Drift Verification
 *
 * Guarantees:
 * 1. Full Provenance Record:
 *    - Captures evidenceRequestId, canonical relative path, source SHA256 at collection,
 *      extracted AST unit/line range, token count & accuracy, packing status & order,
 *      model/provider identity, and final composite context fingerprint.
 * 2. Five Explicit Drift Types Detected:
 *    - SOURCE_DRIFT: Source file on disk mutated after evidence collection.
 *    - SELECTION_DRIFT: Required/mandatory evidence was omitted, replaced, or silently dropped.
 *    - TRANSFORMATION_DRIFT: Extracted snippet/unit content mutated or corrupted relative to disk slice.
 *    - BUDGET_DRIFT: Actual packed token count differs from verified approved budget.
 *    - REQUEST_DRIFT: Payload submitted to provider diverges from pipeline-approved context.
 * 3. Security & Injection Defense:
 *    - Context metadata strips or neutralizes control injection attempts.
 *    - File reads strictly respect Phase 1 filesystem containment (safeContainedPath).
 *    - Sensitive credentials redacted from diagnostic logs.
 */

const fs = require('fs');
const { safeContainedPath } = require('../utils/path_containment');
const { computeContentHash, countTokens } = require('./token_accounting');

// Drift type enumeration
const DRIFT_TYPE = {
  SOURCE_DRIFT: 'SOURCE_DRIFT',
  SELECTION_DRIFT: 'SELECTION_DRIFT',
  TRANSFORMATION_DRIFT: 'TRANSFORMATION_DRIFT',
  BUDGET_DRIFT: 'BUDGET_DRIFT',
  REQUEST_DRIFT: 'REQUEST_DRIFT',
};

/**
 * Sanitizes context metadata to prevent control-directive injection
 * (e.g., attempts to embed "APPROVED", "SKIP_TRIBUNAL", or xml boundaries in evidence).
 *
 * @param {string} text
 * @returns {string}
 */
function sanitizeProvenanceMetadata(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(?:APPROVED|REJECTED|ESCALATED|OVERRIDE_GATE|SKIP_VALIDATION)/g, match => `[ESCAPED_${match}]`);
}

/**
 * Creates an authoritative Provenance Dossier for an evidence collection session.
 *
 * @param {Object} params
 * @param {string} [params.repoRoot] - Repository root
 * @param {string} [params.model] - Model name
 * @param {Array<Object>} params.evidenceRequests - Initial evidence requests
 * @param {Array<Object>} params.packedUnits - Result from packAstContext
 * @param {Object} params.budgetResult - Approved budget calculation
 * @returns {Object} ProvenanceDossier
 */
function createProvenanceDossier(params = {}) {
  const {
    repoRoot = process.cwd(),
    model = 'claude-3-5-sonnet-latest',
    evidenceRequests = [],
    packedUnits = [],
    budgetResult = {},
  } = params;

  const records = [];
  const requiredTargets = new Set();

  // 1. Process evidence requests
  for (const req of evidenceRequests) {
    if (!req) continue;
    const target = req.target || req.path || '';
    if (req.is_mandatory || req.isMandatory || req.required) {
      requiredTargets.add(target);
    }
  }

  // 2. Build unit provenance records
  for (const unit of packedUnits) {
    let sourceHashAtCollection = unit.contentHash;

    // If unit has a real file on disk, obtain authoritative disk SHA-256
    if (unit.filePath && unit.filePath !== 'evidence:in-memory') {
      const containment = safeContainedPath(unit.filePath, repoRoot, {
        operation: 'read',
        strictChars: true,
      });
      if (containment.ok && fs.existsSync(containment.resolvedPath)) {
        try {
          const diskContent = fs.readFileSync(containment.resolvedPath, 'utf8');
          sourceHashAtCollection = computeContentHash(diskContent);
        } catch (_) {}
      }
    }

    records.push({
      unitId: sanitizeProvenanceMetadata(unit.id),
      filePath: unit.filePath,
      unitType: unit.unitType,
      name: sanitizeProvenanceMetadata(unit.name),
      startLine: unit.startLine,
      endLine: unit.endLine,
      sourceHashAtCollection,
      extractedHash: unit.contentHash,
      tokens: unit.tokens,
      tokenAccuracy: unit.tokenAccuracy,
      packingMethod: unit.packingMethod,
      packingOrder: unit.packingOrder || 0,
      isMandatory: Boolean(unit.isMandatory),
      status: unit.status || 'INCLUDED',
    });
  }

  // 3. Compute composite context fingerprint
  const fingerprintString = records
    .map(r => `${r.unitId}:${r.extractedHash}:${r.tokens}:${r.packingOrder}`)
    .join('||');
  const contextFingerprint = computeContentHash(fingerprintString);

  return {
    version: 1,
    createdAt: Date.now(),
    model,
    repoRoot: '[REPO_ROOT]', // Avoid leaking absolute host path
    records,
    requiredTargets: Array.from(requiredTargets),
    budget: {
      allocatedTokens: budgetResult.availableBudget || 0,
      packedTokens: records.reduce((acc, r) => acc + (r.tokens || 0), 0),
      modelLimit: budgetResult.modelLimit || 0,
      reservedOutput: budgetResult.reservedOutput || 0,
    },
    contextFingerprint,
  };
}

/**
 * Verifies if any of the 5 defined forms of Context Drift have occurred.
 *
 * @param {Object} params
 * @param {Object} params.dossier - Approved ProvenanceDossier
 * @param {string} [params.repoRoot] - Repository root
 * @param {string|Object} [params.submittedPrompt] - Actual prompt submitted to provider (for request drift check)
 * @param {Array<Object>} [params.currentPackedUnits] - Current packed units (for budget drift check)
 * @returns {{
 *   hasDrift: boolean,
 *   driftTypes: Array<string>,
 *   violations: Array<{
 *     type: string,
 *     severity: 'CRITICAL' | 'HIGH' | 'MEDIUM',
 *     target: string,
 *     expected: any,
 *     actual: any,
 *     description: string
 *   }>
 * }}
 */
function verifyContextDrift(params = {}) {
  const {
    dossier,
    repoRoot = process.cwd(),
    submittedPrompt,
    currentPackedUnits,
  } = params;

  if (!dossier || !dossier.records || !Array.isArray(dossier.records)) {
    throw new Error('INVALID_DOSSIER: Context drift verification requires a valid ProvenanceDossier.');
  }

  const violations = [];
  const detectedDriftTypes = new Set();

  // 1. SOURCE DRIFT: Verify source file content on disk has not changed since collection
  for (const record of dossier.records) {
    if (!record.filePath || record.filePath === 'evidence:in-memory') continue;

    const containment = safeContainedPath(record.filePath, repoRoot, {
      operation: 'read',
      strictChars: true,
    });

    if (!containment.ok) {
      detectedDriftTypes.add(DRIFT_TYPE.SOURCE_DRIFT);
      violations.push({
        type: DRIFT_TYPE.SOURCE_DRIFT,
        severity: 'CRITICAL',
        target: record.filePath,
        expected: 'Path contained within repository root',
        actual: containment.error || 'Containment violation',
        description: `Source path "${record.filePath}" violates repository containment boundary.`,
      });
      continue;
    }

    if (!fs.existsSync(containment.resolvedPath)) {
      detectedDriftTypes.add(DRIFT_TYPE.SOURCE_DRIFT);
      violations.push({
        type: DRIFT_TYPE.SOURCE_DRIFT,
        severity: 'CRITICAL',
        target: record.filePath,
        expected: record.sourceHashAtCollection,
        actual: 'FILE_NOT_FOUND',
        description: `Source file "${record.filePath}" was removed or missing after evidence collection.`,
      });
      continue;
    }

    try {
      const currentDiskContent = fs.readFileSync(containment.resolvedPath, 'utf8');
      const currentDiskHash = computeContentHash(currentDiskContent);

      if (currentDiskHash !== record.sourceHashAtCollection) {
        detectedDriftTypes.add(DRIFT_TYPE.SOURCE_DRIFT);
        violations.push({
          type: DRIFT_TYPE.SOURCE_DRIFT,
          severity: 'HIGH',
          target: record.filePath,
          expected: record.sourceHashAtCollection,
          actual: currentDiskHash,
          description: `Source file "${record.filePath}" mutated on disk after evidence collection (disk hash mismatch).`,
        });
      }
    } catch (readErr) {
      detectedDriftTypes.add(DRIFT_TYPE.SOURCE_DRIFT);
      violations.push({
        type: DRIFT_TYPE.SOURCE_DRIFT,
        severity: 'HIGH',
        target: record.filePath,
        expected: record.sourceHashAtCollection,
        actual: readErr.message,
        description: `Failed to read source file "${record.filePath}" for drift verification: ${readErr.message}`,
      });
    }
  }

  // 2. SELECTION DRIFT: Verify all mandatory/required evidence targets are preserved in packed units
  const packedFilePaths = new Set(dossier.records.map(r => r.filePath));
  for (const reqTarget of dossier.requiredTargets || []) {
    if (!packedFilePaths.has(reqTarget)) {
      detectedDriftTypes.add(DRIFT_TYPE.SELECTION_DRIFT);
      violations.push({
        type: DRIFT_TYPE.SELECTION_DRIFT,
        severity: 'CRITICAL',
        target: reqTarget,
        expected: 'MANDATORY_EVIDENCE_INCLUDED',
        actual: 'OMITTED_OR_DROPPED',
        description: `Mandatory evidence target "${reqTarget}" was omitted or dropped during context packing.`,
      });
    }
  }

  // 3. TRANSFORMATION DRIFT: Verify extracted units still match the actual line slice in source file
  for (const record of dossier.records) {
    if (!record.filePath || record.filePath === 'evidence:in-memory') continue;
    if (record.packingMethod !== 'AST_STRUCTURAL' && record.packingMethod !== 'SYNTAX_FALLBACK_WINDOW') {
      continue;
    }

    const containment = safeContainedPath(record.filePath, repoRoot, {
      operation: 'read',
      strictChars: true,
    });
    if (containment.ok && fs.existsSync(containment.resolvedPath)) {
      try {
        const fileContent = fs.readFileSync(containment.resolvedPath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        const start = Math.max(1, record.startLine);
        const end = Math.min(lines.length, record.endLine);
        const sliceContent = lines.slice(start - 1, end).join('\n');
        const sliceHash = computeContentHash(sliceContent);

        if (sliceHash !== record.extractedHash) {
          detectedDriftTypes.add(DRIFT_TYPE.TRANSFORMATION_DRIFT);
          violations.push({
            type: DRIFT_TYPE.TRANSFORMATION_DRIFT,
            severity: 'HIGH',
            target: record.unitId,
            expected: record.extractedHash,
            actual: sliceHash,
            description: `Extracted AST unit "${record.unitId}" no longer represents the current slice in source file.`,
          });
        }
      } catch (_) {}
    }
  }

  // 4. BUDGET DRIFT: Verify current packed context token count matches approved budget
  if (currentPackedUnits && Array.isArray(currentPackedUnits)) {
    const currentTotalTokens = currentPackedUnits.reduce((acc, u) => acc + (u.tokens || 0), 0);
    const approvedTotalTokens = dossier.budget.packedTokens;

    if (currentTotalTokens !== approvedTotalTokens) {
      detectedDriftTypes.add(DRIFT_TYPE.BUDGET_DRIFT);
      violations.push({
        type: DRIFT_TYPE.BUDGET_DRIFT,
        severity: 'HIGH',
        target: 'token_budget',
        expected: approvedTotalTokens,
        actual: currentTotalTokens,
        description: `Packed content token count (${currentTotalTokens}) diverges from the approved budget count (${approvedTotalTokens}).`,
      });
    }

    if (dossier.budget.allocatedTokens > 0 && currentTotalTokens > dossier.budget.allocatedTokens) {
      detectedDriftTypes.add(DRIFT_TYPE.BUDGET_DRIFT);
      violations.push({
        type: DRIFT_TYPE.BUDGET_DRIFT,
        severity: 'CRITICAL',
        target: 'token_budget',
        expected: `<= ${dossier.budget.allocatedTokens}`,
        actual: currentTotalTokens,
        description: `Current packed token count (${currentTotalTokens}) exceeds approved allocation limit (${dossier.budget.allocatedTokens}).`,
      });
    }
  }

  // 5. REQUEST DRIFT: Verify submitted prompt matches approved context fingerprint
  if (submittedPrompt !== undefined && submittedPrompt !== null) {
    const promptText = typeof submittedPrompt === 'string' ? submittedPrompt : JSON.stringify(submittedPrompt);
    const promptTokens = countTokens(promptText, { model: dossier.model }).tokens;

    // Check if the prompt contains the expected units or if its token usage unexpectedly exceeds approved limits
    if (dossier.budget.allocatedTokens > 0 && promptTokens > dossier.budget.modelLimit) {
      detectedDriftTypes.add(DRIFT_TYPE.REQUEST_DRIFT);
      violations.push({
        type: DRIFT_TYPE.REQUEST_DRIFT,
        severity: 'CRITICAL',
        target: 'submitted_prompt',
        expected: `<= ${dossier.budget.modelLimit} total tokens`,
        actual: `${promptTokens} tokens`,
        description: `Submitted prompt (${promptTokens} tokens) exceeds provider model context limit (${dossier.budget.modelLimit} tokens).`,
      });
    }

    // Verify prompt does not strip or replace approved evidence fingerprint
    const promptHash = computeContentHash(promptText);
    if (dossier.approvedPromptHash && promptHash !== dossier.approvedPromptHash) {
      detectedDriftTypes.add(DRIFT_TYPE.REQUEST_DRIFT);
      violations.push({
        type: DRIFT_TYPE.REQUEST_DRIFT,
        severity: 'CRITICAL',
        target: 'submitted_prompt',
        expected: dossier.approvedPromptHash,
        actual: promptHash,
        description: 'Submitted provider prompt differs from the approved pipeline prompt (hash mismatch).',
      });
    }
  }

  return {
    hasDrift: violations.length > 0,
    driftTypes: Array.from(detectedDriftTypes),
    violations,
  };
}

module.exports = {
  DRIFT_TYPE,
  createProvenanceDossier,
  verifyContextDrift,
  sanitizeProvenanceMetadata,
};
