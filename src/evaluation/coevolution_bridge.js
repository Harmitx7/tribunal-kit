'use strict';

/**
 * coevolution_bridge.js — Co-Evolution Bridge between EvalOpt and SkillOpt
 * =========================================================================
 * Binds adversarial red-team discoveries to the continuous learning cycle:
 * 1. Automatically maps breaking vulnerabilities into Negative CBR Memory
 *    (recordRejection) to prevent regressions in SkillOpt v2.
 * 2. Stages certified hardened scenarios in .tribunal/evals/candidate_scenarios.json.
 * 3. Enforces Human Gate promotion of candidate benchmark scenarios.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { recordRejection } = require('../evolution/negative_memory');

function getCandidateFilePath(tribunalDir) {
  return path.join(tribunalDir, 'evals', 'candidate_scenarios.json');
}

/**
 * Records an adversarial vulnerability directly into Negative CBR memory.
 */
function recordAdversarialFinding(agentDir, targetName, finding = {}) {
  const payloadStr =
    typeof finding.payload === 'object'
      ? JSON.stringify(finding.payload)
      : String(finding.payload !== undefined ? finding.payload : '');
  const reason =
    finding.reason || 'Adversarial vulnerability discovered during red-team evaluation';

  return recordRejection(
    agentDir,
    targetName,
    0, // epoch 0 designates external adversarial red-team finding
    [
      {
        op: 'adversarial_fuzz',
        category: finding.category || 'UNKNOWN',
        content: payloadStr,
      },
    ],
    reason,
  );
}

/**
 * Stages a certified adversarial scenario awaiting Human Gate authorization.
 */
function stageCandidateScenario(tribunalDir, candidateScenario, proof = {}) {
  const evalsDir = path.join(tribunalDir, 'evals');
  if (!fs.existsSync(evalsDir)) {
    fs.mkdirSync(evalsDir, { recursive: true });
  }

  const filePath = getCandidateFilePath(tribunalDir);
  let candidates = [];
  if (fs.existsSync(filePath)) {
    try {
      candidates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      candidates = [];
    }
  }

  const candidateId = `ADV-SCENARIO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const record = {
    candidateId,
    scenarioId: candidateScenario.scenarioId,
    parentScenarioId: candidateScenario.parentScenarioId,
    category: candidateScenario.category,
    mutationPayload: candidateScenario.mutationPayload,
    verificationCommand: candidateScenario.verificationCommand,
    proof,
    status: 'STAGED',
    stagedAt: new Date().toISOString(),
    promotedAt: null,
  };

  candidates.push(record);
  fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2), 'utf8');
  return record;
}

/**
 * Loads all staged candidate scenarios from .tribunal/evals/
 */
function loadCandidateScenarios(tribunalDir) {
  const filePath = getCandidateFilePath(tribunalDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return [];
  }
}

/**
 * Promotes a candidate scenario after Human Gate approval.
 */
function promoteCandidateScenario(tribunalDir, candidateId) {
  const filePath = getCandidateFilePath(tribunalDir);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Candidate scenarios file not found in ${tribunalDir}`);
  }

  const candidates = loadCandidateScenarios(tribunalDir);
  const target = candidates.find(c => c.candidateId === candidateId);
  if (!target) {
    throw new Error(`Candidate scenario with id ${candidateId} not found.`);
  }

  target.status = 'PROMOTED';
  target.promotedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2), 'utf8');
  return target;
}

module.exports = {
  recordAdversarialFinding,
  stageCandidateScenario,
  loadCandidateScenarios,
  promoteCandidateScenario,
};
