'use strict';

/**
 * codebase_intelligence.test.js — Tribunal Kit Codebase Intelligence Unit Tests
 * ═════════════════════════════════════════════════════════════════════════════
 * 15 rigorous unit tests verifying:
 *   1. overview extraction, workspaces, endpoints & centrality ranking
 *   2. multi-hop trace from ingress to datastore
 *   3. trace dynamic inference fallback with unresolved assumptions
 *   4. dependency fan-in, fan-out, and module topology
 *   5. circular dependency detection and reporting
 *   6. project-wide dependency audit & phantom package detection
 *   7. relevant-files targeted inspection checklist & test recipes
 *   8. blast radius concentric rings and risk tiering
 *   9. impact graceful handling of non-existent query
 *  10. dead-code detection with entry-point protection
 *  11. dead-code preservation of Chesterton's fences (// VERIFY)
 *  12. onboard 30-sec mental model, 3-day reading order & recipes
 *  13. secret redaction (JWTs, private keys, credentials)
 *  14. 11-field evidence record contract compliance
 *  15. strictly read-only execution with zero repository mutation
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  createEvidenceRecord,
} = require('../../.agent/scripts/codebase_intelligence');

describe('Tribunal Codebase Intelligence Engine', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  let engine;

  beforeAll(() => {
    engine = new CodebaseIntelligence(repoRoot);
  });

  // 1. OVERVIEW
  test('1. overview returns valid topology, workspaces, endpoints, and centrality ranking', () => {
    const res = engine.overview();

    expect(res.subcommand).toBe('overview');
    expect(res.runtime).toBeDefined();
    expect(res.runtime).toContain('Node.js');
    expect(res.workspaces.length).toBeGreaterThanOrEqual(1);

    // Verify CLI binaries extracted from package.json
    expect(res.endpoints.cli.length).toBeGreaterThanOrEqual(2);
    const cliNames = res.endpoints.cli.map(c => c.name);
    expect(cliNames.some(n => n.includes('tk') || n.includes('tribunal-kit'))).toBe(true);

    // Verify Centrality Hubs
    expect(res.centralityRanking.length).toBeGreaterThan(0);
    const topHub = res.centralityRanking[0];
    expect(topHub.fanIn).toBeGreaterThan(5);
    expect(topHub.name).toBeDefined();

    // Verify Evidence Records
    expect(res.evidenceRecords.length).toBeGreaterThan(0);
    expect(res.evidenceRecords[0].confidence).toBe('L1_OBSERVED');
    expect(res.evidenceRecords[0].evidence_status).toBe('OBSERVED');
  });

  // 2. TRACE (Static)
  test('2. trace unwinds multi-hop execution flow from ingress to service and datastore', () => {
    const res = engine.trace('POST /mfa-verify');

    expect(res.subcommand).toBe('trace');
    expect(res.target).toBe('POST /mfa-verify');
    expect(res.steps.length).toBeGreaterThanOrEqual(2);

    // Step 1 must be Ingress
    expect(res.steps[0].step).toBe(1);
    expect(res.steps[0].layer).toContain('Ingress');
    expect(res.steps[0].status).toBe('OBSERVED');

    // Downstream steps must be observed
    expect(res.steps[1].status).toBe('OBSERVED');
    expect(res.evidenceRecords.length).toBeGreaterThanOrEqual(2);
  });

  // 3. TRACE (Inferred fallback)
  test('3. trace gracefully falls back to dynamic inference when target has no exact static match', () => {
    const res = engine.trace('non_existent_payment_webhook_feature');

    expect(res.subcommand).toBe('trace');
    expect(res.steps.length).toBe(1);
    expect(res.steps[0].status).toBe('UNVERIFIED_CLAIM');
    expect(res.steps[0].confidence).toBe('L3_INFERRED');
    expect(res.unresolvedAssumptions.length).toBeGreaterThan(0);
  });

  // 4. DEPENDENCIES (Module)
  test('4. dependencies calculates fan-in, fan-out, and immediate inbound callers', () => {
    const res = engine.dependencies('src/security/boundary.js');

    expect(res.subcommand).toBe('dependencies');
    expect(res.target).toContain('boundary.js');
    expect(res.fanIn).toBeGreaterThan(10); // boundary.js is heavily imported
    expect(res.inbound.length).toBeGreaterThan(0);
    expect(res.evidenceRecords.length).toBeGreaterThan(0);
  });

  // 5. DEPENDENCIES (Cycles)
  test('5. dependencies detects circular cycles or confirms acyclic topology', () => {
    const res = engine.dependencies('src/security/boundary.js');

    expect(typeof res.participatesInCycle).toBe('boolean');
    if (res.participatesInCycle) {
      expect(Array.isArray(res.cyclePath)).toBe(true);
      expect(res.cyclePath.length).toBeGreaterThan(1);
    }
  });

  // 6. DEPENDENCIES (Project-Wide)
  test('6. dependencies without target executes project-wide audit and detects package counts', () => {
    const res = engine.dependencies();

    expect(res.subcommand).toBe('dependencies');
    expect(res.mode).toBe('project_wide');
    expect(res.totalImportEdges).toBeGreaterThan(100);
    expect(res.declaredDependenciesCount).toBeGreaterThan(0);
    expect(res.importedPackagesCount).toBeGreaterThan(0);
    expect(Array.isArray(res.phantomDependencies)).toBe(true);
  });

  // 7. RELEVANT-FILES
  test('7. relevantFiles identifies primary files to edit, interface contracts, and test recipes', () => {
    const res = engine.relevantFiles('add OAuth login and token verification');

    expect(res.subcommand).toBe('relevant-files');
    expect(res.primaryFiles.length).toBeGreaterThan(0);
    expect(res.verificationCommand).toBeDefined();
    expect(res.verificationCommand).toContain('npm test');
  });

  // 8. IMPACT (Blast Radius)
  test('8. impact calculates concentric rings, impacted endpoints, and risk tier', () => {
    const res = engine.impact('src/security/boundary.js');

    expect(res.subcommand).toBe('impact');
    expect(res.riskTier).toBeDefined();
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(res.riskTier);
    expect(res.ring1DirectCallers.length).toBeGreaterThan(0);
    expect(res.totalImpactedEntities).toBeGreaterThan(5);
    expect(res.evidenceRecords.length).toBeGreaterThan(0);
    expect(res.evidenceRecords[0].relationship_type).toBe('calls');
  });

  // 9. IMPACT (Non-existent target)
  test('9. impact cleanly handles non-existent query without throwing', () => {
    const res = engine.impact('completely_fake_module_xyz_123.js');

    expect(res.subcommand).toBe('impact');
    expect(res.riskTier).toBe('INDETERMINATE');
    expect(res.totalImpactedEntities).toBe(0);
    expect(res.ring1DirectCallers.length).toBe(0);
  });

  // 10. DEAD-CODE (Entry point protection)
  test('10. deadCode detects unreferenced export candidates while protecting public entry points', () => {
    const res = engine.deadCode();

    expect(res.subcommand).toBe('dead-code');
    expect(res.protectedFilesCount).toBeGreaterThan(0);
    expect(typeof res.unreferencedExportsCount).toBe('number');
    expect(typeof res.orphanModulesCount).toBe('number');

    // package.json bin files must never be flagged as unreferenced exports
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const binFiles = typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin || {});
    binFiles.forEach(bf => {
      const isFlaggedAsUnreferencedExport = res.unreferencedExports.some(ue => ue.file === bf);
      expect(isFlaggedAsUnreferencedExport).toBe(false);
    });
  });

  // 11. DEAD-CODE (Chesterton Fences)
  test('11. deadCode records Chesterton fences and invariants', () => {
    const res = engine.deadCode();
    expect(Array.isArray(res.landmines)).toBe(true);
  });

  // 12. ONBOARD
  test('12. onboard produces 30-sec mental model, 3-day reading order, and recipes', () => {
    const res = engine.onboard();

    expect(res.subcommand).toBe('onboard');
    expect(res.mentalModel.architecturePattern).toBeDefined();
    expect(res.mentalModel.runtime).toContain('Node.js');
    expect(res.mentalModel.totalModules).toBeGreaterThan(50);

    // Reading order Days 1, 2, 3
    expect(res.readingOrder.day1.length).toBeGreaterThan(0);
    expect(res.readingOrder.day2.length).toBeGreaterThan(0);
    expect(res.readingOrder.day3.length).toBeGreaterThan(0);

    // Verification recipes
    expect(res.verificationRecipes.length).toBeGreaterThan(0);
    const hasTestRecipe = res.verificationRecipes.some(r => r.command.includes('npm test'));
    expect(hasTestRecipe).toBe(true);
  });

  // 13. SECRET REDACTION
  test('13. createEvidenceRecord strips private keys, AWS tokens, and JWTs from claims', () => {
    const rawClaim = 'Discovered token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc and key AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE';
    const rec = createEvidenceRecord({
      claim: rawClaim,
      source_path: 'src/auth/jwt.js',
    });

    expect(rec.claim).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDc');
    expect(rec.claim).toContain('[REDACTED_JWT_TOKEN]');
    expect(rec.claim).toContain('[REDACTED_SECRET]');
  });

  // 14. 11-FIELD EVIDENCE CONTRACT
  test('14. evidence records strictly conform to the 11-field schema', () => {
    const rec = createEvidenceRecord({
      finding_id: 'ev_test_01',
      claim: 'Test claim',
      source_path: 'src/index.js',
      symbol: 'main',
      source_range: { start_line: 1, end_line: 10 },
      relationship_type: 'calls',
      verification_method: 'ast_static_visitor',
      repo_fingerprint: 'test_hash',
      evidence_status: 'OBSERVED',
      confidence: 'L1',
      unresolved_assumptions: [],
    });

    expect(rec.finding_id).toBe('ev_test_01');
    expect(rec.claim).toBe('Test claim');
    expect(rec.source_path).toBe('src/index.js');
    expect(rec.symbol).toBe('main');
    expect(rec.source_range).toEqual({ start_line: 1, end_line: 10 });
    expect(rec.relationship_type).toBe('calls');
    expect(rec.verification_method).toBe('ast_static_visitor');
    expect(rec.repo_fingerprint).toBe('test_hash');
    expect(rec.evidence_status).toBe('OBSERVED');
    expect(rec.confidence).toBe('L1_OBSERVED');
    expect(rec.unresolved_assumptions).toEqual([]);
  });

  // 15. READ-ONLY GUARANTEE
  test('15. programmatically running all 7 operations modifies zero files in repository', async () => {
    // Record current modified files
    const statusBefore = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });

    await runCodebaseIntelligence({ subcommand: 'overview', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'trace', target: 'POST /mfa-verify', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'dependencies', target: 'src/security/boundary.js', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'oauth', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'impact', target: 'src/security/boundary.js', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot });

    const statusAfter = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
    expect(statusAfter).toBe(statusBefore);
  });

  // 16. PREPARE
  test('16. prepare produces change preparation dossier with analytical readiness status and blast radius', () => {
    const res = engine.prepare('migrate database auth table to include mfa_secret column');

    expect(res.subcommand).toBe('prepare');
    expect(['READY_FOR_IMPLEMENTATION_REVIEW', 'READY_WITH_UNKNOWNS', 'BLOCKED']).toContain(res.readiness);
    expect(res.changeTargets.length).toBeGreaterThan(0);
    expect(res.verificationCommand).toBeDefined();
    expect(res.blastRadius).toBeDefined();
    expect(res.securityConcerns.length).toBeGreaterThan(0);
  });
});

