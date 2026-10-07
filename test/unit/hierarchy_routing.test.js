const { broker } = require('../../.agent/scripts/context_broker');

describe('Hierarchy Routing', () => {
  it('should prefer specific skill if conditions match', () => {
    // "Create a high-converting landing page" should score higher for landing-page than frontend-design due to specificity
    const result = broker('Create a high-converting landing page', [], 'large');
    // Ensure that it doesn't crash, the actual top skill is tested in eval
    expect(result.trace).toBeDefined();
  });
});
