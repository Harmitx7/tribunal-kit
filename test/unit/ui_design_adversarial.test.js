'use strict';

const {
  buildDesignDecisionRecord,
  analyzeVisualDefects,
  auditInteractiveStates,
  isWcagAaCompliant,
  verifyConcentricRadius,
} = require('../../src/design_intelligence');

describe('UI Design Adversarial Stress Scenarios (Unit)', () => {
  it('Scenario 1: resolves vague "make it premium" prompt to concrete DDR without purple mesh', () => {
    const ddr = buildDesignDecisionRecord({
      productName: 'Analytics Dashboard',
      productCategory: 'ANALYTICS',
    });
    expect(ddr.visualDirection).toBe('DENSE_ANALYTICAL');
    expect(ddr.palette.brandAccent.cssString).not.toContain('oklch(0.65 0.18 300)'); // Not purple
    expect(ddr.antiSlopExclusions.length).toBeGreaterThan(0);
  });

  it('Scenario 2: flags incompatible local hex tokens inside design system', () => {
    const snippet = '<div style={{ backgroundColor: "#2b2b2b", color: "#ffffff" }}>Custom</div>';
    const defects = analyzeVisualDefects(snippet);
    expect(defects.some(d => d.category === 'SLOP_CLICHE_DETECTED')).toBe(true);
  });

  it('Scenario 3: flags mobile table blowout lacking overflow-x-auto', () => {
    const snippet = '<div className="w-full"><table><thead><tr><th>Metric</th></tr></thead></table></div>';
    const defects = analyzeVisualDefects(snippet);
    const tableDefect = defects.find(d => d.id.startsWith('TABLE_MISSING_OVERFLOW'));
    expect(tableDefect).toBeDefined();
    expect(tableDefect.severity).toBe('P1_CRITICAL');
  });

  it('Scenario 4: catches concentric corner radius mismatch', () => {
    // Inner radius 16px, container padding 16px -> expected outer 32px, but actual is 8px
    const radiusCheck = verifyConcentricRadius(8, 16, 16);
    expect(radiusCheck.isConcentric).toBe(false);
    expect(radiusCheck.expectedOuterRadius).toBe(32);
  });

  it('Scenario 5: detects transition-all layout thrashing risk', () => {
    const snippet = '<div className="transition-all duration-300 hover:scale-105">';
    const defects = analyzeVisualDefects(snippet);
    expect(defects.some(d => d.id.startsWith('TRANSITION_ALL'))).toBe(true);
  });

  it('Scenario 6: flags inaccessible muted text contrast below WCAG AA', () => {
    const darkBg = 'oklch(0.12 0.01 260)';
    const illegibleText = 'oklch(0.30 0.01 260)'; // Delta L = 0.18 < 0.45
    expect(isWcagAaCompliant(illegibleText, darkBg)).toBe(false);
  });

  it('Scenario 7: catches outline:none removing visible focus ring', () => {
    const snippet = '<button className="outline-none bg-blue-600 text-white">Action</button>';
    const defects = analyzeVisualDefects(snippet);
    expect(defects.some(d => d.id.startsWith('OUTLINE_NONE_MISSING_RING'))).toBe(true);
  });

  it('Scenario 8: catches incomplete interactive states lacking active press feedback', () => {
    const classStr = 'px-4 py-2 hover:bg-gray-100 disabled:opacity-50'; // Missing active press
    const audit = auditInteractiveStates('btn-static', classStr);
    expect(audit.isCompliant).toBe(false);
    expect(audit.hasActivePress).toBe(false);
  });

  it('Scenario 9: catches scale(0) entry animation popping risk', () => {
    const snippet = '<div className="animate-in scale-0 duration-200">';
    const defects = analyzeVisualDefects(snippet);
    expect(defects.some(d => d.id.startsWith('SCALE_ZERO_ENTRANCE'))).toBe(true);
  });

  it('Scenario 10: flags generic AI purple gradient cliché', () => {
    const snippet = '<div className="bg-gradient-to-r from-purple-500 to-indigo-600">';
    const defects = analyzeVisualDefects(snippet);
    expect(defects.some(d => d.id.startsWith('PURPLE_GRADIENT_CLICHE'))).toBe(true);
  });

  it('Scenario 11: ensures fluid clamp scales cleanly between viewports', () => {
    const { generateFluidClamp } = require('../../src/design_intelligence/spatial_layout_engine');
    const clamp = generateFluidClamp(1.0, 2.0);
    expect(clamp).toContain('clamp(1rem');
    expect(clamp).toContain('2rem)');
  });

  it('Scenario 12: verifies compliant component passes without fatal or critical defects', () => {
    const snippet = `
      <div className="overflow-x-auto p-5 rounded-[28px] bg-surface-0 border border-border-subtle">
        <button className="px-4 py-2 rounded-lg bg-action hover:bg-action-hover focus-visible:outline-2 active:scale-[0.98] disabled:opacity-50">
          Save Changes
        </button>
      </div>
    `;
    const defects = analyzeVisualDefects(snippet);
    const critical = defects.filter(d => d.severity === 'P0_FATAL' || d.severity === 'P1_CRITICAL');
    expect(critical.length).toBe(0);
  });
});

