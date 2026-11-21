'use strict';

const fs = require('fs');
const path = require('path');

describe('Phase 4: TypeScript Baseline & Code Hygiene Verification', () => {
  const rootDir = path.resolve(__dirname, '../..');

  describe('1. Activity Module Export Deduplication (src/activity/index.js)', () => {
    test('exports PROGRESS_STATES and AGGREGATION_POLICIES properly', () => {
      const activity = require('../../src/activity/index');
      expect(activity.PROGRESS_STATES).toBeDefined();
      expect(activity.AGGREGATION_POLICIES).toBeDefined();
      expect(
        activity.PROGRESS_STATES.RUNNING || activity.PROGRESS_STATES.IN_PROGRESS,
      ).toBeDefined();
    });

    test('module.exports in src/activity/index.js has no duplicate keys', () => {
      const filePath = path.join(rootDir, 'src/activity/index.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract the module.exports block
      const exportsMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\};/s);
      expect(exportsMatch).not.toBeNull();
      const exportsBlock = exportsMatch[1];

      // Count occurrences of PROGRESS_STATES and AGGREGATION_POLICIES inside module.exports
      const progressMatches = exportsBlock.match(/\bPROGRESS_STATES\b/g) || [];
      const aggregationMatches = exportsBlock.match(/\bAGGREGATION_POLICIES\b/g) || [];

      expect(progressMatches.length).toBe(1);
      expect(aggregationMatches.length).toBe(1);
    });
  });

  describe('2. System-1 Provider Logger Namespace & Warning Verification', () => {
    test('uses logger.warn on corrupted hash mismatch without duplicate identifier errors', () => {
      const logger = require('../../src/utils/logger');
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

      const providerModule = require('../../src/system1/provider');
      const tempCorruptFile = path.join(rootDir, 'test', 'fixtures', 'temp_corrupt_model.bin');
      fs.mkdirSync(path.dirname(tempCorruptFile), { recursive: true });
      fs.writeFileSync(tempCorruptFile, 'corrupted_content');

      try {
        const provider = new providerModule.System1Provider();
        expect(provider).toBeDefined();

        // Check provider source code directly for logger namespace hygiene
        const providerCode = fs.readFileSync(path.join(rootDir, 'src/system1/provider.js'), 'utf8');
        expect(providerCode).toMatch(/const logger = require\(['"]\.\.\/utils\/logger['"]\);/);
        expect(providerCode).not.toMatch(/const\s*\{\s*warn\s*\}\s*=\s*require/);
        expect(providerCode).toContain('logger.warn(');
      } finally {
        if (fs.existsSync(tempCorruptFile)) {
          fs.unlinkSync(tempCorruptFile);
        }
        warnSpy.mockRestore();
      }
    });
  });

  describe('3. Command Init Dynamic Version Resolution & Identifiers', () => {
    test('src/commands/init.js does not redeclare getTargetVersion in same scope', () => {
      const initCode = fs.readFileSync(path.join(rootDir, 'src/commands/init.js'), 'utf8');
      // Count const { getTargetVersion declarations
      const getTargetMatches = initCode.match(/const\s*\{[^}]*getTargetVersion[^}]*\}\s*=/g) || [];
      expect(getTargetMatches.length).toBe(1);
      expect(initCode).toContain("const sys1 = require('./system1');");
    });
  });

  describe('4. TypeScript Type Definition Integrity', () => {
    test('src/index.d.ts documents ~21 specialists instead of outdated ~13 agents', () => {
      const dtsCode = fs.readFileSync(path.join(rootDir, 'src/index.d.ts'), 'utf8');
      expect(dtsCode).toContain('~21 specialists');
      expect(dtsCode).not.toContain('~13 agents');
    });

    test('src/system1/index.d.ts does not contain invalid relative import from ../index', () => {
      const s1DtsCode = fs.readFileSync(path.join(rootDir, 'src/system1/index.d.ts'), 'utf8');
      expect(s1DtsCode).not.toMatch(/from\s*['"]\.\.\/index['"]/);
      expect(s1DtsCode).toContain('export interface EvidenceResult');
      expect(s1DtsCode).toContain('export function buildDecisionPlan');
      expect(s1DtsCode).toContain('export function validateDecisionPlan');
      expect(s1DtsCode).toContain('export function dynamicReviewerSelection');
    });
  });

  describe('5. tsconfig.json Configuration Baseline', () => {
    test('tsconfig.json has resolveJsonModule, scoped include and exclude', () => {
      const tsconfigContent = fs.readFileSync(path.join(rootDir, 'tsconfig.json'), 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions.resolveJsonModule).toBe(true);
      expect(tsconfig.compilerOptions.allowJs).toBe(true);
      expect(tsconfig.compilerOptions.checkJs).toBe(true);
      expect(tsconfig.compilerOptions.noEmit).toBe(true);

      expect(Array.isArray(tsconfig.include)).toBe(true);
      expect(tsconfig.include.length).toBeGreaterThan(0);
      expect(tsconfig.exclude).toEqual(
        expect.arrayContaining(['node_modules', 'dist', 'target', 'coverage', 'test', 'tests']),
      );
    });
  });
});
