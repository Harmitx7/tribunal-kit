'use strict';

/**
 * index.js — System-1 Capability Suite for Tribunal Kit
 * =======================================================
 * Unified export interface for all five System-1 capability layers:
 *
 * 1. Evidence Intelligence (`evidence_engine.js`)
 * 2. Cross-Capability Decision Engine (`decision_engine.js`)
 * 3. Adaptive Reviewer Orchestration (`reviewer_orchestrator.js`)
 * 4. Self-Evolution Pipeline (`evolution_pipeline.js`)
 * 5. Browser / Interaction Intelligence (`browser_intelligence.js`)
 * + Laya Local ONNX Provider (`provider.js`)
 */

const { System1Provider, getLayaDir, getConfigPath } = require('./provider');
const {
  collectAndRankEvidence,
  extractChangedSymbols,
  extractBoundedSnippet,
  redactSecrets,
  TYPE_PRIORITY,
  SECURITY_BOUNDARIES,
} = require('./evidence_engine');
const {
  evaluateDecision,
  resolveMonotonicImpactTier,
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
  TIER_NAMES,
  ROUTING_NAMES,
} = require('./decision_engine');
const {
  orchestrateReviewers,
  detectRequiredDomains,
  REVIEWER_CATALOG,
} = require('./reviewer_orchestrator');
const {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  saveCandidate,
  loadCandidate,
  loadAllCandidates,
  getActiveEvolutionsPath,
  acquireEvolutionLock,
  releaseEvolutionLock,
  writeFileSyncAtomic,
  VALID_SOURCES,
  CANDIDATE_STATES,
} = require('./evolution_pipeline');
const { evaluateBrowserRequirement, extractAffectedRoutes } = require('./browser_intelligence');

module.exports = {
  // Provider
  System1Provider,
  getLayaDir,
  getConfigPath,

  // Capability 1: Evidence Intelligence
  collectAndRankEvidence,
  extractChangedSymbols,
  extractBoundedSnippet,
  redactSecrets,
  TYPE_PRIORITY,
  SECURITY_BOUNDARIES,

  // Capability 2: Decision Engine
  evaluateDecision,
  resolveMonotonicImpactTier,
  HIGH_RISK_PATTERNS,
  HIGH_RISK_EXTENSIONS,
  TIER_NAMES,
  ROUTING_NAMES,

  // Capability 3: Reviewer Orchestration
  orchestrateReviewers,
  detectRequiredDomains,
  REVIEWER_CATALOG,

  // Capability 4: Self-Evolution
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  saveCandidate,
  loadCandidate,
  loadAllCandidates,
  getActiveEvolutionsPath,
  acquireEvolutionLock,
  releaseEvolutionLock,
  writeFileSyncAtomic,
  VALID_SOURCES,
  CANDIDATE_STATES,

  // Capability 5: Browser Intelligence
  evaluateBrowserRequirement,
  extractAffectedRoutes,
};
