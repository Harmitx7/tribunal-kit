'use strict';

const {
  auditDelegationHierarchy,
  auditReviewerConsensus,
} = require('../../src/security');

describe('Multi-Agent Delegation & Trust Governance Engine', () => {
  test('validates safe hierarchical delegation with bounded capabilities', () => {
    const rootNode = {
      id: 'orchestrator-lead',
      capabilities: ['read_file', 'write_file', 'grep'],
      delegates: [
        {
          id: 'reviewer-subagent',
          capabilities: ['read_file', 'grep'],
          delegates: [],
        },
      ],
    };

    const audit = auditDelegationHierarchy(rootNode);
    expect(audit.isSafe).toBe(true);
    expect(audit.circularLoops.length).toBe(0);
    expect(audit.privilegeExpansions.length).toBe(0);
  });

  test('detects and blocks privilege expansion where subagent exceeds delegator', () => {
    const rootNode = {
      id: 'auditor-agent',
      capabilities: ['read_file', 'grep'],
      delegates: [
        {
          id: 'worker-subagent',
          capabilities: ['read_file', 'exec_shell'], // exec_shell exceeds auditor-agent!
          delegates: [],
        },
      ],
    };

    const audit = auditDelegationHierarchy(rootNode);
    expect(audit.isSafe).toBe(false);
    expect(audit.privilegeExpansions.length).toBe(1);
    expect(audit.privilegeExpansions[0].child).toBe('worker-subagent');
    expect(audit.privilegeExpansions[0].unauthorizedCapability).toBe('exec_shell');
  });

  test('detects circular delegation loops in agent topology', () => {
    const nodeA = { id: 'agent-A', capabilities: ['read_file'], delegates: [] };
    const nodeB = { id: 'agent-B', capabilities: ['read_file'], delegates: [] };
    // Form circular loop: A -> B -> A
    nodeA.delegates.push(nodeB);
    nodeB.delegates.push(nodeA);

    const audit = auditDelegationHierarchy(nodeA);
    expect(audit.isSafe).toBe(false);
    expect(audit.circularLoops.length).toBeGreaterThan(0);
    expect(audit.circularLoops[0]).toContain('agent-A -> agent-B -> agent-A');
  });

  test('enforces Non-Masking Safety Invariant during reviewer consensus', () => {
    const reports = [
      { reviewer: 'frontend-specialist', verdict: 'PASS', findings: [] },
      { reviewer: 'test-coverage-reviewer', verdict: 'PASS', findings: [] },
      {
        reviewer: 'security-auditor',
        verdict: 'FAIL',
        findings: [
          {
            id: 'SEC-CRIT-1',
            severity: 'CRITICAL',
            title: 'Unauthenticated Remote Execution Sink',
          },
        ],
      },
    ];

    const consensus = auditReviewerConsensus(reports);
    expect(consensus.consensusAllowed).toBe(false);
    expect(consensus.status).toBe('REJECTED_SAFETY_GATE');
    expect(consensus.criticalFindings.length).toBe(1);
  });

  test('flags contradictory pass/fail verdicts for Zone 0 human adjudication', () => {
    const reports = [
      { reviewer: 'schema-reviewer', verdict: 'PASS', findings: [] },
      {
        reviewer: 'logic-reviewer',
        verdict: 'FAIL',
        findings: [{ id: 'LOGIC-1', severity: 'MEDIUM', title: 'Edge case off-by-one' }],
      },
    ];

    const consensus = auditReviewerConsensus(reports);
    expect(consensus.consensusAllowed).toBe(false);
    expect(consensus.status).toBe('REQUIRES_HUMAN_ADJUDICATION');
    expect(consensus.contradictions.length).toBe(1);
  });

  test('flags unverified claims asserted without supporting evidence', () => {
    const reports = [
      {
        reviewer: 'hasty-reviewer',
        verdict: 'PASS',
        findings: [
          {
            id: 'UNV-1',
            status: 'VERIFIED',
            severity: 'LOW',
            title: 'Claimed verified without test execution or log',
            evidence: [], // Empty evidence!
          },
        ],
      },
    ];

    const consensus = auditReviewerConsensus(reports);
    expect(consensus.unverifiedClaims.length).toBe(1);
    expect(consensus.unverifiedClaims[0].findingId).toBe('UNV-1');
  });
});

