'use strict';

/**
 * dataset_integrity_auditor.js — Evaluation Dataset & Benchmark Integrity Engine
 * ==============================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Verifies benchmark and evaluation datasets for:
 * 1. Schema conformance (EvaluationDatasetSchema)
 * 2. Exact duplicate case IDs and prompt collisions
 * 3. Semantic near-duplicates via token Jaccard similarity
 * 4. Partition leakage between train/tuning and held-out evaluation splits
 * 5. Class imbalance and ground-truth provenance integrity
 */

const { validateEvaluationDataset } = require('./evaluation_schemas');

/**
 * Tokenizes a string into a normalized set of word tokens.
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return new Set(words);
}

/**
 * Computes Jaccard similarity between two token sets.
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount++;
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

/**
 * Audits an evaluation dataset for internal consistency, duplicates, and class balance.
 *
 * @param {object} dataset - Dataset object to audit
 * @param {object} [options]
 * @param {number} [options.nearDuplicateThreshold=0.85]
 * @returns {object} Integrity audit report
 */
function auditDatasetIntegrity(dataset, options = {}) {
  const nearDuplicateThreshold = options.nearDuplicateThreshold || 0.85;
  const violations = [];
  const warnings = [];

  // 1. Structural Schema Validation
  const schemaCheck = validateEvaluationDataset(dataset);
  if (!schemaCheck.valid) {
    return {
      valid: false,
      violations: schemaCheck.errors.map(e => `SCHEMA_VIOLATION: ${e.path} - ${e.message}`),
      warnings: [],
      stats: { totalCases: 0 },
    };
  }

  const cases = dataset.cases || [];
  const seenIds = new Set();
  const tokenizedCases = [];
  const labelCounts = {};

  // 2. Exact Duplicates & Provenance Check
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    // Check duplicate ID
    if (seenIds.has(c.id)) {
      violations.push(`DUPLICATE_CASE_ID: Case id "${c.id}" occurs more than once.`);
    } else {
      seenIds.add(c.id);
    }

    // Check Ground Truth Provenance
    if (!c.expected?.labelProvenance || c.expected.labelProvenance.trim().length < 3) {
      violations.push(`MISSING_LABEL_PROVENANCE: Case "${c.id}" lacks descriptive label provenance.`);
    }

    const label = String(c.expected?.groundTruthLabel || 'UNKNOWN');
    labelCounts[label] = (labelCounts[label] || 0) + 1;

    const promptText = (c.inputFixture?.prompt || '') + ' ' + (c.taskDescription || '');
    tokenizedCases.push({ id: c.id, tokens: tokenize(promptText), label });
  }

  // 3. Near-Duplicate Detection (O(N^2) over cases)
  const duplicatesDetected = [];
  for (let i = 0; i < tokenizedCases.length; i++) {
    for (let j = i + 1; j < tokenizedCases.length; j++) {
      const caseA = tokenizedCases[i];
      const caseB = tokenizedCases[j];
      const similarity = jaccardSimilarity(caseA.tokens, caseB.tokens);

      if (similarity >= nearDuplicateThreshold) {
        const isConflict = caseA.label !== caseB.label;
        if (isConflict) {
          violations.push(
            `CONTRADICTORY_NEAR_DUPLICATE: Cases "${caseA.id}" and "${caseB.id}" have similarity ${similarity.toFixed(2)} but contradictory labels ("${caseA.label}" vs "${caseB.label}").`
          );
        } else {
          warnings.push(
            `NEAR_DUPLICATE_CASE: Cases "${caseA.id}" and "${caseB.id}" exhibit high token similarity (${similarity.toFixed(2)}). Consider pruning.`
          );
        }
        duplicatesDetected.push({ caseA: caseA.id, caseB: caseB.id, similarity });
      }
    }
  }

  // 4. Class Imbalance Analysis
  const labelKeys = Object.keys(labelCounts);
  if (labelKeys.length > 1) {
    const counts = Object.values(labelCounts);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const imbalanceRatio = maxCount / Math.max(minCount, 1);

    if (imbalanceRatio > 4.0) {
      warnings.push(
        `SEVERE_CLASS_IMBALANCE: Imbalance ratio is ${imbalanceRatio.toFixed(1)}:1 (${JSON.stringify(labelCounts)}). Metrics may skew.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    stats: {
      totalCases: cases.length,
      labelCounts,
      duplicatesDetectedCount: duplicatesDetected.length,
    },
  };
}

/**
 * Checks for benchmark partition leakage between a held-out evaluation dataset and a training/tuning dataset.
 *
 * @param {object} evalDataset - Held-out evaluation dataset
 * @param {object} trainDataset - Training / prompt tuning dataset
 * @param {number} [threshold=0.85] - Similarity threshold for flagging leakage
 * @returns {{ leaked: boolean, violations: string[] }}
 */
function checkPartitionLeakage(evalDataset, trainDataset, threshold = 0.85) {
  const violations = [];
  if (!evalDataset || !trainDataset || !Array.isArray(evalDataset.cases) || !Array.isArray(trainDataset.cases)) {
    return { leaked: false, violations: [] };
  }

  const trainTokens = trainDataset.cases.map(c => ({
    id: c.id,
    tokens: tokenize((c.inputFixture?.prompt || '') + ' ' + (c.taskDescription || '')),
  }));

  for (const evalCase of evalDataset.cases) {
    const eTokens = tokenize((evalCase.inputFixture?.prompt || '') + ' ' + (evalCase.taskDescription || ''));
    for (const tCase of trainTokens) {
      const sim = jaccardSimilarity(eTokens, tCase.tokens);
      if (sim >= threshold) {
        violations.push(
          `BENCHMARK_LEAKAGE: Eval case "${evalCase.id}" leaks from training case "${tCase.id}" with similarity ${sim.toFixed(2)}.`
        );
      }
    }
  }

  return {
    leaked: violations.length > 0,
    violations,
  };
}

module.exports = {
  auditDatasetIntegrity,
  checkPartitionLeakage,
  tokenize,
  jaccardSimilarity,
};
