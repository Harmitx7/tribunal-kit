const {
  verifyChecksum,
  evaluateDataset,
} = require('../../.agent/scripts/routing_evaluation_engine');

describe('Ground Truth Validator', () => {
  it('should verify dataset checksum', () => {
    const dataset = {
      cases: [{ id: '1', request: 'test', expected: { primary_skill: 'test' } }],
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // invalid
    };
    expect(() => verifyChecksum(dataset)).toThrow('Dataset checksum verification failed');
  });
});
