'use strict';

/**
 * conflict_resolver.js — Multi-Agent Cross-Finding Conflict Detection & Resolution
 * ================================================================================
 * Stage 2: Cross-Agent Output Verification & Conflict Detection
 *
 * Guarantees:
 * 1. Detects contradictory assertions and severity divergences across agents.
 * 2. Invariant: Never discards or suppresses contradictory findings.
 * 3. Preserves all conflicting evidence with full origin provenance.
 * 4. Applies deterministic precedence rules (e.g. Security Precedence) while
 *    explicitly flagging unresolved conflicts for human review.
 */

const crypto = require('crypto');
const { normalizeLineRange } = require('./evidence_bus');

const SEVERITY_WEIGHTS = Object.freeze({
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
});

/**
 * Checks if two line ranges overlap.
 * @param {any} rangeA
 * @param {any} rangeB
 * @returns {boolean}
 */
function lineRangesOverlap(rangeA, rangeB) {
  const normA = normalizeLineRange(rangeA);
  const normB = normalizeLineRange(rangeB);

  if (!normA || !normB) return false;

  if (typeof normA === 'object' && typeof normB === 'object') {
    return normA.start <= normB.end && normB.start <= normA.end;
  }

  // String fallback comparison
  return String(normA).toLowerCase() === String(normB).toLowerCase();
}

/**
 * Computes severity weight distance between two severities.
 * @param {string} sevA
 * @param {string} sevB
 * @returns {number}
 */
function severityDistance(sevA, sevB) {
  const wA = SEVERITY_WEIGHTS[String(sevA).toUpperCase()] ?? 2;
  const wB = SEVERITY_WEIGHTS[String(sevB).toUpperCase()] ?? 2;
  return Math.abs(wA - wB);
}

class ConflictResolver {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.securityPrecedence=true] - Security findings take precedence over optimization
   * @param {boolean} [options.strict=false] - If true, keeps all conflicts strictly UNRESOLVED
   * @param {number} [options.divergenceThreshold=2] - Severity step difference to trigger divergence
   */
  constructor(options = {}) {
    this.securityPrecedence = options.securityPrecedence !== false;
    this.strict = Boolean(options.strict);
    this.divergenceThreshold = options.divergenceThreshold || 2;
  }

  /**
   * Evaluates a collection of findings and identifies conflicts.
   *
   * @param {Array<Object>} findings - Array of normalized AgentFinding or Evidence items
   * @param {Object} [evalOptions]
   * @returns {{
   *   hasConflicts: boolean,
   *   unresolvedCount: number,
   *   conflicts: Array<Object>,
   *   findings: Array<Object>,
   *   summary: string
   * }}
   */
  resolve(findings = [], evalOptions = {}) {
    const securityPrecedence =
      evalOptions.securityPrecedence !== undefined
        ? evalOptions.securityPrecedence
        : this.securityPrecedence;
    const strict = evalOptions.strict !== undefined ? evalOptions.strict : this.strict;

    if (!Array.isArray(findings) || findings.length === 0) {
      return {
        hasConflicts: false,
        unresolvedCount: 0,
        conflicts: [],
        findings: [],
        summary: 'No findings to evaluate for conflicts.',
      };
    }

    const conflicts = [];
    const n = findings.length;

    // Compare pairs of findings
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const itemA = findings[i];
        const itemB = findings[j];

        // Only compare findings from DIFFERENT agents
        const agentA = itemA.agentId || itemA.sourceAgent;
        const agentB = itemB.agentId || itemB.sourceAgent;
        if (!agentA || !agentB || agentA === agentB) continue;

        const fileA = (itemA.filePath || itemA.file || '').replace(/\\/g, '/').toLowerCase();
        const fileB = (itemB.filePath || itemB.file || '').replace(/\\/g, '/').toLowerCase();

        // Must target the same file
        if (!fileA || !fileB || fileA !== fileB) continue;

        const rangeA = itemA.lineRange || itemA.location;
        const rangeB = itemB.lineRange || itemB.location;

        const overlaps = lineRangesOverlap(rangeA, rangeB);
        if (!overlaps) continue;

        const sevA = (itemA.severity || 'MEDIUM').toUpperCase();
        const sevB = (itemB.severity || 'MEDIUM').toUpperCase();
        const dist = severityDistance(sevA, sevB);

        // Check for contradiction:
        // 1. Significant severity divergence on same code (e.g. CRITICAL vs INFO/LOW)
        // 2. Security vs Non-Security contradiction
        const isSecurityA = (itemA.category || '').toUpperCase() === 'SECURITY';
        const isSecurityB = (itemB.category || '').toUpperCase() === 'SECURITY';

        let isContradictory = false;
        let conflictType = 'SEVERITY_DIVERGENCE';
        let explanation = '';

        if (dist >= this.divergenceThreshold) {
          isContradictory = true;
          conflictType = 'SEVERITY_DIVERGENCE';
          explanation = `Agent '${agentA}' reported ${sevA} while '${agentB}' reported ${sevB} on ${fileA} lines ${JSON.stringify(rangeA)}.`;
        } else if (
          (isSecurityA && !isSecurityB && sevA === 'CRITICAL') ||
          (isSecurityB && !isSecurityA && sevB === 'CRITICAL')
        ) {
          isContradictory = true;
          conflictType = 'CONTRADICTORY_ASSESSMENT';
          explanation = `Security agent reported CRITICAL finding while non-security agent reported ${isSecurityA ? sevB : sevA} on identical lines in ${fileA}.`;
        }

        if (isContradictory) {
          const conflictId = `conf_${crypto.randomBytes(6).toString('hex')}`;
          const maxSev =
            (SEVERITY_WEIGHTS[sevA] || 0) >= (SEVERITY_WEIGHTS[sevB] || 0) ? sevA : sevB;

          let resolutionStatus = 'UNRESOLVED';
          let resolutionRule = null;
          let winningFindingId = null;

          const findingIdA =
            itemA.findingId || itemA.metadata?.findingId || itemA.content?.findingId || itemA.id;
          const findingIdB =
            itemB.findingId || itemB.metadata?.findingId || itemB.content?.findingId || itemB.id;

          if (!strict && securityPrecedence) {
            if (
              isSecurityA &&
              !isSecurityB &&
              (SEVERITY_WEIGHTS[sevA] || 0) > (SEVERITY_WEIGHTS[sevB] || 0)
            ) {
              resolutionStatus = 'RESOLVED_BY_PRECEDENCE';
              resolutionRule = `Security Precedence Rule: ${agentA} (${sevA}) takes precedence over ${agentB} (${sevB}). Contradictory finding preserved in evidence envelope.`;
              winningFindingId = findingIdA;
            } else if (
              isSecurityB &&
              !isSecurityA &&
              (SEVERITY_WEIGHTS[sevB] || 0) > (SEVERITY_WEIGHTS[sevA] || 0)
            ) {
              resolutionStatus = 'RESOLVED_BY_PRECEDENCE';
              resolutionRule = `Security Precedence Rule: ${agentB} (${sevB}) takes precedence over ${agentA} (${sevA}). Contradictory finding preserved in evidence envelope.`;
              winningFindingId = findingIdB;
            }
          }

          conflicts.push({
            conflictId,
            filePath: fileA,
            lineRange: rangeA,
            agents: [agentA, agentB],
            contradictoryFindings: [
              {
                agentId: agentA,
                findingId: findingIdA,
                severity: sevA,
                category: itemA.category || 'OTHER',
                description: itemA.description || itemA.content,
                confidence: itemA.confidence ?? 1.0,
                provenanceHash: itemA.provenanceHash,
              },
              {
                agentId: agentB,
                findingId: findingIdB,
                severity: sevB,
                category: itemB.category || 'OTHER',
                description: itemB.description || itemB.content,
                confidence: itemB.confidence ?? 1.0,
                provenanceHash: itemB.provenanceHash,
              },
            ],
            conflictType,
            severity: maxSev,
            resolutionStatus,
            resolutionRule,
            winningFindingId,
            explanation,
            timestamp: Date.now(),
          });
        }
      }
    }

    const unresolvedCount = conflicts.filter(c => c.resolutionStatus === 'UNRESOLVED').length;
    const summary =
      conflicts.length === 0
        ? 'No agent conflicts detected across all target files and line ranges.'
        : `Detected ${conflicts.length} conflict(s) (${unresolvedCount} unresolved, ${conflicts.length - unresolvedCount} resolved by precedence). All contradictory findings preserved.`;

    return {
      hasConflicts: conflicts.length > 0,
      unresolvedCount,
      conflicts,
      findings, // Invariant: original findings preserved intact!
      summary,
    };
  }
}

module.exports = {
  ConflictResolver,
  lineRangesOverlap,
  severityDistance,
  SEVERITY_WEIGHTS,
};
