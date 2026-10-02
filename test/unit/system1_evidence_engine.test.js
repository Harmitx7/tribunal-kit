'use strict';

const path = require('path');
const {
  collectAndRankEvidence,
  extractChangedSymbols,
  extractBoundedSnippet,
} = require('../../src/system1/evidence_engine');

describe('System-1 Capability 1: Evidence Intelligence', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  describe('Deterministic Symbol & Snippet Extraction', () => {
    test('extracts function and class declarations from diff', () => {
      const diff = `
+function verifyJwtToken(token) {
+  return jwt.verify(token);
+}
+class SessionHandler {
+  constructor() {}
+}
+const authenticateUser = async (req) => {
+  return true;
+};
`;
      const symbols = extractChangedSymbols(diff);
      const names = symbols.map(s => s.name);
      expect(names).toContain('verifyJwtToken');
      expect(names).toContain('SessionHandler');
      expect(names).toContain('authenticateUser');
    });

    test('extractBoundedSnippet limits snippet size around target center', () => {
      const content = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n');
      const snippet = extractBoundedSnippet(content, 25, null, 10);
      const lines = snippet.split('\n');
      expect(lines.length).toBeLessThanOrEqual(10);
      expect(snippet).toContain('line 25');
    });
  });

  describe('Positive Tests: Evidence Ranking & Hierarchy', () => {
    test('ranks changed files and security boundaries with highest scores', () => {
      const result = collectAndRankEvidence({
        repoRoot,
        files: ['src/commands/native.js', 'src/system1/provider.js'],
        task: 'Refactor native command routing and provider session',
        diff: '+function checkSecuritySession() {}',
      });

      expect(result.evidence.length).toBeGreaterThan(0);
      // Top items should be changed files
      expect(result.evidence[0].type).toBe('changed_file');
      expect(result.evidence[0].score).toBeGreaterThanOrEqual(0.95);
      expect(result.evidence[0].reasons.length).toBeGreaterThan(0);
      expect(result.summary.confidence).toBe('L1');
    });

    test('retains mandatory security boundaries even under tight item budget', () => {
      const result = collectAndRankEvidence({
        repoRoot,
        files: ['src/auth/jwt.js'],
        task: 'Update JWT signing key',
        diff: '+ const secret = process.env.JWT_SECRET;',
        maxItems: 2,
      });

      // Directly changed auth file and SECURITY.md are mandatory
      const mandatoryItems = result.evidence.filter(e => e.is_mandatory);
      expect(mandatoryItems.length).toBeGreaterThan(0);
      expect(mandatoryItems.some(e => e.path.includes('jwt') || e.path.includes('SECURITY'))).toBe(
        true,
      );
    });

    test('resolves and scores relevant test suites for changed source files', () => {
      const result = collectAndRankEvidence({
        repoRoot,
        files: ['src/commands/native.js'],
        task: 'Improve native performance',
      });

      const testEvidence = result.evidence.find(e => e.type === 'relevant_test');
      expect(testEvidence).toBeDefined();
      expect(testEvidence.path).toContain('native.test.js');
      expect(testEvidence.score).toBeGreaterThan(0.7);
    });
  });

  describe('Negative & Boundary Tests', () => {
    test('gracefully handles empty, null, or malformed inputs without throwing', () => {
      const emptyResult = collectAndRankEvidence({});
      expect(emptyResult.evidence).toBeDefined();
      expect(emptyResult.summary.total_items_selected).toBeGreaterThanOrEqual(0);

      const malformedResult = collectAndRankEvidence({
        files: [null, undefined, 123, ''],
        task: null,
        diff: null,
      });
      expect(malformedResult.evidence).toBeDefined();
    });

    test('enforces maxTokens budget by truncating lower-scored optional items', () => {
      const result = collectAndRankEvidence({
        repoRoot,
        files: ['src/commands/native.js', 'src/context/ranker.js'],
        task: 'General update',
        maxTokens: 300,
        maxItems: 50,
      });

      expect(result.summary.total_tokens).toBeLessThanOrEqual(300 + 200); // with mandatory tolerance
      if (result.truncated.length > 0) {
        expect(result.truncated[0].score).toBeLessThanOrEqual(result.evidence[0].score);
      }
    });

    test('historical memory and previous findings are ranked appropriately', () => {
      const memory = [
        {
          id: 'mem-1',
          content: 'Native commands require strict parameter validation for flags',
          tags: ['native'],
        },
      ];
      const previousFindings = [
        {
          id: 'find-1',
          severity: 'Critical',
          desc: 'Missing validation in native options parsing',
          location: 'src/commands/native.js:20',
        },
      ];

      const result = collectAndRankEvidence({
        repoRoot,
        files: ['src/commands/native.js'],
        task: 'Fix native options',
        memory,
        previousFindings,
      });

      const findingItem = result.evidence.find(e => e.type === 'previous_finding');
      const memoryItem = result.evidence.find(e => e.type === 'historical_memory');

      expect(findingItem).toBeDefined();
      expect(findingItem.score).toBeGreaterThanOrEqual(0.9);
      expect(memoryItem).toBeDefined();
      expect(memoryItem.score).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe('Adversarial & Epistemic Tests', () => {
    test('adversarial evasion diff with embedded secrets receives high score and warning', () => {
      const result = collectAndRankEvidence({
        repoRoot,
        files: ['README.md'],
        task: 'Fix typo in documentation',
        diff: '+ const apiKey = "sk-live-1234567890abcdef123456";\n+ function auth() {}',
      });

      const symbolItem = result.evidence.find(
        e => e.type === 'changed_symbol' && e.symbol === 'auth',
      );
      expect(symbolItem).toBeDefined();
      expect(symbolItem.score).toBeGreaterThanOrEqual(0.95);
      expect(symbolItem.reasons.some(r => r.includes('high-risk'))).toBe(true);
    });

    test('deterministic sorting is strictly reproducible across repeated executions', () => {
      const options = {
        repoRoot,
        files: ['src/context/ranker.js', 'src/commands/native.js'],
        task: 'Refactor context ranking',
        diff: '+ function computeScore() {}',
      };

      const run1 = collectAndRankEvidence(options);
      const run2 = collectAndRankEvidence(options);

      expect(run1.evidence.map(e => e.id)).toEqual(run2.evidence.map(e => e.id));
      expect(run1.evidence.map(e => e.score)).toEqual(run2.evidence.map(e => e.score));
    });
  });
});
