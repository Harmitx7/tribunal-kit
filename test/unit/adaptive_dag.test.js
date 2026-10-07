const { DynamicCapabilityGraph } = require('../../.agent/scripts/adaptive_execution');

describe('DynamicCapabilityGraph - Phase 4 DAG Compilation', () => {
  it('should support explicit parallel branches', () => {
    const graph = new DynamicCapabilityGraph(['planner']);
    graph.parallel(['frontend-reviewer', 'backend-reviewer'], 'Execute logic checks in parallel');
    graph.addNode('integration-test');

    const nodes = graph.getNodes();
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toBe('planner');
    expect(nodes[1]).toEqual(['frontend-reviewer', 'backend-reviewer']);
    expect(nodes[2]).toBe('integration-test');

    // Test hasNode functionality
    expect(graph.hasNode('frontend-reviewer')).toBe(true);
    expect(graph.hasNode('integration-test')).toBe(true);
  });

  it('should support explicit handoffs', () => {
    const graph = new DynamicCapabilityGraph(['researcher', 'writer']);
    graph.handoff('researcher', 'fact-checker', 'Fact checker needed before writing');

    const nodes = graph.getNodes();
    expect(nodes).toEqual(['researcher', 'fact-checker', 'writer']);
  });

  it('should prevent cycles natively and validate DAG depth', () => {
    const graph = new DynamicCapabilityGraph(['nodeA']);
    // Trying to add nodeA again will be ignored natively
    graph.addNode('nodeA');
    expect(graph.getNodes()).toEqual(['nodeA']);

    graph.addNode('nodeB');
    graph.addNode('nodeC');

    expect(graph.validateDAG(10)).toBe(true);

    // Enforce maxDepth
    expect(() => graph.validateDAG(2)).toThrow(/depth of 2 exceeded/);
  });

  it('should prevent handoffs from duplicating nodes', () => {
    const graph = new DynamicCapabilityGraph(['nodeA', 'nodeB']);
    graph.handoff('nodeA', 'nodeB'); // nodeB already exists, shouldn't handoff again
    expect(graph.getNodes()).toEqual(['nodeA', 'nodeB']);
  });
});
