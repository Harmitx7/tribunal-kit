
const { testOnlyHelper } = require('../src/index');
test('testOnlyHelper', () => {
  expect(testOnlyHelper()).toBe('test_only');
});
