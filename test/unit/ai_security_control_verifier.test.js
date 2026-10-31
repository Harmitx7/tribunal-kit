'use strict';

const {
  SecurityControlSchema,
  assertWithinRoot,
  isProhibitedIp,
  scanForPromptInjection,
  auditCommandSafety,
  auditToolPermissions,
  scanForDataLeakage,
  auditReviewerConsensus,
} = require('../../src/security');

describe('AI Security Control Verifier', () => {
  // Test mapping of 16 canonical controls to executable checks
  const CANONICAL_CONTROLS = [
    { id: 'CTRL-01', threat: 'THREAT-01', name: 'Prompt Injection Smuggler Detector' },
    { id: 'CTRL-02', threat: 'THREAT-02', name: 'Untrusted Content Isolator' },
    { id: 'CTRL-03', threat: 'THREAT-03', name: 'Least Privilege Wildcard Filter' },
    { id: 'CTRL-04', threat: 'THREAT-04', name: 'Filesystem & Network Boundary Enforcer' },
    { id: 'CTRL-05', threat: 'THREAT-05', name: 'Canary & Secret Leakage Auditor' },
    { id: 'CTRL-06', threat: 'THREAT-06', name: 'Delimiter Breakout & Link Sanitizer' },
    { id: 'CTRL-07', threat: 'THREAT-07', name: 'Shell Command Sink Operator Block' },
    { id: 'CTRL-08', threat: 'THREAT-08', name: 'RAG Retrieval Chunk Scanner' },
    { id: 'CTRL-09', threat: 'THREAT-09', name: 'Evidence Requirement Gate' },
    { id: 'CTRL-10', threat: 'THREAT-10', name: 'Delegation Privilege Ceiling Enforcer' },
    { id: 'CTRL-11', threat: 'THREAT-11', name: 'Confused Deputy Authorization Check' },
    { id: 'CTRL-12', threat: 'THREAT-12', name: 'Mandatory Human Gate Policy' },
    { id: 'CTRL-13', threat: 'THREAT-13', name: 'MCP Server Manifest Evaluator' },
    { id: 'CTRL-14', threat: 'THREAT-14', name: 'Policy Testability Validator' },
    { id: 'CTRL-15', threat: 'THREAT-15', name: 'Incident Telemetry & Audit Schema' },
    { id: 'CTRL-16', threat: 'THREAT-16', name: 'Non-Masking Safety Invariant Evaluator' },
  ];

  test('validates control schema definitions for all 16 canonical controls', () => {
    for (const ctrl of CANONICAL_CONTROLS) {
      const def = {
        controlId: ctrl.id,
        name: ctrl.name,
        description: `Mitigating control for ${ctrl.threat}.`,
        threatIds: [ctrl.threat],
        enforcementType: 'RUNTIME_FILTER',
        executableCheck: 'src/security/index.js',
        activeEnforcement: true,
      };

      const parsed = SecurityControlSchema.parse(def);
      expect(parsed.controlId).toBe(ctrl.id);
      expect(parsed.activeEnforcement).toBe(true);
    }
  });

  test('verifies fail-closed behavior on filesystem traversal (CTRL-04 / THREAT-04)', () => {
    expect(() => {
      assertWithinRoot(__dirname, '../../../../etc/passwd');
    }).toThrow(/Path traversal detected/);
  });

  test('verifies fail-closed behavior on cloud metadata SSRF (CTRL-04 / THREAT-04)', () => {
    expect(isProhibitedIp('169.254.169.254')).toBe(true);
    expect(isProhibitedIp('127.0.0.1')).toBe(true);
    expect(isProhibitedIp('10.0.0.1')).toBe(true);
  });

  test('verifies deterministic check supremacy over natural language claim (Epistemic Law)', () => {
    // Model claims finding is verified, but deterministic evidence check rejects it
    const modelClaim = {
      reviewer: 'stochastic-model',
      verdict: 'APPROVED',
      findings: [
        {
          id: 'F-1',
          status: 'VERIFIED',
          severity: 'CRITICAL',
          title: 'Remote shell execution confirmed',
          evidence: [], // Model claim has zero test logs or code proof!
        },
      ],
    };

    const consensus = auditReviewerConsensus([modelClaim]);
    // The deterministic consensus engine fails closed on critical finding and flags missing evidence
    expect(consensus.consensusAllowed).toBe(false);
    expect(consensus.unverifiedClaims.length).toBe(1);
    expect(consensus.status).toBe('REJECTED_SAFETY_GATE');
  });
});

