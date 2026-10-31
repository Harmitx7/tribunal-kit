'use strict';

const fs = require('fs');
const path = require('path');
const {
  scanForPromptInjection,
  auditToolPermissions,
  auditPathContainment,
  scanForDataLeakage,
  auditCommandSafety,
  detectIndirectInjection,
  auditDelegationHierarchy,
  detectConfusedDeputy,
  auditMcpManifest,
  auditReviewerConsensus,
  PolicyAuditFindingSchema,
  SecurityIncidentSchema,
} = require('../../src/security');
const { evaluateRegressions } = require('../../src/evaluation/llm_regression_evaluator');

describe('AI Security Adversarial Dataset Verification (16/16 Threats)', () => {
  const datasetPath = path.resolve(__dirname, '../fixtures/ai_security/adversarial_security_dataset_v1.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  test('dataset loads and contains all 16 canonical security cases', () => {
    expect(dataset.cases.length).toBe(16);
  });

  // SEC-CASE-01: Direct Prompt Injection
  test('SEC-CASE-01: Direct Prompt Injection is detected and blocked', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-01');
    const result = scanForPromptInjection(c.inputFixture.prompt);

    expect(result.isInjected).toBe(true);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.detectedCategories).toContain('INSTRUCTION_OVERRIDE');
    expect(result.detectedCategories).toContain('GUARDRAIL_BYPASS');
  });

  // SEC-CASE-02: Indirect Prompt Injection
  test('SEC-CASE-02: Indirect Prompt Injection in README is detected', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-02');
    const result = scanForPromptInjection(c.inputFixture.codeSnippet);

    expect(result.isInjected).toBe(true);
    expect(result.detectedCategories).toContain('HIDDEN_HTML_DIRECTIVE');
  });

  // SEC-CASE-03: Excessive Tool Permissions
  test('SEC-CASE-03: Wildcard Tool Permissions are detected and denied', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-03');
    const manifests = [{ name: c.inputFixture.context.tool, capabilities: [c.inputFixture.context.capability] }];
    const result = auditToolPermissions(manifests);

    expect(result.isCompliant).toBe(false);
    expect(result.verdict).toBe('PROHIBITED_WILDCARD');
  });

  // SEC-CASE-04: Unauthorized Filesystem Access
  test('SEC-CASE-04: Filesystem Directory Traversal is contained and blocked', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-04');
    const root = path.resolve(__dirname, '../../');
    const result = auditPathContainment(c.inputFixture.targetFile, root);

    expect(result.isContained).toBe(false);
    expect(result.violation).toContain('Path traversal detected');
  });

  // SEC-CASE-05: Sensitive Data Leakage
  test('SEC-CASE-05: Canary and API Key leaks are detected and scrubbed', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-05');
    const canary = 'CANARY_SECRET_0123456789abcdef';
    const result = scanForDataLeakage(c.inputFixture.codeSnippet, { canaries: [canary] });

    expect(result.leaksDetected).toBe(true);
    expect(result.leakedCanaries).toContain(canary);
    expect(result.secretRedactionsCount).toBeGreaterThan(0);
    expect(result.sanitizedContent).toContain('[REDACTED_API_KEY]');
    expect(result.sanitizedContent).toContain('[REDACTED_CANARY]');
  });

  // SEC-CASE-06: Insecure Input/Output Handling
  test('SEC-CASE-06: Context Delimiter Breakout & Exfiltration links are detected', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-06');
    const result = scanForPromptInjection(c.inputFixture.codeSnippet);

    expect(result.isInjected).toBe(true);
    expect(result.detectedCategories).toContain('TAG_BREAKOUT');
    expect(result.detectedCategories).toContain('MARKDOWN_IMAGE_EXFILTRATION');
  });

  // SEC-CASE-07: Unsafe Command Execution
  test('SEC-CASE-07: Destructive commands and shell chaining operators are blocked', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-07');
    const result = auditCommandSafety(c.inputFixture.codeSnippet);

    expect(result.isSafe).toBe(false);
    expect(result.violations.some(v => v.type === 'DANGEROUS_SHELL_OPERATOR')).toBe(true);
    expect(result.violations.some(v => v.type === 'DESTRUCTIVE_COMMAND')).toBe(true);
  });

  // SEC-CASE-08: Memory & RAG Retrieval Poisoning
  test('SEC-CASE-08: Poisoned RAG retrieval chunks are detected and quarantined', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-08');
    const chunks = [{ id: 'doc-1', text: c.inputFixture.codeSnippet }];
    const result = detectIndirectInjection(chunks);

    expect(result.hasInjections).toBe(true);
    expect(result.flaggedCount).toBe(1);
  });

  // SEC-CASE-09: Tool-Result Spoofing & Forged Proof
  test('SEC-CASE-09: Forged verification claims without evidence are flagged', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-09');
    const reports = [
      {
        reviewer: 'untrusted-agent',
        verdict: 'PASS',
        findings: [
          {
            id: 'F-SPOOF',
            status: c.inputFixture.context.status,
            evidence: c.inputFixture.context.evidence,
          },
        ],
      },
    ];

    const result = auditReviewerConsensus(reports);
    expect(result.unverifiedClaims.length).toBe(1);
    expect(result.unverifiedClaims[0].findingId).toBe('F-SPOOF');
  });

  // SEC-CASE-10: Insecure Agent Delegation
  test('SEC-CASE-10: Unauthorized subagent capability expansion is blocked', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-10');
    const root = {
      id: c.inputFixture.context.parentId,
      capabilities: c.inputFixture.context.parentCaps,
      delegates: [
        {
          id: c.inputFixture.context.childId,
          capabilities: c.inputFixture.context.childCaps,
          delegates: [],
        },
      ],
    };

    const result = auditDelegationHierarchy(root);
    expect(result.isSafe).toBe(false);
    expect(result.privilegeExpansions.length).toBe(1);
    expect(result.privilegeExpansions[0].unauthorizedCapability).toBe('exec_shell');
  });

  // SEC-CASE-11: Confused-Deputy Escalation
  test('SEC-CASE-11: Low-privilege callers cannot invoke privileged sinks without human signoff', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-11');
    const result = detectConfusedDeputy(c.inputFixture.context);

    expect(result.isConfusedDeputy).toBe(true);
    expect(result.blocked).toBe(true);
  });

  // SEC-CASE-12: Human Approval Boundary Bypass
  test('SEC-CASE-12: High-risk actions require explicit Zone 0 human approval', () => {
    const manifests = [{ name: 'modify_file', capabilities: ['delete_file'] }];
    const audit = auditToolPermissions(manifests);

    expect(audit.requiresHumanGate).toBe(true);
  });

  // SEC-CASE-13: Supply Chain & MCP Impersonation
  test('SEC-CASE-13: Insecure MCP server configuration is flagged during vetting', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-13');
    const mcpConfig = {
      mcpServers: {
        [c.inputFixture.context.server]: {
          command: c.inputFixture.context.command,
          args: c.inputFixture.context.args,
        },
      },
    };

    const result = auditMcpManifest(mcpConfig);
    expect(result.isSecure).toBe(false);
    expect(result.untrustedServers).toContain('suspicious-mcp');
  });

  // SEC-CASE-14: Insecure Deployment & Config Drift
  test('SEC-CASE-14: Untestable subjective policy clause is flagged', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-14');
    const clause = {
      clauseId: 'POL-AMBIGUOUS',
      text: c.inputFixture.codeSnippet,
      testable: false,
      status: 'UNTESTABLE',
    };

    const parsed = PolicyAuditFindingSchema.parse(clause);
    expect(parsed.testable).toBe(false);
    expect(parsed.status).toBe('UNTESTABLE');
  });

  // SEC-CASE-15: Audit Log Gaps & Unverified Claims
  test('SEC-CASE-15: Incident telemetry with missing timeline fails schema validation', () => {
    const c = dataset.cases.find(x => x.id === 'SEC-CASE-15');
    expect(() => {
      SecurityIncidentSchema.parse({
        incidentId: c.inputFixture.context.incidentId,
        timestamp: '2026-10-30T12:00:00Z',
        severity: 'HIGH',
        suspectedThreats: ['THREAT-15'],
        timeline: c.inputFixture.context.timeline, // empty timeline!
        affectedAssets: ['audit_log'],
        containmentActions: ['Restore audit log'],
      });
    }).toThrow(/Incident timeline must contain at least one event/);
  });

  // SEC-CASE-16: Security Control Regression
  test('SEC-CASE-16: Non-Masking Safety Invariant blocks release on critical regression', () => {
    const baseline = [
      { caseId: 'THREAT-16-TEST', verdict: 'PASS', severity: 'CRITICAL' },
    ];
    const candidate = [
      { caseId: 'THREAT-16-TEST', verdict: 'FAIL', severity: 'CRITICAL' },
    ];

    const report = evaluateRegressions(candidate, baseline);
    expect(report.safetyInvariantHeld).toBe(false);
    expect(report.releaseDecision).toBe('REJECTED_WITH_SAFETY_REGRESSION');
    expect(report.criticalSafetyRegressions.length).toBe(1);
  });
});
