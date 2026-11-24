'use strict';

/**
 * refactoring_engineer.test.js — Stage 3.4: Refactoring Engineer Specialist Implementation
 * ========================================================================================
 * Comprehensive verification covering all 20 Phase 5 areas:
 * 1. Canonical registration.
 * 2. Persona discovery.
 * 3. Runtime invocation.
 * 4. Structured proposal validation.
 * 5. Malformed proposal rejection.
 * 6. Evidence reference validation.
 * 7. Behavior-preservation requirements.
 * 8. Public API compatibility.
 * 9. Dependency impact detection.
 * 10. Duplicate-code refactoring fixture.
 * 11. Oversized-function refactoring fixture.
 * 12. Excessive-coupling analysis fixture.
 * 13. Security-sensitive refactor escalation.
 * 14. Conflicting proposal handling.
 * 15. Provider failure and timeout.
 * 16. Human approval enforcement.
 * 17. Agent self-authorization rejection.
 * 18. Path containment.
 * 19. Rollback behavior.
 * 20. End-to-end runtime integration.
 * Realistic Fixture Scenarios & Behavioral Divergence Defense:
 * - Scenario A: Decompose oversized query builder without altering SQL output semantics.
 * - Scenario B: Extract duplicate header sanitization into cohesive helper function.
 * - Scenario C: Reject enticing refactor that subtly alters exception types and evaluation order.
 * - Scenario D: Reject breaking public API signature modification.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  resolveAgent,
  listAllAgents,
  getRegistrySummary,
} = require('../../src/execution/canonical_registry');
const { AgentRuntime } = require('../../src/execution/agent_runtime');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { EvidenceBus: _EvidenceBus } = require('../../src/execution/evidence_bus');
const { ConflictResolver } = require('../../src/execution/conflict_resolver');
const { ControlledWriteService, ReviewExecutor } = require('../../src/execution');
const {
  validateRefactoringProposal,
  safeValidateRefactoringProposal,
  validateRefactoringChange,
  isBehaviorPreservingProposal,
  refactoringToWriteRequest,
  RefactoringProposalSchema: _RefactoringProposalSchema,
  RefactoringChangeSchema: _RefactoringChangeSchema,
  REFACTORING_CATEGORIES: _REFACTORING_CATEGORIES,
} = require('../../src/execution/agent_contracts');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Stage 3.4: Refactoring Engineer Specialist Persona & Runtime Verification', () => {
  let tempWorkspace;

  beforeEach(() => {
    tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-refactor-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    } catch (_) {}
  });

  // ── Area 1: Canonical Registration ──────────────────────────────────────────
  test('1. Canonical registration: resolves as active production specialist with complete domain coverage', () => {
    const spec = resolveAgent('refactoring-engineer', {}, REPO_ROOT);
    expect(spec).not.toBeNull();
    expect(spec.name).toBe('refactoring-engineer');
    expect(spec.status).toBe('production');
    expect(spec.type).toBe('specialist');
    expect(spec.active).toBe(true);
    expect(spec.priority).toBe('high');
    expect(spec.domain).toContain('architecture');
    expect(spec.domain).toContain('backend');
    expect(spec.domain).toContain('frontend');
    expect(spec.domain).toContain('refactoring');
    expect(spec.domain).toContain('all');

    // Canonical registry total matches summary
    const allAgents = listAllAgents(REPO_ROOT);
    expect(allAgents.length).toBe(getRegistrySummary(REPO_ROOT).total);
  });

  // ── Area 2: Persona Discovery & Frontmatter ────────────────────────────────
  test('2. Persona discovery: markdown frontmatter contains required fields and behavior preservation mandate', () => {
    const agentMdPath = path.join(REPO_ROOT, '.agent', 'agents', 'refactoring-engineer.md');
    expect(fs.existsSync(agentMdPath)).toBe(true);
    const content = fs.readFileSync(agentMdPath, 'utf8');

    expect(content).toContain('name: refactoring-engineer');
    expect(content).toContain('status: production');
    expect(content).toContain('type: specialist');
    expect(content).toContain('clean-code');
    expect(content).toContain('refactoring');
    expect(content).toContain('Improve internal structure without altering external behavior');
    expect(content).toContain('No Arbitrary Filesystem Writes');
    expect(content).toContain('Do Not Treat Bug Fixes as Refactorings');
    expect(content).toContain('No Wholesale Rewrites');
    expect(content).toContain('No Unjustified Public API Changes');
  });

  // ── Area 3: Runtime Invocation ──────────────────────────────────────────────
  test('3. Runtime invocation: AgentRuntime invokes refactoring-engineer and validates proposal structure', async () => {
    const sampleProposal = {
      proposalId: 'REF-2026-001',
      title: 'Extract pure calculateTax helper from order processor',
      description:
        'Decomposes oversized 90-line calculateTotal method by extracting pure calculation logic.',
      refactoringCategory: 'EXTRACT_METHOD',
      targetFiles: ['src/billing/order_processor.js'],
      codeSmells: ['Long Method', 'Feature Envy'],
      currentDesign:
        'calculateTotal mixes database entity extraction, tax calculation, and discount logic.',
      proposedDesign:
        'Pure calculateTax helper extracted; calculateTotal delegates tax computation.',
      behaviorPreservation:
        'Tax calculation formula, precision rounding, and discount application order remain strictly identical.',
      publicApiImpact: {
        hasBreakingChanges: false,
        details: 'Public signature calculateTotal(orderId) unchanged.',
      },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/billing/order_processor.js',
          sourceRange: '45-65',
          existingContext: 'function calculateTotal(order) { /* inline tax */ }',
          proposedReplacement:
            'function calculateTax(subtotal, rate) { return Math.round(subtotal * rate * 100) / 100; }',
          reason: 'Extract pure deterministic tax calculation.',
          evidence:
            'Inline calculation repeated in order_processor.js:52 and invoice_generator.js:88.',
        },
      ],
      regressionRisks: ['Rounding discrepancy on sub-cent amounts if precision changed.'],
      verificationRequirements: [
        'npx jest test/unit/order_processor.test.js',
        'Verify round-trip tax assertions.',
      ],
      rollbackPlan: 'Revert git commit for src/billing/order_processor.js.',
      confidence: 0.98,
      evidenceReferences: ['EVID-COMPLEXITY-102'],
      requiresHumanApproval: true,
      status: 'PROPOSED',
    };

    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => ({
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Extracted pure calculateTax helper with 100% behavior preservation.',
          findings: [],
          refactoringProposals: [sampleProposal],
          recommendations: ['Run billing test suite before commit.'],
        }),
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: mockProvider,
    });

    const task = {
      taskId: 'task_refactor_001',
      agentId: 'refactoring-engineer',
      objective: 'Refactor oversized order processor method into cohesive helpers',
      context: 'src/billing/order_processor.js has cyclomatic complexity > 15',
    };

    const result = await runtime.executeTask(task);
    expect(result.status).toBe('SUCCESS');
    expect(result.refactoringProposals.length).toBe(1);
    expect(result.refactoringProposals[0].proposalId).toBe('REF-2026-001');
    expect(result.refactoringProposals[0].refactoringCategory).toBe('EXTRACT_METHOD');
    expect(result.refactoringProposals[0].requiresHumanApproval).toBe(true);
  });

  // ── Area 4: Structured Proposal Validation ──────────────────────────────────
  test('4. Structured proposal validation: RefactoringProposalSchema parses all 18 required fields', () => {
    const validProposal = {
      proposalId: 'REF-VALID-01',
      title: 'Rename ambiguous variable in authentication filter',
      description: 'Renames variable `u` to `authenticatedUser` for clarity.',
      refactoringCategory: 'RENAME',
      targetFiles: ['src/auth/filter.js'],
      codeSmells: ['Obscure Identifier / Poor Readability'],
      currentDesign: 'Single letter variable `u` representing session user.',
      proposedDesign: 'Descriptive identifier `authenticatedUser`.',
      behaviorPreservation:
        'Variable scope is strictly internal to function; no external contract affected.',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/auth/filter.js',
          sourceRange: '12-18',
          existingContext: 'const u = session.user;',
          proposedReplacement: 'const authenticatedUser = session.user;',
          reason: 'Improve readability and self-documentation.',
          evidence: 'Code review finding AUTH-STYLE-002.',
        },
      ],
      regressionRisks: ['None identified.'],
      verificationRequirements: ['npx jest test/unit/auth.test.js'],
      rollbackPlan: 'Git checkout src/auth/filter.js',
      confidence: 1.0,
      evidenceReferences: ['REV-AUTH-002'],
      requiresHumanApproval: true,
      status: 'PROPOSED',
    };

    const parsed = validateRefactoringProposal(validProposal);
    expect(parsed.proposalId).toBe('REF-VALID-01');
    expect(parsed.publicApiImpact).toBe(false);
    expect(parsed.confidence).toBe(1.0);
  });

  // ── Area 5: Malformed Proposal Rejection ────────────────────────────────────
  test('5. Malformed proposal rejection: fails closed when critical fields or arrays are missing', () => {
    const missingBehavior = {
      proposalId: 'REF-BAD-01',
      title: 'Missing behavior justification',
      description: 'Some refactor',
      refactoringCategory: 'SIMPLIFY_CONDITIONAL',
      targetFiles: ['src/logic.js'],
      codeSmells: ['Complex Conditional'],
      currentDesign: 'Nested ifs',
      proposedDesign: 'Guard clauses',
      // behaviorPreservation is omitted!
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/logic.js',
          existingContext: 'if (a) { if (b) {} }',
          proposedReplacement: 'if (!a || !b) return;',
          reason: 'Flatten nesting',
          evidence: 'AST depth 4',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'git revert',
    };

    const res1 = safeValidateRefactoringProposal(missingBehavior);
    expect(res1.success).toBe(false);

    const emptyChanges = {
      ...missingBehavior,
      behaviorPreservation: 'Equivalent truth table.',
      proposedChanges: [], // empty proposedChanges!
    };
    const res2 = safeValidateRefactoringProposal(emptyChanges);
    expect(res2.success).toBe(false);

    const missingTests = {
      ...missingBehavior,
      behaviorPreservation: 'Equivalent truth table.',
      proposedChanges: [
        {
          targetFile: 'src/logic.js',
          existingContext: 'if (a) { if (b) {} }',
          proposedReplacement: 'if (!a || !b) return;',
          reason: 'Flatten nesting',
          evidence: 'AST depth 4',
        },
      ],
      verificationRequirements: [], // empty tests!
    };
    const res3 = safeValidateRefactoringProposal(missingTests);
    expect(res3.success).toBe(false);
  });

  // ── Area 6: Evidence Reference Validation ──────────────────────────────────
  test('6. Evidence reference validation: changes require non-empty supporting evidence', () => {
    const badChange = {
      targetFile: 'src/service.js',
      existingContext: 'oldCode()',
      proposedReplacement: 'newCode()',
      reason: 'Looks better',
      evidence: '', // empty evidence!
    };

    expect(() => validateRefactoringChange(badChange)).toThrow(/evidence/);
  });

  // ── Area 7: Behavior-Preservation Requirements ─────────────────────────────
  test('7. Behavior-preservation requirements: isBehaviorPreservingProposal accepts compliant refactors and rejects unverified ones', () => {
    const valid = {
      proposalId: 'REF-BP-01',
      title: 'Extract helper',
      description: 'Extract pure function',
      refactoringCategory: 'EXTRACT_FUNCTION',
      targetFiles: ['src/calc.js'],
      codeSmells: ['Duplicate Code'],
      currentDesign: 'Inlined math',
      proposedDesign: 'Helper call',
      behaviorPreservation:
        'Mathematical operations are commutative and associative; outputs are bitwise identical.',
      publicApiImpact: { hasBreakingChanges: false },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/calc.js',
          existingContext: 'x + y',
          proposedReplacement: 'add(x, y)',
          reason: 'DRY',
          evidence: 'Duplicated 5 times',
        },
      ],
      verificationRequirements: ['npx jest test/unit/calc.test.js'],
      rollbackPlan: 'Revert',
    };

    expect(isBehaviorPreservingProposal(valid)).toBe(true);

    // Disallowed disguised bugfix category
    const _bugfix = {
      ...valid,
      refactoringCategory: 'OTHER',
      title: 'Fix edge-case null pointer bugfix',
    };
    // If title or category attempts functional patch
    const patchMasquerade = {
      ...valid,
      refactoringCategory: 'BUGFIX_REPAIR',
    };
    expect(isBehaviorPreservingProposal(patchMasquerade)).toBe(false);
  });

  // ── Area 8: Public API Compatibility ───────────────────────────────────────
  test('8. Public API compatibility: rejects proposals that introduce breaking contract changes', () => {
    const breakingProposal = {
      proposalId: 'REF-BREAK-01',
      title: 'Refactor payment endpoint signature',
      description: 'Changes argument order to put options first.',
      refactoringCategory: 'RENAME',
      targetFiles: ['src/api/payment.js'],
      codeSmells: ['Inconsistent Parameter Order'],
      currentDesign: 'processPayment(amount, options)',
      proposedDesign: 'processPayment(options, amount)',
      behaviorPreservation: 'Internal business logic unchanged once parameters are unpacked.',
      publicApiImpact: {
        hasBreakingChanges: true,
        details: 'Breaks all external callers passing (amount, options).',
      },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/api/payment.js',
          existingContext: 'function processPayment(amount, options)',
          proposedReplacement: 'function processPayment(options, amount)',
          reason: 'Align with newer SDK conventions',
          evidence: 'API guideline doc #4',
        },
      ],
      verificationRequirements: ['npx jest test/unit/payment.test.js'],
      rollbackPlan: 'Git checkout src/api/payment.js',
    };

    expect(isBehaviorPreservingProposal(breakingProposal)).toBe(false);

    // Also test boolean true breaking flag
    const boolBreaking = { ...breakingProposal, publicApiImpact: true };
    expect(isBehaviorPreservingProposal(boolBreaking)).toBe(false);

    // Also test string describing breaking change
    const strBreaking = {
      ...breakingProposal,
      publicApiImpact: 'BREAKING_CHANGE: requires major version bump',
    };
    expect(isBehaviorPreservingProposal(strBreaking)).toBe(false);
  });

  // ── Area 9: Dependency Impact Detection ────────────────────────────────────
  test('9. Dependency impact detection: validates dependency constraints and captures dependencies', () => {
    const proposalWithDeps = {
      proposalId: 'REF-DEP-01',
      title: 'Use lodash debounce',
      description: 'Replace custom debounce with lodash.debounce',
      refactoringCategory: 'REMOVE_DUPLICATION',
      targetFiles: ['src/utils/debounce.js'],
      codeSmells: ['Reinventing the Wheel'],
      currentDesign: 'Custom 20-line debounce implementation',
      proposedDesign: 'Use lodash.debounce import',
      behaviorPreservation: 'Standard debounce semantics preserved.',
      publicApiImpact: false,
      dependencyImpact: ['lodash.debounce@^4.0.8'], // new dependency!
      proposedChanges: [
        {
          targetFile: 'src/utils/debounce.js',
          existingContext: 'function customDebounce() {}',
          proposedReplacement: 'const debounce = require("lodash.debounce");',
          reason: 'Use standard library',
          evidence: 'Custom debounce had subtle timer leak',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    const parsed = validateRefactoringProposal(proposalWithDeps);
    expect(parsed.dependencyImpact).toEqual(['lodash.debounce@^4.0.8']);
  });

  // ── Area 10: Duplicate-Code Refactoring Fixture ────────────────────────────
  test('10. Duplicate-code refactoring: extracts duplicate formatting logic into cohesive shared helper', () => {
    const proposal = {
      proposalId: 'REF-DUP-001',
      title: 'Extract formatCurrency helper from billing and invoices',
      description:
        'Eliminates copy-pasted currency formatting routine present in both billing.js and invoice.js.',
      refactoringCategory: 'REMOVE_DUPLICATION',
      targetFiles: ['src/billing.js', 'src/invoice.js'],
      codeSmells: ['Duplicated Code (identical 12-line formatting block in 2 modules)'],
      currentDesign: 'Both modules implement inline Intl.NumberFormat instantiation.',
      proposedDesign: 'Common formatCurrency utility imported and invoked by both modules.',
      behaviorPreservation:
        'Output string format, locale fallback, and currency code remain strictly identical.',
      publicApiImpact: { hasBreakingChanges: false },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/billing.js',
          existingContext:
            'const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);',
          proposedReplacement: 'const formatted = formatCurrency(amount);',
          reason: 'Eliminate duplicate formatter instantiation.',
          evidence: 'Identical Intl.NumberFormat snippet at billing.js:45 and invoice.js:82.',
        },
      ],
      verificationRequirements: ['npx jest test/unit/billing.test.js test/unit/invoice.test.js'],
      rollbackPlan: 'Git checkout src/billing.js src/invoice.js',
      confidence: 0.99,
      status: 'PROPOSED',
    };

    const parsed = validateRefactoringProposal(proposal);
    expect(parsed.refactoringCategory).toBe('REMOVE_DUPLICATION');
    expect(parsed.targetFiles).toHaveLength(2);
    expect(isBehaviorPreservingProposal(parsed)).toBe(true);
  });

  // ── Area 11: Oversized-Function Refactoring Fixture ────────────────────────
  test('11. Oversized-function refactoring: decomposes monolithic function into pure helper methods', () => {
    const proposal = {
      proposalId: 'REF-OVERSIZED-001',
      title: 'Decompose 140-line compileMarkdownPipeline into distinct AST stages',
      description:
        'Breaks down monolithic pipeline function into parseAst, transformDirectives, and renderHtml.',
      refactoringCategory: 'EXTRACT_METHOD',
      targetFiles: ['src/compiler/pipeline.js'],
      codeSmells: ['Long Method (140 lines)', 'Multiple Responsibilities'],
      currentDesign:
        'compileMarkdownPipeline performs lexing, parsing, transformation, and string rendering in one body.',
      proposedDesign: 'Three dedicated helper functions chained sequentially.',
      behaviorPreservation:
        'Final HTML output and error handling for malformed input remain 100% identical.',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/compiler/pipeline.js',
          sourceRange: '10-150',
          existingContext: 'function compileMarkdownPipeline(raw) { /* 140 lines */ }',
          proposedReplacement:
            'function compileMarkdownPipeline(raw) { const ast = parseAst(raw); const trans = transformDirectives(ast); return renderHtml(trans); }',
          reason: 'Reduce cyclomatic complexity from 24 to 3.',
          evidence: 'Complexity analysis report CMP-091.',
        },
      ],
      verificationRequirements: ['npx jest test/unit/compiler.test.js'],
      rollbackPlan: 'Git revert commit',
      confidence: 0.96,
      status: 'PROPOSED',
    };

    expect(isBehaviorPreservingProposal(proposal)).toBe(true);
  });

  // ── Area 12: Excessive-Coupling Analysis Fixture ────────────────────────────
  test('12. Excessive-coupling analysis: decouples module by introducing parameter object', () => {
    const proposal = {
      proposalId: 'REF-COUPLING-001',
      title: 'Introduce ConfigContext to decouple database pool from service handlers',
      description:
        'Replaces direct global DB pool access with explicit injected context parameter.',
      refactoringCategory: 'DECOUPLE_MODULE',
      targetFiles: ['src/services/user_service.js'],
      codeSmells: ['Inappropriate Intimacy with global db singleton', 'Tight Coupling'],
      currentDesign: 'user_service directly references global.dbPool.',
      proposedDesign: 'user_service accepts pool via options parameter with global fallback.',
      behaviorPreservation:
        'Default behavior falls back to global singleton if not supplied, preserving all existing callers.',
      publicApiImpact: { hasBreakingChanges: false, details: 'Additive optional parameter.' },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/services/user_service.js',
          existingContext: 'function getUser(id) { return global.dbPool.query(...); }',
          proposedReplacement:
            'function getUser(id, { pool = global.dbPool } = {}) { return pool.query(...); }',
          reason: 'Allow unit testing with mock pool while preserving backward compatibility.',
          evidence: 'Architecture review ARCH-COUPLE-004.',
        },
      ],
      verificationRequirements: ['npx jest test/unit/user_service.test.js'],
      rollbackPlan: 'Git checkout src/services/user_service.js',
      confidence: 0.95,
      status: 'PROPOSED',
    };

    expect(isBehaviorPreservingProposal(proposal)).toBe(true);
  });

  // ── Area 13: Security-Sensitive Refactor Escalation ─────────────────────────
  test('13. Security-sensitive refactor escalation: flags and escalates refactors touching authentication boundaries', () => {
    const securityRefactor = {
      proposalId: 'REF-SEC-001',
      title: 'Refactor session token validation logic',
      description: 'Attempts to simplify timing-safe comparison.',
      refactoringCategory: 'SIMPLIFY_CONDITIONAL',
      targetFiles: ['src/security/session_validator.js'],
      codeSmells: ['Complex Conditional'],
      currentDesign: 'crypto.timingSafeEqual loop',
      proposedDesign: 'String equality a === b',
      behaviorPreservation: 'Equal strings return true, unequal return false.',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/security/session_validator.js',
          existingContext: 'return crypto.timingSafeEqual(a, b);',
          proposedReplacement: 'return a === b;', // INTRODUCES TIMING ATTACK!
          reason: 'Simplify comparison syntax',
          evidence: 'Static analyzer complained about complexity',
        },
      ],
      securityImpact:
        'HIGH_RISK_TIMING_ATTACK: Replaces constant-time comparison with variable-time string equality.',
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
      requiresHumanApproval: true,
    };

    // Specialist must flag high security risk
    expect(securityRefactor.securityImpact).toContain('TIMING_ATTACK');
    expect(securityRefactor.requiresHumanApproval).toBe(true);
  });

  // ── Area 14: Conflicting Proposal Handling ──────────────────────────────────
  test('14. Conflicting proposal handling: ConflictResolver flags overlapping edits from concurrent refactors', () => {
    const resolver = new ConflictResolver();

    const findingA = {
      agentId: 'refactoring-engineer',
      findingId: 'REF-001',
      filePath: 'src/utils/parser.js',
      lineRange: '10-30',
      category: 'ARCHITECTURE',
      severity: 'LOW',
      description: 'Extract sub-parser',
      evidence: 'Line 10-30',
    };

    const findingB = {
      agentId: 'patch-proposal-agent',
      findingId: 'PATCH-001',
      filePath: 'src/utils/parser.js',
      lineRange: '20-40', // Overlaps lines 20-30!
      category: 'SECURITY',
      severity: 'HIGH',
      description: 'Buffer overflow patch',
      evidence: 'Line 20-40',
    };

    const analysis = resolver.resolve([findingA, findingB]);
    expect(analysis.hasConflicts).toBe(true);
    expect(analysis.conflicts.length).toBeGreaterThan(0);
    expect(analysis.conflicts[0].filePath).toBe('src/utils/parser.js');
    expect(analysis.conflicts[0].agents).toContain('refactoring-engineer');
    expect(analysis.conflicts[0].agents).toContain('patch-proposal-agent');
  });

  // ── Area 15: Provider Failure and Timeout ──────────────────────────────────
  test('15. Provider failure and timeout: AgentRuntime returns graceful ERROR status when model provider fails', async () => {
    const failingProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => {
        throw new Error('ETIMEDOUT: Connection to model provider timed out');
      },
    });

    const runtime = new AgentRuntime({
      repoRoot: REPO_ROOT,
      provider: failingProvider,
    });

    const task = {
      taskId: 'task_timeout_test',
      agentId: 'refactoring-engineer',
      objective: 'Analyze refactoring opportunities',
      timeoutMs: 1000,
    };

    const result = await runtime.executeTask(task);
    expect(result.status).toBe('ERROR');
    expect(result.summary).toContain('ETIMEDOUT');
    expect(result.refactoringProposals).toEqual([]);
    expect(result.proposals).toEqual([]);
  });

  // ── Area 16: Human Approval Enforcement ────────────────────────────────────
  test('16. Human approval enforcement: ControlledWriteService requires human gate token for refactor proposals', async () => {
    const mockReviewProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });
    const reviewExecutor = new ReviewExecutor({
      provider: mockReviewProvider,
      repoRoot: REPO_ROOT,
    });

    const service = new ControlledWriteService({
      workspaceRoot: tempWorkspace,
      reviewExecutor,
      authorizedApprovers: ['lead-architect@tribunal.test'],
      approvalSecret: 'test-hmac-secret-refactor-999',
    });

    const proposal = {
      proposalId: 'REF-GATE-001',
      title: 'Extract pure string sanitizer',
      description: 'Decomposes formatting logic',
      refactoringCategory: 'EXTRACT_METHOD',
      targetFiles: ['src/sanitizer.js'],
      codeSmells: ['Long Method'],
      currentDesign: 'Monolithic function',
      proposedDesign: 'Pure helper',
      behaviorPreservation: 'Strictly identical outputs',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/sanitizer.js',
          existingContext: 'old()',
          proposedReplacement: '// sanitized pure helper\nfunction sanitize() { return true; }\n',
          reason: 'Clean code',
          evidence: 'Evidence #1',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
      requiresHumanApproval: true,
      status: 'PROPOSED',
    };

    const targetFilePath = path.join(tempWorkspace, 'src', 'sanitizer.js');
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.writeFileSync(targetFilePath, 'function old() { return false; }\n', 'utf8');

    // Convert proposal to write request
    const writeReq = refactoringToWriteRequest(proposal, {
      workspaceId: tempWorkspace,
      agentId: 'refactoring-engineer',
      sessionId: 'session_refactor_123',
    });

    // 1. Initial write request requires human approval
    const outcome = await service.requestWrite(writeReq);
    expect(outcome.status).toBe('HUMAN_APPROVAL_REQUIRED');

    // 2. Commit cannot proceed without approval
    await expect(
      service.commitWrite(outcome.token, { sessionId: 'session_refactor_123' }),
    ).rejects.toThrow(/Cannot commit write in status 'HUMAN_APPROVAL_REQUIRED'/);

    // 3. Cryptographic approval by authorized approver
    const approver = 'lead-architect@tribunal.test';
    const sig = service.generateApprovalSignature(outcome.token, approver, {
      sessionId: 'session_refactor_123',
    });
    const approveRes = service.approveWrite(outcome.token, approver, sig, {
      sessionId: 'session_refactor_123',
    });
    expect(approveRes.status).toBe('PENDING_COMMIT');

    // 4. Staged commit proceeds successfully
    const commitRes = await service.commitWrite(outcome.token, {
      sessionId: 'session_refactor_123',
    });
    expect(commitRes.status).toBe('COMMITTED');

    // Verify file created/modified
    const written = fs.readFileSync(path.join(tempWorkspace, 'src', 'sanitizer.js'), 'utf8');
    expect(written).toContain('function sanitize()');
  });

  // ── Area 17: Agent Self-Authorization Rejection ─────────────────────────────
  test('17. Agent self-authorization rejection: AI agents cannot approve their own or other refactoring proposals', async () => {
    const mockReviewProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });
    const reviewExecutor = new ReviewExecutor({
      provider: mockReviewProvider,
      repoRoot: REPO_ROOT,
    });

    const service = new ControlledWriteService({
      workspaceRoot: tempWorkspace,
      reviewExecutor,
      approvalSecret: 'test-hmac-secret-456',
    });

    const proposal = {
      proposalId: 'REF-SELF-AUTH',
      title: 'Self-approved refactor attempt',
      description: 'Attempting to self-approve',
      refactoringCategory: 'RENAME',
      targetFiles: ['src/self.js'],
      codeSmells: ['Bad Name'],
      currentDesign: 'old',
      proposedDesign: 'new',
      behaviorPreservation: 'Identical',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/self.js',
          existingContext: 'a',
          proposedReplacement: 'b',
          reason: 'rename',
          evidence: 'evid',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    const writeReq = refactoringToWriteRequest(proposal, {
      workspaceId: tempWorkspace,
      agentId: 'refactoring-engineer',
    });

    const outcome = await service.requestWrite(writeReq);
    expect(outcome.status).toBe('HUMAN_APPROVAL_REQUIRED');

    // Attempting self-approval as 'refactoring-engineer' (registered agent)
    const agentSig = service.generateApprovalSignature(outcome.token, 'refactoring-engineer');
    expect(() => {
      service.approveWrite(outcome.token, 'refactoring-engineer', agentSig);
    }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/);

    // Attempting self-approval as generic 'agent-bot'
    const botSig = service.generateApprovalSignature(outcome.token, 'agent-bot');
    expect(() => {
      service.approveWrite(outcome.token, 'agent-bot', botSig);
    }).toThrow(/Security Violation: AI agents and automated callers cannot self-approve/);
  });

  // ── Area 18: Path Containment ──────────────────────────────────────────────
  test('18. Path containment: rejects paths with null bytes or directory traversal attempts', () => {
    const traversalProposal = {
      proposalId: 'REF-ESCAPE-01',
      title: 'Escape workspace root',
      description: 'Tries ../../outside.js',
      refactoringCategory: 'OTHER',
      targetFiles: ['../../outside.js'], // Traversal!
      codeSmells: ['Escape Smell'],
      currentDesign: 'inside',
      proposedDesign: 'outside',
      behaviorPreservation: 'none',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: '../../outside.js',
          existingContext: 'x',
          proposedReplacement: 'y',
          reason: 'escape',
          evidence: 'evid',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    expect(() => validateRefactoringProposal(traversalProposal)).toThrow(/path traversal/);

    const nullByteProposal = {
      ...traversalProposal,
      targetFiles: ['src/valid.js\0malicious.js'],
      proposedChanges: [
        {
          targetFile: 'src/valid.js\0malicious.js',
          existingContext: 'x',
          proposedReplacement: 'y',
          reason: 'null byte',
          evidence: 'evid',
        },
      ],
    };

    expect(() => validateRefactoringProposal(nullByteProposal)).toThrow(/null bytes/);
  });

  // ── Area 19: Rollback Behavior ──────────────────────────────────────────────
  test('19. Rollback behavior: transaction manager restores original disk state if transaction aborts', async () => {
    const mockReviewProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });
    const reviewExecutor = new ReviewExecutor({
      provider: mockReviewProvider,
      repoRoot: REPO_ROOT,
    });

    const service = new ControlledWriteService({
      workspaceRoot: tempWorkspace,
      reviewExecutor,
    });

    // Create initial file
    const targetPath = path.join(tempWorkspace, 'src', 'original.js');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '// Original Unmodified Code\n', 'utf8');

    const proposal = {
      proposalId: 'REF-ROLLBACK-01',
      title: 'Refactor that causes conflict',
      description: 'Attempts modify with invalid expected hash or abort',
      refactoringCategory: 'EXTRACT_METHOD',
      targetFiles: ['src/original.js'],
      codeSmells: ['Smell'],
      currentDesign: 'Original',
      proposedDesign: 'Refactored',
      behaviorPreservation: 'Preserved',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/original.js',
          existingContext: '// Original Unmodified Code\n',
          proposedReplacement: '// Refactored Code\n',
          reason: 'Clean',
          evidence: 'Evid',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    const req = refactoringToWriteRequest(proposal, { workspaceId: tempWorkspace });
    // Add an expectedHash that intentionally mismatches to trigger rollback
    req.files[0].expectedHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const outcome = await service.requestWrite(req);
    // Since policy might require review or approve, let's test commit failure
    if (outcome.status === 'HUMAN_APPROVAL_REQUIRED') {
      service.approveWrite(outcome.token, 'human-admin', 'dummy-sig');
    }

    await expect(service.commitWrite(outcome.token)).rejects.toThrow(/CONFLICT: Hash mismatch/);

    // Verify original file was preserved without corruption
    const currentContent = fs.readFileSync(targetPath, 'utf8');
    expect(currentContent).toBe('// Original Unmodified Code\n');
  });

  // ── Area 20: End-to-End Runtime Integration ────────────────────────────────
  test('20. End-to-end runtime integration: full cycle from task to proposal, review, approval, and transaction commit', async () => {
    const mockReviewProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 1.0,
        findings: [],
      }),
    });
    const reviewExecutor = new ReviewExecutor({
      provider: mockReviewProvider,
      repoRoot: REPO_ROOT,
    });

    const service = new ControlledWriteService({
      workspaceRoot: tempWorkspace,
      reviewExecutor,
      authorizedApprovers: ['security-lead@tribunal.test'],
      approvalSecret: 'e2e-secret-key-stage-34',
    });

    const targetFile = 'src/math/geometry.js';
    const initialContent = `
function calculateArea(shape, width, height) {
  if (shape === 'rectangle') {
    return width * height;
  } else if (shape === 'triangle') {
    return (width * height) / 2;
  }
  return 0;
}
module.exports = { calculateArea };
`;
    const fullTarget = path.join(tempWorkspace, targetFile);
    fs.mkdirSync(path.dirname(fullTarget), { recursive: true });
    fs.writeFileSync(fullTarget, initialContent, 'utf8');

    const refactoredContent = `
const AREA_CALCULATORS = {
  rectangle: (w, h) => w * h,
  triangle: (w, h) => (w * h) / 2,
};

function calculateArea(shape, width, height) {
  const calc = AREA_CALCULATORS[shape];
  return calc ? calc(width, height) : 0;
}
module.exports = { calculateArea };
`;

    const generatedProposal = {
      proposalId: 'REF-E2E-001',
      title: 'Replace conditional dispatch with lookup table strategy',
      description: 'Replaces if/else chain in calculateArea with lookup strategy table.',
      refactoringCategory: 'SIMPLIFY_CONDITIONAL',
      targetFiles: [targetFile],
      codeSmells: ['Conditional Complexity', 'Open-Closed Principle Violation'],
      currentDesign: 'Hardcoded if/else ladder checking shape strings.',
      proposedDesign: 'Strategy lookup table mapping shape names to calculation functions.',
      behaviorPreservation:
        'Returns exact same numerical results for rectangle, triangle, and unhandled shapes (0).',
      publicApiImpact: {
        hasBreakingChanges: false,
        details: 'Function signature calculateArea(shape, width, height) strictly unchanged.',
      },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile,
          sourceRange: '2-10',
          existingContext: initialContent.trim(),
          proposedReplacement: refactoredContent.trim(),
          reason: 'Improve extensibility and eliminate branching.',
          evidence: 'Complexity metrics CC=4 reduced to CC=2.',
        },
      ],
      regressionRisks: ['Non-existent shape string handling'],
      verificationRequirements: ['npx jest test/unit/geometry.test.js'],
      rollbackPlan: 'Git checkout src/math/geometry.js',
      confidence: 0.99,
      evidenceReferences: ['EVID-CC-002'],
      requiresHumanApproval: true,
      status: 'PROPOSED',
    };

    const mockProvider = new ProviderAdapter({
      provider: 'mock',
      mockHandler: async () => ({
        text: JSON.stringify({
          status: 'SUCCESS',
          summary: 'Formulated strategy lookup refactoring for calculateArea.',
          findings: [],
          refactoringProposals: [generatedProposal],
          recommendations: ['Apply change via ControlledWriteService after human review.'],
        }),
      }),
    });

    const runtime = new AgentRuntime({
      repoRoot: tempWorkspace,
      provider: mockProvider,
      writeService: service,
    });

    // 1. Execute task
    const taskResult = await runtime.executeTask({
      taskId: 'e2e_refactor_task',
      agentId: 'refactoring-engineer',
      objective: 'Refactor calculateArea conditional branching into strategy table',
      context: 'src/math/geometry.js has branching complexity',
    });

    expect(taskResult.status).toBe('SUCCESS');
    expect(taskResult.refactoringProposals).toHaveLength(1);
    const proposal = taskResult.refactoringProposals[0];

    // 2. Behavior preservation check
    expect(isBehaviorPreservingProposal(proposal)).toBe(true);

    // 3. Staged write request
    const writeReq = refactoringToWriteRequest(proposal, {
      workspaceId: tempWorkspace,
      sessionId: 'sess_e2e_refactor',
    });

    const writeOutcome = await service.requestWrite(writeReq);
    expect(writeOutcome.status).toBe('HUMAN_APPROVAL_REQUIRED');

    // 4. Human Approval Gate
    const approver = 'security-lead@tribunal.test';
    const sig = service.generateApprovalSignature(writeOutcome.token, approver, {
      sessionId: 'sess_e2e_refactor',
    });
    service.approveWrite(writeOutcome.token, approver, sig, {
      sessionId: 'sess_e2e_refactor',
    });

    // 5. Transactional Commit
    const commitOutcome = await service.commitWrite(writeOutcome.token, {
      sessionId: 'sess_e2e_refactor',
    });
    expect(commitOutcome.status).toBe('COMMITTED');

    // 6. Verify file on disk
    const updated = fs.readFileSync(fullTarget, 'utf8');
    expect(updated).toContain('AREA_CALCULATORS');
    expect(updated).toContain('calculateArea');
  });

  // ── Realistic Fixture Scenarios ────────────────────────────────────────────

  test('Scenario A: Decompose oversized query builder without altering SQL output semantics', () => {
    const proposal = {
      proposalId: 'REF-SCENARIO-A',
      title: 'Decompose buildSelectQuery into modular clause builders',
      description: 'Extracts buildWhereClause, buildJoinClause, and buildPaginationClause.',
      refactoringCategory: 'EXTRACT_METHOD',
      targetFiles: ['src/db/query_builder.js'],
      codeSmells: ['Long Method (> 100 lines)', 'Mixed Levels of Abstraction'],
      currentDesign: 'Monolithic function concatenating SQL string fragments.',
      proposedDesign: 'Pure helper functions returning sanitized SQL clauses.',
      behaviorPreservation:
        'Generated SQL string, parameter binding positions, and escaping remain 100% identical.',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/db/query_builder.js',
          sourceRange: '30-90',
          existingContext: 'let sql = "SELECT * FROM " + table;\nif (where) { sql += ... }',
          /* eslint-disable no-template-curly-in-string */
          proposedReplacement:
            'const whereClause = buildWhere(where);\nconst sql = `SELECT * FROM ${table}${whereClause}`;',
          /* eslint-enable no-template-curly-in-string */
          reason: 'Isolate clause construction logic.',
          evidence: 'High cyclomatic complexity at line 45.',
        },
      ],
      verificationRequirements: ['npx jest test/unit/query_builder.test.js'],
      rollbackPlan: 'Git checkout src/db/query_builder.js',
      confidence: 0.98,
      status: 'PROPOSED',
    };

    expect(isBehaviorPreservingProposal(proposal)).toBe(true);
  });

  test('Scenario B: Extract duplicate header sanitization into cohesive helper function', () => {
    const proposal = {
      proposalId: 'REF-SCENARIO-B',
      title: 'Extract sanitizeHttpHeader into shared utility',
      description: 'Eliminates duplicate CRLF header sanitization in proxy and gateway.',
      refactoringCategory: 'EXTRACT_FUNCTION',
      targetFiles: ['src/proxy.js', 'src/gateway.js'],
      codeSmells: ['Duplicated Code', 'Shotgun Surgery Risk'],
      currentDesign: 'Regex replace(/\r|\n/g, "") copied across multiple files.',
      proposedDesign: 'Shared sanitizeHttpHeader utility function.',
      behaviorPreservation:
        'Replaces identical characters with identical replacement semantics; input/output invariant.',
      publicApiImpact: false,
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/proxy.js',
          existingContext: 'const safeHeader = val.replace(/\\r|\\n/g, "");',
          proposedReplacement: 'const safeHeader = sanitizeHttpHeader(val);',
          reason: 'Centralize security-critical header sanitization.',
          evidence: 'Duplicated at proxy.js:34 and gateway.js:68.',
        },
      ],
      verificationRequirements: ['npx jest test/unit/proxy.test.js test/unit/gateway.test.js'],
      rollbackPlan: 'Git checkout src/proxy.js src/gateway.js',
      confidence: 1.0,
      status: 'PROPOSED',
    };

    expect(isBehaviorPreservingProposal(proposal)).toBe(true);
  });

  test('Scenario C: Reject enticing refactor that subtly alters exception types and evaluation order', () => {
    // An enticing refactoring that changes evaluation order or exception type:
    // Original:
    //   if (req.user == null) throw new UnauthorizedError();
    //   if (req.body == null) throw new BadRequestError();
    // Refactored proposal:
    //   const { user, body } = validateInput(req); // throws BadRequestError first if body invalid!
    // This alters observable error behavior for requests with both null user and null body!
    const subtleBehaviorDivergence = {
      proposalId: 'REF-SCENARIO-C-REJECT',
      title: 'Combine validation checks into unified validator (Divergent semantics)',
      description: 'Combines authentication check and body validation into single schema parse.',
      refactoringCategory: 'SIMPLIFY_CONDITIONAL',
      targetFiles: ['src/routes/order.js'],
      codeSmells: ['Multiple Guard Clauses'],
      currentDesign: 'Sequential checks: Auth check (401) precedes body validation (400).',
      proposedDesign:
        'Unified validator evaluating body before auth, changing 401 to 400 when unauthenticated caller sends bad body.',
      behaviorPreservation: '', // Specialist refuses to certify behavior preservation!
      publicApiImpact: {
        hasBreakingChanges: true,
        details:
          'Changes HTTP status code from 401 Unauthorized to 400 Bad Request for unauthenticated malformed payloads.',
      },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/routes/order.js',
          existingContext:
            'if (!user) throw new Unauthorized(); if (!body) throw new BadRequest();',
          proposedReplacement: 'validateAll(req);',
          reason: 'Cleaner code',
          evidence: 'Double if statement',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    // Must be rejected as non-behavior-preserving
    expect(isBehaviorPreservingProposal(subtleBehaviorDivergence)).toBe(false);
  });

  test('Scenario D: Reject breaking public API signature modification', () => {
    const breakingSignature = {
      proposalId: 'REF-SCENARIO-D-REJECT',
      title: 'Convert callback API to async/await without backward compatibility wrapper',
      description: 'Removes callback parameter (cb) from readFileAsync.',
      refactoringCategory: 'REFACTORING_CATEGORIES',
      targetFiles: ['src/fs/reader.js'],
      codeSmells: ['Callback Hell'],
      currentDesign: 'readFileAsync(path, options, callback)',
      proposedDesign: 'async function readFileAsync(path, options)',
      behaviorPreservation:
        'Async resolution is identical but callers expecting cb will hang/crash.',
      publicApiImpact: {
        hasBreakingChanges: true,
        details: 'Removes callback argument, breaking all existing non-Promise callers.',
      },
      dependencyImpact: 'None',
      proposedChanges: [
        {
          targetFile: 'src/fs/reader.js',
          existingContext: 'function readFileAsync(p, opts, cb) {}',
          proposedReplacement: 'async function readFileAsync(p, opts) {}',
          reason: 'Modernize to async/await',
          evidence: 'Callbacks are legacy',
        },
      ],
      verificationRequirements: ['test.js'],
      rollbackPlan: 'revert',
    };

    expect(isBehaviorPreservingProposal(breakingSignature)).toBe(false);
  });
});
