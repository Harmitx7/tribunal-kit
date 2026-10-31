'use strict';

const { auditInteractiveStates } = require('../../src/design_intelligence/component_state_engine');

describe('UI Component State Engine (Unit)', () => {
  it('audits a compliant 5-state interactive target', () => {
    const classStr = 'px-4 py-2 bg-primary hover:bg-primary-hover focus-visible:ring-2 active:scale-[0.98] disabled:opacity-50';
    const audit = auditInteractiveStates('btn-primary', classStr);

    expect(audit.isCompliant).toBe(true);
    expect(audit.hasHover).toBe(true);
    expect(audit.hasFocusVisible).toBe(true);
    expect(audit.hasActivePress).toBe(true);
    expect(audit.hasDisabled).toBe(true);
    expect(audit.pressScaleFactor).toBe(0.98);
  });

  it('detects missing states on non-compliant interactive target', () => {
    // Only has hover, missing focus-visible, active press, and disabled
    const classStr = 'px-4 py-2 bg-blue-500 hover:bg-blue-600';
    const audit = auditInteractiveStates('btn-flawed', classStr);

    expect(audit.isCompliant).toBe(false);
    expect(audit.hasHover).toBe(true);
    expect(audit.hasFocusVisible).toBe(false);
    expect(audit.hasActivePress).toBe(false);
    expect(audit.hasDisabled).toBe(false);
  });
});

