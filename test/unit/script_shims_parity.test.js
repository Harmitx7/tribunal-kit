'use strict';

const path = require('path');
const cp = require('child_process');

const SHIM_FILES = [
  'adaptive_execution.js',
  'architecture_intelligence.js',
  'capability_evolution.js',
  'concept_extractor.js',
  'consideration_engine.js',
  'context_compiler.js',
  'coverage_engine.js',
  'cross_domain_engine.js',
  'engineering_memory.js',
  'judgment_engine.js',
  'materiality_engine.js',
  'outcome_engine.js',
  'outcome_optimization_engine.js',
  'simulation_engine.js',
  'skill_intelligence.js',
  'validation_engine.js',
  'verification_auditor.js',
  'visual_audit.js'
];

describe('Phase 3 — Script Forwarding Shims Behavioral Parity', () => {
  test('all 18 forwarding shims export identical symbols to their canonical .agent/scripts targets', () => {
    for (const file of SHIM_FILES) {
      const shimPath = path.resolve(__dirname, '../../scripts', file);
      const targetPath = path.resolve(__dirname, '../../.agent/scripts', file);

      const shimModule = require(shimPath);
      const targetModule = require(targetPath);

      expect(shimModule).toBeDefined();
      expect(targetModule).toBeDefined();

      if (typeof targetModule === 'object' && targetModule !== null) {
        const shimKeys = Object.keys(shimModule).sort();
        const targetKeys = Object.keys(targetModule).sort();
        expect(shimKeys).toEqual(targetKeys);
      } else if (typeof targetModule === 'function') {
        expect(typeof shimModule).toBe('function');
      }
    }
  });

  test('validation_engine shim does not throw ReferenceError on CLI invocation', () => {
    const shimPath = path.resolve(__dirname, '../../scripts/validation_engine.js');
    let err = null;
    let out = '';
    try {
      out = cp.execSync(`node "${shimPath}" --help`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      err = e;
    }

    // Either exit 0 or normal error (e.g. missing input file), but NEVER ReferenceError
    const combinedOutput = (err ? (err.stderr || err.stdout || '') : out);
    expect(combinedOutput).not.toMatch(/ReferenceError/);
  });

  test('all 18 shims execute without runtime syntax or reference errors under node', () => {
    for (const file of SHIM_FILES) {
      const shimPath = path.resolve(__dirname, '../../scripts', file);
      let err = null;
      let out = '';
      try {
        out = cp.execSync(`node "${shimPath}" --help`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) {
        err = e;
      }
      const combined = (err ? (err.stderr || err.stdout || '') : out);
      expect(combined).not.toMatch(/ReferenceError/);
      expect(combined).not.toMatch(/SyntaxError/);
    }
  });
});

