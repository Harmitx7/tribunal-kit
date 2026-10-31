'use strict';

const { executeDesignQualityLoop } = require('../../src/design_intelligence');

describe('UI Engineering & Design Intelligence Domain (Integration)', () => {
  it('executes 9-step Design Quality Loop on compliant component and certifies release', async () => {
    const input = {
      taskId: 'integration-task-saas-dashboard',
      productName: 'Cloud Governance Console',
      productCategory: 'DEV_TOOL',
      targetAudience: 'Infrastructure Engineers',
      codeSnippet: `
        <div className="overflow-x-auto p-4 rounded-[18px] bg-surface-0 border border-border-subtle">
          <h2 className="text-lg font-mono font-semibold text-text-primary">Cluster Status</h2>
          <button className="mt-4 px-3 py-1.5 rounded-sm bg-action hover:bg-action-hover focus-visible:outline-2 active:scale-[0.98] disabled:opacity-50">
            Sync State
          </button>
        </div>
      `,
      buttonClasses: 'px-3 py-1.5 rounded-sm bg-action hover:bg-action-hover focus-visible:outline-2 active:scale-[0.98] disabled:opacity-50',
    };

    const outcome = await executeDesignQualityLoop(input);

    expect(outcome.success).toBe(true);
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    expect(outcome.designDecisionRecord.visualDirection).toBe('TECHNICAL_UTILITARIAN');
    expect(outcome.stateContract.isCompliant).toBe(true);
    expect(outcome.stateContract.pressScaleFactor).toBe(0.98);
    expect(outcome.benchmarkResult.tier).toBe('EXEMPLARY');
    expect(outcome.benchmarkResult.weightedScore).toBeGreaterThanOrEqual(4.0);
  });

  it('fails closed when component has critical layout defect (Safety Non-Masking Invariant)', async () => {
    const flawedInput = {
      taskId: 'integration-flawed-table',
      productName: 'Uncontained Table',
      productCategory: 'B2B_SAAS',
      codeSnippet: `
        <div>
          <table>
            <thead><tr><th>Wide Header Column 1</th><th>Wide Header Column 2</th></tr></thead>
          </table>
          <button className="bg-blue-500">Unstyled Action</button>
        </div>
      `,
      buttonClasses: 'bg-blue-500', // Missing hover, focus-visible, active press, disabled
    };

    const outcome = await executeDesignQualityLoop(flawedInput);

    // Must NOT succeed when critical P1 layout collapse or missing states exist
    expect(outcome.success).toBe(false);
    expect(outcome.benchmarkResult.tier).toBe('FAILING');
    expect(outcome.defects.some(d => d.severity === 'P1_CRITICAL')).toBe(true);
  });
});

