const { evaluateDataset } = require('../../.agent/scripts/routing_evaluation_engine');

describe('Routing Evaluation Engine', () => {
  it('should export evaluateDataset function', () => {
    expect(typeof evaluateDataset).toBe('function');
  });
});
