'use strict';

const fs = require('fs');
const path = require('path');
const { cmdCompile } = require('../../src/commands/compile');

describe('cmdCompile command', () => {
  const generatedFiles = [
    '.aider.conf.yml',
    'CONVENTIONS.md',
    '.claude.json',
    '.claude/CLAUDE.md',
    '.tribunal-compiled.json',
    'custom_output.json',
    '.tribunal-compiled.md',
    '.tribunal-compiled.yml',
  ];

  function cleanupFiles() {
    for (const relPath of generatedFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (_) {}
      }
    }
    const claudeDir = path.join(process.cwd(), '.claude');
    if (fs.existsSync(claudeDir)) {
      try {
        fs.rmdirSync(claudeDir);
      } catch (_) {}
    }
  }

  beforeEach(() => {
    cleanupFiles();
  });

  afterEach(() => {
    cleanupFiles();
  });

  test('exports cmdCompile function', () => {
    expect(typeof cmdCompile).toBe('function');
  });

  test('compiles to default markdown when no target specified', async () => {
    await cmdCompile({ quiet: true }, true);
    const defaultFile = path.join(process.cwd(), '.tribunal-compiled.md');
    expect(fs.existsSync(defaultFile)).toBe(true);
    const content = fs.readFileSync(defaultFile, 'utf-8');
    expect(content).toContain('# Tribunal Kit Context');
  });

  test('compiles strictly valid YAML configuration for aider target', async () => {
    await cmdCompile({ target: 'aider', quiet: true }, true);

    const aiderConf = path.join(process.cwd(), '.aider.conf.yml');
    const conventions = path.join(process.cwd(), 'CONVENTIONS.md');

    expect(fs.existsSync(aiderConf)).toBe(true);
    expect(fs.existsSync(conventions)).toBe(true);

    const confContent = fs.readFileSync(aiderConf, 'utf-8');
    // Verify valid YAML structure
    expect(confContent).toMatch(/^#.*\n#.*\nread:\n\s+-\s+CONVENTIONS\.md/m);
    expect(confContent).not.toContain('# Tribunal Kit Context');

    const convContent = fs.readFileSync(conventions, 'utf-8');
    expect(convContent).toContain('# Tribunal Kit Context');
  });

  test('compiles valid JSON for claude target and creates .claude/CLAUDE.md', async () => {
    await cmdCompile({ target: 'claude', quiet: true }, true);

    const claudeJson = path.join(process.cwd(), '.claude.json');
    const claudeMd = path.join(process.cwd(), '.claude', 'CLAUDE.md');

    expect(fs.existsSync(claudeJson)).toBe(true);
    expect(fs.existsSync(claudeMd)).toBe(true);

    const rawJson = fs.readFileSync(claudeJson, 'utf-8');
    let parsed;
    expect(() => {
      parsed = JSON.parse(rawJson);
    }).not.toThrow();

    expect(parsed).toHaveProperty('$schema');
    expect(parsed).toHaveProperty('rules');
    expect(parsed.rules).toContain('# Tribunal Kit Context');
    expect(parsed.generator).toBe('tribunal-kit');

    const mdContent = fs.readFileSync(claudeMd, 'utf-8');
    expect(mdContent).toContain('# Tribunal Kit Context');
  });

  test('compiles valid JSON when target is json or custom.json', async () => {
    await cmdCompile({ target: 'json', quiet: true }, true);
    const jsonFile = path.join(process.cwd(), '.tribunal-compiled.json');
    expect(fs.existsSync(jsonFile)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    expect(parsed).toHaveProperty('rules');
    expect(parsed.rules).toContain('# Tribunal Kit Context');

    await cmdCompile({ target: 'custom_output.json', quiet: true }, true);
    const customJson = path.join(process.cwd(), 'custom_output.json');
    expect(fs.existsSync(customJson)).toBe(true);
    const parsedCustom = JSON.parse(fs.readFileSync(customJson, 'utf-8'));
    expect(parsedCustom).toHaveProperty('rules');
  });
});
