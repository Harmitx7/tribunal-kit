'use strict';

/**
 * contract_engine.js — Design-by-Contract (DbC) Enforcement Engine
 * =================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Provides runtime contract assertion and boundary verification:
 * 1. Preconditions (P_pre): Input assumptions that caller must satisfy
 * 2. Postconditions (Q_post): Guaranteed return values that implementation must provide
 * 3. Invariants (I_inv): Immutable consistency properties holding across operations
 * 4. Contract Violation Diagnostics with structured defect classification
 */

class ContractViolationError extends Error {
  constructor(type, message, details = {}) {
    super(`[${type}] Contract Violation: ${message}`);
    this.name = 'ContractViolationError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Asserts a precondition condition.
 */
function requires(condition, message = 'Precondition failed', details = {}) {
  const isSatisfied = typeof condition === 'function' ? condition() : Boolean(condition);
  if (!isSatisfied) {
    throw new ContractViolationError('PRECONDITION_VIOLATION', message, details);
  }
}

/**
 * Asserts a postcondition condition on return value.
 */
function ensures(condition, message = 'Postcondition failed', details = {}) {
  const isSatisfied = typeof condition === 'function' ? condition() : Boolean(condition);
  if (!isSatisfied) {
    throw new ContractViolationError('POSTCONDITION_VIOLATION', message, details);
  }
}

/**
 * Asserts an invariant condition that must hold before and after execution.
 */
function checkInvariant(condition, message = 'System invariant failed', details = {}) {
  const isSatisfied = typeof condition === 'function' ? condition() : Boolean(condition);
  if (!isSatisfied) {
    throw new ContractViolationError('INVARIANT_VIOLATION', message, details);
  }
}

/**
 * Wraps a target function with executable Design-by-Contract gates.
 *
 * @param {Function} targetFn - The underlying business logic function
 * @param {object} contract - Contract definition
 * @param {Array<Function|object>} [contract.pre] - Precondition checks: (args) => boolean
 * @param {Array<Function|object>} [contract.post] - Postcondition checks: (result, args) => boolean
 * @param {Array<Function|object>} [contract.invariants] - Invariant checks: () => boolean
 * @returns {Function} Contract-enforced proxy function
 */
function withContract(targetFn, contract = {}) {
  if (typeof targetFn !== 'function') {
    throw new Error('withContract requires a callable target function.');
  }

  const preconditions = Array.isArray(contract.pre) ? contract.pre : [];
  const postconditions = Array.isArray(contract.post) ? contract.post : [];
  const invariants = Array.isArray(contract.invariants) ? contract.invariants : [];

  return function contractEnforcedWrapper(...args) {
    // 1. Verify Class / Module Invariants before execution
    for (const inv of invariants) {
      const checkFn = typeof inv === 'function' ? inv : inv.check;
      const msg = inv.message || 'Pre-execution invariant check failed.';
      checkInvariant(checkFn(), msg, { stage: 'pre-execution', args });
    }

    // 2. Verify Preconditions on arguments
    for (const pre of preconditions) {
      const checkFn = typeof pre === 'function' ? pre : pre.check;
      const msg = pre.message || 'Caller failed to satisfy function precondition.';
      requires(checkFn(...args), msg, { args });
    }

    // 3. Execute underlying implementation
    let result;
    try {
      result = targetFn.apply(this, args);
    } catch (err) {
      // Re-throw contract errors untouched
      if (err instanceof ContractViolationError) throw err;
      throw err;
    }

    // 4. Verify Postconditions on result
    for (const post of postconditions) {
      const checkFn = typeof post === 'function' ? post : post.check;
      const msg = post.message || 'Function implementation failed to satisfy guaranteed postcondition.';
      ensures(checkFn(result, ...args), msg, { result, args });
    }

    // 5. Verify Class / Module Invariants after execution
    for (const inv of invariants) {
      const checkFn = typeof inv === 'function' ? inv : inv.check;
      const msg = inv.message || 'Post-execution invariant check failed.';
      checkInvariant(checkFn(), msg, { stage: 'post-execution', result, args });
    }

    return result;
  };
}

/**
 * Audits a code snippet or function interface for missing boundary validations.
 *
 * @param {string} codeSnippet - Raw source code of a function
 * @returns {object} Contract audit findings
 */
function auditContractCompleteness(codeSnippet) {
  if (typeof codeSnippet !== 'string') {
    return { isComplete: false, issues: ['Invalid source code input.'] };
  }

  const issues = [];

  // Check for unchecked argument indexing or division by parameter
  if (/\/\s*[a-zA-Z0-9_]+\b/.test(codeSnippet) && !/=== 0|!== 0|<= 0|< 0|> 0/.test(codeSnippet)) {
    issues.push({
      type: 'POTENTIAL_DIVISION_BY_ZERO',
      severity: 'HIGH',
      description: 'Arithmetic division performed without precondition check against zero denominator.',
    });
  }

  // Check for unchecked array length / indexing
  if (/\[\s*0\s*\]|\[\s*[a-zA-Z_]+\s*\]/.test(codeSnippet) && !/\.length\b/.test(codeSnippet)) {
    issues.push({
      type: 'UNCHECKED_ARRAY_INDEXING',
      severity: 'MEDIUM',
      description: 'Direct array element indexing without length or bounds precondition verification.',
    });
  }

  // Check for null dereference risk (e.g. obj.prop without obj check)
  if (/\b([a-zA-Z_]+)\.[a-zA-Z_]+/.test(codeSnippet) && !/\?\.|typeof|if\s*\(/.test(codeSnippet)) {
    issues.push({
      type: 'MISSING_NULLABILITY_PRECONDITION',
      severity: 'MEDIUM',
      description: 'Object property accessed without null/undefined guard.',
    });
  }

  return {
    isComplete: issues.length === 0,
    issuesCount: issues.length,
    issues,
  };
}

module.exports = {
  ContractViolationError,
  requires,
  ensures,
  checkInvariant,
  withContract,
  auditContractCompleteness,
};
