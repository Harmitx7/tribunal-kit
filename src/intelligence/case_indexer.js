'use strict';

/**
 * case_indexer.js — Tribunal Intelligence: Case Indexing
 * ============================================================================
 * Phase 7C implementation of efficient local-first case indexing.
 *
 * Maintains a live metadata index of all finalized cases, enabling O(1) or O(N)
 * sweeps over case metadata without incurring full filesystem reads for payload bodies.
 *
 * It helps answer:
 * - Have we seen this type of change before?
 * - Have we seen this file before?
 * - Have we seen this finding before?
 * - Which reviewers performed well on similar cases?
 */

const fs = require('fs');
const path = require('path');

class CaseIndexer {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.agentDir = options.agentDir || path.join(this.workspace, '.agent');
    this.intelligenceDir = path.join(this.agentDir, 'intelligence');
    this.indexPath = path.join(this.intelligenceDir, 'cases.index.json');

    this.index = {
      cases: {}, // caseId -> structured metadata
      byImpactTier: {}, // tier -> Set of caseIds
      byFailureMode: {}, // mode -> Set of caseIds
      byFile: {}, // filePath -> Set of caseIds
      byReviewer: {}, // reviewerId -> Set of caseIds
    };
    this._loadIndex();
  }

  _loadIndex() {
    if (fs.existsSync(this.indexPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
        this.index.cases = raw.cases || {};

        // Deserialize sets
        ['byImpactTier', 'byFailureMode', 'byFile', 'byReviewer'].forEach(key => {
          this.index[key] = {};
          if (raw[key]) {
            for (const [k, arr] of Object.entries(raw[key])) {
              this.index[key][k] = new Set(arr);
            }
          }
        });
      } catch (e) {
        console.warn('[Tribunal Case Indexer] Failed to load index, starting fresh.', e);
      }
    }
  }

  _saveIndex() {
    // Serialize sets
    const serialized = {
      cases: this.index.cases,
      byImpactTier: {},
      byFailureMode: {},
      byFile: {},
      byReviewer: {},
    };

    ['byImpactTier', 'byFailureMode', 'byFile', 'byReviewer'].forEach(key => {
      for (const [k, set] of Object.entries(this.index[key])) {
        serialized[key][k] = Array.from(set);
      }
    });

    if (!fs.existsSync(this.intelligenceDir)) {
      fs.mkdirSync(this.intelligenceDir, { recursive: true });
    }

    // Atomic write to prevent index corruption
    const tempPath = this.indexPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(serialized, null, 2), 'utf8');
    fs.renameSync(tempPath, this.indexPath);
  }

  _addToSet(indexMap, key, value) {
    if (!indexMap[key]) indexMap[key] = new Set();
    indexMap[key].add(value);
  }

  /**
   * Adds a finalized case to the index.
   * Called automatically by CaseMemory.storeCase in an integrated system,
   * or lazily via batch processors.
   *
   * @param {Object} caseRecord The fully structured case.
   */
  indexCase(caseRecord) {
    if (!caseRecord || !caseRecord.caseId) return;

    const { caseId } = caseRecord;

    // Build indexing metadata
    const files = Array.isArray(caseRecord.changeFingerprint?.files)
      ? caseRecord.changeFingerprint.files
      : [];

    const failureModes = caseRecord.failureModes || [];
    const impactTier = caseRecord.impactTier || 'UNKNOWN';
    const reviewers = caseRecord.selectedReviewers || [];

    // Persist small fast-scan metadata
    this.index.cases[caseId] = {
      timestamp: caseRecord.timestamp,
      impactTier,
      finalVerdict: caseRecord.finalVerdict,
      correctionCount: (caseRecord.correctionAttempts || []).length,
      latency: caseRecord.latency,
      tokenInput: caseRecord.tokenUsage?.input || 0,
    };

    // Update reverse-lookup sets
    this._addToSet(this.index.byImpactTier, impactTier, caseId);

    failureModes.forEach(mode => this._addToSet(this.index.byFailureMode, mode, caseId));
    files.forEach(f => this._addToSet(this.index.byFile, f, caseId));
    reviewers.forEach(r => this._addToSet(this.index.byReviewer, r, caseId));

    this._saveIndex();
  }

  /**
   * Fast queries over the index
   */
  getCasesByFile(filePath) {
    return Array.from(this.index.byFile[filePath] || []);
  }

  getCasesByImpactTier(tier) {
    return Array.from(this.index.byImpactTier[tier] || []);
  }

  getCasesByFailureMode(mode) {
    return Array.from(this.index.byFailureMode[mode] || []);
  }

  getReviewerPerformanceSignals(reviewerName) {
    const caseIds = Array.from(this.index.byReviewer[reviewerName] || []);
    const casesAppeared = caseIds.length;
    let regressionsAssociated = 0;

    // Scan light metadata
    for (const cid of caseIds) {
      if (this.index.byFailureMode['REGRESSION']?.has(cid)) {
        regressionsAssociated++;
      }
    }

    return {
      casesAppeared,
      regressionsAssociated,
      reliabilityScore: casesAppeared === 0 ? null : 1.0 - regressionsAssociated / casesAppeared,
    };
  }
}

module.exports = { CaseIndexer };
