'use strict';

const crypto = require('crypto');
const { AgentCorrectionEngine } = require('./agent_correction_engine');
const { ControlledWriteService } = require('./controlled_write_service');
const { FindingDiffEngine } = require('./finding_diff_engine');
const { CorrectionVerifier } = require('./correction_verifier');
const { ResolutionPolicy } = require('./resolution_policy');
const { ResolutionCertificate } = require('./resolution_certificate');

function computeFingerprint(obj) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(obj || {}))
    .digest('hex');
}

/**
 * Phase 5B: Correction Run Engine
 * Orchestrates the closed-loop verification and adaptive governance pipeline.
 */
class CorrectionRunEngine {
  constructor(options = {}) {
    this.controlledWriteService = options.controlledWriteService || new ControlledWriteService();
    this.correctionEngine = options.correctionEngine || new AgentCorrectionEngine();
    this.findingDiffEngine = options.findingDiffEngine || new FindingDiffEngine();
    this.correctionVerifier = options.correctionVerifier || new CorrectionVerifier();

    // Limits
    this.maxIterations = options.maxIterations || 3;
    this.activeRuns = new Map();
  }

  createRun(finding, initialRequest, originalVerdict) {
    const runId = `CR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const runState = {
      runId,
      finding,
      initialRequest,
      originalVerdict,
      state: 'INITIALIZED',
      iteration: 0,
      history: [],
      // Loop control fingerprints
      fingerprints: {
        proposals: new Set(),
      },
      budget: {
        maxIterations: this.maxIterations,
      },
    };
    this.activeRuns.set(runId, runState);
    return runId;
  }

  _transition(runState, nextState) {
    const validTransitions = {
      INITIALIZED: ['ANALYZING', 'ABORTED'],
      ANALYZING: ['PLAN_READY', 'ESCALATED', 'ABORTED'],
      PLAN_READY: ['GOVERNANCE_PENDING', 'ESCALATED', 'ABORTED'],
      GOVERNANCE_PENDING: ['CORRECTION_APPLIED', 'ESCALATED', 'ABORTED'],
      CORRECTION_APPLIED: ['VERIFYING', 'ABORTED'],
      VERIFYING: ['RE_REVIEWING', 'ESCALATED', 'ABORTED'],
      RE_REVIEWING: ['COMPARING', 'ABORTED'],
      COMPARING: ['RESOLVED', 'PARTIALLY_RESOLVED', 'UNRESOLVED', 'ANALYZING', 'ESCALATED'],
      RESOLVED: [],
      PARTIALLY_RESOLVED: ['ANALYZING', 'ESCALATED'],
      UNRESOLVED: ['ANALYZING', 'ESCALATED'],
      ESCALATED: [],
      ABORTED: [],
    };

    if (!validTransitions[runState.state].includes(nextState)) {
      throw new Error(`Invalid state transition: ${runState.state} -> ${nextState}`);
    }
    runState.state = nextState;
  }

  /**
   * Plans the correction for a specific finding. (Phase 5C & 5E)
   */
  async planCorrection(runId, proposalContext) {
    const runState = this.activeRuns.get(runId);
    if (!runState) throw new Error('Invalid runId');

    this._transition(runState, 'ANALYZING');

    if (runState.iteration >= runState.budget.maxIterations) {
      runState.escalationReason = 'Correction budget exhausted.';
      this._transition(runState, 'ESCALATED');
      return { status: runState.state, reason: runState.escalationReason };
    }

    runState.iteration++;

    // Call the AgentCorrectionEngine to build the enhanced plan
    const plan = this.correctionEngine.generateEnhancedPlan(runState.finding, proposalContext);

    const proposalFingerprint = computeFingerprint(plan);
    if (runState.fingerprints.proposals.has(proposalFingerprint)) {
      runState.escalationReason = 'LOOP_DETECTED: Identical correction proposal generated.';
      this._transition(runState, 'ESCALATED');
      return { status: runState.state, reason: runState.escalationReason };
    }
    runState.fingerprints.proposals.add(proposalFingerprint);

    runState.currentPlan = plan;
    this._transition(runState, 'PLAN_READY');
    return { status: runState.state, plan };
  }

  /**
   * Submits a planned correction via the ControlledWriteService (Phase 5B, 5T).
   */
  async executeCorrection(runId, proposedFiles) {
    const runState = this.activeRuns.get(runId);
    if (!runState) throw new Error('Invalid runId');
    if (runState.state !== 'PLAN_READY')
      throw new Error(`Cannot execute in state: ${runState.state}`);

    this._transition(runState, 'GOVERNANCE_PENDING');

    // Hash binding for STALE_CORRECTION check (Phase 5P, 5Q)
    runState.proposalHash = computeFingerprint(proposedFiles);

    const writeReq = {
      workspaceId: runState.initialRequest.workspaceId || 'ws_1',
      requestId: `REQ-${runId}-ITER-${runState.iteration}`,
      files: proposedFiles,
      reason: `Correction run ${runId} - ${runState.currentPlan.objective}`,
    };

    const writeResponse = await this.controlledWriteService.requestWrite(writeReq);

    if (writeResponse.status === 'REJECTED') {
      runState.escalationReason = 'Correction write request was REJECTED by governance.';
      this._transition(runState, 'ESCALATED');
      return {
        status: runState.state,
        reason: runState.escalationReason,
        feedback: writeResponse.correction,
      };
    }

    // Automatically commit if approved for the correction loop
    if (writeResponse.status === 'PENDING_COMMIT') {
      await this.controlledWriteService.commitWrite(writeResponse.token);
      this._transition(runState, 'CORRECTION_APPLIED');
      runState.transactionId = writeResponse.transactionId;
      runState.reviewRunId = writeResponse.provenance?.reviewRunId;
      return { status: runState.state, transactionId: writeResponse.transactionId };
    }

    runState.escalationReason = `Unexpected write status: ${writeResponse.status}`;
    this._transition(runState, 'ESCALATED');
    return { status: runState.state, reason: runState.escalationReason };
  }

  /**
   * Verifies the correction (Phase 5F, 5G, 5I) and checks for regressions (Phase 5M).
   */
  async verifyCorrection(runId, newVerdictFindings = []) {
    const runState = this.activeRuns.get(runId);
    if (!runState) throw new Error('Invalid runId');
    if (runState.state !== 'CORRECTION_APPLIED')
      throw new Error(`Cannot verify in state: ${runState.state}`);

    this._transition(runState, 'VERIFYING');

    // 1. Run Verification Plan and targeted reviews (Phase 6F, 6G)
    // Now returns an EvidenceAggregator instance
    const aggregator = await this.correctionVerifier.verify(runState.finding, runState.currentPlan);

    this._transition(runState, 'RE_REVIEWING');

    this._transition(runState, 'COMPARING');

    const diff = this.findingDiffEngine.compare([runState.finding], newVerdictFindings);
    runState.diff = diff;

    // Add regression evidence
    if (diff.regressed.length > 0 || diff.new.some(f => f.severity === 'CRITICAL')) {
      aggregator.addEvidence({
        type: 'REGRESSION',
        source: 'FindingDiffEngine',
        status: 'FAILED',
        details: { regressed: diff.regressed, newCritical: diff.new },
      });
    } else {
      aggregator.addEvidence({
        type: 'REGRESSION',
        source: 'FindingDiffEngine',
        status: 'PASSED',
        details: { resolved: diff.resolved },
      });
    }

    // 2. Evaluate Resolution Policy (Phase 6K, 6L)
    const policyResult = ResolutionPolicy.evaluate(runState.finding.category, aggregator);

    if (policyResult.status === 'RESOLVED') {
      this._transition(runState, 'RESOLVED');
    } else if (policyResult.status === 'UNRESOLVED' || policyResult.status === 'ESCALATED') {
      runState.escalationReason = policyResult.reason;
      this._transition(runState, 'ESCALATED');
    }

    // 3. Generate Resolution Certificate (Phase 6N, 6O)
    const certificate = ResolutionCertificate.generate({
      runId,
      findingFingerprint: runState.finding.id,
      originalRepositoryFingerprint: 'mock-repo-hash',
      correctedRepositoryFingerprint: 'mock-repo-hash',
      proposalHash: runState.proposalHash,
      reviewHash: runState.reviewRunId || 'no-review-hash',
      transactionHash: runState.transactionId || 'no-tx-hash',
      aggregator,
      diff,
      finalVerdict: runState.state,
    });

    runState.certificate = certificate;

    return {
      status: runState.state,
      diff,
      evidence: aggregator.getAllEvidence(),
      certificate,
      reason: runState.escalationReason,
    };
  }
}

module.exports = { CorrectionRunEngine, computeFingerprint };
