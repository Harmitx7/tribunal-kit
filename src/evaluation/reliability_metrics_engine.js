'use strict';

/**
 * reliability_metrics_engine.js — AI Reliability, Metrics & Calibration Engine
 * ============================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Provides mathematically rigorous implementations of:
 * 1. Confusion Matrix, Precision, Recall, Specificity, F1, FPR, FNR
 * 2. Probabilistic Calibration: Brier Score, Expected Calibration Error (ECE)
 * 3. Overconfidence / Underconfidence Detection
 * 4. Inter-Reviewer Consistency: Observed Agreement, Cohen's Kappa, Fleiss' Kappa
 *
 * Invariant: Guaranteed safe division with explicit denominator tracking.
 */

/**
 * Calculates a binary confusion matrix and associated classification metrics.
 *
 * @param {Array<{ predicted: string|boolean, actual: string|boolean }>} pairs
 * @param {object} [options]
 * @param {string|boolean} [options.positiveLabel=true]
 * @returns {object} Full metrics object
 */
function calculateConfusionMatrix(pairs, options = {}) {
  const positiveLabel = options.positiveLabel !== undefined ? options.positiveLabel : true;

  if (!Array.isArray(pairs)) {
    throw new Error('calculateConfusionMatrix expects an array of prediction-actual pairs.');
  }

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const item of pairs) {
    const isPredPos = item.predicted === positiveLabel || String(item.predicted).toLowerCase() === String(positiveLabel).toLowerCase();
    const isActualPos = item.actual === positiveLabel || String(item.actual).toLowerCase() === String(positiveLabel).toLowerCase();

    if (isPredPos && isActualPos) tp++;
    else if (isPredPos && !isActualPos) fp++;
    else if (!isPredPos && !isActualPos) tn++;
    else if (!isPredPos && isActualPos) fn++;
  }

  const total = tp + fp + tn + fn;
  const precisionDenominator = tp + fp;
  const recallDenominator = tp + fn;
  const specificityDenominator = tn + fp;

  const precision = precisionDenominator > 0 ? tp / precisionDenominator : 0;
  const recall = recallDenominator > 0 ? tp / recallDenominator : 0;
  const specificity = specificityDenominator > 0 ? tn / specificityDenominator : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = specificityDenominator > 0 ? fp / specificityDenominator : 0;
  const fnr = recallDenominator > 0 ? fn / recallDenominator : 0;
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  return {
    counts: { tp, fp, tn, fn, total },
    denominators: {
      precision: precisionDenominator,
      recall: recallDenominator,
      specificity: specificityDenominator,
    },
    metrics: {
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      specificity: Math.round(specificity * 10000) / 10000,
      f1: Math.round(f1 * 10000) / 10000,
      fpr: Math.round(fpr * 10000) / 10000,
      fnr: Math.round(fnr * 10000) / 10000,
      accuracy: Math.round(accuracy * 10000) / 10000,
    },
    zeroDenominatorFlags: {
      precision: precisionDenominator === 0,
      recall: recallDenominator === 0,
      specificity: specificityDenominator === 0,
    },
  };
}

/**
 * Calculates Brier score for probabilistic predictions against binary outcomes.
 *
 * @param {Array<{ probability: number, outcome: number|boolean }>} items
 * @returns {{ brierScore: number, sampleSize: number }}
 */
function calculateBrierScore(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { brierScore: 0, sampleSize: 0 };
  }

  let squaredDiffSum = 0;
  let validCount = 0;

  for (const item of items) {
    const prob = Number(item.probability);
    if (isNaN(prob) || prob < 0 || prob > 1) {
      throw new Error(`Invalid probability value: ${item.probability}. Must be in [0, 1].`);
    }

    const actual = (item.outcome === 1 || item.outcome === true || String(item.outcome).toLowerCase() === 'true') ? 1 : 0;
    squaredDiffSum += Math.pow(prob - actual, 2);
    validCount++;
  }

  const brier = validCount > 0 ? squaredDiffSum / validCount : 0;
  return {
    brierScore: Math.round(brier * 10000) / 10000,
    sampleSize: validCount,
  };
}

/**
 * Calculates Expected Calibration Error (ECE) across M uniform probability bins.
 *
 * @param {Array<{ confidence: number, correct: boolean|number }>} predictions
 * @param {number} [numBins=10]
 * @returns {object} ECE, bins, and overconfidence/underconfidence diagnostics
 */
function calculateExpectedCalibrationError(predictions, numBins = 10) {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { ece: 0, sampleSize: 0, bins: [], diagnosis: 'NO_DATA' };
  }

  const n = predictions.length;
  const bins = Array.from({ length: numBins }, (_, idx) => ({
    binIndex: idx,
    range: [idx / numBins, (idx + 1) / numBins],
    count: 0,
    confSum: 0,
    correctCount: 0,
  }));

  for (const item of predictions) {
    const conf = Number(item.confidence);
    if (isNaN(conf) || conf < 0 || conf > 1) {
      throw new Error(`Invalid confidence value: ${item.confidence}. Must be in [0, 1].`);
    }

    const isCorrect = item.correct === true || item.correct === 1;
    let binIdx = Math.floor(conf * numBins);
    if (binIdx >= numBins) binIdx = numBins - 1; // upper edge 1.0

    bins[binIdx].count++;
    bins[binIdx].confSum += conf;
    if (isCorrect) bins[binIdx].correctCount++;
  }

  let weightedEceSum = 0;
  let overconfidentBins = 0;
  let underconfidentBins = 0;

  const binResults = bins.map(b => {
    if (b.count === 0) {
      return {
        range: b.range,
        count: 0,
        avgConfidence: 0,
        accuracy: 0,
        diff: 0,
      };
    }

    const avgConf = b.confSum / b.count;
    const accuracy = b.correctCount / b.count;
    const diff = Math.abs(accuracy - avgConf);
    weightedEceSum += (b.count / n) * diff;

    // Diagnose calibration anomalies in high & low confidence brackets
    if (avgConf >= 0.7 && (avgConf - accuracy) > 0.15) overconfidentBins++;
    if (avgConf <= 0.4 && (accuracy - avgConf) > 0.15) underconfidentBins++;

    return {
      range: b.range,
      count: b.count,
      avgConfidence: Math.round(avgConf * 10000) / 10000,
      accuracy: Math.round(accuracy * 10000) / 10000,
      diff: Math.round(diff * 10000) / 10000,
    };
  });

  let diagnosis = 'WELL_CALIBRATED';
  if (overconfidentBins > 0) diagnosis = 'OVERCONFIDENT';
  else if (underconfidentBins > 0) diagnosis = 'UNDERCONFIDENT';

  return {
    ece: Math.round(weightedEceSum * 10000) / 10000,
    sampleSize: n,
    numBins,
    bins: binResults,
    diagnosis,
  };
}

/**
 * Calculates Cohen's Kappa for inter-rater agreement between two reviewers.
 *
 * @param {Array<{ raterA: string, raterB: string }>} ratings - Array of paired category decisions
 * @returns {{ kappa: number, observedAgreement: number, expectedAgreement: number, sampleSize: number }}
 */
function calculateCohensKappa(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return { kappa: 0, observedAgreement: 0, expectedAgreement: 0, sampleSize: 0 };
  }

  const n = ratings.length;
  const categories = Array.from(new Set(ratings.flatMap(r => [String(r.raterA), String(r.raterB)])));

  let agreeCount = 0;
  const countA = {};
  const countB = {};

  categories.forEach(cat => {
    countA[cat] = 0;
    countB[cat] = 0;
  });

  for (const r of ratings) {
    const a = String(r.raterA);
    const b = String(r.raterB);
    if (a === b) agreeCount++;
    countA[a] = (countA[a] || 0) + 1;
    countB[b] = (countB[b] || 0) + 1;
  }

  const po = agreeCount / n;
  let pe = 0;
  for (const cat of categories) {
    pe += (countA[cat] / n) * (countB[cat] / n);
  }

  if (pe === 1) {
    return { kappa: 1, observedAgreement: 1, expectedAgreement: 1, sampleSize: n };
  }

  const kappa = (po - pe) / (1 - pe);
  return {
    kappa: Math.round(kappa * 10000) / 10000,
    observedAgreement: Math.round(po * 10000) / 10000,
    expectedAgreement: Math.round(pe * 10000) / 10000,
    sampleSize: n,
  };
}

/**
 * Calculates Fleiss' Kappa for inter-rater agreement across 3+ raters.
 *
 * @param {Array<Record<string, number>>} matrix - Array where each row represents an item,
 *   and each key is a category with value = count of raters who picked that category.
 * @returns {{ kappa: number, sampleSize: number, ratersPerItem: number }}
 */
function calculateFleissKappa(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { kappa: 0, sampleSize: 0, ratersPerItem: 0 };
  }

  const N = matrix.length;
  // Get all unique categories across rows
  const allCategories = Array.from(new Set(matrix.flatMap(row => Object.keys(row))));
  const k = allCategories.length;

  if (k <= 1) {
    return { kappa: 1.0, sampleSize: N, ratersPerItem: Object.values(matrix[0])[0] || 0 };
  }

  // Determine n (raters per item) from the first row
  const n = Object.values(matrix[0]).reduce((sum, v) => sum + v, 0);
  if (n <= 1) {
    throw new Error('Fleiss Kappa requires at least 2 raters per item.');
  }

  // Compute p_j (proportion of all assignments to the j-th category)
  const categoryCounts = {};
  allCategories.forEach(cat => { categoryCounts[cat] = 0; });

  for (const row of matrix) {
    for (const cat of allCategories) {
      categoryCounts[cat] += (row[cat] || 0);
    }
  }

  const totalAssignments = N * n;
  const pj = {};
  let pe = 0;
  for (const cat of allCategories) {
    const prop = categoryCounts[cat] / totalAssignments;
    pj[cat] = prop;
    pe += prop * prop;
  }

  // Compute P_i for each subject
  let piSum = 0;
  for (const row of matrix) {
    let sumSquares = 0;
    for (const cat of allCategories) {
      const count = row[cat] || 0;
      sumSquares += count * count;
    }
    const pi = (sumSquares - n) / (n * (n - 1));
    piSum += pi;
  }

  const pbar = piSum / N;
  if (pe === 1) {
    return { kappa: 1.0, sampleSize: N, ratersPerItem: n };
  }

  const kappa = (pbar - pe) / (1 - pe);
  return {
    kappa: Math.round(kappa * 10000) / 10000,
    observedAgreement: Math.round(pbar * 10000) / 10000,
    expectedAgreement: Math.round(pe * 10000) / 10000,
    sampleSize: N,
    ratersPerItem: n,
  };
}

module.exports = {
  calculateConfusionMatrix,
  calculateBrierScore,
  calculateExpectedCalibrationError,
  calculateCohensKappa,
  calculateFleissKappa,
};
