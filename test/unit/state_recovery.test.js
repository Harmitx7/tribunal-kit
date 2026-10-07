const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getExecutionStateStore,
  STATE_STATUS,
  ExecutionStateStore,
} = require('../../.agent/scripts/engineering_memory');

describe('ExecutionStateStore - Phase 5 State & Recovery', () => {
  let store;
  const testStorePath = path.join(os.tmpdir(), `tribunal_test_states_${Date.now()}.json`);

  beforeEach(() => {
    store = new ExecutionStateStore(testStorePath);
    // Clear out for fresh tests
    store.states.clear();
  });

  afterAll(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  it('should create and retrieve a checkpoint', () => {
    const cp = store.checkpoint('task-123', 'planning', { rules: 2 }, ['plan.md']);
    expect(cp.step).toBe('planning');
    expect(cp.context.rules).toBe(2);

    const state = store.states.get('task-123');
    expect(state.status).toBe(STATE_STATUS.RUNNING);
    expect(state.history.length).toBe(1);
    expect(state.current_step).toBe('planning');
  });

  it('should pause and resume a task', () => {
    store.checkpoint('task-123', 'planning', {}, []);

    store.pause('task-123', 'Waiting for human input');
    expect(store.states.get('task-123').status).toBe(STATE_STATUS.PAUSED);
    expect(store.states.get('task-123').pause_reason).toBe('Waiting for human input');

    store.resume('task-123');
    expect(store.states.get('task-123').status).toBe(STATE_STATUS.RUNNING);
  });

  it('should rollback to previous step', () => {
    store.checkpoint('task-123', 'step1', {}, []);
    store.checkpoint('task-123', 'step2', {}, []);

    expect(store.states.get('task-123').history.length).toBe(2);

    const rb = store.rollback('task-123');
    expect(rb.previous_checkpoint.step).toBe('step1');

    const state = store.states.get('task-123');
    expect(state.status).toBe(STATE_STATUS.ROLLED_BACK);
    expect(state.current_step).toBe('step1');
    expect(state.history.length).toBe(1);
  });

  it('should mark task as completed', () => {
    store.checkpoint('task-123', 'step1', {}, []);
    store.complete('task-123');
    expect(store.states.get('task-123').status).toBe(STATE_STATUS.COMPLETED);

    // Cannot resume completed task
    expect(() => store.resume('task-123')).toThrow(/already completed/);
  });
});
