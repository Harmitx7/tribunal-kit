'use strict';

const caseLaw = require('../../.agent/scripts/case_law_manager');
const { codifyAuditViolations } = require('../../dist/browser/case_bridge');

describe('browser/case_bridge.js — Empirical Case Law Bridge', () => {
  let mockIndex;
  let savedCases;
  let saveIndexCalled;

  beforeEach(() => {
    mockIndex = {
      version: '1.0',
      next_id: 10,
      cases: [],
    };
    savedCases = [];
    saveIndexCalled = false;

    jest.spyOn(caseLaw, 'loadIndex').mockImplementation(() => mockIndex);
    jest.spyOn(caseLaw, 'saveCase').mockImplementation((c) => savedCases.push(c));
    jest.spyOn(caseLaw, 'saveIndex').mockImplementation((idx) => {
      saveIndexCalled = true;
      mockIndex = idx;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('codifies accessibility, security, and console violations into Case Law', () => {
    const mockReport = {
      url: 'http://localhost:3000',
      violations: {
        accessibility: [
          { category: 'a11y', message: '4 image(s) missing alt attribute', count: 4 },
        ],
        security: ['Missing Content-Security-Policy (CSP) header'],
        consoleErrors: [
          {
            level: 'error',
            text: 'Uncaught TypeError: Cannot read properties of undefined',
            url: 'http://localhost:3000/main.js',
            line: 42,
          },
        ],
      },
    };

    const result = codifyAuditViolations(mockReport);
    expect(result.codifiedCount).toBe(3);
    expect(savedCases.length).toBe(3);
    expect(saveIndexCalled).toBe(true);

    const a11yCase = savedCases.find(
      (c) => c.domain === 'frontend' && c.reason.includes('Accessibility')
    );
    expect(a11yCase).toBeDefined();
    expect(a11yCase.id).toBe(10);
    expect(a11yCase.reviewer).toBe('browser-audit');
    expect(a11yCase.verdict).toBe('REJECTED');

    const secCase = savedCases.find((c) => c.domain === 'security');
    expect(secCase).toBeDefined();
    expect(secCase.reason).toContain('Content-Security-Policy');

    const errCase = savedCases.find((c) => c.reason.includes('Uncaught browser exception'));
    expect(errCase).toBeDefined();
  });

  test('deduplicates existing cases with identical fingerprint', () => {
    const mockReport = {
      url: 'http://localhost:3000',
      violations: {
        accessibility: [
          { category: 'a11y', message: '1 image(s) missing alt attribute', count: 1 },
        ],
        security: [],
        consoleErrors: [],
      },
    };

    const firstPass = codifyAuditViolations(mockReport);
    expect(firstPass.codifiedCount).toBe(1);

    // Second pass should not duplicate
    const secondPass = codifyAuditViolations(mockReport);
    expect(secondPass.codifiedCount).toBe(0);
  });

  test('returns 0 if audit report has no violations', () => {
    const cleanReport = {
      url: 'http://localhost:3000',
      violations: {
        accessibility: [],
        security: [],
        consoleErrors: [],
      },
    };

    const res = codifyAuditViolations(cleanReport);
    expect(res.codifiedCount).toBe(0);
    expect(res.cases).toEqual([]);
    expect(saveIndexCalled).toBe(false);
  });
});
