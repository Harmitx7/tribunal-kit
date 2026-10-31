'use strict';

const { analyzeVisualDefects } = require('../../src/design_intelligence/visual_defect_analyzer');

describe('UI Visual Defect Analyzer (Unit)', () => {
  it('detects hardcoded hex colors', () => {
    const code = '<div className="bg-[#1a1a1a] text-[#ffffff]">';
    const defects = analyzeVisualDefects(code);
    expect(defects.some(d => d.category === 'SLOP_CLICHE_DETECTED' && d.id.startsWith('HEX_COLOR_FOUND'))).toBe(true);
  });

  it('detects dangerous transition: all', () => {
    const code = '<button className="transition-all duration-300">';
    const defects = analyzeVisualDefects(code);
    expect(defects.some(d => d.id.startsWith('TRANSITION_ALL'))).toBe(true);
  });

  it('detects outline none without focus-visible', () => {
    const code = '<button className="outline-none py-2 px-4">';
    const defects = analyzeVisualDefects(code);
    expect(defects.some(d => d.id.startsWith('OUTLINE_NONE_MISSING_RING'))).toBe(true);
  });

  it('detects default purple gradient cliché', () => {
    const code = '<div className="bg-gradient-to-r from-purple-500 to-indigo-600">';
    const defects = analyzeVisualDefects(code);
    expect(defects.some(d => d.id.startsWith('PURPLE_GRADIENT_CLICHE'))).toBe(true);
  });

  it('detects table missing overflow containment', () => {
    const code = '<div><table><thead><tr><th>Header</th></tr></thead></table></div>';
    const defects = analyzeVisualDefects(code);
    expect(defects.some(d => d.id.startsWith('TABLE_MISSING_OVERFLOW'))).toBe(true);
  });

  it('passes clean, compliant code without high-severity defects', () => {
    const code = `
      <div className="overflow-x-auto p-4 rounded-[24px] bg-surface-0 border border-border-subtle">
        <button className="px-4 py-2 rounded-lg bg-action hover:bg-action-hover focus-visible:ring-2 active:scale-[0.98] disabled:opacity-50">
          Save Changes
        </button>
      </div>
    `;
    const defects = analyzeVisualDefects(code);
    const fatalOrCritical = defects.filter(d => d.severity === 'P0_FATAL' || d.severity === 'P1_CRITICAL');
    expect(fatalOrCritical.length).toBe(0);
  });
});

