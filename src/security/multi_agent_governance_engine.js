'use strict';

/**
 * multi_agent_governance_engine.js — Multi-Agent Delegation & Trust Governance
 * ===========================================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Enforces cross-agent trust invariants:
 * 1. Privilege ceiling invariant: Subagents cannot inherit or acquire capabilities exceeding their delegator.
 * 2. Circular delegation detection: Prevents approval loops and runaway agent-to-agent recursion.
 * 3. Reviewer consensus integrity: Contradictory reviewer claims require human gate adjudication.
 * 4. Non-masking consensus invariant: A critical safety finding cannot be overridden by non-critical passes.
 */

/**
 * Audits a multi-agent delegation tree for privilege expansion and circular loops.
 *
 * @param {object} rootNode - Root agent node { id, role, capabilities: string[], delegates: object[] }
 * @returns {object} Delegation audit verdict
 */
function auditDelegationHierarchy(rootNode) {
  if (!rootNode || typeof rootNode !== 'object') {
    throw new Error('auditDelegationHierarchy requires a valid root agent node object.');
  }

  const visitedStack = [];
  const circularLoops = [];
  const privilegeExpansions = [];
  const findings = [];

  function traverse(node, parentCapabilities = null) {
    if (!node || !node.id) return;

    // Check for circular delegation loops
    if (visitedStack.includes(node.id)) {
      const loop = [...visitedStack.slice(visitedStack.indexOf(node.id)), node.id].join(' -> ');
      circularLoops.push(loop);
      findings.push({
        type: 'CIRCULAR_DELEGATION_LOOP',
        severity: 'CRITICAL',
        issue: `Circular delegation detected: ${loop}`,
      });
      return;
    }

    visitedStack.push(node.id);

    const nodeCaps = new Set(Array.isArray(node.capabilities) ? node.capabilities : []);

    // Check privilege ceiling against parent
    if (parentCapabilities !== null) {
      for (const cap of nodeCaps) {
        if (!parentCapabilities.has(cap) && !parentCapabilities.has('*')) {
          privilegeExpansions.push({
            parent: visitedStack[visitedStack.length - 2],
            child: node.id,
            unauthorizedCapability: cap,
          });
          findings.push({
            type: 'PRIVILEGE_EXPANSION_VIOLATION',
            severity: 'CRITICAL',
            issue: `Subagent "${node.id}" has capability "${cap}" which exceeds parent delegator bounds.`,
          });
        }
      }
    }

    // Recurse into child delegates
    const delegates = Array.isArray(node.delegates) ? node.delegates : [];
    for (const child of delegates) {
      traverse(child, nodeCaps);
    }

    visitedStack.pop();
  }

  traverse(rootNode, null);

  const isSafe = circularLoops.length === 0 && privilegeExpansions.length === 0;

  return {
    isSafe,
    totalAgentsAudited: visitedStack.length,
    circularLoops,
    privilegeExpansions,
    findings,
  };
}

/**
 * Audits reviewer findings and consensus across parallel specialist agents.
 *
 * @param {Array<object>} reviewerReports - Array of reports from reviewers { reviewer: string, findings: Array<object>, verdict: string }
 * @param {object} [options]
 * @returns {object} Consensus triage result
 */
function auditReviewerConsensus(reviewerReports, options = {}) {
  if (!Array.isArray(reviewerReports)) {
    throw new Error('auditReviewerConsensus expects an array of reviewer report objects.');
  }

  const allFindings = [];
  const criticalFindings = [];
  const contradictions = [];
  const unverifiedClaims = [];

  for (const report of reviewerReports) {
    const reviewerName = report.reviewer || 'unknown_reviewer';
    const findings = Array.isArray(report.findings) ? report.findings : [];

    for (const f of findings) {
      allFindings.push({ ...f, reportedBy: reviewerName });

      if (f.severity === 'CRITICAL' || f.severity === 'Critical') {
        criticalFindings.push({ ...f, reportedBy: reviewerName });
      }

      // Check for unverified assertions presented as verified without evidence
      if (f.status === 'VERIFIED' && (!f.evidence || f.evidence.length === 0)) {
        unverifiedClaims.push({
          findingId: f.id,
          reviewer: reviewerName,
          issue: 'Finding marked as VERIFIED without accompanying evidence array.',
        });
      }
    }
  }

  // Detect contradictory verdicts: e.g. one reviewer says PASS on auth, another says FAIL
  const passes = reviewerReports.filter(r => r.verdict === 'PASS' || r.verdict === 'APPROVED');
  const fails = reviewerReports.filter(r => r.verdict === 'FAIL' || r.verdict === 'REJECTED');

  if (passes.length > 0 && fails.length > 0) {
    contradictions.push({
      type: 'VERDICT_CONTRADICTION',
      passingReviewers: passes.map(p => p.reviewer),
      failingReviewers: fails.map(f => f.reviewer),
      issue: 'Reviewers disagree on pass/fail verdict; requires Zone 0 human adjudication.',
    });
  }

  // Enforce Non-Masking Consensus: Critical finding ALWAYS forces REJECTED_SAFETY_GATE
  let status = 'APPROVED';
  let consensusAllowed = true;

  if (criticalFindings.length > 0) {
    status = 'REJECTED_SAFETY_GATE';
    consensusAllowed = false;
  } else if (contradictions.length > 0) {
    status = 'REQUIRES_HUMAN_ADJUDICATION';
    consensusAllowed = false;
  }

  return {
    consensusAllowed,
    status,
    totalReviewers: reviewerReports.length,
    totalFindings: allFindings.length,
    criticalFindings,
    contradictions,
    unverifiedClaims,
    remediation: !consensusAllowed
      ? 'Critical findings or reviewer contradictions present. Awaiting Zone 0 Human Gate signoff.'
      : 'Consensus valid; no critical blockers identified.',
  };
}

module.exports = {
  auditDelegationHierarchy,
  auditReviewerConsensus,
};

