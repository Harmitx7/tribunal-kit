'use strict';

const path = require('path');
const { ArchitectureExtractor } = require('../../.agent/scripts/architecture_extractor');
const { ArchitectureVerifier } = require('../../.agent/scripts/architecture_verifier');
const { BlastRadiusEngine } = require('../../.agent/scripts/blast_radius_engine');
const { ArchitectureDiffer } = require('../../.agent/scripts/architecture_diff');
const { ArchitectureHealthAuditor } = require('../../.agent/scripts/architecture_health');

describe('Tribunal Architecture Intelligence — Core Unit Tests', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  describe('Architecture Extractor', () => {
    it('extracts entities, relationships, endpoints and trust boundaries', () => {
      const extractor = new ArchitectureExtractor(repoRoot);
      const model = extractor.scan();

      expect(model.schemaVersion).toBe(1);
      expect(model.engine).toBe('tribunal-architecture-intelligence');
      expect(model.entities.length).toBeGreaterThan(10);
      expect(model.relationships.length).toBeGreaterThan(10);
      expect(model.trustBoundaries.length).toBe(5);

      const endpoint = model.entities.find(e => e.kind === 'endpoint');
      expect(endpoint).toBeDefined();
      expect(endpoint.sources[0].verified).toBe(true);
      expect(endpoint.confidence).toBe('L1');
    });
  });

  describe('Architecture Verifier', () => {
    it('verifies ground-truth evidence and assigns L1 confidence', () => {
      const extractor = new ArchitectureExtractor(repoRoot);
      const model = extractor.scan();
      const verifier = new ArchitectureVerifier(repoRoot);
      const report = verifier.verifyModel(model);

      expect(report.verified).toBe(true);
      expect(report.stats.verifiedEntities).toBe(model.entities.length);
      expect(report.stats.staleEntities).toBe(0);
      expect(report.stats.fabricatedEntities).toBe(0);
      expect(report.confidenceDistribution.L1).toBe(model.entities.length);
    });

    it('detects fabricated evidence when non-existent files are cited', () => {
      const fakeModel = {
        entities: [
          {
            id: 'mod.fake',
            name: 'fake.js',
            kind: 'module',
            sources: [{ file: 'non_existent_file_xyz_123.js', startLine: 1, endLine: 5 }],
          },
        ],
        relationships: [],
      };
      const verifier = new ArchitectureVerifier(repoRoot);
      const report = verifier.verifyModel(fakeModel);

      expect(report.verified).toBe(false);
      expect(report.stats.fabricatedEntities).toBe(1);
      expect(report.diagnostics[0].code).toBe('ARCH_EVIDENCE_FABRICATED');
    });
  });

  describe('Blast Radius Engine', () => {
    it('computes direct callers and transitive rings for an entity', () => {
      const extractor = new ArchitectureExtractor(repoRoot);
      const model = extractor.scan();
      const engine = new BlastRadiusEngine(model);

      // Find an entity with callers, e.g. logger
      const loggerEntity = model.entities.find(e => e.name === 'logger.js');
      expect(loggerEntity).toBeDefined();

      const result = engine.computeBlastRadius('logger.js');
      expect(result.found).toBe(true);
      expect(result.metrics.directDependentsCount).toBeGreaterThan(0);
      expect(result.metrics.transitiveDependentsCount).toBeGreaterThanOrEqual(
        result.metrics.directDependentsCount,
      );
      expect(result.transitiveRings.length).toBeGreaterThan(0);
      expect(typeof result.metrics.riskScore).toBe('number');
    });

    it('handles non-existent target cleanly', () => {
      const extractor = new ArchitectureExtractor(repoRoot);
      const model = extractor.scan();
      const engine = new BlastRadiusEngine(model);

      const result = engine.computeBlastRadius('non_existent_component_abc');
      expect(result.found).toBe(false);
      expect(result.error).toContain('not found in architectural model');
    });
  });

  describe('Architecture Differ', () => {
    it('detects added entities and external dependencies', () => {
      const baseModel = {
        entities: [{ id: 'mod.a', name: 'a.js', kind: 'module', trustZone: 'internal_service' }],
        relationships: [],
      };
      const headModel = {
        entities: [
          { id: 'mod.a', name: 'a.js', kind: 'module', trustZone: 'internal_service' },
          {
            id: 'ext.stripe',
            name: 'Stripe SaaS',
            kind: 'external_api',
            trustZone: 'external_untrusted',
          },
        ],
        relationships: [
          { id: 'rel.1', sourceId: 'mod.a', targetId: 'ext.stripe', relationType: 'calls' },
        ],
      };

      const differ = new ArchitectureDiffer(baseModel, headModel);
      const diff = differ.compare();

      expect(diff.summary.entitiesAdded).toBe(1);
      expect(diff.summary.relationshipsAdded).toBe(1);
      expect(diff.semanticImpacts.length).toBe(1);
      expect(diff.semanticImpacts[0].type).toBe('NEW_EXTERNAL_DEPENDENCY');
    });

    it('detects trust boundary crossings when public calls isolated datastore directly', () => {
      const baseModel = {
        entities: [
          { id: 'ep.public', name: 'GET /public', kind: 'endpoint', trustZone: 'public_untrusted' },
          {
            id: 'db.prod',
            name: 'Postgres DB',
            kind: 'datastore',
            trustZone: 'isolated_datastore',
          },
        ],
        relationships: [],
      };
      const headModel = {
        entities: [
          { id: 'ep.public', name: 'GET /public', kind: 'endpoint', trustZone: 'public_untrusted' },
          {
            id: 'db.prod',
            name: 'Postgres DB',
            kind: 'datastore',
            trustZone: 'isolated_datastore',
          },
        ],
        relationships: [
          { id: 'rel.bypass', sourceId: 'ep.public', targetId: 'db.prod', relationType: 'reads' },
        ],
      };

      const differ = new ArchitectureDiffer(baseModel, headModel);
      const diff = differ.compare();

      expect(diff.trustBoundaryViolations.length).toBe(1);
      expect(diff.trustBoundaryViolations[0].severity).toBe('CRITICAL');
      expect(diff.summary.riskLevel).toBe('CRITICAL');
    });
  });

  describe('Architecture Health Auditor', () => {
    it('detects circular dependency cycles', () => {
      const modelWithCycle = {
        entities: [
          { id: 'mod.x', name: 'x.js', kind: 'module' },
          { id: 'mod.y', name: 'y.js', kind: 'module' },
          { id: 'mod.z', name: 'z.js', kind: 'module' },
        ],
        relationships: [
          { sourceId: 'mod.x', targetId: 'mod.y' },
          { sourceId: 'mod.y', targetId: 'mod.z' },
          { sourceId: 'mod.z', targetId: 'mod.x' },
        ],
      };

      const auditor = new ArchitectureHealthAuditor(modelWithCycle);
      const report = auditor.audit();

      const cycleSignal = report.signals.find(s => s.code === 'ARCH_CIRCULAR_DEPENDENCY');
      expect(cycleSignal).toBeDefined();
      expect(cycleSignal.severity).toBe('HIGH');
      expect(cycleSignal.entities).toEqual(['mod.x', 'mod.y', 'mod.z', 'mod.x']);
    });
  });
});
