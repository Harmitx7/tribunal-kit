'use strict';

const { System1Provider } = require('../../src/system1/provider');
const { cmdImpactTier } = require('../../src/commands/native');

describe('Optional Dependencies Graceful Fallback', () => {
  test('System1Provider._initSession throws descriptive MODULE_NOT_FOUND error when @receptron/laya is missing', async () => {
    const provider = new System1Provider();
    // Point layaDir to a non-existent directory to simulate missing @receptron/laya package
    provider.layaDir = '/non/existent/path/for/test';

    await expect(provider._initSession()).rejects.toThrow(/Optional dependency '@receptron\/laya'/);
  });

  test('cmdImpactTier gracefully degrades to deterministic heuristic when System-1 model or optional deps are unavailable', async () => {
    const processArgs = ['node', 'tk', 'impact-tier', '--files', 'package.json', '--lines', '5'];
    // Should return true and exit 0, falling back to deterministic heuristic
    const result = await cmdImpactTier(processArgs, true);
    expect(result).toBe(true);
  });
});
