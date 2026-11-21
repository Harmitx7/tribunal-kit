'use strict';

/**
 * evidence_integrity.test.js — Deep Immutability, Provenance Stability & Attribution Integrity Tests
 */

const { EvidenceBus } = require('../../src/execution/evidence_bus');
const { ConflictResolver } = require('../../src/execution/conflict_resolver');

describe('Stage 2.1: Evidence Envelope & Conflict Integrity', () => {
  describe('Deep Immutability & Anti-Tamper Guarantees', () => {
    test('enforces deep immutability on nested content and metadata', () => {
      const bus = new EvidenceBus();
      const session = bus.createSession('sess_freeze');

      const findingItem = session.recordFinding(
        { taskId: 'task_01', agentId: 'threat-modeler' },
        {
          findingId: 'F-10',
          category: 'SECURITY',
          severity: 'HIGH',
          description: 'Deserialization attack',
          evidence: 'pickle.loads(data)',
          filePath: 'src/worker.py',
        },
      );

      // Verify top-level is frozen
      expect(Object.isFrozen(findingItem)).toBe(true);
      expect(() => {
        findingItem.severity = 'LOW';
      }).toThrow(TypeError);

      // Verify nested content is deeply frozen
      expect(Object.isFrozen(findingItem.content)).toBe(true);
      expect(() => {
        findingItem.content.description = 'tampered';
      }).toThrow(TypeError);

      // Verify metadata is deeply frozen
      expect(Object.isFrozen(findingItem.metadata)).toBe(true);
      expect(() => {
        findingItem.metadata.findingId = 'F-HACKED';
      }).toThrow(TypeError);
    });

    test('defensive cloning prevents external caller mutation from polluting the bus', () => {
      const bus = new EvidenceBus();
      const session = bus.createSession('sess_clone');

      const externalContent = {
        deep: {
          vulnerable: true,
          threatLevel: 'MAXIMUM',
        },
      };

      const item = session.recordObservation(
        { taskId: 'task_obs', agentId: 'security-auditor' },
        externalContent,
      );

      // Mutate the external object that caller retains
      externalContent.deep.threatLevel = 'NONE';
      externalContent.deep.vulnerable = false;

      // Evidence in bus MUST remain untouched!
      expect(item.content.deep.threatLevel).toBe('MAXIMUM');
      expect(item.content.deep.vulnerable).toBe(true);
    });

    test('agent and task attribution cannot be overwritten', () => {
      const bus = new EvidenceBus();
      const session = bus.createSession('sess_attr');

      const item = session.recordFinding(
        { taskId: 'task_orig', agentId: 'agent_orig' },
        {
          findingId: 'F-1',
          category: 'LOGIC',
          severity: 'LOW',
          description: 'Logic flaw',
          evidence: 'if (x)',
        },
      );

      expect(() => {
        item.agentId = 'imposter_agent';
      }).toThrow(TypeError);

      expect(() => {
        item.taskId = 'imposter_task';
      }).toThrow(TypeError);

      expect(() => {
        item.sessionId = 'imposter_session';
      }).toThrow(TypeError);
    });
  });

  describe('Cryptographic Hash Stability & Collision Resistance', () => {
    test('produces identical SHA-256 hash for identical payloads regardless of key insertion order', () => {
      const bus = new EvidenceBus();
      const fixedTime = 1700000000000;

      // Object A with key order 1
      const itemA = bus.emit('fixed_session', {
        id: 'ev_1',
        taskId: 't_fixed',
        agentId: 'agent_fixed',
        type: 'FINDING',
        category: 'SECURITY',
        severity: 'CRITICAL',
        content: { a: 1, b: 2, c: { x: 10, y: 20 } },
        timestamp: fixedTime,
      });

      // Object B with key order 2 (reversed)
      const itemB = bus.emit('fixed_session', {
        id: 'ev_2',
        taskId: 't_fixed',
        agentId: 'agent_fixed',
        type: 'FINDING',
        severity: 'CRITICAL',
        category: 'SECURITY',
        content: { c: { y: 20, x: 10 }, b: 2, a: 1 },
        timestamp: fixedTime,
      });

      expect(itemA.provenanceHash).toBe(itemB.provenanceHash);
      expect(itemA.provenanceHash).toHaveLength(64);
    });

    test('produces distinct SHA-256 hashes for different payloads', () => {
      const bus = new EvidenceBus();
      const fixedTime = 1700000000000;

      const itemA = bus.emit('sess_hash', {
        taskId: 't1',
        agentId: 'agentA',
        content: 'payload A',
        timestamp: fixedTime,
      });

      const itemB = bus.emit('sess_hash', {
        taskId: 't1',
        agentId: 'agentA',
        content: 'payload B', // different content
        timestamp: fixedTime,
      });

      expect(itemA.provenanceHash).not.toBe(itemB.provenanceHash);
    });

    test('cryptographic provenance hash covers confidence and all security-relevant metadata', () => {
      const bus = new EvidenceBus();
      const fixedTime = 1700000000000;

      const baseItem = bus.emit('sess_meta_cov', {
        taskId: 't1',
        agentId: 'agentA',
        content: 'identical content',
        confidence: 0.95,
        metadata: { findingId: 'F-1', origin: 'static_analysis' },
        timestamp: fixedTime,
      });

      // Different metadata MUST produce a distinct hash
      const differentMetaItem = bus.emit('sess_meta_cov', {
        taskId: 't1',
        agentId: 'agentA',
        content: 'identical content',
        confidence: 0.95,
        metadata: { findingId: 'F-2', origin: 'taint_engine' },
        timestamp: fixedTime,
      });
      expect(baseItem.provenanceHash).not.toBe(differentMetaItem.provenanceHash);

      // Different confidence MUST produce a distinct hash
      const differentConfidenceItem = bus.emit('sess_meta_cov', {
        taskId: 't1',
        agentId: 'agentA',
        content: 'identical content',
        confidence: 0.2,
        metadata: { findingId: 'F-1', origin: 'static_analysis' },
        timestamp: fixedTime,
      });
      expect(baseItem.provenanceHash).not.toBe(differentConfidenceItem.provenanceHash);
    });
  });

  describe('Concurrent Session Isolation', () => {
    test('strictly isolates sessions under high-concurrency interleaved execution', async () => {
      const bus = new EvidenceBus();
      const sessionCount = 10;
      const findingsPerSession = 20;

      const sessionPromises = Array.from({ length: sessionCount }, async (_, sIdx) => {
        const sessionId = `conc_sess_${sIdx}`;
        const session = bus.createSession(sessionId);

        for (let fIdx = 0; fIdx < findingsPerSession; fIdx++) {
          session.recordFinding(
            { taskId: `t_${sIdx}_${fIdx}`, agentId: `agent_${sIdx}` },
            {
              findingId: `F_${sIdx}_${fIdx}`,
              category: 'CORRECTNESS',
              severity: 'LOW',
              description: `Finding ${fIdx} in session ${sIdx}`,
              evidence: `ev_${sIdx}_${fIdx}`,
            },
          );
          // Yield to event loop to interleave execution
          await new Promise(r => setImmediate(r));
        }

        const findings = session.getFindings();
        expect(findings).toHaveLength(findingsPerSession);
        // Ensure every finding belongs to this session ONLY
        for (const f of findings) {
          expect(f.sessionId).toBe(sessionId);
          expect(f.agentId).toBe(`agent_${sIdx}`);
        }
      });

      await Promise.all(sessionPromises);
    });
  });

  describe('Conflict Integrity Invariants', () => {
    test('never discards or suppresses conflicting findings during resolution', () => {
      const resolver = new ConflictResolver();
      const findings = [
        {
          agentId: 'security-auditor',
          findingId: 'SEC-1',
          category: 'SECURITY',
          severity: 'CRITICAL',
          filePath: 'src/auth.js',
          lineRange: '10-20',
          description: 'SQL injection',
        },
        {
          agentId: 'backend-specialist',
          findingId: 'BE-1',
          category: 'CORRECTNESS',
          severity: 'INFO',
          filePath: 'src/auth.js',
          lineRange: '12-18',
          description: 'Query looks optimized',
        },
      ];

      const res = resolver.resolve(findings);
      expect(res.hasConflicts).toBe(true);

      // Invariant check: original findings array is returned 100% intact
      expect(res.findings).toHaveLength(2);
      expect(res.findings[0].findingId).toBe('SEC-1');
      expect(res.findings[1].findingId).toBe('BE-1');

      // The conflict report stores both contradictory findings
      const conf = res.conflicts[0];
      expect(conf.contradictoryFindings).toHaveLength(2);
      expect(conf.contradictoryFindings.map(f => f.findingId)).toEqual(['SEC-1', 'BE-1']);
    });

    test('unresolved conflicts remain explicitly marked as UNRESOLVED', () => {
      const resolver = new ConflictResolver({ strict: true });
      const findings = [
        {
          agentId: 'frontend-reviewer',
          findingId: 'FE-1',
          category: 'STYLE',
          severity: 'HIGH',
          filePath: 'src/ui.jsx',
          lineRange: '50-60',
          description: 'Bad pattern',
        },
        {
          agentId: 'accessibility-reviewer',
          findingId: 'A11Y-1',
          category: 'STYLE',
          severity: 'INFO',
          filePath: 'src/ui.jsx',
          lineRange: '52-58',
          description: 'Acceptable shortcut',
        },
      ];

      const res = resolver.resolve(findings);
      expect(res.unresolvedCount).toBe(1);
      expect(res.conflicts[0].resolutionStatus).toBe('UNRESOLVED');
      expect(res.conflicts[0].winningFindingId).toBeNull();
    });
  });
});
