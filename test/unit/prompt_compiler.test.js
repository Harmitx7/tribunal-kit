const { compileSuperPrompt } = require('../../.agent/scripts/prompt_compiler');

describe('prompt_compiler.js', () => {
  describe('compileSuperPrompt()', () => {
    it('should sanitize input containing --- at start of line', () => {
      const input = '---';
      const output = compileSuperPrompt(input);
      // Should not have --- at start of line in the target block
      expect(output).not.toMatch(/\n\s*---/);
    });

    it('should sanitize input containing ... at start of line', () => {
      const input = '...';
      const output = compileSuperPrompt(input);
      // Should not have ... at start of line in the target block
      expect(output).not.toMatch(/\n\s*\.\.\./);
    });

    it('should not alter input containing --- in the middle', () => {
      const input = 'hello --- world';
      const output = compileSuperPrompt(input);
      expect(output).toContain('hello --- world');
    });

    it('should handle input with leading spaces and then ---', () => {
      const input = '   ---';
      const output = compileSuperPrompt(input);
      // Should convert --- to - -- to prevent YAML document start
      expect(output).toContain('\n      - --\n');
    });
  });
});
