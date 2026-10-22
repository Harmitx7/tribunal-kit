'use strict';

/**
 * anomaly_detector.js — System-1 Phase 7 Anomaly Detection Engine
 * =========================================================================
 * Explainable, evidence-backed cross-run statistical anomaly detection.
 * Strictly observational and advisory:
 * - NO automatic code edits
 * - NO policy mutations or risk tier downgrades
 * - NO Human Gate overrides
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  DRIFT_SCHEMA_VERSION,
  MIN_BASELINE_SAMPLES,
  MAX_RECORDS_STORED,
  MAX_STORAGE_BYTES,
  validateCrossRunRecord,
  validateAnomalyRecord,
} = require('./drift_contract');
const { writeFileSyncAtomic } = require('./evolution_pipeline');
const { assertContainedPath } = require('../utils/path_containment');

// ============================================================================
// Statistical & Robust Dispersion Functions
// ============================================================================

function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sorted = [...numbers].filter(n => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4));
}

function calculateMAD(numbers, median) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const med = typeof median === 'number' ? median : calculateMedian(numbers);
  const absoluteDeviations = numbers
    .filter(n => typeof n === 'number' && Number.isFinite(n))
    .map(n => Math.abs(n - med));
  return calculateMedian(absoluteDeviations);
}

function calculateRobustZScore(value, median, mad) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (typeof median !== 'number' || typeof mad !== 'number' || mad <= 0) {
    // Zero dispersion (constant baseline):
    if (value === median) return 0;
    if (median > 0) {
      const relDelta = (value - median) / median;
      if (Math.abs(relDelta) < 0.05) return 0; // 5% baseline noise tolerance
      return parseFloat(Math.min(3.5, Math.max(-3.5, (relDelta / 0.1) * 1.0)).toFixed(4));
    }
    return value > median ? 3.5 : -3.5;
  }
  return parseFloat(((value - median) / (1.4826 * mad)).toFixed(4));
}

// ============================================================================
// Comparability & Cohort Matching
// ============================================================================

function evaluateComparability(currentRun, candidateRun) {
  // Rule 1: Safe Repository Isolation (Strict)
  if (currentRun.safe_repo_id !== candidateRun.safe_repo_id) {
    return { is_compatible: false, reason: 'DIFFERENT_REPOSITORY' };
  }

  // Rule 2: Benchmark Fixture Match (Highest Quality)
  if (currentRun.fixture_id && candidateRun.fixture_id) {
    if (currentRun.fixture_id === candidateRun.fixture_id) {
      return { is_compatible: true, comparison_type: 'FIXTURE', fixture_id: currentRun.fixture_id };
    }
    return { is_compatible: false, reason: 'DIFFERENT_BENCHMARK_FIXTURE' };
  }

  // Rule 3: Cohort Match (Risk Tier & Scope Complexity)
  if (currentRun.decision.risk_tier === candidateRun.decision.risk_tier) {
    return { is_compatible: true, comparison_type: 'COHORT' };
  }

  // Incompatible Risk Tier
  return { is_compatible: false, reason: 'MISMATCHED_RISK_TIER' };
}

function detectExplanatoryFactors(currentRun, baselineRuns) {
  const factors = new Set();
  for (const b of baselineRuns) {
    if (b.environment.model_id && currentRun.environment.model_id && b.environment.model_id !== currentRun.environment.model_id) {
      factors.add(`MODEL_CHANGED: ${b.environment.model_id} -> ${currentRun.environment.model_id}`);
    }
    if (b.environment.prompt_version && currentRun.environment.prompt_version && b.environment.prompt_version !== currentRun.environment.prompt_version) {
      factors.add(`PROMPT_VERSION_CHANGED: ${b.environment.prompt_version} -> ${currentRun.environment.prompt_version}`);
    }
    if (b.environment.policy_hash && currentRun.environment.policy_hash && b.environment.policy_hash !== currentRun.environment.policy_hash) {
      factors.add(`POLICY_CONFIG_CHANGED: ${b.environment.policy_hash} -> ${currentRun.environment.policy_hash}`);
    }
  }
  return Array.from(factors);
}

// ============================================================================
// Core Anomaly Detection Engine
// ============================================================================

class AnomalyDetectionEngine {
  constructor(options = {}) {
    this.minBaselineSamples = options.minBaselineSamples || MIN_BASELINE_SAMPLES;
    this.detectorVersion = 1;
    this.tokenDriftThreshold = options.tokenDriftThreshold || 0.50; // 50% surge
    this.latencyDriftThreshold = options.latencyDriftThreshold || 3.0; // 3x median
  }

  /**
   * Evaluates a current review run against historical comparable runs.
   *
   * @param {Object} currentRun - Validated CrossRunRecord under evaluation
   * @param {Array<Object>} history - Historical CrossRunRecords
   * @returns {Object} AnomalyDetectionReport
   */
  detectAnomalies(currentRun, history = []) {
    const val = validateCrossRunRecord(currentRun);
    if (!val.ok) {
      throw new Error(`Current run failed schema validation: ${val.error}`);
    }

    const anomalies = [];
    const hex = crypto.randomBytes(4).toString('hex');

    // 1. Filter comparable runs
    const comparableBaseline = [];
    const primaryComparisonType = currentRun.fixture_id ? 'FIXTURE' : 'COHORT';

    for (const h of history) {
      const comp = evaluateComparability(currentRun, h);
      if (comp.is_compatible) {
        comparableBaseline.push(h);
      }
    }

    const baselineSize = comparableBaseline.length;
    const explanatoryFactors = detectExplanatoryFactors(currentRun, comparableBaseline);

    // Discrete safety invariants can be audited even on small baselines
    // -------------------------------------------------------------------------

    // A. POLICY_EXECUTION_DRIFT: Check for high-risk review depth downgrade
    if (currentRun.decision.risk_tier >= 3 && currentRun.confidence_assessment.review_depth === 'STANDARD') {
      const anomaly = {
        anomaly_id: `anom_pol_${Date.now()}_${hex.slice(0, 4)}`,
        schema_version: DRIFT_SCHEMA_VERSION,
        drift_category: 'POLICY_EXECUTION_DRIFT',
        signal_name: 'HIGH_RISK_SHALLOW_REVIEW_DEPTH',
        severity: 'CRITICAL',
        status: 'DETECTED',
        affected_run_id: currentRun.review_run_id,
        comparability: {
          comparison_type: primaryComparisonType,
          fixture_id: currentRun.fixture_id,
          baseline_sample_size: baselineSize,
          is_compatible: true,
        },
        metrics: {
          observed_value: currentRun.confidence_assessment.review_depth,
          baseline_value: 'DEEP',
          deviation: 'DOWNGRADED_TO_STANDARD',
          threshold: 'TIER_3_REQUIRES_DEEP',
          method: 'DISCRETE_INVARIANT',
        },
        reason_codes: ['POLICY_EXECUTION_DRIFT', 'MANDATORY_DEPTH_VIOLATION'],
        supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
        recommended_action: 'Investigate confidence controller: Tier 3 change received STANDARD depth, violating non-negotiable risk policy.',
        potential_explanatory_factors: explanatoryFactors,
        detector_version: this.detectorVersion,
      };
      anomalies.push(anomaly);
    }

    // B. CONFIDENCE_EVIDENCE_DRIFT: High confidence with unverified claims
    if (
      currentRun.confidence_assessment.score >= 0.85 &&
      (currentRun.evidence_summary.unverified_count > 0 || currentRun.confidence_assessment.reason_codes.includes('UNVERIFIED_EVIDENCE_CLAIM'))
    ) {
      const anomaly = {
        anomaly_id: `anom_conf_${Date.now()}_${hex.slice(0, 4)}`,
        schema_version: DRIFT_SCHEMA_VERSION,
        drift_category: 'CONFIDENCE_EVIDENCE_DRIFT',
        signal_name: 'UNVERIFIED_HIGH_CONFIDENCE_DISCREPANCY',
        severity: 'HIGH',
        status: 'DETECTED',
        affected_run_id: currentRun.review_run_id,
        comparability: {
          comparison_type: primaryComparisonType,
          fixture_id: currentRun.fixture_id,
          baseline_sample_size: baselineSize,
          is_compatible: true,
        },
        metrics: {
          observed_value: currentRun.confidence_assessment.score,
          baseline_value: '<= 0.80',
          deviation: `score=${currentRun.confidence_assessment.score} with ${currentRun.evidence_summary.unverified_count} unverified claims`,
          threshold: 'MAX_0.80_WHEN_UNVERIFIED',
          method: 'DISCRETE_INVARIANT',
        },
        reason_codes: ['CONFIDENCE_EVIDENCE_DRIFT', 'UNVERIFIED_EVIDENCE_CLAIM'],
        supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
        recommended_action: 'Audit confidence evaluator: high confidence (> 0.85) was emitted despite presence of unverified evidence claims.',
        potential_explanatory_factors: explanatoryFactors,
        detector_version: this.detectorVersion,
      };
      anomalies.push(anomaly);
    }

    // Baseline size gate for statistical dispersion checks
    // -------------------------------------------------------------------------
    if (baselineSize < this.minBaselineSamples) {
      return {
        status: anomalies.length > 0 ? 'DETECTED' : 'INSUFFICIENT_BASELINE',
        message: baselineSize < this.minBaselineSamples
          ? `Baseline sample size (${baselineSize}) is below minimum required (${this.minBaselineSamples}). Statistical checks omitted.`
          : 'Baseline sufficient.',
        baseline_sample_size: baselineSize,
        minimum_required: this.minBaselineSamples,
        anomalies,
        explanatory_factors: explanatoryFactors,
        is_advisory_only: true,
      };
    }

    // C. REVIEW_QUALITY_DRIFT: Fixed fixture defect recall regression
    if (currentRun.fixture_id) {
      const baselineCriticalRuns = comparableBaseline.filter(r => r.findings_summary.critical_count > 0);
      if (baselineCriticalRuns.length >= 2 && currentRun.findings_summary.critical_count === 0 && currentRun.governance_outcome.final_verdict === 'APPROVED') {
        const anomaly = {
          anomaly_id: `anom_qual_${Date.now()}_${hex.slice(0, 4)}`,
          schema_version: DRIFT_SCHEMA_VERSION,
          drift_category: 'REVIEW_QUALITY_DRIFT',
          signal_name: 'CRITICAL_DEFECT_DETECTION_REGRESSION',
          severity: 'CRITICAL',
          status: 'DETECTED',
          affected_run_id: currentRun.review_run_id,
          comparability: {
            comparison_type: 'FIXTURE',
            fixture_id: currentRun.fixture_id,
            baseline_sample_size: baselineSize,
            is_compatible: true,
          },
          metrics: {
            observed_value: currentRun.findings_summary.critical_count,
            baseline_value: calculateMedian(baselineCriticalRuns.map(r => r.findings_summary.critical_count)),
            deviation: 'MISSED_CRITICAL_DEFECT_ON_BENCHMARK',
            threshold: 'RECALL_100%_ON_KNOWN_VULNERABILITY',
            method: 'DISCRETE_INVARIANT',
          },
          reason_codes: ['REVIEW_QUALITY_DRIFT', 'CRITICAL_DEFECT_MISSED'],
          supporting_record_ids: baselineCriticalRuns.map(r => r.review_run_id),
          recommended_action: 'Urgent investigation: stable benchmark fixture defect was missed. Review recent prompt, model, or parser updates.',
          potential_explanatory_factors: explanatoryFactors,
          detector_version: this.detectorVersion,
        };
        anomalies.push(anomaly);
      }
    }

    // D. REVIEWER_BEHAVIOR_DRIFT: Timeouts or execution failures
    const baselineTimeouts = comparableBaseline.map(r => r.reviewers.timeouts.length);
    const medTimeouts = calculateMedian(baselineTimeouts);
    if (currentRun.reviewers.timeouts.length > 0 && currentRun.reviewers.timeouts.length > medTimeouts) {
      const anomaly = {
        anomaly_id: `anom_beh_to_${Date.now()}_${hex.slice(0, 4)}`,
        schema_version: DRIFT_SCHEMA_VERSION,
        drift_category: 'REVIEWER_BEHAVIOR_DRIFT',
        signal_name: 'REVIEWER_TIMEOUT_SPIKE',
        severity: 'HIGH',
        status: 'DETECTED',
        affected_run_id: currentRun.review_run_id,
        comparability: {
          comparison_type: primaryComparisonType,
          baseline_sample_size: baselineSize,
          is_compatible: true,
        },
        metrics: {
          observed_value: currentRun.reviewers.timeouts.length,
          baseline_value: medTimeouts,
          deviation: `+${currentRun.reviewers.timeouts.length - medTimeouts} timeouts`,
          threshold: '> baseline median',
          method: 'RATE_SHIFT',
        },
        reason_codes: ['REVIEWER_BEHAVIOR_DRIFT', 'REVIEWER_TIMEOUT_SPIKE'],
        supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
        recommended_action: `Check LLM provider latency and timeout limits for: ${currentRun.reviewers.timeouts.join(', ')}.`,
        potential_explanatory_factors: explanatoryFactors,
        detector_version: this.detectorVersion,
      };
      anomalies.push(anomaly);
    }

    // Reviewer contradiction surge
    const baselineContradictions = comparableBaseline.filter(r => r.confidence_assessment.reason_codes.includes('REVIEWER_CONTRADICTION')).length;
    const baselineContradictionRate = baselineContradictions / baselineSize;
    if (currentRun.confidence_assessment.reason_codes.includes('REVIEWER_CONTRADICTION') && baselineContradictionRate < 0.20) {
      const anomaly = {
        anomaly_id: `anom_beh_con_${Date.now()}_${hex.slice(0, 4)}`,
        schema_version: DRIFT_SCHEMA_VERSION,
        drift_category: 'REVIEWER_BEHAVIOR_DRIFT',
        signal_name: 'REVIEWER_CONTRADICTION_SURGE',
        severity: 'MEDIUM',
        status: 'DETECTED',
        affected_run_id: currentRun.review_run_id,
        comparability: {
          comparison_type: primaryComparisonType,
          baseline_sample_size: baselineSize,
          is_compatible: true,
        },
        metrics: {
          observed_value: 'REVIEWER_CONTRADICTION_PRESENT',
          baseline_value: `${(baselineContradictionRate * 100).toFixed(1)}% rate`,
          deviation: 'UNEXPECTED_REVIEWER_DISAGREEMENT',
          threshold: '< 20% baseline contradiction rate',
          method: 'RATE_SHIFT',
        },
        reason_codes: ['REVIEWER_BEHAVIOR_DRIFT', 'REVIEWER_CONTRADICTION'],
        supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
        recommended_action: 'Examine conflicting reviewer prompts and context slices: reviewers emitted opposing verdicts (APPROVED vs REJECTED).',
        potential_explanatory_factors: explanatoryFactors,
        detector_version: this.detectorVersion,
      };
      anomalies.push(anomaly);
    }

    // E. RESOURCE_DRIFT: Token surge
    const baselineTokens = comparableBaseline.map(r => r.resources.prompt_tokens);
    const medTokens = calculateMedian(baselineTokens);
    const madTokens = calculateMAD(baselineTokens, medTokens);
    const robustZ = calculateRobustZScore(currentRun.resources.prompt_tokens, medTokens, madTokens);
    if (medTokens > 0) {
      const tokenSurgeRatio = (currentRun.resources.prompt_tokens - medTokens) / medTokens;
      if (tokenSurgeRatio > this.tokenDriftThreshold || robustZ >= 2.5) {
        const anomaly = {
          anomaly_id: `anom_res_${Date.now()}_${hex.slice(0, 4)}`,
          schema_version: DRIFT_SCHEMA_VERSION,
          drift_category: 'RESOURCE_DRIFT',
          signal_name: 'PROMPT_TOKEN_CONSUMPTION_SURGE',
          severity: 'MEDIUM',
          status: 'DETECTED',
          affected_run_id: currentRun.review_run_id,
          comparability: {
            comparison_type: primaryComparisonType,
            baseline_sample_size: baselineSize,
            is_compatible: true,
          },
          metrics: {
            observed_value: currentRun.resources.prompt_tokens,
            baseline_value: medTokens,
            deviation: `+${(tokenSurgeRatio * 100).toFixed(1)}%`,
            robust_z_score: robustZ,
            threshold: `> ${(this.tokenDriftThreshold * 100).toFixed(0)}% increase`,
            method: 'ROBUST_Z_SCORE',
          },
          reason_codes: ['RESOURCE_DRIFT', 'TOKEN_BUDGET_SURGE'],
          supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
          recommended_action: 'Inspect AST slicing and evidence packaging: prompt tokens increased significantly for equivalent task risk.',
          potential_explanatory_factors: explanatoryFactors,
          detector_version: this.detectorVersion,
        };
        anomalies.push(anomaly);
      }
    }

    // F. VERIFICATION_DRIFT: Regressions in deterministic verification
    const baselineErrors = comparableBaseline.filter(r => r.confidence_assessment.reason_codes.includes('FAILED_VERIFICATION')).length;
    const baselineErrorRate = baselineErrors / baselineSize;
    if (currentRun.confidence_assessment.reason_codes.includes('FAILED_VERIFICATION') && baselineErrorRate === 0) {
      const anomaly = {
        anomaly_id: `anom_ver_${Date.now()}_${hex.slice(0, 4)}`,
        schema_version: DRIFT_SCHEMA_VERSION,
        drift_category: 'VERIFICATION_DRIFT',
        signal_name: 'DETERMINISTIC_VERIFIER_FAILURE_SURGE',
        severity: 'HIGH',
        status: 'DETECTED',
        affected_run_id: currentRun.review_run_id,
        comparability: {
          comparison_type: primaryComparisonType,
          baseline_sample_size: baselineSize,
          is_compatible: true,
        },
        metrics: {
          observed_value: 'FAILED_VERIFICATION_PRESENT',
          baseline_value: '0% error rate',
          deviation: 'VERIFIER_EXECUTION_FAILURE',
          threshold: '0% baseline error rate',
          method: 'RATE_SHIFT',
        },
        reason_codes: ['VERIFICATION_DRIFT', 'FAILED_VERIFICATION'],
        supporting_record_ids: comparableBaseline.slice(0, 5).map(r => r.review_run_id),
        recommended_action: 'Inspect local syntax/test verification runners: execution errors occurred where baseline runs succeeded.',
        potential_explanatory_factors: explanatoryFactors,
        detector_version: this.detectorVersion,
      };
      anomalies.push(anomaly);
    }

    // Validate all emitted anomalies against AnomalyRecord schema
    for (const anom of anomalies) {
      const aVal = validateAnomalyRecord(anom);
      if (!aVal.ok) {
        throw new Error(`Generated anomaly record failed schema validation: ${aVal.error}`);
      }
    }

    return {
      status: anomalies.length > 0 ? 'DETECTED' : 'STABLE',
      anomalies_count: anomalies.length,
      baseline_sample_size: baselineSize,
      anomalies,
      explanatory_factors: explanatoryFactors,
      is_advisory_only: true,
    };
  }
}

// ============================================================================
// Process-Level Concurrency Locking
// ============================================================================

function acquireDriftLock(driftDir) {
  const lockPath = path.join(driftDir, 'drift.lock');
  if (!fs.existsSync(driftDir)) fs.mkdirSync(driftDir, { recursive: true });
  const maxRetries = 40;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      try {
        const waitBuf = new Int32Array(new SharedArrayBuffer(4));
        Atomics.wait(waitBuf, 0, 0, 25);
      } catch (_) {
        // Fallback sleep if SharedArrayBuffer unavailable
        const start = Date.now();
        while (Date.now() - start < 25) {}
      }
    }
  }
  // Check for stale lock (> 15000ms old)
  try {
    const stats = fs.statSync(lockPath);
    if (Date.now() - stats.mtimeMs > 15000) {
      fs.unlinkSync(lockPath);
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    }
  } catch (_) {}
  throw new Error('Could not acquire concurrency lock for drift store');
}

function releaseDriftLock(lockPath) {
  try {
    if (lockPath && fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (_) {}
}

// ============================================================================
// Local-First Cross-Run Drift Store
// ============================================================================

class DriftStore {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.agentDir = options.agentDir || path.join(this.workspace, '.agent');
    this.driftDir = path.join(this.agentDir, 'intelligence', 'drift');
    this.recordsFile = path.join(this.driftDir, 'cross_run_records.json');
    this.maxRecords = options.maxRecords || MAX_RECORDS_STORED;
    this.maxStorageBytes = options.maxStorageBytes || MAX_STORAGE_BYTES;
    this.engine = new AnomalyDetectionEngine(options);

    // Verify storage path containment to prevent path traversal
    assertContainedPath(this.driftDir, this.workspace);

    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.driftDir)) {
      fs.mkdirSync(this.driftDir, { recursive: true });
    }
  }

  loadRecords() {
    if (!fs.existsSync(this.recordsFile)) {
      return [];
    }
    try {
      // Byte ceiling check before reading
      const stat = fs.statSync(this.recordsFile);
      if (stat.size > this.maxStorageBytes) {
        // Quarantine or trim oversized file
        return [];
      }

      const raw = fs.readFileSync(this.recordsFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Verify integrity of each loaded record
      const validRecords = [];
      for (const r of parsed) {
        const val = validateCrossRunRecord(r);
        if (val.ok) {
          validRecords.push(r);
        }
      }
      return validRecords;
    } catch (_) {
      return [];
    }
  }

  saveRecords(records) {
    this._ensureDir();
    // Enforce retention ceiling
    let trimmed = records.slice(-this.maxRecords);
    let serialized = JSON.stringify(trimmed, null, 2);
    // If byte limit exceeded, pop oldest records until under byte limit
    while (Buffer.byteLength(serialized, 'utf8') > this.maxStorageBytes && trimmed.length > 1) {
      trimmed = trimmed.slice(1);
      serialized = JSON.stringify(trimmed, null, 2);
    }
    writeFileSyncAtomic(this.recordsFile, serialized, 'utf8');
  }

  /**
   * Appends a new review run record with process concurrency locking,
   * preventing duplicate review_run_id and tampering.
   */
  recordRun(runRecord) {
    const val = validateCrossRunRecord(runRecord);
    if (!val.ok) {
      throw new Error(`Cannot record run: ${val.error}`);
    }

    const lock = acquireDriftLock(this.driftDir);
    try {
      const records = this.loadRecords();

      // Prevent duplicate run ID replay
      if (records.some(r => r.review_run_id === runRecord.review_run_id)) {
        throw new Error(`Duplicate review_run_id "${runRecord.review_run_id}" already exists in drift store`);
      }

      records.push(runRecord);
      this.saveRecords(records);
      return runRecord;
    } finally {
      releaseDriftLock(lock);
    }
  }

  /**
   * Records a run and evaluates it against comparable history.
   */
  recordAndEvaluate(runRecord) {
    const recorded = this.recordRun(runRecord);
    const history = this.loadRecords().filter(r => r.review_run_id !== recorded.review_run_id);
    return this.engine.detectAnomalies(recorded, history);
  }
}

module.exports = {
  calculateMedian,
  calculateMAD,
  calculateRobustZScore,
  evaluateComparability,
  detectExplanatoryFactors,
  AnomalyDetectionEngine,
  DriftStore,
};
