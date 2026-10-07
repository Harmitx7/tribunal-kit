const {
  ObservabilityEngine,
  LifecycleManager,
  SkillTelemetryRegistry,
} = require('../../.agent/scripts/capability_evolution');

describe('capability_evolution.js', () => {
  describe('ObservabilityEngine (Pillar 9)', () => {
    let engine;

    beforeEach(() => {
      engine = new ObservabilityEngine();
    });

    it('should start and track active spans', () => {
      const spanId = engine.startSkillSpan('test-skill', { task_id: 'task1' });
      expect(spanId).toMatch(/^span_test-skill_/);
      expect(engine.activeSpans.has(spanId)).toBe(true);

      const span = engine.activeSpans.get(spanId);
      expect(span.status).toBe('RUNNING');
      expect(span.skill).toBe('test-skill');
    });

    it('should end spans and calculate duration', () => {
      const spanId = engine.startSkillSpan('test-skill', { task_id: 'task2' });
      const completedSpan = engine.endSkillSpan(spanId, { findings: 5, verified_findings: 5 });

      expect(completedSpan.status).toBe('COMPLETED');
      expect(completedSpan.duration_ms).toBeGreaterThanOrEqual(0);
      expect(engine.activeSpans.has(spanId)).toBe(false);
      expect(engine.completedSpans.length).toBe(1);
    });

    it('should handle errors gracefully in endSkillSpan', () => {
      const spanId = engine.startSkillSpan('error-skill');
      const completedSpan = engine.endSkillSpan(spanId, {}, new Error('Something went wrong'));

      expect(completedSpan.status).toBe('FAILED');
      expect(completedSpan.error).toBe('Something went wrong');
    });
  });

  describe('LifecycleManager (Pillar 10)', () => {
    let registry;
    let lifecycle;

    beforeEach(() => {
      registry = new SkillTelemetryRegistry();
      lifecycle = new LifecycleManager(registry);
    });

    it('should mark unused skills for deprecation', () => {
      // Mock an unused skill by manipulating registry records
      registry.records.set('dormant-skill', {
        skill: 'dormant-skill',
        activations: 0,
        tasks: [],
      });

      const deprecated = lifecycle.evaluateSkillLifecycle(30);
      expect(deprecated).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ skill: 'dormant-skill', reason: 'Dormant beyond threshold' }),
        ]),
      );
    });

    it('should mark low precision skills for deprecation', () => {
      registry.records.set('low-precision-skill', {
        skill: 'low-precision-skill',
        activations: 15,
        findings: 100,
        verified_findings: 10, // 10% precision
        tasks: [{ recorded_at: new Date().toISOString() }],
      });

      const deprecated = lifecycle.evaluateSkillLifecycle(30);
      expect(deprecated).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            skill: 'low-precision-skill',
            reason: 'Chronic low verification precision',
          }),
        ]),
      );
    });

    it('should keep active and precise skills', () => {
      registry.records.set('good-skill', {
        skill: 'good-skill',
        activations: 20,
        findings: 20,
        verified_findings: 19, // 95% precision
        tasks: [{ recorded_at: new Date().toISOString() }], // recent
      });

      const deprecated = lifecycle.evaluateSkillLifecycle(30);
      expect(deprecated.some(d => d.skill === 'good-skill')).toBe(false);
    });
  });
});
