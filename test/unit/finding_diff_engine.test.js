'use strict';

const { FindingDiffEngine } = require('../../src/execution/finding_diff_engine');

describe('FindingDiffEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new FindingDiffEngine();
  });

  it('identifies resolved and unresolved findings', () => {
    const baseFindings = [
      { category: 'Security', severity: 'CRITICAL', file: 'a.js', issue: 'SQL Injection' },
      { category: 'Style', severity: 'LOW', file: 'b.js', issue: 'Indentation' },
    ];

    const newFindings = [
      { category: 'Style', severity: 'LOW', file: 'b.js', issue: 'Indentation' },
    ];

    const diff = engine.compare(baseFindings, newFindings);

    expect(diff.resolved.length).toBe(1);
    expect(diff.resolved[0].category).toBe('Security');

    expect(diff.unresolved.length).toBe(1);
    expect(diff.unresolved[0].category).toBe('Style');

    expect(diff.new.length).toBe(0);
    expect(diff.regressed.length).toBe(0);
  });

  it('detects new critical regressions', () => {
    const baseFindings = [
      { category: 'Style', severity: 'LOW', file: 'b.js', issue: 'Indentation' },
    ];

    const newFindings = [
      { category: 'Style', severity: 'LOW', file: 'b.js', issue: 'Indentation' },
      { category: 'Logic', severity: 'CRITICAL', file: 'b.js', issue: 'Null pointer' },
    ];

    const diff = engine.compare(baseFindings, newFindings);

    expect(diff.resolved.length).toBe(0);
    expect(diff.new.length).toBe(1);
    expect(diff.regressed.length).toBe(1);
    expect(diff.regressed[0].issue).toBe('Null pointer');
  });

  it('ignores non-critical regressions as regressed but lists them as new', () => {
    const baseFindings = [];

    const newFindings = [{ category: 'Style', severity: 'INFO', file: 'b.js', issue: 'Typo' }];

    const diff = engine.compare(baseFindings, newFindings);

    expect(diff.new.length).toBe(1);
    expect(diff.regressed.length).toBe(0);
  });
});
