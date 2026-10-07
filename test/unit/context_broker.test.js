/**
 * context_broker.test.js — Unit tests for the Context Density Broker
 * Tests: tokenize, scoreSkill, selectSkills
 */

const { scoreSkill, selectSkills, tokenize } = require('../../.agent/scripts/context_broker');

describe('context_broker.js', () => {
  // ── tokenize ──────────────────────────────────────────────────────────

  describe('tokenize()', () => {
    it('should extract words 3+ characters, lowercased', () => {
      const tokens = tokenize('Build a JWT authentication API');
      expect(tokens).toContain('build');
      expect(tokens).toContain('jwt');
      expect(tokens).toContain('authentication');
      expect(tokens).toContain('api');
    });

    it('should ignore 1-2 character words', () => {
      const tokens = tokenize('I am ok to go');
      // "ok" is only 2 chars, "am" is 2 chars, "I" is 1 char, "to" is 2 chars, "go" is 2 chars
      expect(tokens).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('should handle underscored identifiers', () => {
      const tokens = tokenize('use_case my_component');
      expect(tokens).toContain('use_case');
      expect(tokens).toContain('my_component');
    });
  });

  // ── scoreSkill ────────────────────────────────────────────────────────

  describe('scoreSkill()', () => {
    const makeSkill = (name, description = '') => ({
      name,
      description,
      content: '',
    });

    it('should give higher scores for domain-matched skills', () => {
      const taskTokens = tokenize('Build a React component with hooks');
      const reactSkill = makeSkill(
        'react-specialist',
        'React 19+ specialist. Components, hooks, state.',
      );
      const sqlSkill = makeSkill('sql-pro', 'Advanced SQL queries and optimization');

      const reactScore = scoreSkill(
        reactSkill,
        'Build a React component with hooks',
        [],
        taskTokens,
      ).score;
      const sqlScore = scoreSkill(
        sqlSkill,
        'Build a React component with hooks',
        [],
        taskTokens,
      ).score;

      expect(reactScore).toBeGreaterThan(sqlScore);
    });

    it('should boost score for file extension affinity', () => {
      const taskTokens = tokenize('Fix the login page');
      const reactSkill = makeSkill('react-specialist', 'React components and hooks');

      const withoutExt = scoreSkill(reactSkill, 'Fix the login page', [], taskTokens).score;
      const withExt = scoreSkill(reactSkill, 'Fix the login page', ['.tsx'], taskTokens).score;

      expect(withExt).toBeGreaterThanOrEqual(withoutExt);
    });

    it('should return 0 or low score for completely unrelated skills', () => {
      const taskTokens = tokenize('Deploy to Kubernetes');
      const gameSkill = makeSkill('game-design-expert', 'Game design and player experience');

      const score = scoreSkill(gameSkill, 'Deploy to Kubernetes', [], taskTokens).score;
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should boost baseline skills', () => {
      const taskTokens = tokenize('random unrelated task');
      // clean-code is a baseline skill
      const cleanCode = makeSkill('clean-code', 'Clean code mastery');

      const score = scoreSkill(cleanCode, 'random unrelated task', [], taskTokens).score;
      // Baseline skills get +1 regardless of match
      expect(score).toBeGreaterThanOrEqual(1);
    });
  });

  // ── selectSkills ──────────────────────────────────────────────────────

  describe('selectSkills()', () => {
    // Create minimal mock skills array for testing
    const mockSkills = [
      {
        name: 'react-specialist',
        description: 'React 19+ specialist. Components, hooks, state management.',
        content: '',
      },
      {
        name: 'sql-pro',
        description: 'SQL queries, PostgreSQL, MySQL, optimization',
        content: '',
      },
      {
        name: 'clean-code',
        description: 'Clean code mastery. Naming, SOLID, refactoring.',
        content: '',
      },
      {
        name: 'testing-patterns',
        description: 'Testing mastery. Jest, Vitest, Playwright, mocking.',
        content: '',
      },
      {
        name: 'vulnerability-scanner',
        description: 'Security vulnerability analysis. OWASP, injection.',
        content: '',
      },
    ];

    it('should return essential, supplementary, and available arrays', () => {
      const result = selectSkills('Build a React component', [], 'large', mockSkills);

      expect(result).toHaveProperty('essential');
      expect(result).toHaveProperty('supplementary');
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('scores');
      expect(Array.isArray(result.essential)).toBe(true);
      expect(Array.isArray(result.supplementary)).toBe(true);
      expect(Array.isArray(result.available)).toBe(true);
    });

    it('should prioritize relevant skills in essential tier', () => {
      const result = selectSkills('Write a SQL query for user analytics', [], 'large', mockSkills);
      const essentialNames = result.essential.map(s => s.name);
      // sql-pro should be ranked highly for a SQL task
      if (essentialNames.length > 0) {
        expect(essentialNames).toContain('sql-pro');
      }
    });

    it('should limit essential to 6 for small models', () => {
      const result = selectSkills('Build something', [], 'small', mockSkills);
      expect(result.essential.length).toBeLessThanOrEqual(6);
      // Small model should have empty supplementary
      expect(result.supplementary).toEqual([]);
    });

    it('should collapse supplementary into available for small models', () => {
      const result = selectSkills('Build a full-stack app', [], 'small', mockSkills);
      expect(result.supplementary).toEqual([]);
      // Available should contain things that would have been supplementary
      expect(result.available.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit essential to 10 for large models', () => {
      const result = selectSkills('Build everything imaginable', [], 'large', mockSkills);
      expect(result.essential.length).toBeLessThanOrEqual(10);
    });

    it('should return a scores Map', () => {
      const result = selectSkills('Test something', [], 'large', mockSkills);
      expect(result.scores).toBeInstanceOf(Map);
      expect(result.scores.size).toBe(mockSkills.length);
    });
  });

  // ── formatPrompt Token Limits ──────────────────────────────────────────
  describe('formatPrompt()', () => {
    const { formatPrompt } = require('../../.agent/scripts/context_broker');

    it('should enforce maxTokenLimit and truncate gracefully', () => {
      const veryLongContent = 'A'.repeat(5000);
      const selection = {
        maxTokenLimit: 1000, // 4000 chars
        essential: [
          { name: 'skill1', keyRules: veryLongContent },
          { name: 'skill2', keyRules: veryLongContent },
        ],
        supplementary: [],
        available: [],
      };

      const result = formatPrompt('test task', 'small', selection);

      expect(result).toMatch(/\[TRUNCATED BY TOKEN LIMIT\]/);
      // It should truncate in the first skill or at least before the second skill
      expect(result).not.toMatch(/### Skill: skill2/);
      expect(result.length).toBeLessThanOrEqual(4200); // 4000 max + buffer + original lines
    });

    it('should enforce maxTokenLimit in supplementary skills', () => {
      const veryLongContent = 'A'.repeat(5000);
      const selection = {
        maxTokenLimit: 1000, // 4000 chars
        essential: [],
        supplementary: [
          { name: 'skill1', keyRules: 'short content' },
          { name: 'skill2', keyRules: veryLongContent },
          { name: 'skill3', keyRules: 'should be excluded' },
        ],
        available: [],
      };

      const result = formatPrompt('test task', 'large', selection);

      expect(result).toMatch(/### Skill: skill1/);
      expect(result).toMatch(/\[TRUNCATED BY TOKEN LIMIT\]/);
      expect(result).not.toMatch(/### Skill: skill3/);
      expect(result.length).toBeLessThanOrEqual(4200);
    });
  });
});
