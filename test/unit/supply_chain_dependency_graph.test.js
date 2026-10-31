'use strict';

const {
  DependencyGraph,
  buildNpmDependencyGraph,
  buildPurl,
} = require('../../src/supply_chain');

const fixtureData = require('../fixtures/supply_chain/supply_chain_dataset_v1.json');

describe('Dependency Graph & Transitive Exposure Engine', () => {
  test('buildPurl generates valid Package URL strings', () => {
    expect(buildPurl('npm', 'lodash', '4.17.21')).toBe('pkg:npm/lodash@4.17.21');
    expect(buildPurl('npm', '@scope/pkg', '1.0.0')).toBe('pkg:npm/@scope/pkg@1.0.0');
    expect(buildPurl('cargo', 'serde', '1.0.197')).toBe('pkg:cargo/serde@1.0.197');
  });

  test('buildNpmDependencyGraph correctly constructs DAG from lockfile v3', () => {
    const graph = buildNpmDependencyGraph(
      fixtureData.validPackageJson,
      fixtureData.validLockfileJson
    );

    const metrics = graph.getMetrics();
    expect(metrics.totalComponents).toBe(4); // lodash, express, debug, ms
    expect(metrics.directComponents).toBe(2); // lodash, express
    expect(metrics.transitiveComponents).toBe(2); // debug, ms
    expect(metrics.hasCycles).toBe(false);
    expect(metrics.maxDepth).toBe(2); // express (0) -> debug (1) -> ms (2)
  });

  test('DependencyGraph detects circular dependencies', () => {
    const graph = new DependencyGraph();

    for (const node of fixtureData.cyclicalGraphNodes) {
      graph.addComponent({
        id: `comp-${node.name}`,
        name: node.name,
        version: node.version,
        purl: `pkg:npm/${node.name}@${node.version}`,
        direct: node.name === 'pkg-a',
        dependencies: node.dependencies,
      });
    }

    graph.addDependencyEdge('pkg-a@1.0.0', 'pkg-b@1.0.0');
    graph.addDependencyEdge('pkg-b@1.0.0', 'pkg-c@1.0.0');
    graph.addDependencyEdge('pkg-c@1.0.0', 'pkg-a@1.0.0');

    const cycleResult = graph.detectCycles();
    expect(cycleResult.hasCycles).toBe(true);
    expect(cycleResult.cyclesCount).toBeGreaterThanOrEqual(1);
    expect(cycleResult.cycles[0]).toContain('pkg-a@1.0.0');
  });

  test('calculates transitive closure & blast radius', () => {
    const graph = buildNpmDependencyGraph(
      fixtureData.validPackageJson,
      fixtureData.validLockfileJson
    );

    const expressClosure = graph.getTransitiveClosure('express@4.18.2');
    expect(expressClosure.transitiveCount).toBe(2); // debug, ms
    expect(expressClosure.transitiveComponents).toContain('debug@2.6.9');
    expect(expressClosure.transitiveComponents).toContain('ms@2.0.0');

    const lodashClosure = graph.getTransitiveClosure('lodash@4.17.21');
    expect(lodashClosure.transitiveCount).toBe(0);
  });

  test('findDependencyChain locates root-to-leaf path', () => {
    const graph = buildNpmDependencyGraph(
      fixtureData.validPackageJson,
      fixtureData.validLockfileJson
    );

    const path = graph.findDependencyChain('ms@2.0.0');
    expect(path).toEqual(['express@4.18.2', 'debug@2.6.9', 'ms@2.0.0']);
  });
});

