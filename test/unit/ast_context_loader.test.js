/**
 * ast_context_loader.test.js - Tests for AST Context Loader
 */

const { getContext } = require('../../.agent/scripts/ast_context_loader');
const path = require('path');
const fs = require('fs');

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(p => {
      if (p.endsWith('graph.json')) return true;
      return originalFs.existsSync(p);
    }),
    readFileSync: jest.fn((p, enc) => {
      if (p.endsWith('graph.json')) {
        return JSON.stringify({
          nodes: [
            { file_path: 'src/index.js', imports: ['./utils.js'] },
            { file_path: 'src/utils.js', imports: ['./config.js'] },
            { file_path: 'src/config.js', imports: [] },
          ],
        });
      }
      return originalFs.readFileSync(p, enc);
    }),
    renameSync: jest.fn((a, b) => {
      // Mock rename for the error test
      if (a.endsWith('graph.json') || a.endsWith('graph.json.bak')) return;
      originalFs.renameSync(a, b);
    }),
  };
});

// Helper to normalize paths for comparison (ast_context_loader normalizes to forward slashes)
function normalizeForComparison(p) {
  return p.replace(/\\/g, '/');
}

describe('ast_context_loader.js', () => {
  const projectRoot = path.join(__dirname, '..', '..');

  describe('getContext()', () => {
    it('should return error when graph.json not found', () => {
      // Override the mock temporarily for this test
      fs.existsSync.mockImplementationOnce(p => {
        if (p.endsWith('graph.json')) return false;
        return jest.requireActual('fs').existsSync(p);
      });

      const result = getContext(projectRoot, 'src/index.js');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Graph not found');
    });

    it('should find dependencies and dependents', () => {
      const result = getContext(projectRoot, 'src/index.js');

      // Should not have error
      expect(result).not.toHaveProperty('error');

      // Should have target
      expect(result).toHaveProperty('target');
      expect(normalizeForComparison(result.target)).toBe(
        normalizeForComparison(path.join(projectRoot, 'src/index.js')),
      );

      // Should find utils.js as dependency
      expect(result.dependencies.map(normalizeForComparison)).toContain(
        normalizeForComparison(path.join(projectRoot, 'src/utils.js')),
      );

      // Should find config.js as transitive dependency
      expect(result.dependencies.map(normalizeForComparison)).toContain(
        normalizeForComparison(path.join(projectRoot, 'src/config.js')),
      );

      // Should have empty dependents for index.js (nothing imports it in current graph)
      expect(result.dependents).toEqual([]);
    });

    it('should handle circular dependencies', () => {
      const result = getContext(projectRoot, 'src/utils.js');

      expect(result).not.toHaveProperty('error');
      expect(normalizeForComparison(result.target)).toBe(
        normalizeForComparison(path.join(projectRoot, 'src/utils.js')),
      );

      // Should find config.js as dependency
      expect(result.dependencies.map(normalizeForComparison)).toContain(
        normalizeForComparison(path.join(projectRoot, 'src/config.js')),
      );

      // Should find index.js as dependent (since index.js imports utils.js)
      expect(result.dependents.map(normalizeForComparison)).toContain(
        normalizeForComparison(path.join(projectRoot, 'src/index.js')),
      );
    });
  });
});
