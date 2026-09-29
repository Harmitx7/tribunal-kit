'use strict';

/**
 * system1_15_fixtures.test.js — Full 15-Fixture Integrated End-to-End Suite
 * =========================================================================
 * Phase 6 & Phase 7 of System-1 Audit:
 * Evaluates the complete, integrated System-1 pipeline across 15 standard
 * fixtures (3 Low, 4 Medium, 7 High, 1 Adversarial) spanning:
 *
 * Request → Impact Tier → Context Ranking → Deterministic Checks
 * → Reviewer/LLM Claims → Claim/Check Reconciliation → Human Gate
 * → Observation → Evolution Proposal
 *
 * For every fixture, records:
 * 1. input
 * 2. impact tier
 * 3. selected context
 * 4. mandatory context
 * 5. deterministic checks
 * 6. LLM claims
 * 7. conflicts
 * 8. final disposition
 * 9. evolution observation
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { resolveMonotonicImpactTier } = require('../../src/commands/native');
const { rankContext } = require('../../src/context/ranker');
const {
  createImplementationCheck,
  createEvidenceClaim,
  synthesizeReviewResults,
} = require('../../src/synthesis/claim_check_separator');
const {
  createEvolutionProposal,
  validateEvolutionProposal,
  saveEvolutionProposal,
  approveEvolutionProposal,
} = require('../../src/evolution/engine');

describe('System-1 Phase 6: 15-Fixture End-to-End Integration Matrix', () => {
  let tmpRepo;
  const fixtureRecords = [];

  beforeAll(() => {
    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-15fix-test-'));

    // Create realistic repository structure
    fs.mkdirSync(path.join(tmpRepo, 'src', 'auth'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'middleware'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'db'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'vault'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'security'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'api'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'validators'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'schemas'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'styles'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, '.github', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'prisma'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'test'), { recursive: true });

    // Populate mock files
    fs.writeFileSync(path.join(tmpRepo, 'SECURITY.md'), '# Security Policy\nContact: sec@org.com\n');
    fs.writeFileSync(path.join(tmpRepo, 'package.json'), '{\n  "name": "fixture-app",\n  "version": "1.0.0"\n}\n');
    fs.writeFileSync(path.join(tmpRepo, 'jest.config.js'), 'module.exports = { testTimeout: 5000 };\n');
    fs.writeFileSync(path.join(tmpRepo, 'README.md'), '# Fixture App\nOverview of application.\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'styles', 'theme.css'), 'button { color: #000; }\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'components', 'SubmitButton.jsx'), 'export const Btn = () => <button>Submit</button>;\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'api', 'products.js'), 'module.exports = { getProducts: () => [] };\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'validators', 'user_age.js'), 'module.exports = { isAgeValid: () => true };\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'schemas', 'user.js'), 'module.exports = { schema: {} };\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'auth', 'jwt.js'), 'module.exports = { signToken: () => "t" };\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'middleware', 'rbac.js'), 'module.exports = { checkRole: () => true };\n');
    fs.writeFileSync(path.join(tmpRepo, 'prisma', 'schema.prisma'), 'model User { id Int @id }\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'db', 'billing.sql'), 'SELECT * FROM billing;\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'vault', 'secrets.js'), 'module.exports = { getSecret: () => "s" };\n');
    fs.writeFileSync(path.join(tmpRepo, '.github', 'workflows', 'deploy.yml'), 'name: Deploy\non: push\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'security', 'crypto_policy.js'), 'module.exports = { algo: "aes" };\n');
    fs.writeFileSync(path.join(tmpRepo, 'docs', 'readme.md'), '# Documentation\nDetails.\n');
    fs.writeFileSync(path.join(tmpRepo, 'src', 'auth', 'token_verifier.js'), 'module.exports = { verify: () => true };\n');
  });

  afterAll(() => {
    if (fs.existsSync(tmpRepo)) {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    }
  });

  /**
   * Helper that executes the unified System-1 pipeline for a fixture
   */
  function runSystem1Pipeline(fixture) {
    // Stage 1: Deterministic Impact Tier
    const impactTier = resolveMonotonicImpactTier({
      files: fixture.files,
      lines: fixture.lines,
      task: fixture.task,
      diff: fixture.diff,
      layaTier: fixture.layaTier,
    });

    // Stage 2: Deterministic Context Ranking
    const rankResult = rankContext({
      repoRoot: tmpRepo,
      targetFiles: fixture.files,
      candidateFiles: [
        'SECURITY.md',
        'package.json',
        ...fixture.files,
        'docs/readme.md',
      ],
      maxItems: 4,
    });

    const selectedContext = rankResult.ranked_items.map(i => i.path);
    const mandatoryContext = rankResult.ranked_items.filter(i => i.is_mandatory).map(i => i.path);

    // Stage 3 & 4: Checks vs Claims Synthesis
    const synthesis = synthesizeReviewResults({
      checks: fixture.deterministicChecks || [],
      claims: fixture.reviewerClaims || [],
    });

    // Stage 5: Human Gate & Disposition
    let finalDisposition = 'REJECTED';
    if (synthesis.summary.verdict === 'VERIFIED') {
      finalDisposition = impactTier === 3 ? 'AWAITING_HUMAN_GATE' : 'APPROVED_FOR_EXECUTION';
    } else if (synthesis.summary.verdict === 'FAILED_CHECKS') {
      finalDisposition = 'BLOCKED_BY_CHECKS';
    } else if (synthesis.summary.verdict === 'CONFLICT') {
      finalDisposition = 'AWAITING_CONFLICT_RESOLUTION';
    }

    // Stage 6: Evolution Observation
    const evolutionObservation = {
      observable: `Pipeline executed for tier ${impactTier}`,
      candidateTarget: impactTier === 0 ? 'fast-pass-rules' : 'reviewer-routing',
      eligibleForEvolution: synthesis.summary.verdict === 'VERIFIED',
    };

    const record = {
      id: fixture.id,
      category: fixture.category,
      name: fixture.name,
      input: {
        task: fixture.task,
        files: fixture.files,
        lines: fixture.lines,
      },
      impactTier,
      selectedContext,
      mandatoryContext,
      deterministicChecks: fixture.deterministicChecks ? fixture.deterministicChecks.map(c => `${c.check}:${c.result}`) : [],
      llmClaims: fixture.reviewerClaims ? fixture.reviewerClaims.map(c => `${c.reviewer}:${c.assertion.slice(0, 35)}...`) : [],
      conflicts: synthesis.conflicts.map(cf => cf.type),
      finalDisposition,
      evolutionObservation,
    };

    fixtureRecords.push(record);
    return { impactTier, rankResult, synthesis, finalDisposition, record };
  }

  // --- LOW RISK FIXTURES ---
  describe('Low Risk Fixtures', () => {
    test('Fixture 1: README modification', () => {
      const { impactTier, finalDisposition, record } = runSystem1Pipeline({
        id: 1,
        category: 'LOW_RISK',
        name: 'README modification',
        task: 'Fix typos and formatting in README.md',
        files: ['README.md'],
        lines: 4,
        diff: '+ Fix typo in section 2\n- Fix typpo in section 2',
        layaTier: 0,
        deterministicChecks: [
          createImplementationCheck({ check: 'lint', command: 'node lint_runner.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'documentation-writer', assertion: 'Markdown grammar corrected' }),
        ],
      });

      expect(impactTier).toBe(0);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
      expect(record.mandatoryContext).toContain('README.md');
    });

    test('Fixture 2: CSS-only change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 2,
        category: 'LOW_RISK',
        name: 'CSS-only change',
        task: 'Update button hover background color in stylesheet',
        files: ['src/styles/theme.css'],
        lines: 3,
        diff: '+ button:hover { background-color: #3b82f6; }\n- button:hover { background-color: #1d4ed8; }',
        layaTier: 0,
        deterministicChecks: [
          createImplementationCheck({ check: 'lint', command: 'node lint_runner.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'ui-ux-auditor', assertion: 'Hover color meets contrast guidelines' }),
        ],
      });

      expect(impactTier).toBe(0);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });

    test('Fixture 3: UI text change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 3,
        category: 'LOW_RISK',
        name: 'UI text change',
        task: 'Change label text on submit button',
        files: ['src/components/SubmitButton.jsx'],
        lines: 2,
        diff: '+ <button>Submit Order</button>\n- <button>Submit</button>',
        layaTier: 1,
        deterministicChecks: [
          createImplementationCheck({ check: 'lint', command: 'node lint_runner.js', result: 'PASSED' }),
          createImplementationCheck({ check: 'test', command: 'node test_runner.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'frontend-specialist', assertion: 'Label updated cleanly without style breaks' }),
        ],
      });

      expect(impactTier).toBeLessThanOrEqual(1);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });
  });

  // --- MEDIUM RISK FIXTURES ---
  describe('Medium Risk Fixtures', () => {
    test('Fixture 4: API pagination', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 4,
        category: 'MEDIUM_RISK',
        name: 'API pagination',
        task: 'Add limit and cursor pagination parameters to getProducts endpoint',
        files: ['src/api/products.js'],
        lines: 22,
        diff: '+ const { limit = 20, cursor } = req.query;\n+ const items = fetchPage(cursor, limit);',
        layaTier: 2,
        deterministicChecks: [
          createImplementationCheck({ check: 'api_tests', command: 'npm test api', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'api-architect', assertion: 'Pagination params comply with REST guidelines' }),
        ],
      });

      expect(impactTier).toBe(2);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });

    test('Fixture 5: Backend validation change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 5,
        category: 'MEDIUM_RISK',
        name: 'Backend validation change',
        task: 'Update user age validation check to reject values over 120',
        files: ['src/validators/user_age.js'],
        lines: 15,
        diff: '+ const isAgeValid = (age) => age >= 0 && age <= 120;',
        layaTier: 2,
        deterministicChecks: [
          createImplementationCheck({ check: 'validation_tests', command: 'npm test validate', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'backend-specialist', assertion: 'Age bounds correctly restricted' }),
        ],
      });

      expect(impactTier).toBe(2);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });

    test('Fixture 6: Configuration modification', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 6,
        category: 'MEDIUM_RISK',
        name: 'Configuration modification',
        task: 'Update jest test timeout in configuration',
        files: ['jest.config.js'],
        lines: 5,
        diff: '+ module.exports = { testTimeout: 10000 };',
        layaTier: 2,
        deterministicChecks: [
          createImplementationCheck({ check: 'lint', command: 'node lint_runner.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'devops-engineer', assertion: 'Jest timeout adjusted safely' }),
        ],
      });

      expect(impactTier).toBe(2);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });

    test('Fixture 7: Dependency update', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 7,
        category: 'MEDIUM_RISK',
        name: 'Dependency update',
        task: 'Bump date-fns package from 2.29.0 to 2.30.0 in package.json',
        files: ['package.json'],
        lines: 6,
        diff: '+   "date-fns": "^2.30.0"\n-   "date-fns": "^2.29.0"',
        layaTier: 2,
        deterministicChecks: [
          createImplementationCheck({ check: 'dependency_audit', command: 'node dependency_analyzer.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'dependency-reviewer', assertion: 'No CVEs detected in date-fns 2.30.0' }),
        ],
      });

      expect(impactTier).toBe(2);
      expect(finalDisposition).toBe('APPROVED_FOR_EXECUTION');
    });
  });

  // --- HIGH RISK FIXTURES ---
  describe('High Risk Fixtures', () => {
    test('Fixture 8: Authentication change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 8,
        category: 'HIGH_RISK',
        name: 'Authentication change',
        task: 'Update JWT token generation and session expiration logic',
        files: ['src/auth/jwt.js'],
        lines: 18,
        diff: "+ const token = jwt.sign({ id: user.id }, secret, { expiresIn: '1h' });",
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'security_scan', command: 'node security_scan.js', result: 'PASSED' }),
          createImplementationCheck({ check: 'auth_tests', command: 'npm test auth', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'security-auditor', assertion: 'JWT expiration correctly enforced' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE'); // High-risk Tier 3 requires Human Gate
    });

    test('Fixture 9: Authorization change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 9,
        category: 'HIGH_RISK',
        name: 'Authorization change',
        task: 'Add RBAC role check for administrative dashboard endpoint',
        files: ['src/middleware/rbac.js'],
        lines: 12,
        diff: "+ if (!req.user.roles.includes('ADMIN')) throw new UnauthorizedError();",
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'rbac_tests', command: 'npm test rbac', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'security-auditor', assertion: 'RBAC boundary verified' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });

    test('Fixture 10: Database schema change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 10,
        category: 'HIGH_RISK',
        name: 'Database schema change',
        task: 'Add foreign key relation from orders to users in prisma schema',
        files: ['prisma/schema.prisma'],
        lines: 14,
        diff: '+   user User @relation(fields: [userId], references: [id])',
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'schema_validator', command: 'node schema_validator.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'database-architect', assertion: 'Schema relationship valid and indexable' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });

    test('Fixture 11: SQL query change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 11,
        category: 'HIGH_RISK',
        name: 'SQL query change',
        task: 'Optimize user billing report aggregation query',
        files: ['src/db/billing.sql'],
        lines: 10,
        diff: '+ SELECT u.id, SUM(b.amount) FROM users u JOIN billing b ON u.id = b.user_id GROUP BY u.id;',
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'sql_security_scan', command: 'node security_scan.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'sql-pro', assertion: 'Query syntax and joins validated' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });

    test('Fixture 12: Secret-management change', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 12,
        category: 'HIGH_RISK',
        name: 'Secret-management change',
        task: 'Update encryption key retrieval from KMS vault',
        files: ['src/vault/secrets.js'],
        lines: 16,
        diff: '+ const masterKey = await kms.decrypt({ CiphertextBlob: encryptedSecret });',
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'vault_tests', command: 'npm test vault', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'security-auditor', assertion: 'KMS decrypt follows zero-trust pattern' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });

    test('Fixture 13: Docker/CI modification', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 13,
        category: 'HIGH_RISK',
        name: 'Docker/CI modification',
        task: 'Update GitHub Actions workflow to build release container',
        files: ['.github/workflows/deploy.yml'],
        lines: 20,
        diff: '+   - name: Docker Build\n+     run: docker build -t app:v2 .',
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'cicd_validator', command: 'node cicd_validator.js', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'devops-engineer', assertion: 'CI build step conforms to syntax standard' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });

    test('Fixture 14: Crypto/security-policy modification', () => {
      const { impactTier, finalDisposition } = runSystem1Pipeline({
        id: 14,
        category: 'HIGH_RISK',
        name: 'Crypto/security-policy modification',
        task: 'Enforce AES-256-GCM cipher suite in TLS configuration',
        files: ['src/security/crypto_policy.js'],
        lines: 15,
        diff: "+ const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);",
        layaTier: 3,
        deterministicChecks: [
          createImplementationCheck({ check: 'crypto_tests', command: 'npm test crypto', result: 'PASSED' }),
        ],
        reviewerClaims: [
          createEvidenceClaim({ reviewer: 'security-auditor', assertion: 'AES-256-GCM authenticated cipher verified' }),
        ],
      });

      expect(impactTier).toBe(3);
      expect(finalDisposition).toBe('AWAITING_HUMAN_GATE');
    });
  });

  // --- ADVERSARIAL FIXTURE ---
  describe('Adversarial Fixtures', () => {
    test('Fixture 15: Benign wording + dangerous diff', () => {
      const failingSecCheck = createImplementationCheck({
        check: 'security_scan',
        command: 'node security_scan.js',
        result: 'FAILED',
        details: 'CWE-89: SQL Injection detected in auth query',
      });

      const misleadingClaim = createEvidenceClaim({
        reviewer: 'untrusted-reviewer',
        assertion: 'Security scan approved, no vulnerabilities detected in diff.',
        category: 'security',
      });

      const { impactTier, finalDisposition, synthesis, record } = runSystem1Pipeline({
        id: 15,
        category: 'ADVERSARIAL',
        name: 'Benign wording + dangerous diff',
        task: 'Fix punctuation and typos in documentation comments',
        files: ['docs/readme.md', 'src/auth/token_verifier.js'],
        lines: 8,
        diff: '+ // bypass auth check\n+ if (req.headers["x-bypass"]) return next();\n+ const sql = "SELECT * FROM users WHERE token = " + req.query.token;',
        layaTier: 0, // Model was deceived by task description
        deterministicChecks: [failingSecCheck],
        reviewerClaims: [misleadingClaim],
      });

      // 1. Impact tier MUST upgrade to Tier 3 despite benign wording and Laya T0
      expect(impactTier).toBe(3);

      // 2. Deterministic check failure MUST override misleading reviewer claim
      expect(synthesis.summary.verdict).toBe('FAILED_CHECKS');
      expect(finalDisposition).toBe('BLOCKED_BY_CHECKS');

      // 3. Conflict must be detected and recorded
      expect(record.conflicts).toContain('CHECK_FAILED_CLAIM_PASSED');

      // 4. Security boundary must be retained in context
      expect(record.mandatoryContext).toContain('SECURITY.md');
      expect(record.mandatoryContext).toContain('src/auth/token_verifier.js');
    });
  });

  // --- MATRIX COMPLETION VERIFICATION ---
  test('Complete 15-fixture matrix was executed and recorded', () => {
    expect(fixtureRecords.length).toBe(15);
    for (const rec of fixtureRecords) {
      expect(rec.id).toBeDefined();
      expect(rec.category).toBeDefined();
      expect(rec.name).toBeDefined();
      expect(rec.impactTier).toBeGreaterThanOrEqual(0);
      expect(rec.impactTier).toBeLessThanOrEqual(3);
      expect(Array.isArray(rec.selectedContext)).toBe(true);
      expect(Array.isArray(rec.mandatoryContext)).toBe(true);
      expect(Array.isArray(rec.deterministicChecks)).toBe(true);
      expect(Array.isArray(rec.llmClaims)).toBe(true);
      expect(rec.finalDisposition).toBeDefined();
      expect(rec.evolutionObservation).toBeDefined();
    }
  });

  // --- PHASE 7: CROSS-CAPABILITY INVARIANTS ---
  describe('Phase 7: Cross-Capability Invariants', () => {
    test('Invariant 1 — Risk Cannot Decrease: Adding dangerous evidence cannot lower tier', () => {
      const baseOptions = {
        files: ['src/components/SubmitButton.jsx'],
        lines: 10,
        task: 'change button label',
        diff: '+ <button>OK</button>',
        layaTier: 1,
      };

      const baseTier = resolveMonotonicImpactTier(baseOptions);
      expect(baseTier).toBe(1);

      // Add dangerous auth file
      const withAuthFile = resolveMonotonicImpactTier({
        ...baseOptions,
        files: [...baseOptions.files, 'src/auth/jwt.js'],
      });
      expect(withAuthFile).toBeGreaterThanOrEqual(baseTier);
      expect(withAuthFile).toBe(3);

      // Add dangerous secret diff
      const withSecretDiff = resolveMonotonicImpactTier({
        ...baseOptions,
        diff: '+ const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret";',
      });
      expect(withSecretDiff).toBeGreaterThanOrEqual(baseTier);
      expect(withSecretDiff).toBe(3);

      // Add high Laya tier
      const withHigherLaya = resolveMonotonicImpactTier({
        ...baseOptions,
        layaTier: 3,
      });
      expect(withHigherLaya).toBeGreaterThanOrEqual(baseTier);
      expect(withHigherLaya).toBe(3);
    });

    test('Invariant 2 — Critical Evidence Cannot Disappear: Security boundary survives budget limit', () => {
      const candidates = [
        'SECURITY.md',
        'src/auth/jwt.js',
        'docs/readme.md',
        'src/components/SubmitButton.jsx',
        'package.json',
        'test/sample.test.js',
      ];

      // Very constrained budget: only 2 items
      const ranked = rankContext({
        repoRoot: tmpRepo,
        targetFiles: ['src/auth/jwt.js'],
        candidateFiles: candidates,
        maxItems: 2,
      });

      expect(ranked.ranked_items.length).toBe(2);
      const paths = ranked.ranked_items.map(i => i.path);
      // Both mandatory items must be retained
      expect(paths).toContain('SECURITY.md');
      expect(paths).toContain('src/auth/jwt.js');
      expect(ranked.metrics.critical_evidence_retained).toBe(2);
    });

    test('Invariant 3 — Claims Cannot Become Facts: Unverified LLM claims cannot self-upgrade to VERIFIED', () => {
      const glowingClaims = [
        createEvidenceClaim({ reviewer: 'reviewer-1', assertion: 'Code is 100% bug-free and tested', confidence: 0.999 }),
        createEvidenceClaim({ reviewer: 'reviewer-2', assertion: 'Security approved with zero issues', confidence: 0.999 }),
        createEvidenceClaim({ reviewer: 'reviewer-3', assertion: 'Performance is optimal', confidence: 0.999 }),
      ];

      // Synthesis with zero deterministic checks
      const synthesis = synthesizeReviewResults({
        checks: [],
        claims: glowingClaims,
      });

      expect(synthesis.summary.verdict).toBe('CLAIMED');
      expect(synthesis.summary.verdict).not.toBe('VERIFIED');
      expect(synthesis.verified_items.length).toBe(0);
      expect(synthesis.claimed_items.length).toBe(3);
    });

    test('Invariant 4 — Evolution Cannot Self-Authorize: Proposals cannot modify behavior without Human Gate', () => {
      const tmpAgent = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-inv4-'));

      const proposal = createEvolutionProposal({
        target: 'reviewer-routing',
        currentBehavior: 'Run 7 reviewers',
        observedEvidence: 'Telemetry showed 0 findings on 100 benchmark runs',
        proposedChange: 'Skip accessibility reviewer on backend routes',
        expectedEffect: 'Faster turnaround',
        risk: 'LOW',
        testsRequired: ['test/unit/native.test.js'],
        regressionRequirements: ['Backend checks still pass'],
        evidenceType: 'DETERMINISTIC_TELEMETRY',
      });

      saveEvolutionProposal(proposal, tmpAgent);

      // Proposal status is strictly PROPOSED upon creation
      expect(proposal.status).toBe('PROPOSED');
      expect(proposal.approval).toBeNull();

      // Only explicit human approval clears the Human Gate
      const approved = approveEvolutionProposal(proposal.proposal_id, 'Lead Engineer', tmpAgent);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approval.human_gate_cleared).toBe(true);
      expect(approved.approval.approved_by).toBe('Lead Engineer');

      fs.rmSync(tmpAgent, { recursive: true, force: true });
    });

    test('Invariant 5 — Security Boundaries Cannot Self-Evolve: Protected boundaries are hard-blocked', () => {
      const forbiddenTargets = [
        'security-boundaries',
        'shell-execution-policy',
        'package-integrity',
        'dependency-pinning',
        'human-gate',
        'system1-trust-boundary',
        'production-security',
      ];

      for (const target of forbiddenTargets) {
        const proposal = createEvolutionProposal({
          target,
          currentBehavior: 'Strict boundary',
          observedEvidence: 'Verified benchmark telemetry over 500 test runs',
          proposedChange: 'Bypass this boundary for speed',
          expectedEffect: 'Bypass security',
          risk: 'HIGH',
          testsRequired: ['test/unit/native.test.js'],
          regressionRequirements: ['None'],
          evidenceType: 'VERIFIED_TEST_RESULT',
        });

        const validation = validateEvolutionProposal(proposal);
        expect(validation.valid).toBe(false);
        expect(validation.reason).toContain('protected security boundary');
      }
    });

    test('Invariant 6 — Determinism: Identical inputs produce identical pipeline outputs across 25 iterations', () => {
      const fixtureInput = {
        files: ['src/api/products.js'],
        lines: 20,
        task: 'Add limit and cursor pagination parameters',
        diff: '+ const { limit = 20, cursor } = req.query;',
        layaTier: 2,
      };

      const candidates = ['SECURITY.md', 'package.json', 'src/api/products.js', 'docs/readme.md'];

      const runOnce = () => {
        const tier = resolveMonotonicImpactTier(fixtureInput);
        const rank = rankContext({
          repoRoot: tmpRepo,
          targetFiles: fixtureInput.files,
          candidateFiles: candidates,
        });
        const synthesis = synthesizeReviewResults({
          checks: [createImplementationCheck({ check: 'api_tests', command: 'npm test api', result: 'PASSED' })],
          claims: [createEvidenceClaim({ reviewer: 'api-architect', assertion: 'Valid pagination design' })],
        });
        return {
          tier,
          rankedPaths: rank.ranked_items.map(i => `${i.path}:${i.score}`),
          verdict: synthesis.summary.verdict,
        };
      };

      const baseline = runOnce();
      for (let i = 0; i < 25; i++) {
        const iteration = runOnce();
        expect(iteration.tier).toBe(baseline.tier);
        expect(iteration.rankedPaths).toEqual(baseline.rankedPaths);
        expect(iteration.verdict).toBe(baseline.verdict);
      }
    });

    test('Invariant 7 — Graceful Degradation: Pipeline remains operational when Laya fails', () => {
      const badLayaValues = [
        null,
        undefined,
        NaN,
        -1,
        999,
        'throw_error',
        { error: 'ONNX runtime failure' },
        [1, 2, 3],
      ];

      for (const badValue of badLayaValues) {
        let tier;
        expect(() => {
          tier = resolveMonotonicImpactTier({
            files: ['src/components/SubmitButton.jsx'],
            lines: 10,
            task: 'Update button style',
            diff: '+ <button>Save</button>',
            layaTier: badValue,
          });
        }).not.toThrow();

        // Valid impact tier falls back cleanly
        expect(tier).toBeGreaterThanOrEqual(0);
        expect(tier).toBeLessThanOrEqual(3);
      }
    });
  });
});

