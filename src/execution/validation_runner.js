'use strict';

const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const VALIDATION_REGISTRY = {
  unit_tests: {
    command: 'npm',
    args: ['run', 'test'],
    timeout: 120000,
    riskLevel: 'LOW',
    parser: 'jest',
  },
  lint: {
    command: 'npm',
    args: ['run', 'lint'],
    timeout: 60000,
    riskLevel: 'LOW',
    parser: 'eslint',
  },
};

class TestResultParser {
  static parse(output, parserType) {
    const result = {
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      failedTestNames: [],
      suiteCount: 0,
    };

    if (parserType === 'jest') {
      // Basic heuristic parsing for standard Jest output
      // Note: A real implementation might use jest --json, but we parse text here as fallback
      const matchPass = output.match(/Tests:\s+(\d+)\s+passed/);
      if (matchPass) result.testsPassed = parseInt(matchPass[1], 10);

      const matchFail = output.match(/Tests:\s+(\d+)\s+failed/);
      if (matchFail) result.testsFailed = parseInt(matchFail[1], 10);

      const matchTotal = output.match(/Tests:\s+(.*?)(?:,|$)/);
      if (matchTotal && !matchPass && !matchFail) {
        // Fallback logic
      }

      const suiteMatch = output.match(/Test Suites:\s+(\d+)\s+passed/);
      if (suiteMatch) result.suiteCount = parseInt(suiteMatch[1], 10);

      // Attempt to extract failed test names
      const fails = [...output.matchAll(/FAIL\s+(.*)/g)];
      result.failedTestNames = fails.map(f => f[1].trim());
    }

    return result;
  }
}

class ValidationRunner {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    // Security: Only allow specific benign environment variables
    this.allowedEnv = {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      CI: 'true',
    };
  }

  async run(validationId, customArgs = []) {
    const config = VALIDATION_REGISTRY[validationId];
    if (!config) {
      return this._failClosed(`Unknown validation ID: ${validationId}`);
    }

    const start = Date.now();
    const commandFingerprint = crypto
      .createHash('sha256')
      .update(`${config.command} ${config.args.join(' ')}`)
      .digest('hex');

    return new Promise(resolve => {
      let stdout = '';
      let stderr = '';
      const MAX_BUFFER = 1024 * 1024 * 5; // 5MB

      // Enforce Workspace Boundary
      const runDir = path.resolve(this.workspaceRoot);
      const systemRoot = path.resolve(process.cwd());
      if (!runDir.startsWith(systemRoot)) {
        return resolve(this._failClosed('Path traversal detected in workspace root.'));
      }

      const args = [...config.args, ...customArgs];

      // We explicitly avoid shell: true to prevent injection
      const proc = spawn(config.command, args, {
        cwd: runDir,
        env: this.allowedEnv,
        shell: false,
        detached: false,
      });

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, config.timeout);

      proc.stdout.on('data', data => {
        if (stdout.length < MAX_BUFFER) stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        if (stderr.length < MAX_BUFFER) stderr += data.toString();
      });

      proc.on('close', code => {
        clearTimeout(timer);
        const duration = Date.now() - start;

        let status = 'PASSED';
        if (timedOut) status = 'TIMEOUT';
        else if (code !== 0) status = 'FAILED';

        const parsed = TestResultParser.parse(stdout + '\n' + stderr, config.parser);

        resolve({
          validationId,
          status,
          exitCode: code,
          duration,
          stdout: stdout.substring(0, 10000), // Trim for payload size
          stderr: stderr.substring(0, 10000),
          testsPassed: parsed.testsPassed,
          testsFailed: parsed.testsFailed,
          testsSkipped: parsed.testsSkipped,
          startedAt: new Date(start).toISOString(),
          completedAt: new Date().toISOString(),
          commandFingerprint,
          repositoryFingerprint: 'repo-hash-placeholder',
        });
      });

      proc.on('error', err => {
        clearTimeout(timer);
        resolve(
          this._failClosed(`Process crash: ${err.message}`, validationId, commandFingerprint),
        );
      });
    });
  }

  _failClosed(reason, validationId = 'UNKNOWN', fingerprint = 'UNKNOWN') {
    return {
      validationId,
      status: 'CRASHED',
      exitCode: -1,
      duration: 0,
      stdout: '',
      stderr: reason,
      testsPassed: 0,
      testsFailed: 1, // Treat structural failure as a failed test
      testsSkipped: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      commandFingerprint: fingerprint,
      repositoryFingerprint: 'UNKNOWN',
    };
  }
}

module.exports = { ValidationRunner, TestResultParser, VALIDATION_REGISTRY };
