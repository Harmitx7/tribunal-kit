'use strict';

/**
 * review_command.test.js — CLI Integration Tests for tk review --plan and --execute
 * =================================================================================
 * Phase 1N & 1O: Testing CLI Plan and Execute Modes with JSON Telemetry
 */

const { cmdReview, FIXTURES } = require('../../src/commands/review');

describe('Phase 1N & 1O: tk review CLI Command Modes', () => {
  let originalExitCode;
  let originalLog;
  let loggedOutput = [];

  beforeEach(() => {
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    loggedOutput = [];
    originalLog = console.log;
    console.log = (...args) => {
      loggedOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    console.log = originalLog;
  });

  test('tk review --plan --fixture mfa-implementation --json produces structured plan JSON', async () => {
    await cmdReview(
      {},
      ['node', 'tk', 'review', '--plan', '--fixture', 'mfa-implementation', '--json'],
      true,
    );

    expect(loggedOutput.length).toBeGreaterThan(0);
    const parsed = JSON.parse(loggedOutput.join('\n'));
    expect(parsed.mode).toBe('plan');
    expect(parsed.tier).toBe(3);
    expect(parsed.tier_name).toBe('Full Gauntlet');
    expect(parsed.selected_reviewers).toContain('security-auditor');
    expect(parsed.signals).toBeDefined();
    expect(parsed.evidence_summary).toBeDefined();
  });

  test('tk review --execute --mock --fixture mfa-implementation --json runs reviewers and aggregates verdict', async () => {
    await cmdReview(
      {},
      ['node', 'tk', 'review', '--execute', '--mock', '--fixture', 'mfa-implementation', '--json'],
      true,
    );

    expect(loggedOutput.length).toBeGreaterThan(0);
    const parsed = JSON.parse(loggedOutput.join('\n'));
    expect(parsed.mode).toBe('execute');
    expect(parsed.reviewRunId).toBeDefined();
    expect(parsed.execution).toBeDefined();
    expect(parsed.execution.results.length).toBeGreaterThan(0);
    expect(parsed.aggregated).toBeDefined();
    expect(parsed.aggregated.verdict).toBe('APPROVED');
    expect(parsed.execution.telemetry.totalTokens).toBeGreaterThan(0);
  });

  test('tk review --execute supports overriding reviewer set via --reviewers', async () => {
    await cmdReview(
      {},
      [
        'node',
        'tk',
        'review',
        '--execute',
        '--mock',
        '--fixture',
        'mfa-implementation',
        '--reviewers',
        'security-auditor,logic-reviewer',
        '--json',
      ],
      true,
    );

    const parsed = JSON.parse(loggedOutput.join('\n'));
    expect(parsed.reviewers).toEqual(['security-auditor', 'logic-reviewer']);
    expect(parsed.execution.results).toHaveLength(2);
    expect(parsed.aggregated.reviewersExecuted).toEqual(['security-auditor', 'logic-reviewer']);
  });

  test('tk review exports built-in fixtures and configurations', () => {
    expect(FIXTURES).toBeDefined();
    expect(Object.keys(FIXTURES)).toContain('mfa-implementation');
    expect(Object.keys(FIXTURES)).toContain('rbac-modification');
    expect(Object.keys(FIXTURES)).toContain('schema-migration');
    expect(Object.keys(FIXTURES)).toContain('authenticated-endpoint');
    expect(Object.keys(FIXTURES)).toContain('secret-rotation');
  });
});
