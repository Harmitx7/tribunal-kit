const path = require('path');
const fs = require('fs');
const {
  validateWorkerRequest,
  validateWorkerResult,
  validateSwarmPayload,
  SwarmOrchestrator,
} = require('../../.agent/scripts/swarm_dispatcher.js');

describe('swarm_dispatcher.js', () => {
  it('should be a valid javascript file', () => {
    const filePath = path.join(__dirname, '../../.agent/scripts/swarm_dispatcher.js');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.includes('module.exports')).toBeTruthy();
  });

  it('should validate a valid worker request object', () => {
    const agentsDir = path.join(__dirname, '../../.agent/agents');
    const validRequest = {
      task_id: 'task-1',
      type: 'generate_code',
      agent: 'backend-specialist',
      goal: 'Implement authentication route',
      context: 'Minimal required context',
    };
    expect(validateWorkerRequest(validRequest, 0, agentsDir)).toEqual([]);
  });

  it('should reject invalid worker requests missing required fields', () => {
    const agentsDir = path.join(__dirname, '../../.agent/agents');
    const invalidRequest = { worker_id: 'worker-1' };
    expect(validateWorkerRequest(invalidRequest, 0, agentsDir).length).toBeGreaterThan(0);
  });

  it('should validate a valid worker result object', () => {
    const validResult = {
      task_id: 'task-1',
      agent: 'backend-specialist',
      status: 'success',
      output: 'Created auth handler',
    };
    expect(validateWorkerResult(validResult, 0)).toEqual([]);
  });

  it('should validate a complete swarm payload object', () => {
    const payload = {
      goal: 'Build feature',
      workers: [
        {
          task_id: 'task-1',
          type: 'generate_code',
          agent: 'backend-specialist',
          goal: 'Build auth route',
          context: 'Context info',
        },
      ],
    };
    const agentsDir = path.join(__dirname, '../../.agent/agents');
    expect(validateSwarmPayload(payload, agentsDir)).toBe(true);
  });

  it('should execute deterministic reviewer workers instantly without mock delay', async () => {
    const orchestrator = new SwarmOrchestrator(null);
    const worker = {
      agent: 'security-auditor',
      files: ['package.json'],
    };

    const startTime = Date.now();
    const result = await orchestrator.executeWorker(worker, 5000);
    const duration = Date.now() - startTime;

    expect(result.status).toBe('success');
    expect(result.agent).toBe('security-auditor');
    expect(result.output).toContain('Security audit completed');
    // Execution must be deterministic and fast (under 500ms, not 1000-3000ms mock delay)
    expect(duration).toBeLessThan(500);
  });
});

