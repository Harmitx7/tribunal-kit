'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Subagent-Driven Development (SDD) & Plugin Integration', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const tempDir = path.join(repoRoot, 'scratch', 'sdd_test');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_e) {
      // Ignore cleanup error
    }
  });

  test('SessionStart hook emits valid JSON with master governance', () => {
    const hookScript = path.join(repoRoot, 'hooks', 'session-start.js');
    const output = execSync(`node "${hookScript}"`, { cwd: repoRoot, encoding: 'utf8' });
    const json = JSON.parse(output);

    expect(json).toHaveProperty('additionalContext');
    expect(json.additionalContext).toContain('<EXTREMELY_IMPORTANT>');
    expect(json.additionalContext).toContain('Tribunal Kit Master Governance');
  });

  test('SessionStart hook adapts output format when CURSOR_PLUGIN_ROOT is present', () => {
    const hookScript = path.join(repoRoot, 'hooks', 'session-start.js');
    const output = execSync(`node "${hookScript}"`, {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, CURSOR_PLUGIN_ROOT: repoRoot },
    });
    const json = JSON.parse(output);

    expect(json).toHaveProperty('additional_context');
    expect(json.additional_context).toContain('<EXTREMELY_IMPORTANT>');
  });

  test('sdd brief command extracts task out-of-band via Rust engine', () => {
    const planPath = path.join(tempDir, 'test-plan.md');
    const planContent = `# Test Implementation Plan

### Task 1: Setup Infrastructure
**Files:**
- Create: src/infra.ts
- [ ] Step 1: Write test

### Task 2: Build API Router
**Files:**
- Create: src/router.ts
- [ ] Step 1: Write router test
- [ ] Step 2: Implement minimal route

### Task 3: Final Verification
- [ ] Step 1: Run test suite
`;
    fs.writeFileSync(planPath, planContent, 'utf8');

    const outPath = path.join(tempDir, 'task-2-extracted.md');
    const wrapperScript = path.join(repoRoot, 'bin', 'wrapper.js');

    execSync(
      `node "${wrapperScript}" sdd brief --plan "${planPath}" --task 2 --out "${outPath}"`,
      { cwd: repoRoot, encoding: 'utf8' }
    );

    expect(fs.existsSync(outPath)).toBe(true);
    const extracted = fs.readFileSync(outPath, 'utf8');
    expect(extracted).toContain('Task 2: Build API Router');
    expect(extracted).not.toContain('Task 1: Setup Infrastructure');
    expect(extracted).not.toContain('Task 3: Final Verification');
  });

  test('verification-before-completion skill exists and contains Iron Law', () => {
    const vbcPath = path.join(repoRoot, '.agent', 'skills', 'verification-before-completion', 'SKILL.md');
    expect(fs.existsSync(vbcPath)).toBe(true);
    const content = fs.readFileSync(vbcPath, 'utf8');
    expect(content).toContain('NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE');
  });

  test('all plugin manifests exist and are valid JSON', () => {
    const manifests = [
      path.join(repoRoot, '.claude-plugin', 'plugin.json'),
      path.join(repoRoot, '.claude-plugin', 'marketplace.json'),
      path.join(repoRoot, '.cursor-plugin', 'plugin.json'),
      path.join(repoRoot, '.codex-plugin', 'plugin.json'),
      path.join(repoRoot, '.devin-plugin', 'plugin.json'),
      path.join(repoRoot, '.kimi-plugin', 'plugin.json'),
      path.join(repoRoot, '.agents', 'plugins', 'marketplace.json'),
      path.join(repoRoot, 'gemini-extension.json'),
      path.join(repoRoot, 'hooks', 'hooks.json'),
      path.join(repoRoot, 'hooks', 'hooks-cursor.json'),
    ];

    for (const manifestPath of manifests) {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(parsed).toBeDefined();
    }
  });

  test('Hermes, OpenCode, and Pi plugin integration files exist and are valid', () => {
    const hermesYaml = path.join(repoRoot, '.hermes-plugin', 'plugin.yaml');
    const hermesPy = path.join(repoRoot, '.hermes-plugin', '__init__.py');
    const openCodeJs = path.join(repoRoot, '.opencode', 'plugins', 'tribunal.js');
    const openCodeInstall = path.join(repoRoot, '.opencode', 'INSTALL.md');
    const piExt = path.join(repoRoot, '.pi', 'extensions', 'tribunal.ts');

    expect(fs.existsSync(hermesYaml)).toBe(true);
    expect(fs.existsSync(hermesPy)).toBe(true);
    expect(fs.existsSync(openCodeJs)).toBe(true);
    expect(fs.existsSync(openCodeInstall)).toBe(true);
    expect(fs.existsSync(piExt)).toBe(true);

    const hermesContent = fs.readFileSync(hermesPy, 'utf8');
    expect(hermesContent).toContain('tribunal-kit:master-governance bootstrap for hermes');

    const openCodeContent = fs.readFileSync(openCodeJs, 'utf8');
    expect(openCodeContent).toContain('TribunalPlugin');

    const piContent = fs.readFileSync(piExt, 'utf8');
    expect(piContent).toContain('firstNonCompactionSummaryIndex');
  });
});
