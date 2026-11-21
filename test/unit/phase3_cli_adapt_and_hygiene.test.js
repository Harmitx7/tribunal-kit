'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');
const { EventEmitter } = require('events');

const { cmdAdapt } = require('../../src/cli');
const { extractCommandArgs, cmdMinContext } = require('../../src/commands/native');
const { CORE_AGENTS, CORE_SKILLS } = require('../../src/commands/init');
const { countMarkdownAgents } = require('../../src/commands/status');

describe('Phase 3: CLI Adapt & Hygiene (#17, #18, #19, #24, #25)', () => {
  // ── #17: tk adapt awaits child process and propagates exit codes ──
  describe('#17: tk adapt child process await & exit code propagation', () => {
    let forkSpy;
    const originalExitCode = process.exitCode;

    afterEach(() => {
      if (forkSpy) forkSpy.mockRestore();
      process.exitCode = originalExitCode;
    });

    test('cmdAdapt awaits child process and resolves on exit code 0', async () => {
      const mockChild = new EventEmitter();
      forkSpy = jest.spyOn(child_process, 'fork').mockImplementation(() => {
        setImmediate(() => mockChild.emit('close', 0, null));
        return mockChild;
      });

      const result = await cmdAdapt(['claude']);
      expect(result).toEqual({ code: 0 });
      expect(forkSpy).toHaveBeenCalled();
    });

    test('cmdAdapt sets process.exitCode on non-zero child exit', async () => {
      const mockChild = new EventEmitter();
      forkSpy = jest.spyOn(child_process, 'fork').mockImplementation(() => {
        setImmediate(() => mockChild.emit('close', 2, null));
        return mockChild;
      });

      const result = await cmdAdapt(['invalid-agent']);
      expect(result).toEqual({ code: 2 });
      expect(process.exitCode).toBe(2);
    });

    test('cmdAdapt rejects on child process spawn error and sets exitCode 1', async () => {
      const mockChild = new EventEmitter();
      forkSpy = jest.spyOn(child_process, 'fork').mockImplementation(() => {
        setImmediate(() => mockChild.emit('error', new Error('Spawn failed')));
        return mockChild;
      });

      await expect(cmdAdapt([])).rejects.toThrow('Spawn failed');
      expect(process.exitCode).toBe(1);
    });
  });

  // ── #18: ESM Hygiene ──
  describe('#18: ESM index.mjs error variable hygiene', () => {
    test('src/esm/index.mjs does not shadow exported err with inner catch error', () => {
      const esmSource = fs.readFileSync(path.join(__dirname, '../../src/esm/index.mjs'), 'utf8');

      // Assert export const err exists
      expect(esmSource).toContain('export const err = logger.err;');

      // Assert loadCommand catch does not shadow 'err'
      expect(esmSource).not.toMatch(/function\s+loadCommand[\s\S]*?catch\s*\(\s*err\s*\)/);
      expect(esmSource).toMatch(/function\s+loadCommand[\s\S]*?catch\s*\(\s*loadErr\s*\)/);
    });
  });

  // ── #19: Programmatic native args parsing ──
  describe('#19: Native commands argument parsing & programmatic invocation', () => {
    test('extractCommandArgs preserves programmatic arg arrays without command name', () => {
      const args = ['--file', 'sample.txt', '--max-lines', '10'];
      const extracted = extractCommandArgs(args, 'min-context');
      expect(extracted).toEqual(['--file', 'sample.txt', '--max-lines', '10']);
    });

    test('extractCommandArgs correctly extracts arguments after command name', () => {
      const cliArgs = ['node', 'cli.js', 'min-context', '--file', 'sample.txt'];
      const extracted = extractCommandArgs(cliArgs, 'min-context');
      expect(extracted).toEqual(['--file', 'sample.txt']);
    });

    test('extractCommandArgs handles custom runner argv shapes', () => {
      const runnerArgs = ['tk', 'min-context', '--file', 'sample.txt'];
      const extracted = extractCommandArgs(runnerArgs, 'min-context');
      expect(extracted).toEqual(['--file', 'sample.txt']);
    });

    test('cmdMinContext works when called programmatically with pure flag array', () => {
      const tmpFile = path.join(os.tmpdir(), `min-ctx-test-${Date.now()}.txt`);
      fs.writeFileSync(tmpFile, 'Line 1\nLine 2\nLine 3\nLine 4\n');

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        const success = cmdMinContext(['--file', tmpFile, '--max-lines', '2'], true);
        expect(success).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalled();
        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.minified_lines).toBe(2);
        expect(payload.original_lines).toBe(5);
      } finally {
        fs.unlinkSync(tmpFile);
        consoleLogSpy.mockRestore();
      }
    });
  });

  // ── #24: Dynamic Core Agent & Skill Counts ──
  describe('#24: Reconcile CORE_AGENTS array with displayed summaries', () => {
    test('CORE_AGENTS and CORE_SKILLS are exported Sets with positive sizes', () => {
      expect(CORE_AGENTS).toBeInstanceOf(Set);
      expect(CORE_SKILLS).toBeInstanceOf(Set);
      expect(CORE_AGENTS.size).toBeGreaterThan(0);
      expect(CORE_SKILLS.size).toBeGreaterThan(0);
    });

    test('cli.js help text dynamically reflects CORE_AGENTS size', () => {
      const cliSource = fs.readFileSync(path.join(__dirname, '../../src/cli.js'), 'utf8');
      expect(cliSource).toContain('CORE_AGENTS');
      expect(cliSource).toContain('CORE_AGENTS.size');
    });

    test('init.js minimal mode message uses dynamic CORE_AGENTS.size and CORE_SKILLS.size', () => {
      const initSource = fs.readFileSync(
        path.join(__dirname, '../../src/commands/init.js'),
        'utf8',
      );
      expect(initSource).toContain('CORE_AGENTS.size');
      expect(initSource).toContain('CORE_SKILLS.size');
      expect(initSource).toContain('core agents and');
    });
  });

  // ── #25: Recursive Status Agent Counting ──
  describe('#25: Recursive agent counting under .agent/agents/', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-status-count-'));
    });

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('counts markdown files in flat directory, ignoring README.md and index.md', () => {
      fs.writeFileSync(path.join(tempDir, 'agent-1.md'), '# Agent 1');
      fs.writeFileSync(path.join(tempDir, 'agent-2.md'), '# Agent 2');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Agents Readme');
      fs.writeFileSync(path.join(tempDir, 'index.md'), '# Index');
      fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'text');

      expect(countMarkdownAgents(tempDir)).toBe(2);
    });

    test('recursively discovers and counts agent .md files in nested subdirectories', () => {
      const sub1 = path.join(tempDir, 'domain1');
      const sub2 = path.join(tempDir, 'domain2', 'nested');
      fs.mkdirSync(sub1, { recursive: true });
      fs.mkdirSync(sub2, { recursive: true });

      fs.writeFileSync(path.join(tempDir, 'root-agent.md'), '# Root Agent');
      fs.writeFileSync(path.join(sub1, 'domain-agent.md'), '# Domain Agent');
      fs.writeFileSync(path.join(sub2, 'deep-agent.md'), '# Deep Agent');
      fs.writeFileSync(path.join(sub2, 'README.md'), '# Deep Readme');

      expect(countMarkdownAgents(tempDir)).toBe(3);
    });

    test('returns 0 for non-existent directory safely without throwing', () => {
      expect(countMarkdownAgents('/non/existent/path')).toBe(0);
    });
  });
});
