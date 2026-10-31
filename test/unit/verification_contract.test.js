'use strict';

const {
  ContractViolationError,
  requires,
  ensures,
  checkInvariant,
  withContract,
  auditContractCompleteness,
} = require('../../src/verification');

describe('Design-by-Contract (DbC) Engine', () => {
  test('requires asserts preconditions and throws ContractViolationError', () => {
    expect(() => {
      requires(5 > 0, 'Must be positive');
    }).not.toThrow();

    expect(() => {
      requires(-1 > 0, 'Must be positive');
    }).toThrow(ContractViolationError);

    try {
      requires(false, 'Argument cannot be null');
    } catch (err) {
      expect(err.type).toBe('PRECONDITION_VIOLATION');
      expect(err.message).toContain('Argument cannot be null');
    }
  });

  test('ensures asserts postconditions on return values', () => {
    expect(() => {
      ensures(100 >= 0, 'Return must be non-negative');
    }).not.toThrow();

    expect(() => {
      ensures(-5 >= 0, 'Return must be non-negative');
    }).toThrow(ContractViolationError);

    try {
      ensures(false, 'Postcondition failed');
    } catch (err) {
      expect(err.type).toBe('POSTCONDITION_VIOLATION');
    }
  });

  test('checkInvariant asserts invariants holding across operations', () => {
    expect(() => {
      checkInvariant(true, 'Invariant holds');
    }).not.toThrow();

    expect(() => {
      checkInvariant(false, 'Invariant violated');
    }).toThrow(ContractViolationError);

    try {
      checkInvariant(false, 'Invariant broken');
    } catch (err) {
      expect(err.type).toBe('INVARIANT_VIOLATION');
    }
  });

  test('withContract enforces full pre, post, and invariant lifecycle', () => {
    let balance = 100;

    const withdraw = withContract(
      (amount) => {
        balance -= amount;
        return balance;
      },
      {
        pre: [
          (amount) => amount > 0,
          (amount) => amount <= balance,
        ],
        post: [
          (newBal, amount) => newBal >= 0,
        ],
        invariants: [
          () => balance >= 0,
        ],
      }
    );

    // Valid withdrawal
    expect(withdraw(30)).toBe(70);
    expect(balance).toBe(70);

    // Precondition failure: negative amount
    expect(() => withdraw(-10)).toThrow(ContractViolationError);

    // Precondition failure: overdraft amount
    expect(() => withdraw(100)).toThrow(ContractViolationError);
  });

  test('auditContractCompleteness detects missing boundary checks in raw code', () => {
    const rawDivision = 'function divide(a, b) { return a / b; }';
    const audit1 = auditContractCompleteness(rawDivision);
    expect(audit1.isComplete).toBe(false);
    expect(audit1.issues.some(i => i.type === 'POTENTIAL_DIVISION_BY_ZERO')).toBe(true);

    const safeDivision = 'function divide(a, b) { if (b === 0) throw new Error(); return a / b; }';
    const audit2 = auditContractCompleteness(safeDivision);
    expect(audit2.issues.some(i => i.type === 'POTENTIAL_DIVISION_BY_ZERO')).toBe(false);
  });
});
