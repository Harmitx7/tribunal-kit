'use strict';

/**
 * case_memory.js — Tribunal Intelligence: Case Memory System
 * ============================================================================
 * Phase 7B implementation of persistent, local-first case intelligence.
 *
 * Every completed governance event is stored here as an immutable case.
 * Cases are NEVER mutated after finalization; corrections create linked
 * cases to maintain untampered historical truth.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CaseMemory {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.agentDir = options.agentDir || path.join(this.workspace, '.agent');
    this.intelligenceDir = path.join(this.agentDir, 'intelligence');
    this.casesDir = path.join(this.intelligenceDir, 'cases');

    // Ensure directories exist
    this._ensureDirectories();
  }

  _ensureDirectories() {
    if (!fs.existsSync(this.agentDir)) fs.mkdirSync(this.agentDir, { recursive: true });
    if (!fs.existsSync(this.intelligenceDir))
      fs.mkdirSync(this.intelligenceDir, { recursive: true });
    if (!fs.existsSync(this.casesDir)) fs.mkdirSync(this.casesDir, { recursive: true });
  }

  /**
   * Generates a deterministic hash for repository states based on current context.
   */
  _generateFingerprint(data) {
    return crypto
      .createHash('sha256')
      .update(typeof data === 'string' ? data : JSON.stringify(data))
      .digest('hex');
  }

  _getCasePath(caseId) {
    return path.join(this.casesDir, `${caseId}.json`);
  }

  /**
   * Finalizes and stores an immutable governance case.
   *
   * @param {Object} caseData The raw case outcome structure
   * @throws {Error} If the caseId already exists to enforce immutability
   * @returns {Object} The finalized, frozen case record
   */
  storeCase(caseData) {
    if (!caseData || !caseData.caseId) {
      throw new Error('Cannot store case: caseId is missing.');
    }

    const { caseId } = caseData;
    const casePath = this._getCasePath(caseId);

    if (fs.existsSync(casePath)) {
      throw new Error(
        `Immutability violation: Case ${caseId} already exists and cannot be overwritten.`,
      );
    }

    const finalizedCase = {
      caseId,
      timestamp: caseData.timestamp || new Date().toISOString(),
      repositoryFingerprint: caseData.repositoryFingerprint || 'UNKNOWN',
      changeFingerprint: caseData.changeFingerprint || null,
      findingFingerprint: caseData.findingFingerprint || null,
      impactTier: caseData.impactTier || 'UNKNOWN',
      policyDecision: caseData.policyDecision || {},
      selectedReviewers: caseData.selectedReviewers || [],
      reviewResults: caseData.reviewResults || [],
      correctionAttempts: caseData.correctionAttempts || [],
      validationResults: caseData.validationResults || [],
      evidence: caseData.evidence || {},
      finalVerdict: caseData.finalVerdict || 'UNRESOLVED',
      resolutionCertificate: caseData.resolutionCertificate || null,
      tokenUsage: caseData.tokenUsage || { input: 0, output: 0 },
      latency: caseData.latency || 0,
      failureModes: caseData.failureModes || [],
      regressions: caseData.regressions || [],
      linkedParentCase: caseData.linkedParentCase || null, // For correction chains

      // Compute cryptographic hash of the entire record bounds for immutability check
      _recordHash: '',
    };

    // Seal the record with its own hash
    finalizedCase._recordHash = this._generateFingerprint({ ...finalizedCase, _recordHash: '' });

    fs.writeFileSync(casePath, JSON.stringify(finalizedCase, null, 2), 'utf8');

    return finalizedCase;
  }

  /**
   * Retrieves an immutable case.
   *
   * @param {string} caseId
   * @returns {Object|null} The case record, or null if missing.
   */
  getCase(caseId) {
    const casePath = this._getCasePath(caseId);
    if (!fs.existsSync(casePath)) return null;

    try {
      const data = fs.readFileSync(casePath, 'utf8');
      const caseRecord = JSON.parse(data);

      // Immutability Integrity Check
      const storedHash = caseRecord._recordHash;
      const computedHash = this._generateFingerprint({ ...caseRecord, _recordHash: '' });

      if (storedHash !== computedHash) {
        console.warn(
          `[Tribunal Case Memory] CORRUPTION WARNING: Case ${caseId} fails internal integrity hash.`,
        );
      }

      return Object.freeze(caseRecord); // Prevent accidental in-memory mutation
    } catch (e) {
      console.error(`[Tribunal Case Memory] Failed to read case ${caseId}:`, e);
      return null;
    }
  }

  /**
   * Scans all stored cases without loading full objects immediately.
   * Useful for indexing.
   */
  *listCaseIds() {
    if (!fs.existsSync(this.casesDir)) return;
    const files = fs.readdirSync(this.casesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        yield file.replace('.json', '');
      }
    }
  }
}

module.exports = { CaseMemory };
