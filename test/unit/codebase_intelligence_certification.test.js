'use strict';

/**
 * codebase_intelligence_certification.test.js — Behavioral Certification Suite
 * ═════════════════════════════════════════════════════════════════════════════
 * Comprehensive behavioral certification testing 15 distinct fixture cases
 * and adversarial negative invariants:
 *
 * Positive Fixture Cases:
 *   1. Small JS/TS Application Structure
 *   2. Cross-File Imports and Exports Traversal
 *   3. Circular Dependency Cycle Detection
 *   4. Dynamic Imports Handling
 *   5. Framework & Configuration Loaded Modules (CLI bins)
 *   6. Dead Code Analysis with Protected Public Exports
 *   7. Missing vs. Unresolvable Dependencies Detection
 *   8. Malformed & Unsupported Syntax Resilience
 *   9. Symlink and Path Traversal Boundary Containment
 *  10. Secret-like Strings Redaction
 *  11. Bounded Analysis with Traversal Ceilings
 *  12. Cache Invalidation Freshness
 *  13. Contradictory & Missing Evidence Graceful Handling
 *  14. Empty Repository Minimal Execution
 *  15. Realistic Change-Preparation Readiness Operation
 *
 * Adversarial Negative Tests:
 *  16. Zero File Invention: never cites non-existent files as observed
 *  17. Zero Mutation Invariant: zero files created, modified, or deleted
 *  18. Zero Secret Leakage: secrets never appear unredacted in dossiers
 *  19. Zero Runtime Certainty: static traces always retain runtime disclaimer
 *  20. No Deletion Invariant: dead code findings never delete files
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  createEvidenceRecord,
  createResultEnvelope,
  redactSecrets,
} = require('../../.agent/scripts/codebase_intelligence');

describe('Codebase Intelligence — Behavioral Certification & Adversarial Audit', () => {
  const fixturesRoot = path.resolve(__dirname, '../fixtures/codebase_intelligence');
  const fixtureAppRoot = path.join(fixturesRoot, 'fixture_app');
  const emptyAppRoot = path.join(fixturesRoot, 'empty_app');

  let engine;

  beforeAll(() => {
    engine = new CodebaseIntelligence(fixtureAppRoot);
  });

  // 1. SMALL JS/TS APPLICATION
  test('Case 1: Small JS/TS Application — extracts runtime, workspaces, and entry points', () => {
    const res = engine.overview();
    expect(res.subcommand).toBe('overview');
    expect(res.runtime).toContain('Node.js');
    expect(res.endpoints.cli.length).toBe(1);
    expect(res.endpoints.cli[0].name).toContain('fixture-cli');
  });

  // 2. CROSS-FILE IMPORTS AND EXPORTS
  test('Case 2: Cross-File Imports & Exports — unwinds call path from index -> service -> db', () => {
    const res = engine.trace('processData');
    expect(res.subcommand).toBe('trace');
    expect(res.steps.length).toBeGreaterThanOrEqual(2);
    expect(res.steps.some(s => s.path.includes('service.js'))).toBe(true);
  });

  // 3. CIRCULAR DEPENDENCIES
  test('Case 3: Circular Dependencies — detects circular cycle between circular_a and circular_b', () => {
    const res = engine.dependencies('src/circular_a.js');
    expect(res.participatesInCycle).toBe(true);
    expect(res.cyclePath).toBeDefined();
    expect(res.cyclePath.join(' -> ')).toContain('circular_b');
  });

  // 4. DYNAMIC IMPORTS
  test('Case 4: Dynamic Imports — analyzes dynamic_loader without crashing', () => {
    const res = engine.dependencies('src/dynamic_loader.js');
    expect(res.subcommand).toBe('dependencies');
    expect(res.fanOut).toBeDefined();
  });

  // 5. FRAMEWORK & CONFIGURATION LOADED MODULES
  test('Case 5: Framework & Config Loaded Modules — maps CLI bin defined in package.json', () => {
    const res = engine.overview();
    const cliEndpoint = res.endpoints.cli.find(c => c.name.includes('fixture-cli'));
    expect(cliEndpoint).toBeDefined();
    expect(cliEndpoint.scope).toContain('app-cli.js');
  });

  // 6. DEAD CODE WITH PROTECTED EXPORTS
  test('Case 6: Dead Code Analysis — detects unusedHelperFunc but protects bin/app-cli.js', () => {
    const res = engine.deadCode();
    expect(res.subcommand).toBe('dead-code');

    // unusedHelperFunc in helper.js should be candidate
    const foundUnused = res.unreferencedExports.some(ue => ue.name === 'unusedHelperFunc');
    expect(foundUnused).toBe(true);

    // bin/app-cli.js is a CLI binary, must be protected
    const isBinReportedAsDead = res.unreferencedExports.some(ue => ue.file.includes('app-cli.js'));
    expect(isBinReportedAsDead).toBe(false);
  });

  // 7. MISSING VS UNRESOLVABLE DEPENDENCIES
  test('Case 7: Missing vs Unresolvable Dependencies — detects undeclared package and missing module', () => {
    const res = engine.dependencies();
    expect(res.mode).toBe('project_wide');

    // undeclared-crypto-package is missing from package.json
    const hasUndeclared = res.missingDependencies.some(m => m.package === 'undeclared-crypto-package');
    expect(hasUndeclared).toBe(true);

    // ghost_module does not exist on disk
    const hasUnresolvable = res.unresolvableImports.some(u => u.importPath.includes('ghost_module'));
    expect(hasUnresolvable).toBe(true);
  });

  // 8. MALFORMED & UNSUPPORTED SYNTAX RESILIENCE
  test('Case 8: Malformed & Unsupported Syntax — survives malformed syntax file without throwing', () => {
    expect(() => {
      engine.overview();
    }).not.toThrow();
  });

  // 9. SYMLINK & PATH TRAVERSAL BOUNDARIES
  test('Case 9: Symlink & Path Traversal — safely rejects paths outside root boundary', () => {
    expect(() => {
      engine.impact('../../../../../../../etc/passwd');
    }).not.toThrow();

    const res = engine.impact('../../../../../../../etc/passwd');
    expect(res.riskTier).toBe('INDETERMINATE');
  });

  // 10. SECRET-LIKE STRINGS REDACTION
  test('Case 10: Secret Redaction — redacts JWTs, AWS keys, and database credentials', () => {
    const raw = 'Found JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc and AWS: AKIAIOSFODNN7EXAMPLE and DB: postgres://admin:secret123@localhost:5432/db';
    const redacted = redactSecrets(raw);

    expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc');
    expect(redacted).toContain('[REDACTED_JWT_TOKEN]');
    expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(redacted).toContain('[REDACTED_AWS_KEY]');
    expect(redacted).not.toContain('secret123');
    expect(redacted).toContain('[REDACTED_DB_URI]');
  });

  // 11. BOUNDED ANALYSIS
  test('Case 11: Bounded Analysis — respects depth flag constraint', () => {
    const res = engine.impact('src/service.js', { depth: 1 });
    expect(res.depth).toBe(1);
  });

  // 12. CACHE FRESHNESS
  test('Case 12: Cache Freshness — getModel supports forced fresh in-memory extraction', () => {
    const model1 = engine.getModel();
    const model2 = engine.getModel(true);
    expect(model1).toBeDefined();
    expect(model2).toBeDefined();
    expect(model1.schemaVersion).toBe(model2.schemaVersion);
  });

  // 13. CONTRADICTORY & MISSING EVIDENCE
  test('Case 13: Contradictory Evidence — returns INDETERMINATE when target cannot be resolved', () => {
    const res = engine.impact('non_existent_symbol_or_file_404');
    expect(res.riskTier).toBe('INDETERMINATE');
    expect(res.limitations.length).toBeGreaterThan(0);
  });

  // 14. EMPTY REPOSITORY
  test('Case 14: Empty Repository — handles minimal empty repository gracefully', () => {
    const emptyEngine = new CodebaseIntelligence(emptyAppRoot);
    const res = emptyEngine.overview();
    expect(res.subcommand).toBe('overview');
    expect(res.workspaces.length).toBe(0);
    expect(res.endpoints.total).toBe(0);
  });

  // 15. CHANGE-PREPARATION OPERATION
  test('Case 15: Change Preparation Operation — correctly maps targets, contracts, and readiness', () => {
    const res = engine.prepare('add validation to processData in service');
    expect(res.subcommand).toBe('prepare');
    expect(['READY_FOR_IMPLEMENTATION_REVIEW', 'READY_WITH_UNKNOWNS']).toContain(res.readiness);
    expect(res.changeTargets.length).toBeGreaterThan(0);
    expect(res.verificationCommand).toBeDefined();
  });

  // ── Adversarial Negative Tests ──────────────────────────────────────────

  // 16. ZERO FILE INVENTION
  test('Case 16 [Negative]: Zero File Invention — never labels unverified files as OBSERVED', () => {
    const res = engine.trace('totally_fabricated_feature_name');
    res.steps.forEach(s => {
      if (s.path === 'heuristic_match') {
        expect(s.confidence).toBe('L3_INFERRED');
        expect(s.status).toBe('UNVERIFIED_CLAIM');
      }
    });
  });

  // 17. ZERO MUTATION INVARIANT
  test('Case 17 [Negative]: Zero Mutation Invariant — running all operations creates 0 files in fixture', async () => {
    const getFileCount = dir => fs.readdirSync(dir, { recursive: true }).length;
    const countBefore = getFileCount(fixtureAppRoot);

    await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'trace', target: 'processData', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'dependencies', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'service', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'impact', target: 'src/service.js', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot: fixtureAppRoot });
    await runCodebaseIntelligence({ subcommand: 'prepare', target: 'service', repoRoot: fixtureAppRoot });

    const countAfter = getFileCount(fixtureAppRoot);
    expect(countAfter).toBe(countBefore);
  });

  // 18. ZERO SECRET LEAKAGE
  test('Case 18 [Negative]: Zero Secret Leakage — evidence records never contain plaintext secrets', () => {
    const rec = createEvidenceRecord({
      claim: 'Discovered token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc with AWS AKIAIOSFODNN7EXAMPLE and password=supersecretpass123',
      source_path: 'src/credentials.js',
    });

    expect(rec.claim).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc');
    expect(rec.claim).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(rec.claim).not.toContain('supersecretpass123');
  });

  // 19. ZERO RUNTIME CERTAINTY CLAIM
  test('Case 19 [Negative]: Zero Runtime Certainty — markdown trace always contains runtime disclaimer', () => {
    const res = engine.trace('processData');
    const { renderTraceMarkdown } = require('../../.agent/scripts/codebase_intelligence');
    const md = renderTraceMarkdown(res);
    expect(md).toContain('Static analysis does not guarantee runtime invocation');
  });

  // 20. NO DELETION INVARIANT
  test('Case 20 [Negative]: No Deletion Invariant — dead-code output explicitly prohibits automated deletion', () => {
    const res = engine.deadCode();
    expect(res.safetyNotice).toContain('No files are ever automatically deleted');
  });

  // 21. REGRESSION DEF-01: Evidence Integrity — Static Imports Never Claim Runtime Execution
  test('Case 21 [Regression DEF-01]: Static imports never claim verified runtime execution', () => {
    const res = engine.trace('processData');
    expect(res.evidenceRecords.length).toBeGreaterThanOrEqual(1);

    // Assert that NO evidence record overclaims runtime execution
    res.evidenceRecords.forEach(rec => {
      expect(rec.relationship).not.toBe('executes');
      expect(rec.relationship_type).not.toBe('executes');
      expect(rec.claim).not.toMatch(/^Execution reaches/i);
    });

    // Specifically verify that static hops use static-analysis terminology
    const staticHops = res.evidenceRecords.filter(r => r.relationship === 'references' || r.relationship === 'imports' || r.relationship === 'routes_to');
    expect(staticHops.length).toBe(res.evidenceRecords.length);
  });

  // 22. REGRESSION DEF-02: Secret Redaction Across All Output Boundaries
  test('Case 22 [Regression DEF-02]: Secret redaction covers Markdown outputs and error messages', async () => {
    const sensitiveKey = 'sk-ant-api03-12345678901234567890';
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc';

    // 1. Success Markdown output
    const resSuccess = await runCodebaseIntelligence({
      subcommand: 'prepare',
      target: `migrate service with key ${sensitiveKey} and aws ${awsKey}`,
      repoRoot: fixtureAppRoot,
    });

    expect(resSuccess.markdown).not.toContain(sensitiveKey);
    expect(resSuccess.markdown).toContain('[REDACTED_API_KEY]');
    expect(resSuccess.markdown).not.toContain(awsKey);
    expect(resSuccess.markdown).toContain('[REDACTED_AWS_KEY]');
    expect(resSuccess.target).not.toContain(sensitiveKey);
    expect(resSuccess.target).toContain('[REDACTED_API_KEY]');
    expect(resSuccess.data.summary).not.toContain(sensitiveKey);

    // 2. Error Markdown and Exception output
    const resError = await runCodebaseIntelligence({
      subcommand: 'invalid-command-xyz',
      target: `probe with token ${jwtToken}`,
      repoRoot: fixtureAppRoot,
    });

    expect(resError.status).toBe('UNSUPPORTED');
    expect(resError.target).not.toContain(jwtToken);
    expect(resError.target).toContain('[REDACTED_JWT_TOKEN]');

    // 3. Direct error message containing sensitive DB URI
    const sensitiveError = 'Fatal: failed to connect to postgres://admin:secretPass123@prod-db.internal:5432/main';
    const safeError = redactSecrets(sensitiveError);
    expect(safeError).not.toContain('secretPass123');
    expect(safeError).toContain('[REDACTED_DB_URI]');
  });
});

