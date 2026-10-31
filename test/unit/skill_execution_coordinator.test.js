'use strict';

/**
 * skill_execution_coordinator.test.js — Verification of Multi-Skill Orchestration & Lifecycle
 *
 * Verifies Phase 6 & Phase 7 non-negotiables:
 * - Single, sequential, and parallel skill orchestration
 * - Zero silent abandonment — all skills accounted for in audit log
 * - State machine legality and illegal transition rejection
 * - Strict prerequisite enforcement
 * - Safe artifact propagation between stages
 */

const {
  SkillExecutionCoordinator,
  SKILL_STATES,
} = require('../../src/execution/skill_execution_coordinator');

describe('Phase 6 & 7 — Multi-Skill Orchestration & Zero Silent Abandonment', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new SkillExecutionCoordinator({ defaultTimeoutMs: 500, maxRetries: 1 });
  });

  describe('Lifecycle State Machine & Auditable Transitions', () => {
    test('transitions through DISCOVERED -> SELECTED -> READY -> RUNNING -> COMPLETED', () => {
      const record = coordinator.createRecord('clean-code', { isRequired: true });
      expect(record.state).toBe(SKILL_STATES.SELECTED);

      coordinator.transition('clean-code', SKILL_STATES.READY);
      expect(record.state).toBe(SKILL_STATES.READY);

      coordinator.transition('clean-code', SKILL_STATES.RUNNING);
      expect(record.state).toBe(SKILL_STATES.RUNNING);
      expect(record.startedAt).toBeDefined();

      coordinator.transition('clean-code', SKILL_STATES.COMPLETED);
      expect(record.state).toBe(SKILL_STATES.COMPLETED);
      expect(record.completedAt).toBeDefined();
    });

    test('strictly rejects illegal state transitions', () => {
      coordinator.createRecord('sql-pro');
      // Cannot jump from SELECTED directly to COMPLETED
      expect(() => {
        coordinator.transition('sql-pro', SKILL_STATES.COMPLETED);
      }).toThrow(/Illegal state transition/);
    });
  });

  describe('Sequential Skill Execution & Artifact Handoff', () => {
    test('transfers output from stage 1 to stage 2 and preserves context', async () => {
      const plan = [
        { skillName: 'api-patterns', isRequired: true },
        { skillName: 'data-validation-schemas', isRequired: true, prerequisites: ['api-patterns'] },
      ];

      const executor = async (name, ctx) => {
        if (name === 'api-patterns') {
          return { valid: true, routes: ['/login', '/users'] };
        }
        if (name === 'data-validation-schemas') {
          expect(ctx['api-patterns']).toBeDefined();
          expect(ctx['api-patterns'].routes).toContain('/login');
          return { valid: true, schemas: ['LoginSchema', 'UserSchema'] };
        }
        return { valid: true };
      };

      const result = await coordinator.executeSequence(plan, executor);
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.cumulativeContext['data-validation-schemas'].schemas).toContain('LoginSchema');

      const audit = coordinator.getAuditLog();
      expect(audit.totalSkillsAccounted).toBe(2);
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);
    });

    test('blocks execution and halts when a prerequisite has not completed', async () => {
      const plan = [
        { skillName: 'security-auditor', isRequired: true, prerequisites: ['non-existent-prereq'] },
      ];

      await expect(coordinator.executeSequence(plan, async () => ({ valid: true }))).rejects.toThrow(
        /Execution halted: Required skill 'security-auditor' blocked by missing prerequisite/
      );

      const record = coordinator.executionRecords.get('security-auditor');
      expect(record.state).toBe(SKILL_STATES.BLOCKED);
    });
  });

  describe('Parallel Execution & Deterministic Aggregation', () => {
    test('executes multiple skills concurrently and aggregates records', async () => {
      const skills = [
        { skillName: 'lint-and-validate', isRequired: true },
        { skillName: 'clean-code', isRequired: true },
        { skillName: 'error-resilience', isRequired: true },
      ];

      const result = await coordinator.executeParallel(skills, async (name) => {
        return { valid: true, skill: name, passedChecks: 5 };
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);

      const audit = coordinator.getAuditLog();
      expect(audit.totalSkillsAccounted).toBe(3);
      expect(audit.allReachedTerminalState).toBe(true);
    });
  });

  describe('Eliminating Silent Failures & Zero Abandonment', () => {
    test('never marks a failed required skill as completed', async () => {
      const plan = [
        { skillName: 'vulnerability-scanner', isRequired: true },
      ];

      const executor = async () => {
        throw new Error('Critical vulnerability scan error');
      };

      await expect(coordinator.executeSequence(plan, executor)).rejects.toThrow(
        /Critical vulnerability scan error/
      );

      const record = coordinator.executionRecords.get('vulnerability-scanner');
      expect(record.state).toBe(SKILL_STATES.FAILED);
      expect(record.validationPassed).toBeNull();

      const audit = coordinator.getAuditLog();
      expect(audit.allReachedTerminalState).toBe(true);
      expect(audit.zeroSilentAbandonment).toBe(true);
    });

    test('times out hanging skills without hanging the process', async () => {
      const plan = [
        { skillName: 'slow-auditor', isRequired: true },
      ];

      const executor = async () => {
        return new Promise(resolve => {
          const t = setTimeout(() => resolve({ valid: true }), 2000);
          if (t.unref) t.unref();
        });
      };

      await expect(coordinator.executeSequence(plan, executor)).rejects.toThrow(/Timeout/);

      const record = coordinator.executionRecords.get('slow-auditor');
      expect(record.state).toBe(SKILL_STATES.TIMED_OUT);
    });

    test('parallel execution settles all skills and avoids dangling rejections when a required skill fails', async () => {
      const skills = [
        { skillName: 'parallel-ok', isRequired: false },
        { skillName: 'parallel-fail-req', isRequired: true },
        { skillName: 'parallel-slow-ok', isRequired: false },
      ];

      const executor = jest.fn(async (skill) => {
        if (skill === 'parallel-ok') return { valid: true, ok: 1 };
        if (skill === 'parallel-fail-req') throw new Error('Critical explosion');
        if (skill === 'parallel-slow-ok') {
          await new Promise(r => setTimeout(r, 20));
          return { valid: true, slow: true };
        }
      });

      await expect(coordinator.executeParallel(skills, executor))
        .rejects.toThrow(/Required parallel skill 'parallel-fail-req' failed: Critical explosion/);

      // Invariant: All skills must reach terminal state!
      const recOk = coordinator.executionRecords.get('parallel-ok');
      const recFail = coordinator.executionRecords.get('parallel-fail-req');
      const recSlow = coordinator.executionRecords.get('parallel-slow-ok');

      expect(recOk.state).toBe(SKILL_STATES.COMPLETED);
      expect(recFail.state).toBe(SKILL_STATES.FAILED);
      expect(recSlow.state).toBe(SKILL_STATES.COMPLETED);

      const audit = coordinator.getAuditLog();
      expect(audit.allReachedTerminalState).toBe(true);
    });

    test('cleans up timeout timer cleanly when executor throws early in sequence', async () => {
      const plan = [{ skillName: 'faulty-skill', isRequired: false }];

      const executor = jest.fn(async () => {
        throw new Error('Immediate internal failure');
      });

      const result = await coordinator.executeSequence(plan, executor);
      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(false);
      expect(coordinator.executionRecords.get('faulty-skill').state).toBe(SKILL_STATES.FAILED);
    });
  });
});

