'use strict';

const vm = require('node:vm');

const {
  validateRequirementTrace,
  withContract,
  ContractViolationError,
  assertProperty,
  arb,
  verifyFsmCompleteness,
  createFsmInstance,
  evaluateMutants,
  runDifferentialTest,
  verifyMetamorphicRelation,
  validateVerificationResult,
} = require('../../src/verification');

describe('Software Verification & Formal Methods Domain — End-to-End Integration', () => {
  test('end-to-end verification pipeline: Requirements -> Contracts -> Properties -> FSM -> Mutation -> Differential', async () => {
    // 1. Requirement Traceability
    const requirement = validateRequirementTrace({
      requirementId: 'REQ-01',
      title: 'Order Processing Invariants',
      category: 'FUNCTIONAL',
      invariantIds: ['INV-01'],
      implementationFiles: ['src/domain/order.js'],
      verificationCaseIds: ['VERIF-CASE-01'],
      status: 'VERIFIED',
      uncoveredAcceptanceCriteria: [],
    });
    expect(requirement.status).toBe('VERIFIED');

    // 2. Design-by-Contract: Safe Order Creation
    let orderDb = [];
    const createOrder = withContract(
      (orderId, amount) => {
        const order = { orderId, amount, status: 'CREATED' };
        orderDb.push(order);
        return order;
      },
      {
        pre: [
          (id, amt) => typeof id === 'string' && id.length > 0,
          (id, amt) => typeof amt === 'number' && amt > 0,
        ],
        post: [
          (order) => order.status === 'CREATED' && order.amount > 0,
        ],
      }
    );

    const validOrder = createOrder('ORD-101', 49.99);
    expect(validOrder.orderId).toBe('ORD-101');
    expect(() => createOrder('ORD-BAD', -5)).toThrow(ContractViolationError);

    // 3. Property-Based Invariant: Tax Calculation Monotonicity
    // Invariant: amount1 <= amount2 implies tax(amount1) <= tax(amount2)
    const calculateTax = (amt) => Math.round(amt * 0.08 * 100) / 100;
    const propertyResult = assertProperty(
      [arb.integer({ min: 1, max: 1000 }), arb.integer({ min: 1, max: 1000 })],
      (amt1, amt2) => {
        const smaller = Math.min(amt1, amt2);
        const larger = Math.max(amt1, amt2);
        return calculateTax(smaller) <= calculateTax(larger);
      },
      { runs: 50, seed: 42 }
    );
    expect(propertyResult.passed).toBe(true);

    // 4. State Machine Verification: Order FSM
    const orderFsm = {
      states: ['CREATED', 'PAID', 'SHIPPED', 'CANCELLED'],
      initialState: 'CREATED',
      terminalStates: ['SHIPPED', 'CANCELLED'],
      transitions: [
        { from: 'CREATED', event: 'PAY', to: 'PAID', action: (ctx) => ({ ...ctx, isPaid: true }) },
        { from: 'CREATED', event: 'CANCEL', to: 'CANCELLED' },
        { from: 'PAID', event: 'SHIP', to: 'SHIPPED' },
      ],
      invariants: [
        { state: 'SHIPPED', check: (ctx) => ctx.isPaid === true, message: 'Cannot ship unpaid order' },
      ],
    };

    const completeness = verifyFsmCompleteness(orderFsm);
    expect(completeness.isComplete).toBe(true);

    const fsmInstance = createFsmInstance(orderFsm, { isPaid: false });
    fsmInstance.transition('PAY');
    fsmInstance.transition('SHIP');
    expect(fsmInstance.getState()).toBe('SHIPPED');

    // 5. Mutation Testing: Check Test Assertion Effectiveness
    const discountCode = 'function discount(amt) { if (amt > 50) return amt * 0.9; return amt; }';
    const strictRunner = (mutated) => {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(mutated, sandbox, { timeout: 1000 });
      const fn = sandbox.discount;
      if (typeof fn !== 'function') return false;
      if (fn(100) !== 90) return false;
      if (fn(50) !== 50) return false;
      if (fn(40) !== 40) return false;
      return true;
    };

    const mutationReport = await evaluateMutants(discountCode, strictRunner);
    expect(mutationReport.mutationScore).toBe(1.0);
    expect(mutationReport.verdict).toBe('PASSED_EFFECTIVE_TESTS');

    // 6. Differential Testing & Metamorphic Verification
    const diffReport = runDifferentialTest(
      (x) => Math.floor(x),
      (x) => Math.floor(x),
      [[1.5], [2.9], [-0.5], [10.0]]
    );
    expect(diffReport.isEquivalent).toBe(true);

    // 7. Audit Ledger Recording (VerificationResultSchema)
    const auditRecord = validateVerificationResult({
      caseId: 'VERIF-PIPELINE-01',
      testedRevision: 'commit-781959c',
      timestamp: new Date().toISOString(),
      status: 'PASS',
      durationMs: 45,
      metrics: {
        runsCount: propertyResult.runsCompleted,
        mutantsKilled: mutationReport.killedCount,
        mutantsTotal: mutationReport.totalMutants,
      },
      evidence: [
        { type: 'DETERMINISTIC_CHECK', source: 'contract_engine.js', verified: true },
        { type: 'PROPERTY_INVARIANT', source: 'property_testing_engine.js', verified: true },
        { type: 'FSM_TRANSITION', source: 'state_machine_engine.js', verified: true },
        { type: 'MUTATION_KILL', source: 'mutation_testing_engine.js', verified: true },
      ],
    });

    expect(auditRecord.status).toBe('PASS');
    expect(auditRecord.evidence.length).toBe(4);
  });
});
