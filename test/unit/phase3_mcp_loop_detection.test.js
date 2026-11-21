'use strict';

const { ToolRepeatGuard } = require('../../bin/mcp-server');

describe('Phase 3: MCP Tool Repeat & Cyclic Loop Guard (#16)', () => {
  let guard;

  beforeEach(() => {
    guard = new ToolRepeatGuard({ maxWindow: 10 });
  });

  test('consecutive identical calls trigger notification at 3 and critical warning at 5', () => {
    const tool = 'read_file';
    const args = { path: 'src/cli.js' };

    expect(guard.observe(tool, args)).toBeNull(); // 1st
    expect(guard.observe(tool, args)).toBeNull(); // 2nd

    const third = guard.observe(tool, args);
    expect(third).not.toBeNull();
    expect(third).toContain('You are repeating the exact same tool call with identical arguments');

    expect(guard.observe(tool, args)).toBeNull(); // 4th

    const fifth = guard.observe(tool, args);
    expect(fifth).not.toBeNull();
    expect(fifth).toContain('Repeated tool call detected:');
    expect(fifth).toContain('consecutive_calls: 5');
  });

  test('detects alternating cyclic repeat loops (A -> B -> A -> B)', () => {
    const toolA = 'grep_search';
    const argsA = { query: 'login' };
    const toolB = 'find_files';
    const argsB = { pattern: '*.ts' };

    expect(guard.observe(toolA, argsA)).toBeNull(); // 1: A
    expect(guard.observe(toolB, argsB)).toBeNull(); // 2: B
    expect(guard.observe(toolA, argsA)).toBeNull(); // 3: A

    const fourth = guard.observe(toolB, argsB); // 4: B -> cycle [A, B] repeated 2 times!
    expect(fourth).not.toBeNull();
    expect(fourth).toContain('Alternating / cyclic tool call loop detected');
    expect(fourth).toContain('2 repetitions of pattern [grep_search -> find_files]');
  });

  test('detects 3-step cyclic loops (A -> B -> C -> A -> B -> C)', () => {
    const tA = 'tool_a';
    const tB = 'tool_b';
    const tC = 'tool_c';
    const a = {};

    expect(guard.observe(tA, a)).toBeNull();
    expect(guard.observe(tB, a)).toBeNull();
    expect(guard.observe(tC, a)).toBeNull();
    expect(guard.observe(tA, a)).toBeNull();
    expect(guard.observe(tB, a)).toBeNull();

    const sixth = guard.observe(tC, a);
    expect(sixth).not.toBeNull();
    expect(sixth).toContain('Alternating / cyclic tool call loop detected');
    expect(sixth).toContain('2 repetitions of pattern [tool_a -> tool_b -> tool_c]');
  });

  test('varied normal calls do not false-trigger', () => {
    const tools = [
      'read_file',
      'write_file',
      'list_dir',
      'search_code',
      'lint_check',
      'git_status',
    ];
    for (const tool of tools) {
      expect(guard.observe(tool, { target: tool })).toBeNull();
    }
  });

  test('enforces maxWindow eviction bounds to prevent unbounded memory growth', () => {
    const smallGuard = new ToolRepeatGuard({ maxWindow: 4 });

    smallGuard.observe('tool1', { id: 1 });
    smallGuard.observe('tool2', { id: 2 });
    smallGuard.observe('tool3', { id: 3 });
    smallGuard.observe('tool4', { id: 4 });

    expect(smallGuard.callHistory.length).toBe(4);

    // 5th call should evict the 1st
    smallGuard.observe('tool5', { id: 5 });
    expect(smallGuard.callHistory.length).toBe(4);
    expect(smallGuard.callHistory.some(k => k.startsWith('tool1'))).toBe(false);
    expect(smallGuard.history.has('tool1::{"id":1}')).toBe(false);
  });

  test('canonicalizes argument keys and handles circular references safely', () => {
    const args1 = { b: 2, a: 1 };
    const args2 = { a: 1, b: 2 };

    const c1 = guard.canonicalizeArgs(args1);
    const c2 = guard.canonicalizeArgs(args2);
    expect(c1).toBe(c2);

    const circular = { name: 'loop' };
    circular.self = circular;
    expect(() => guard.canonicalizeArgs(circular)).not.toThrow();
    expect(guard.canonicalizeArgs(circular)).toContain('[Circular]');
  });
});
