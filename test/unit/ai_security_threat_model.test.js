'use strict';

const {
  ThreatRecordSchema,
  SecurityControlSchema,
  SecurityFindingSchema,
  SecurityIncidentSchema,
  PolicyAuditFindingSchema,
  buildThreatModelRegister,
} = require('../../src/security');

describe('AI Agent Threat Model & Schemas', () => {
  const sampleThreat = {
    threatId: 'THREAT-01',
    category: 'Direct Prompt Injection',
    atlasId: 'AML.T0051',
    entryPoint: 'User chat prompt',
    trustBoundaryCrossed: 'User Input -> System Control',
    severity: 'CRITICAL',
    mitigatingControl: 'Delimiter isolation & smuggler detector',
    testReference: 'test/unit/ai_security_prompt_injection.test.js',
    strideCategory: 'TAMPERING',
    description: 'Direct override of system prompt instructions.',
  };

  test('validates canonical ThreatRecordSchema correctly', () => {
    const parsed = ThreatRecordSchema.parse(sampleThreat);
    expect(parsed.threatId).toBe('THREAT-01');
    expect(parsed.atlasId).toBe('AML.T0051');
    expect(parsed.severity).toBe('CRITICAL');
  });

  test('rejects malformed threatId or invalid ATLAS ID', () => {
    expect(() => {
      ThreatRecordSchema.parse({ ...sampleThreat, threatId: 'INVALID-ID' });
    }).toThrow();

    expect(() => {
      ThreatRecordSchema.parse({ ...sampleThreat, atlasId: 'ATTACK.T1234' });
    }).toThrow();
  });

  test('validates SecurityControlSchema linking threats to executable checks', () => {
    const control = {
      controlId: 'CTRL-PI-01',
      name: 'Prompt Injection Smuggler Detector',
      description: 'Scans for direct override phrases and role hijacking.',
      threatIds: ['THREAT-01', 'THREAT-02'],
      enforcementType: 'RUNTIME_FILTER',
      executableCheck: 'src/security/prompt_injection_engine.js',
      activeEnforcement: true,
      bypassableViaFlag: false,
    };

    const parsed = SecurityControlSchema.parse(control);
    expect(parsed.controlId).toBe('CTRL-PI-01');
    expect(parsed.activeEnforcement).toBe(true);
  });

  test('validates SecurityFindingSchema with deterministic evidence', () => {
    const finding = {
      id: 'FIND-001',
      threatId: 'THREAT-01',
      threatCategory: 'Direct Prompt Injection',
      severity: 'CRITICAL',
      title: 'Direct Instruction Override',
      description: 'Found ignore previous instructions in input.',
      entryPoint: 'user_prompt',
      evidence: [
        {
          type: 'REGEX_MATCH',
          source: 'prompt_injection_engine',
          codeSnippet: 'ignore previous instructions',
        },
      ],
      remediation: 'Isolate user content in passive data container.',
      verificationStatus: 'VERIFIED',
    };

    const parsed = SecurityFindingSchema.parse(finding);
    expect(parsed.id).toBe('FIND-001');
    expect(parsed.evidence.length).toBe(1);
  });

  test('rejects SecurityFindingSchema with empty evidence', () => {
    expect(() => {
      SecurityFindingSchema.parse({
        id: 'FIND-EMPTY',
        threatCategory: 'Test',
        severity: 'HIGH',
        title: 'Empty evidence test',
        description: 'Should fail',
        evidence: [],
        remediation: 'Fix it',
        verificationStatus: 'UNVERIFIED',
      });
    }).toThrow();
  });

  test('validates SecurityIncidentSchema with timeline and containment', () => {
    const incident = {
      incidentId: 'INC-2026-001',
      timestamp: '2026-10-30T12:00:00Z',
      severity: 'CRITICAL',
      suspectedThreats: ['THREAT-01', 'THREAT-05'],
      timeline: [
        {
          timestamp: '2026-10-30T12:00:01Z',
          action: 'User supplied injected prompt',
          actor: 'external_user',
        },
        {
          timestamp: '2026-10-30T12:00:02Z',
          action: 'Agent attempted to read /etc/passwd',
          actor: 'subagent',
        },
      ],
      affectedAssets: ['workspace_fs', 'execution_log'],
      compromisedBoundaries: ['ZONE_2_REASONING'],
      containmentActions: ['Session terminated', 'API keys rotated'],
    };

    const parsed = SecurityIncidentSchema.parse(incident);
    expect(parsed.incidentId).toBe('INC-2026-001');
    expect(parsed.timeline.length).toBe(2);
  });

  test('validates PolicyAuditFindingSchema for testability and enforcement', () => {
    const clause = {
      clauseId: 'POL-01',
      text: 'Shell operator chaining with semicolon (;) is strictly prohibited.',
      testable: true,
      associatedControls: ['CTRL-EXEC-01'],
      status: 'ENFORCED',
    };

    const parsed = PolicyAuditFindingSchema.parse(clause);
    expect(parsed.status).toBe('ENFORCED');
    expect(parsed.testable).toBe(true);
  });

  test('buildThreatModelRegister aggregates unique threats and counts severity', () => {
    const records = [
      sampleThreat,
      {
        threatId: 'THREAT-02',
        category: 'Indirect Prompt Injection',
        atlasId: 'AML.T0051.001',
        entryPoint: 'README file',
        trustBoundaryCrossed: 'Untrusted Data -> Model Reasoning',
        severity: 'CRITICAL',
        mitigatingControl: 'Untrusted content wrapper',
        testReference: 'test/unit/ai_security_prompt_injection.test.js',
      },
      {
        threatId: 'THREAT-03',
        category: 'Excessive Tool Permissions',
        atlasId: 'AML.T0053',
        entryPoint: 'Tool manifest',
        trustBoundaryCrossed: 'Model Output -> OS Process',
        severity: 'HIGH',
        mitigatingControl: 'Wildcard denial',
        testReference: 'test/unit/ai_security_tool_permission.test.js',
      },
    ];

    const register = buildThreatModelRegister(records);
    expect(register.totalThreats).toBe(3);
    expect(register.severityCounts.CRITICAL).toBe(2);
    expect(register.severityCounts.HIGH).toBe(1);
    expect(register.threats.length).toBe(3);
  });

  test('buildThreatModelRegister rejects duplicate threat IDs', () => {
    const duplicates = [sampleThreat, { ...sampleThreat, category: 'Duplicate copy' }];
    expect(() => buildThreatModelRegister(duplicates)).toThrow(/Duplicate threatId detected/);
  });
});

