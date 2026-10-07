'use strict';

/**
 * Commands for Tribunal Intelligence (Phase 7U)
 */
const { CaseMemory } = require('../intelligence/case_memory');
const { CaseIndexer } = require('../intelligence/case_indexer');
const { CaseSimilarity } = require('../intelligence/case_similarity');
const { FailureIntelligence } = require('../intelligence/failure_intelligence');
const { RiskPredictionEngine } = require('../intelligence/risk_prediction_engine');
const { CaseBasedReasoningEngine } = require('../intelligence/cbr_engine');
const { ReviewerPerformance } = require('../intelligence/reviewer_performance');
const { GovernanceDriftDetector } = require('../intelligence/governance_drift_detector');
const { GovernanceSimulator } = require('../intelligence/governance_simulator');

function output(json, readableStr) {
  if (process.env.JSON_OUTPUT === '1') {
    console.log(JSON.stringify(json, null, 2));
  } else {
    console.log(readableStr);
  }
}

async function cmdIntelligence(subcommand, argsArray) {
  const mem = new CaseMemory();
  const idx = new CaseIndexer();

  switch (subcommand) {
    case 'cases': {
      // Output format supports human readable and JSON
      const out = '';
      const allIds = Array.from(idx.listCaseIds());
      output(allIds, `Total cases stored: ${allIds.length}`);
      break;
    }
    case 'case': {
      const id = argsArray[0];
      if (!id) return console.error('Missing ID');
      const data = mem.getCase(id);
      output(data, JSON.stringify(data, null, 2));
      break;
    }
    case 'failures': {
      const fi = new FailureIntelligence({ memory: mem, indexer: idx });
      // Stub generic invocation
      const val = argsArray[0];
      const pattern = fi.detectFailurePattern('FILE', val || 'UNKNOWN');
      output(pattern, JSON.stringify(pattern, null, 2));
      break;
    }
    case 'reviewer-stats': {
      const rp = new ReviewerPerformance({ memory: mem, indexer: idx });
      const name = argsArray[0];
      if (!name) return console.error('Missing reviewer name');
      const stats = rp.getReviewerStats(name);
      output(stats, JSON.stringify(stats, null, 2));
      break;
    }
    case 'governance-drift': {
      const gdd = new GovernanceDriftDetector({ memory: mem, indexer: idx });
      const drift = gdd.detectDrift();
      output(drift, JSON.stringify(drift, null, 2));
      break;
    }
    case 'simulate-policy': {
      const sim = new GovernanceSimulator({ memory: mem, indexer: idx });
      // Quick hardcoded policy test
      const result = sim.simulatePolicy({ maxReviewers: 1 });
      output(result, JSON.stringify(result, null, 2));
      break;
    }
    case 'review-plan': {
      const cbr = new CaseBasedReasoningEngine();
      const file = argsArray[0] || 'src/index.js';
      const plan = cbr.generateReviewPlan({ files: [file], impactTier: 2, task: 'Test plan' });
      output(plan, JSON.stringify(plan, null, 2));
      break;
    }
    default:
      console.log(
        'Available commands: cases, case, failures, reviewer-stats, governance-drift, simulate-policy, review-plan',
      );
  }
}

module.exports = { cmdIntelligence };
