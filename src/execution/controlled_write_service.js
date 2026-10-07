'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const TransactionManager = require('./transaction_manager');
const { WritePolicyEngine } = require('./write_policy_engine');
const { evaluateDecision } = require('../system1/decision_engine');
const { ReviewExecutor } = require('./review_executor');
const { VerdictAggregator } = require('./verdict_aggregator');

function computeSha256(data) {
  return crypto
    .createHash('sha256')
    .update(data || '', 'utf8')
    .digest('hex');
}

const { AgentCorrectionEngine } = require('./agent_correction_engine');

class ControlledWriteService {
  constructor(options = {}) {
    this.txManager =
      options.txManager ||
      new TransactionManager({ workspace: options.workspaceRoot || process.cwd() });
    this.policyEngine = options.policyEngine || new WritePolicyEngine();
    this.reviewExecutor =
      options.reviewExecutor ||
      new ReviewExecutor({ repoRoot: options.workspaceRoot || process.cwd() });
    this.correctionEngine = options.correctionEngine || new AgentCorrectionEngine();
    this.workspaceRoot = options.workspaceRoot || process.cwd();

    // In-memory store for write requests and tokens
    this.activeRequests = new Map();
  }

  _validateRequest(req) {
    if (!req.workspaceId) throw new Error('Missing workspaceId');
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0)
      throw new Error('Missing files array');

    // Normalize and validate paths
    for (const f of req.files) {
      if (!['CREATE', 'MODIFY', 'DELETE'].includes(f.operation)) {
        throw new Error(`Unknown operation: ${f.operation}`);
      }
      if (!f.path) throw new Error('File path missing');

      const fullPath = path.resolve(this.workspaceRoot, f.path);
      if (!fullPath.startsWith(this.workspaceRoot)) {
        throw new Error(`Path outside workspace: ${f.path}`);
      }
      f.fullPath = fullPath;
    }
  }

  _computeProposalHash(files) {
    // Sort files by path for deterministic hash
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
    const parts = sorted.map(f => `${f.path}:${f.operation}:${computeSha256(f.content || '')}`);
    return computeSha256(parts.join('|'));
  }

  async requestWrite(req, options = {}) {
    this._validateRequest(req);
    const dryRun = options.dryRun || false;

    const filePaths = req.files.map(f => f.path);
    const lines = req.files.reduce(
      (acc, f) => acc + (f.content ? f.content.split('\n').length : 0),
      0,
    );
    const proposalHash = this._computeProposalHash(req.files);

    // 1. Path Validation & Evidence Collection (via evaluateDecision)
    // 2. Impact Classification & Reviewer Selection
    const decision = evaluateDecision({
      task: req.reason || 'Agent requested write',
      files: filePaths,
      lines,
      repoRoot: this.workspaceRoot,
    });

    // 3. Write Policy Engine
    const policyResult = this.policyEngine.evaluate(req, decision);

    // 4. Execute Review if needed
    let reviewResults = [];
    let reviewRunId = null;
    let verdict = null;

    if (policyResult.action === 'REVIEW_REQUIRED' || policyResult.action === 'DENY') {
      const reviewReq = {
        decision,
        code: req.files.map(f => `// ${f.path}\n${f.content || ''}`).join('\n\n'),
        task: req.reason,
      };

      const res = await this.reviewExecutor.executeReview(reviewReq);
      reviewResults = res.results;
      reviewRunId = res.reviewRunId;

      // 5. Deterministic Verdict
      const aggregated = VerdictAggregator.aggregate({
        results: reviewResults,
        tier: decision.tier,
        decision,
        reviewRunId,
      });
      verdict = aggregated;
    } else {
      // Tier 0 ALLOW
      verdict = {
        verdict: 'APPROVED',
        severity: 'INFO',
        reason: 'Tier 0 Fast-Pass Policy ALLOW',
      };
    }

    const isApproved = verdict.verdict === 'APPROVED' || verdict.verdict === 'WARNING';

    let status = isApproved ? 'PENDING_COMMIT' : 'REJECTED';
    let requiresHumanApproval = policyResult.requiresHumanApproval;

    if (status === 'REJECTED') {
      requiresHumanApproval = false; // Cannot approve a rejected AI review
    } else if (requiresHumanApproval) {
      status = 'HUMAN_APPROVAL_REQUIRED';
    }

    let correction = null;
    if (status === 'REJECTED') {
      correction = this.correctionEngine.generateCorrection(req, verdict, policyResult);
    }

    const token = `tok_${crypto.randomBytes(8).toString('hex')}`;
    const txId = `tx_${crypto.randomBytes(8).toString('hex')}`;

    const state = {
      token,
      transactionId: txId,
      request: req,
      decision,
      policyResult,
      verdict,
      proposalHash,
      status,
      correction,
      requiresHumanApproval,
      humanApproval: null,
      provenance: {
        requestHash: computeSha256(JSON.stringify(req)),
        proposalHash,
        decisionHash: computeSha256(JSON.stringify(decision)),
        reviewRunId,
      },
      timestamp: Date.now(),
    };

    if (!dryRun) {
      this.activeRequests.set(token, state);
    }

    if (dryRun) {
      return {
        requestId: req.requestId,
        status: 'NOT EXECUTED - DRY RUN',
        verdict: verdict.verdict,
        policy: policyResult.action,
        impact: decision.tier_name,
        files: filePaths,
        correction,
      };
    }

    // If APPROVED and no human approval needed, we can auto-commit if the API flow expects it,
    // but the prompt implies we might want to return the token for commit.
    // Let's just return the state so caller can commit.
    return {
      requestId: req.requestId,
      transactionId: txId,
      token,
      status,
      verdict: verdict.verdict,
      files: filePaths,
      correction,
      provenance: state.provenance,
    };
  }

  previewWrite(token) {
    const state = this.activeRequests.get(token);
    if (!state) throw new Error('Invalid or expired token');

    return {
      files: state.request.files.map(f => ({ path: f.path, operation: f.operation })),
      impactTier: state.decision.tier_name,
      policyDecision: state.policyResult.action,
      approvalRequirements: state.requiresHumanApproval ? 'HUMAN_APPROVAL_REQUIRED' : 'NONE',
      verdict: state.verdict.verdict,
      findings: state.verdict.findings || [],
    };
  }

  approveWrite(token, approverId, signature) {
    const state = this.activeRequests.get(token);
    if (!state) throw new Error('Invalid or expired token');

    if (state.status !== 'HUMAN_APPROVAL_REQUIRED') {
      throw new Error('Approval not required or already approved/rejected');
    }

    state.humanApproval = {
      approverId,
      signature,
      timestamp: Date.now(),
    };

    state.status = 'PENDING_COMMIT';
    return { status: state.status };
  }

  async commitWrite(token) {
    const state = this.activeRequests.get(token);
    if (!state) throw new Error('Invalid or expired token');

    if (state.status === 'REJECTED') {
      throw new Error('Cannot commit a REJECTED write');
    }
    if (state.status === 'HUMAN_APPROVAL_REQUIRED') {
      throw new Error('Cannot commit: HUMAN_APPROVAL_REQUIRED');
    }

    // TOCTOU Protection
    // 1. Verify hash binds
    const currentProposalHash = this._computeProposalHash(state.request.files);
    if (currentProposalHash !== state.proposalHash) {
      state.status = 'STALE_REVIEW';
      throw new Error('STALE_REVIEW: The requested files or content have changed since review.');
    }

    // 2. Lock and Validate File existence & Original hashes if any
    try {
      this.txManager.begin();

      // Prepare
      for (const f of state.request.files) {
        if (f.operation === 'CREATE') {
          if (fs.existsSync(f.fullPath)) {
            throw new Error(`CONFLICT: File already exists: ${f.path}`);
          }
          this.txManager.prepareWrite(f.path, f.content);
        } else if (f.operation === 'MODIFY') {
          if (!fs.existsSync(f.fullPath)) {
            throw new Error(`CONFLICT: File does not exist: ${f.path}`);
          }
          if (f.expectedHash) {
            const actual = computeSha256(fs.readFileSync(f.fullPath, 'utf8'));
            if (actual !== f.expectedHash) {
              throw new Error(`CONFLICT: Hash mismatch for ${f.path}`);
            }
          }
          this.txManager.prepareWrite(f.path, f.content);
        } else if (f.operation === 'DELETE') {
          if (!fs.existsSync(f.fullPath)) {
            throw new Error(`CONFLICT: File does not exist: ${f.path}`);
          }
          this.txManager.prepareDelete(f.path);
        }
      }

      // Validate & Commit
      const txId = this.txManager.activeTxId;
      this.txManager.validate();
      this.txManager.commit();

      state.status = 'COMMITTED';
      this.activeRequests.delete(token); // cleanup

      return {
        requestId: state.request.requestId,
        transactionId: txId,
        status: 'COMMITTED',
        verdict: state.verdict.verdict,
        files: state.request.files.map(f => f.path),
        provenance: state.provenance,
      };
    } catch (err) {
      if (this.txManager.state !== 'IDLE' && this.txManager.state !== 'ROLLED_BACK') {
        this.txManager.rollback();
      }
      state.status = 'ERROR';
      throw err;
    }
  }
}

module.exports = {
  ControlledWriteService,
  computeSha256,
};
