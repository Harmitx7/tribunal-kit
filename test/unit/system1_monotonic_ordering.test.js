'use strict';

const { resolveMonotonicImpactTier, cmdImpactTier } = require('../../src/commands/native');

describe('Capability 1: Deterministic Monotonic Impact-Tier Ordering', () => {
  describe('Adversarial Security Fixtures', () => {
    test('Fixture 1: Harmless task + dangerous diff upgrades to Tier 3', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/utils/helpers.js'],
        lines: 10,
        task: 'Fix simple spelling error in comments',
        diff: '+ const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);\n+ db.query("SELECT * FROM users WHERE auth = 1");',
        layaTier: 0, // Even if Laya was tricked by the task description into Tier 0
      });
      expect(tier).toBe(3);
    });

    test('Fixture 2: Dangerous task + harmless documentation diff remains low-risk (Tier 0)', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['docs/architecture.md'],
        lines: 15,
        task: 'Refactor database schema and auth permissions and deploy infrastructure',
        diff: '+ ### Security & Auth Architecture\n+ This document describes our deployment model.',
        layaTier: null,
      });
      // Negative control: pure doc change remains Tier 0 without implementation evidence
      expect(tier).toBe(0);
    });

    test('Fixture 3: Vague task + security-sensitive file upgrades to Tier 3', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/auth/session.ts'],
        lines: 5,
        task: 'update file',
        diff: '+ // updated',
        layaTier: null,
      });
      expect(tier).toBe(3);
    });

    test('Fixture 4: Small auth change (<= 5 lines) is NOT downgraded to Tier 0 or Tier 1', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/auth.js'],
        lines: 3,
        task: 'tweak auth',
        diff: '+ if (!req.auth) return 401;',
        layaTier: null,
      });
      expect(tier).toBe(3);
    });

    test('Fixture 5: Small database change (schema.prisma or sql) upgrades to Tier 3', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['prisma/schema.prisma'],
        lines: 2,
        task: 'add column',
        diff: '+ role String @default("user")',
        layaTier: null,
      });
      expect(tier).toBe(3);
    });

    test('Fixture 6: Small infrastructure change (.github workflow or docker) upgrades to Tier 3', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['.github/workflows/deploy.yml'],
        lines: 4,
        task: 'update ci',
        diff: '+ run: npm publish',
        layaTier: null,
      });
      expect(tier).toBe(3);
    });

    test('Fixture 7: Large harmless documentation change (> 500 lines) remains Tier 0', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['docs/guide.md', 'README.md'],
        lines: 800,
        task: 'Expand getting started user documentation',
        diff: '+ Added 800 lines of user guides and tutorials',
        layaTier: 0,
      });
      expect(tier).toBe(0);
    });

    test('Fixture 8: Mixed-risk multi-file change (docs + auth) upgrades to Tier 3', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['docs/readme.md', 'src/auth/login.js'],
        lines: 20,
        task: 'Update readme and login button',
        diff: '+ update readme\n+ checkLogin()',
        layaTier: null,
      });
      expect(tier).toBe(3);
    });

    test('Fixture 9: Laya result lower than deterministic security evidence is upgraded', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/tokens.js'],
        lines: 10,
        task: 'Handle session token expiration',
        diff: '+ if (isExpired(token)) invalidateSession();',
        layaTier: 1, // Laya model misclassified as Express Pass (Tier 1)
      });
      // Concrete token/session risk evidence upgrades it to Tier 3
      expect(tier).toBe(3);
    });

    test('Fixture 10: Laya result higher than deterministic fallback preserves higher tier', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/utils/calc.js'],
        lines: 15,
        task: 'Refactor complex financial calculation algorithm',
        diff: '+ function computeInterest() { ... }',
        layaTier: 3, // Laya detected severe architectural risk
      });
      // Fallback baseTier is 1, but Laya elevates it to 3
      expect(tier).toBe(3);
    });

    test('Fixture 11: Missing Laya falls back to deterministic heuristic safely', () => {
      const tier1 = resolveMonotonicImpactTier({
        files: ['src/components/Card.jsx'],
        lines: 20,
        task: 'Fix card margin styling and button color',
        diff: '+ className="p-4 bg-white"',
        layaTier: null,
      });
      expect(tier1).toBe(1);

      const tier2 = resolveMonotonicImpactTier({
        files: ['src/components/Card.jsx', 'src/components/Header.jsx'],
        lines: 80,
        task: 'Update card and header layout alignment',
        diff: '+ updated layout',
        layaTier: null,
      });
      expect(tier2).toBe(2);
    });

    test('Fixture 12: Broken / Malformed Laya values (NaN, negative, > 3) are safely ignored', () => {
      const tier = resolveMonotonicImpactTier({
        files: ['src/components/Button.jsx'],
        lines: 10,
        task: 'Change button text',
        diff: '+ <button>Save</button>',
        layaTier: 'corrupted',
      });
      expect(tier).toBe(1);

      const tierNegative = resolveMonotonicImpactTier({
        files: ['src/components/Button.jsx'],
        lines: 10,
        task: 'Change button text',
        diff: '+ <button>Save</button>',
        layaTier: -5,
      });
      expect(tierNegative).toBe(1);

      const tierOverflow = resolveMonotonicImpactTier({
        files: ['src/components/Button.jsx'],
        lines: 10,
        task: 'Change button text',
        diff: '+ <button>Save</button>',
        layaTier: 99,
      });
      expect(tierOverflow).toBe(1);
    });

    test('Fixture 13: Malformed evidence inputs do not throw exceptions', () => {
      expect(() => {
        resolveMonotonicImpactTier({});
        resolveMonotonicImpactTier({ files: null, lines: 'invalid', task: null, diff: undefined });
      }).not.toThrow();
    });
  });

  describe('Monotonicity Invariant Proof', () => {
    test('Invariant: Adding high-risk evidence can only preserve or increase tier, NEVER decrease it', () => {
      const baseline = {
        files: ['src/components/Item.jsx'],
        lines: 15,
        task: 'Update item renderer',
        diff: '+ <div>Item</div>',
        layaTier: null,
      };

      const baselineTier = resolveMonotonicImpactTier(baseline);
      expect(baselineTier).toBe(1);

      // Add database file evidence
      const withDbFile = {
        ...baseline,
        files: [...baseline.files, 'src/db/connection.js'],
      };
      const tierWithDb = resolveMonotonicImpactTier(withDbFile);
      expect(tierWithDb).toBeGreaterThanOrEqual(baselineTier);
      expect(tierWithDb).toBe(3);

      // Add auth diff evidence
      const withAuthDiff = {
        ...baseline,
        diff: baseline.diff + '\n+ const session = req.auth.session;',
      };
      const tierWithAuthDiff = resolveMonotonicImpactTier(withAuthDiff);
      expect(tierWithAuthDiff).toBeGreaterThanOrEqual(baselineTier);
      expect(tierWithAuthDiff).toBe(3);

      // Add lines of change
      const withMoreLines = {
        ...baseline,
        lines: 300,
      };
      const tierWithMoreLines = resolveMonotonicImpactTier(withMoreLines);
      expect(tierWithMoreLines).toBeGreaterThanOrEqual(baselineTier);
      expect(tierWithMoreLines).toBe(3);

      // Add Laya higher tier
      const withLayaUpgrade = {
        ...baseline,
        layaTier: 2,
      };
      const tierWithLaya = resolveMonotonicImpactTier(withLayaUpgrade);
      expect(tierWithLaya).toBeGreaterThanOrEqual(baselineTier);
      expect(tierWithLaya).toBe(2);
    });
  });

  describe('CLI Integration via cmdImpactTier', () => {
    test('cmdImpactTier outputs valid JSON adhering to contract', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const argv = [
        'node',
        'tk',
        'impact-tier',
        '--files',
        'src/auth/jwt.js',
        '--lines',
        '10',
        '--task',
        'Fix JWT expiry',
      ];
      const ok = await cmdImpactTier(argv, true);
      expect(ok).toBe(true);

      const output = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      const parsed = JSON.parse(output);
      expect(parsed).toMatchObject({
        tier: 3,
        tier_name: 'Full Gauntlet',
        file_count: 1,
        line_count: 10,
        socratic_gate: 'required',
      });

      logSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('Adversarial Semantic Variations & Tier Transitions', () => {
    test('Phase 3 Adversarial Semantic Variations are promoted to Tier 3', () => {
      const semanticTasks = [
        'update identity verification',
        'change login trust rules',
        'rotate service credentials',
        'modify database connection handling',
        'change infrastructure provisioning',
        'alter permission inheritance',
        'modify session validation',
        'change secret rotation',
      ];

      for (const task of semanticTasks) {
        const tier = resolveMonotonicImpactTier({
          files: ['src/service.js'],
          lines: 15,
          task,
        });
        expect(tier).toBe(3);
      }
    });

    test('Phase 3 Step Transitions: T0->T0, T1->T1, T1->T2, T1->T3, T2->T2, T2->T3, T3->T3', () => {
      // T0 -> T0: Pure documentation remains Fast-Pass
      expect(resolveMonotonicImpactTier({ files: ['README.md'], lines: 4, task: 'fix typo' })).toBe(
        0,
      );

      // T1 -> T1: Single non-critical file <= 50 lines remains Express Pass
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx'],
          lines: 10,
          task: 'update button color',
        }),
      ).toBe(1);

      // T1 -> T2: Single non-critical file promoted to Targeted Audit via line volume (> 50 lines) or Laya T2
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx'],
          lines: 60,
          task: 'update button layout',
        }),
      ).toBe(2);
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx'],
          lines: 10,
          task: 'update button layout',
          layaTier: 2,
        }),
      ).toBe(2);

      // T1 -> T3: Single file promoted to Full Gauntlet via high-risk file/diff/keyword
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx'],
          lines: 10,
          task: 'update button',
          diff: '+ const jwt = token;',
        }),
      ).toBe(3);

      // T2 -> T2: Multi-file non-critical change remains Targeted Audit
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx', 'src/card.jsx'],
          lines: 40,
          task: 'align widgets',
        }),
      ).toBe(2);

      // T2 -> T3: Multi-file change promoted to Full Gauntlet via schema/secret evidence
      expect(
        resolveMonotonicImpactTier({
          files: ['src/button.jsx', 'prisma/schema.prisma'],
          lines: 40,
          task: 'align widgets',
        }),
      ).toBe(3);

      // T3 -> T3: Full Gauntlet cannot be downgraded by benign wording or T0 Laya output
      expect(
        resolveMonotonicImpactTier({
          files: ['src/auth.js'],
          lines: 5,
          task: 'simple typo',
          layaTier: 0,
        }),
      ).toBe(3);
    });
  });
});
