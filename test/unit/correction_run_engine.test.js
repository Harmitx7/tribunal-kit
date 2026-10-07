'use strict';

const { CorrectionRunEngine } = require('../../src/execution/correction_run_engine');
const { ResolutionPolicy } = require('../../src/execution/resolution_policy');

describe('CorrectionRunEngine', () => {
  let engine;
  let mockWriteService;
  let mockVerifier;

  beforeEach(() => {
    mockWriteService = {
      requestWrite: jest
        .fn()
        .mockResolvedValue({ status: 'PENDING_COMMIT', token: 'tok', transactionId: 'tx1' }),
      commitWrite: jest.fn().mockResolvedValue({}),
    };

    mockVerifier = {
      verify: jest.fn().mockResolvedValue({
        addEvidence: jest.fn(),
        getAllEvidence: jest.fn().mockReturnValue([]),
        hasFailingEvidence: jest.fn().mockReturnValue(false),
        hasPassingEvidence: jest.fn().mockReturnValue(true),
      }),
    };

    engine = new CorrectionRunEngine({
      controlledWriteService: mockWriteService,
      correctionVerifier: mockVerifier,
    });

    // We can spy on ResolutionPolicy to control test outcomes since EvidenceAggregator is mocked
    jest.spyOn(ResolutionPolicy, 'evaluate').mockReturnValue({ status: 'RESOLVED' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs a full correction loop successfully', async () => {
    const finding = { id: 'F1', category: 'Security', severity: 'CRITICAL', issue: 'Bad code' };
    const runId = engine.createRun(finding, { workspaceId: 'ws1' });

    // Plan
    const planRes = await engine.planCorrection(runId, { someContext: true });
    expect(planRes.status).toBe('PLAN_READY');

    // Execute
    const execRes = await engine.executeCorrection(runId, [
      { path: 'test.js', operation: 'MODIFY', content: 'good code' },
    ]);
    expect(execRes.status).toBe('CORRECTION_APPLIED');
    expect(mockWriteService.requestWrite).toHaveBeenCalled();
    expect(mockWriteService.commitWrite).toHaveBeenCalled();

    // Verify
    const verifyRes = await engine.verifyCorrection(runId, []);
    expect(verifyRes.status).toBe('RESOLVED');
    expect(verifyRes.certificate).toBeDefined();
  });

  it('escalates on loop detection (same proposal)', async () => {
    const finding = { id: 'F1', category: 'Security', severity: 'CRITICAL', issue: 'Bad code' };
    const runId = engine.createRun(finding, { workspaceId: 'ws1' });

    engine.correctionEngine.generateEnhancedPlan = jest
      .fn()
      .mockReturnValue({ objective: 'Fix it' });

    await engine.planCorrection(runId, {});

    const state = engine.activeRuns.get(runId);
    state.state = 'INITIALIZED';

    const secondPlan = await engine.planCorrection(runId, {});
    expect(secondPlan.status).toBe('ESCALATED');
    expect(secondPlan.reason).toContain('LOOP_DETECTED');
  });

  it('escalates when verification fails', async () => {
    jest
      .spyOn(ResolutionPolicy, 'evaluate')
      .mockReturnValue({ status: 'ESCALATED', reason: 'Verification FAILED' });

    const finding = { id: 'F1', category: 'Security' };
    const runId = engine.createRun(finding, { workspaceId: 'ws1' });

    await engine.planCorrection(runId, {});
    await engine.executeCorrection(runId, []);

    const verifyRes = await engine.verifyCorrection(runId, []);
    expect(verifyRes.status).toBe('ESCALATED');
    expect(verifyRes.reason).toContain('Verification FAILED');
  });
});
