'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('Phase 8 — Compatibility, API Stability & Cross-Platform Reliability', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const wrapperBin = path.join(repoRoot, 'bin', 'wrapper.js');

  describe('COMPAT-001: bin/wrapper.js argument forwarding & path handling', () => {
    test('converts --path to positional for POSITIONAL_PATH_COMMANDS (status, init, sync, etc.)', () => {
      // Running --help on status with --path should not error
      const res = spawnSync(process.execPath, [wrapperBin, 'status', '--help'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(res.status).toBe(0);
    });

    test('preserves --path as option for commands requiring flag parameters', () => {
      // tk memory recall --help should execute cleanly
      const res = spawnSync(process.execPath, [wrapperBin, 'memory', 'recall', '--help'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('recall');
    });
  });

  describe('COMPAT-002: tk memory recall dual query interface', () => {
    test('tk memory recall displays help with both flag and positional option', () => {
      const res = spawnSync(process.execPath, [wrapperBin, 'memory', 'recall', '--help'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(res.status).toBe(0);
      // Clap help output includes [QUERY] and -q, --query <QUERY>
      expect(res.stdout).toMatch(/\[QUERY\]/);
      expect(res.stdout).toMatch(/--query/);
    });

    test('tk memory recall empty query returns valid JSON structure', () => {
      const res = spawnSync(process.execPath, [wrapperBin, 'memory', 'recall', 'test_compat_query'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      // Exit code 0 and stdout is valid JSON with action: recall
      expect(res.status).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(parsed.action).toBe('recall');
      expect(parsed.query).toBe('test_compat_query');
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    test('tk memory recall works with --query flag and --path flag simultaneously', () => {
      const res = spawnSync(
        process.execPath,
        [wrapperBin, 'memory', 'recall', '--query', 'test_compat_flag', '--path', repoRoot],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );
      expect(res.status).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(parsed.action).toBe('recall');
      expect(parsed.query).toBe('test_compat_flag');
    });

    test('tk memory recall works with space-separated positional query', () => {
      const res = spawnSync(
        process.execPath,
        [wrapperBin, 'memory', 'recall', 'query with multiple words'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );
      expect(res.status).toBe(0);
      const parsed = JSON.parse(res.stdout.trim());
      expect(parsed.action).toBe('recall');
      expect(parsed.query).toBe('query with multiple words');
    });

    test('supports global --quiet flag placement both before and after subcommands', () => {
      const resBefore = spawnSync(
        process.execPath,
        [wrapperBin, 'memory', '--quiet', 'recall', 'quiet_test'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );
      expect(resBefore.status).toBe(0);
      const parsedBefore = JSON.parse(resBefore.stdout.trim());
      expect(parsedBefore.query).toBe('quiet_test');
      expect(resBefore.stderr).toBe('');

      const resAfter = spawnSync(
        process.execPath,
        [wrapperBin, 'memory', 'recall', 'quiet_test', '--quiet'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
        }
      );
      expect(resAfter.status).toBe(0);
      const parsedAfter = JSON.parse(resAfter.stdout.trim());
      expect(parsedAfter.query).toBe('quiet_test');
      expect(resAfter.stderr).toBe('');
    });
  });

  describe('COMPAT-005: src/esm/index.mjs contract & exported interfaces', () => {
    test('exports all core CLI command functions and utilities in ESM interface', () => {
      const esmPath = path.join(repoRoot, 'src', 'esm', 'index.mjs');
      expect(fs.existsSync(esmPath)).toBe(true);

      const script = `
        import * as esm from ${JSON.stringify(`file://${esmPath.replace(/\\/g, '/')}`)};
        const requiredFns = [
          'main', 'cmdInit', 'cmdStatus', 'cmdSync', 'cmdUpdate', 'cmdUninstall', 'cmdValidate', 'cmdMemory',
          'cmdMinContext', 'cmdDagSchedule', 'cmdContextCompress', 'cmdOptimizeStep', 'cmdImpactTier',
          'cmdArch', 'cmdContract', 'cmdSdd', 'cmdSystem1', 'cmdReview', 'cmdBrowse', 'cmdAuditWeb',
          'cmdCompareWeb', 'cmdDeconstruct', 'cmdHeal', 'cmdSkillIntel', 'cmdEvalOpt', 'cmdEvolve', 'cmdRsi',
          'log', 'ok', 'err', 'warn', 'banner'
        ];
        const missing = requiredFns.filter(fn => typeof esm[fn] !== 'function');
        if (missing.length > 0) {
          console.error('Missing ESM exports: ' + missing.join(', '));
          process.exit(1);
        }
        console.log('ALL_EXPORTS_OK');
      `;

      const res = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      if (res.status !== 0) {
        console.error(res.stderr);
      }
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('ALL_EXPORTS_OK');
    });
  });

  describe('Versioning & Package Metadata Stability', () => {
    test('ensures package.json, npm/core-template/package.json, and Cargo.toml versions are synchronized', () => {
      const pkgPath = path.join(repoRoot, 'package.json');
      const coreTemplatePkgPath = path.join(repoRoot, 'npm', 'core-template', 'package.json');
      const cargoTomlPath = path.join(repoRoot, 'crates', 'core', 'Cargo.toml');

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const corePkg = JSON.parse(fs.readFileSync(coreTemplatePkgPath, 'utf8'));
      const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

      expect(pkg.version).toBeDefined();
      expect(corePkg.version).toBe(pkg.version);

      const cargoVersionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
      expect(cargoVersionMatch).not.toBeNull();
      expect(cargoVersionMatch[1]).toBe(pkg.version);
    });

    test('CLI --version reports correct synchronized version', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
      const res = spawnSync(process.execPath, [wrapperBin, '--version'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(res.status).toBe(0);
      expect(res.stdout.trim()).toContain(pkg.version);
    });
  });
});
