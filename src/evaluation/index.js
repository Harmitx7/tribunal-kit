'use strict';

/**
 * src/evaluation/index.js — Unified AI Reliability & Evaluation Interface
 * ======================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 */

const schemas = require('./evaluation_schemas');
const metrics = require('./reliability_metrics_engine');
const datasetAuditor = require('./dataset_integrity_auditor');
const hallucinationAuditor = require('./hallucination_detection_auditor');
const regressionEvaluator = require('./llm_regression_evaluator');
const behavioralEngine = require('./agent_behavioral_testing_engine');
const methodologyAuditor = require('./evaluation_methodology_auditor');
const statisticalEvaluator = require('./statistical_evaluator');
const benchmarkOracle = require('./benchmark_oracle');
const worktreeSandbox = require('./worktree_sandbox');
const invariantVerifier = require('./invariant_verifier');

module.exports = {
  ...schemas,
  ...metrics,
  ...datasetAuditor,
  ...hallucinationAuditor,
  ...regressionEvaluator,
  ...behavioralEngine,
  ...methodologyAuditor,
  ...statisticalEvaluator,
  ...benchmarkOracle,
  ...worktreeSandbox,
  ...invariantVerifier,
};
