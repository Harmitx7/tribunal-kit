'use strict';

/**
 * evidence_and_conflicts.test.js — Unit Tests for Evidence Bus & Conflict Resolver
 */

const { EvidenceBus, normalizeLineRange } = require('../../src/execution/evidence_bus');
const { ConflictResolver, lineRangesOverlap } = require('../../src/execution/conflict_resolver');

describe('Stage 2: Evidence Bus & Conflict Resolver', () => {
  describe('Line Range Normalization & Overlap', () => {
    test('normalizes various line range expressions', () => {
      expect(normalizeLineRange('10-25')).toEqual({ start: 10, end: 25 });
      expect(normalizeLineRange('42:50')).toEqual({ start: 42, end: 50 });
      expect(normalizeLineRange(15)).toEqual({ start: 15, end: 15 });
      expect(normalizeLineRange({ start: 100, end: 200 })).toEqual({ start: 100, end: 200 });
    });

    test('detects overlapping line ranges', () => {
      expect(lineRangesOverlap('10-20', '15-25')).toBe(true);
      expect(lineRangesOverlap('10-20', '20-30')).toBe(true);
      expect(lineRangesOverlap('10-20', '21-30')).toBe(false);
      expect(lineRangesOverlap(15, '10-20')).toBe(true);
      expect(lineRangesOverlap(5, '10-20')).toBe(false);
    });
  });

  describe('Evidence Bus Invariants', () => {
    test('enforces session isolation with no state pollution', () => {
      const bus = new EvidenceBus();
      const session1 = bus.createSession('sess_1');
      const session2 = bus.createSession('sess_2');

      session1.recordFinding(
        { taskId: 't1', agentId: 'security-auditor' },
        {
          findingId: 'F-1',
          category: 'SECURITY',
          severity: 'HIGH',
          description: 'SQL Injection detected',
          evidence: 'query(req.body.id)',
          filePath: 'src/db.js',
          lineRange: '10-15',
        },
      );

      session2.recordFinding(
        { taskId: 't2', agentId: 'frontend-reviewer' },
        {
          findingId: 'F-2',
          category: 'STYLE',
          severity: 'LOW',
          description: 'Missing semicolon',
          evidence: 'const a = 1',
          filePath: 'src/ui.js',
        },
      );

      const f1 = session1.getFindings();
      const f2 = session2.getFindings();

      expect(f1).toHaveLength(1);
      expect(f1[0].agentId).toBe('security-auditor');
      expect(f1[0].filePath).toBe('src/db.js');
      expect(f1[0].provenanceHash).toBeDefined();

      expect(f2).toHaveLength(1);
      expect(f2[0].agentId).toBe('frontend-reviewer');
      expect(f2[0].filePath).toBe('src/ui.js');

      // Zero cross-contamination
      expect(session1.query({ filePath: 'src/ui.js' })).toHaveLength(0);
      expect(session2.query({ filePath: 'src/db.js' })).toHaveLength(0);
    });

    test('seals evidence items as immutable with SHA-256 provenance', () => {
      const bus = new EvidenceBus();
      const session = bus.createSession('sess_immut');

      const item = session.recordFinding(
        { taskId: 'task_01', agentId: 'threat-modeler' },
        {
          findingId: 'F-100',
          category: 'SECURITY',
          severity: 'CRITICAL',
          description: 'Auth bypass in middleware',
          evidence: 'if (token) next()',
          filePath: 'auth/mw.js',
        },
      );

      expect(Object.isFrozen(item)).toBe(true);
      expect(item.provenanceHash).toHaveLength(64);
      expect(() => {
        item.severity = 'LOW';
      }).toThrow();
    });
  });

  describe('Conflict Resolver Invariants', () => {
    test('detects severity divergence between two agents on overlapping code lines', () => {
      const bus = new EvidenceBus();
      const session = bus.createSession('sess_conflict');

      session.recordFinding(
        { taskId: 'task_sec', agentId: 'security-auditor' },
        {
          findingId: 'SEC-1',
          category: 'SECURITY',
          severity: 'CRITICAL',
          description: 'Remote Code Execution vulnerability in eval()',
          evidence: 'eval(userInput)',
          filePath: 'src/calc.js',
          lineRange: '40-50',
          confidence: 0.98,
        },
      );

      session.recordFinding(
        { taskId: 'task_perf', agentId: 'performance-engineer' },
        {
          findingId: 'PERF-1',
          category: 'PERFORMANCE',
          severity: 'INFO',
          description: 'Dynamic expression execution is optimal here',
          evidence: 'eval(userInput) benchmarked at 0.1ms',
          filePath: 'src/calc.js',
          lineRange: '45-55',
          confidence: 0.9,
        },
      );

      const findings = session.getFindings();
      const resolver = new ConflictResolver();
      const res = resolver.resolve(findings);

      expect(res.hasConflicts).toBe(true);
      expect(res.conflicts).toHaveLength(1);
      const conf = res.conflicts[0];
      expect(conf.filePath).toBe('src/calc.js');
      expect(conf.agents).toContain('security-auditor');
      expect(conf.agents).toContain('performance-engineer');
      expect(conf.severity).toBe('CRITICAL');

      // Security precedence applied:
      expect(conf.resolutionStatus).toBe('RESOLVED_BY_PRECEDENCE');
      expect(conf.winningFindingId).toBe('SEC-1');

      // Invariant check: Original findings preserved intact!
      expect(res.findings).toHaveLength(2);
      expect(conf.contradictoryFindings).toHaveLength(2);
    });

    test('preserves conflicts as UNRESOLVED in strict mode', () => {
      const resolver = new ConflictResolver({ strict: true });
      const findings = [
        {
          agentId: 'architect-specialist',
          findingId: 'ARC-1',
          category: 'ARCHITECTURE',
          severity: 'HIGH',
          filePath: 'src/api.js',
          lineRange: '10-20',
          description: 'Layering violation',
        },
        {
          agentId: 'backend-specialist',
          findingId: 'BE-1',
          category: 'STYLE',
          severity: 'LOW',
          filePath: 'src/api.js',
          lineRange: '12-18',
          description: 'Valid pragmatic shortcut',
        },
      ];

      const res = resolver.resolve(findings);
      expect(res.hasConflicts).toBe(true);
      expect(res.unresolvedCount).toBe(1);
      expect(res.conflicts[0].resolutionStatus).toBe('UNRESOLVED');
    });

    test('ignores non-overlapping findings in same file', () => {
      const resolver = new ConflictResolver();
      const findings = [
        {
          agentId: 'agent-1',
          findingId: 'F-1',
          severity: 'CRITICAL',
          filePath: 'src/test.js',
          lineRange: '1-10',
        },
        {
          agentId: 'agent-2',
          findingId: 'F-2',
          severity: 'INFO',
          filePath: 'src/test.js',
          lineRange: '50-60',
        },
      ];

      const res = resolver.resolve(findings);
      expect(res.hasConflicts).toBe(false);
      expect(res.conflicts).toHaveLength(0);
    });
  });
});
