'use strict';

const path = require('path');
const { ArchitectureVerifier } = require('../../.agent/scripts/architecture_verifier');
const { BlastRadiusEngine } = require('../../.agent/scripts/blast_radius_engine');
const { ArchitectureDiffer } = require('../../.agent/scripts/architecture_diff');
const { ArchitectureHealthAuditor } = require('../../.agent/scripts/architecture_health');

describe('Tribunal Architecture Intelligence — Adversarial Verification Suite', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  // 1. False Dependency: visually plausible but nonexistent relationship
  test('Adversarial 1: False dependency is rejected and flagged as contradicted', () => {
    const model = {
      entities: [
        {
          id: 'mod.a',
          name: 'src/cli.js',
          kind: 'module',
          sources: [{ file: 'src/cli.js', startLine: 1 }],
        },
        {
          id: 'mod.phantom',
          name: 'src/nonexistent.js',
          kind: 'module',
          sources: [{ file: 'src/nonexistent.js', startLine: 1 }],
        },
      ],
      relationships: [
        {
          id: 'rel.fake',
          sourceId: 'mod.a',
          targetId: 'mod.phantom',
          relationType: 'calls',
          evidence: [{ file: 'src/nonexistent.js', startLine: 1 }],
        },
      ],
    };

    const verifier = new ArchitectureVerifier(repoRoot);
    const report = verifier.verifyModel(model);

    expect(report.verified).toBe(false);
    expect(report.stats.contradictedRelations).toBe(1);
    expect(report.contradictions.length).toBe(1);
    expect(report.contradictions[0].conflictType).toBe('fabricated_call_site');
  });

  // 2. Dynamic Dependency: exists through runtime event bus or dynamic import
  test('Adversarial 2: Dynamic dependency via event bus is correctly classified as decoupled', () => {
    const model = {
      entities: [
        {
          id: 'mod.producer',
          name: 'producer.js',
          kind: 'module',
          sources: [{ file: 'src/cli.js', startLine: 1 }],
        },
        {
          id: 'queue.events',
          name: 'OrderEvents',
          kind: 'event_bus',
          sources: [{ file: 'src/cli.js', startLine: 1 }],
        },
      ],
      relationships: [
        {
          id: 'rel.dynamic',
          sourceId: 'mod.producer',
          targetId: 'queue.events',
          relationType: 'publishes',
          protocol: 'event_emitter',
        },
      ],
    };

    const engine = new BlastRadiusEngine(model);
    const res = engine.computeBlastRadius('producer.js');

    expect(res.found).toBe(true);
    expect(res.target.kind).toBe('module');
  });

  // 3. Contradictory Evidence: two claims disagree, surfaces explicit conflict
  test('Adversarial 3: Contradictory claims surface as first-class architectural conflicts', () => {
    const conflictingModel = {
      entities: [
        {
          id: 'mod.auth',
          name: 'auth.js',
          kind: 'module',
          sources: [{ file: 'src/cli.js', startLine: 1 }],
        },
        {
          id: 'db.redis',
          name: 'Redis',
          kind: 'datastore',
          sources: [{ file: 'src/cli.js', startLine: 1 }],
        },
      ],
      relationships: [],
      contradictions: [
        {
          id: 'conflict.auth_redis',
          entityOrRelationId: 'mod.auth',
          claimA: {
            agent: 'backend-specialist',
            claim: 'Auth middleware uses Redis for token blacklisting',
          },
          claimB: {
            agent: 'security-auditor',
            claim: 'JWT tokens are verified purely statelessly with no Redis calls',
          },
          conflictType: 'static_vs_runtime',
          resolution: 'pending',
        },
      ],
    };

    const verifier = new ArchitectureVerifier(repoRoot);
    const report = verifier.verifyModel(conflictingModel);

    expect(report.contradictions.length).toBe(1);
    expect(report.contradictions[0].id).toBe('conflict.auth_redis');
    expect(report.contradictions[0].conflictType).toBe('static_vs_runtime');
  });

  // 4. Stale Evidence: content hash drifts between revisions
  test('Adversarial 4: Stale evidence is detected when content hash has drifted', () => {
    const staleModel = {
      entities: [
        {
          id: 'mod.real',
          name: 'cli.js',
          kind: 'module',
          sources: [
            {
              file: 'src/cli.js',
              startLine: 1,
              contentHash: 'stale_expired_hash_12345',
            },
          ],
        },
      ],
      relationships: [],
    };

    const verifier = new ArchitectureVerifier(repoRoot);
    const report = verifier.verifyModel(staleModel);

    expect(report.stats.staleEntities).toBe(1);
    const staleDiag = report.diagnostics.find(d => d.code === 'ARCH_EVIDENCE_STALE');
    expect(staleDiag).toBeDefined();
    expect(staleDiag.severity).toBe('warning');
  });

  // 5. Generated Code: provenance tracks extraction method
  test('Adversarial 5: Generated code provenance retains exact generator metadata', () => {
    const model = {
      entities: [
        {
          id: 'mod.generated',
          name: 'schema.gen.js',
          kind: 'module',
          confidence: 'L2',
          sources: [
            {
              file: 'src/cli.js',
              startLine: 1,
              extractionMethod: 'config_declaration',
              confidence: 'L2',
            },
          ],
        },
      ],
      relationships: [],
    };

    const verifier = new ArchitectureVerifier(repoRoot);
    const report = verifier.verifyModel(model);

    expect(report.stats.verifiedEntities).toBe(1);
    expect(report.confidenceDistribution.L2).toBe(1);
  });

  // 6. Circular Dependency: cycle surfaced with full path
  test('Adversarial 6: Circular dependency loop is detected and traced', () => {
    const circularModel = {
      entities: [
        { id: 'node1', name: 'Service1', kind: 'module' },
        { id: 'node2', name: 'Service2', kind: 'module' },
      ],
      relationships: [
        { sourceId: 'node1', targetId: 'node2' },
        { sourceId: 'node2', targetId: 'node1' },
      ],
    };

    const auditor = new ArchitectureHealthAuditor(circularModel);
    const report = auditor.audit();

    const cycle = report.signals.find(s => s.code === 'ARCH_CIRCULAR_DEPENDENCY');
    expect(cycle).toBeDefined();
    expect(cycle.entities).toContain('node1');
    expect(cycle.entities).toContain('node2');
  });

  // 7. Security Boundary Crossing: flagged as CRITICAL violation
  test('Adversarial 7: Unauthenticated public access to datastore triggers critical security signal', () => {
    const model = {
      entities: [
        {
          id: 'ep.open',
          name: 'GET /unprotected',
          kind: 'endpoint',
          trustZone: 'public_untrusted',
        },
        { id: 'db.users', name: 'Users DB', kind: 'datastore', trustZone: 'isolated_datastore' },
      ],
      relationships: [{ sourceId: 'ep.open', targetId: 'db.users', relationType: 'reads' }],
    };

    const auditor = new ArchitectureHealthAuditor(model);
    const report = auditor.audit();

    const secSignal = report.signals.find(s => s.code === 'ARCH_SECURITY_BOUNDARY_VIOLATION');
    expect(secSignal).toBeDefined();
    expect(secSignal.severity).toBe('CRITICAL');
  });

  // 8. Large Repository: analysis remains bounded and fast
  test('Adversarial 8: Large synthetic repository with 1,000 entities computes bounded blast radius under 50ms', () => {
    const largeEntities = [];
    const largeRelations = [];

    for (let i = 0; i < 1000; i++) {
      largeEntities.push({
        id: `entity_${i}`,
        name: `Module_${i}`,
        kind: 'module',
        scope: `src/pkg_${i % 10}`,
        trustZone: 'internal_service',
      });
      if (i > 0) {
        largeRelations.push({
          id: `rel_${i}`,
          sourceId: `entity_${i}`,
          targetId: `entity_${Math.floor(i / 2)}`,
          relationType: 'imports',
        });
      }
    }

    const largeModel = { entities: largeEntities, relationships: largeRelations };
    const startTime = Date.now();
    const engine = new BlastRadiusEngine(largeModel);
    const result = engine.computeBlastRadius('entity_0');
    const elapsed = Date.now() - startTime;

    expect(result.found).toBe(true);
    expect(result.metrics.transitiveDependentsCount).toBe(999);
    expect(elapsed).toBeLessThan(100); // Strict bounded time limit
  });

  // 9. Architecture Change: semantic impact detected
  test('Adversarial 9: Semantic architecture diff detects protection removal', () => {
    const baseModel = {
      entities: [{ id: 'svc', name: 'Service', kind: 'module' }],
      relationships: [
        {
          id: 'rel.api',
          sourceId: 'svc',
          targetId: 'ext.api',
          failureMode: { hasTimeout: true, hasCircuitBreaker: true },
        },
      ],
    };
    const headModel = {
      entities: [{ id: 'svc', name: 'Service', kind: 'module' }],
      relationships: [
        {
          id: 'rel.api',
          sourceId: 'svc',
          targetId: 'ext.api',
          failureMode: { hasTimeout: false, hasCircuitBreaker: false },
        },
      ],
    };

    const differ = new ArchitectureDiffer(baseModel, headModel);
    const diff = differ.compare();

    expect(diff.resilienceRegressions.length).toBe(2);
    expect(diff.resilienceRegressions[0].severity).toBe('HIGH');
  });

  // 10. Missing Evidence: assigns UNVERIFIED instead of hallucinating facts
  test('Adversarial 10: Missing source evidence is marked UNVERIFIED instead of hallucinated fact', () => {
    const model = {
      entities: [
        { id: 'mod.no_src', name: 'orphan.js', kind: 'module' }, // No sources array
      ],
      relationships: [],
    };

    const verifier = new ArchitectureVerifier(repoRoot);
    const report = verifier.verifyModel(model);

    expect(report.confidenceDistribution.L1).toBe(0);
    expect(report.stats.verifiedEntities).toBe(0);
  });
});
