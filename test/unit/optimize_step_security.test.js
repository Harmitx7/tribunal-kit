'use strict';

const fs = require('fs');
const path = require('path');
const { validateSkillTarget, cmdOptimizeStep } = require('../../src/commands/native');

describe('cmdOptimizeStep security & path containment', () => {
  const cwd = process.cwd();
  const testSkillDir = path.join(cwd, '.agent', 'skills', 'test-sec-skill');
  const testSkillFile = path.join(testSkillDir, 'SKILL.md');

  beforeAll(() => {
    if (!fs.existsSync(testSkillDir)) {
      fs.mkdirSync(testSkillDir, { recursive: true });
    }
    fs.writeFileSync(testSkillFile, '# Test Skill\nInitial content\n', 'utf8');
  });

  afterAll(() => {
    if (fs.existsSync(testSkillFile)) {
      try {
        fs.unlinkSync(testSkillFile);
      } catch (_) {}
    }
    if (fs.existsSync(testSkillDir)) {
      try {
        fs.rmdirSync(testSkillDir);
      } catch (_) {}
    }
  });

  describe('validateSkillTarget', () => {
    test('rejects null byte in path', () => {
      expect(() => {
        validateSkillTarget('my-skill\0/SKILL.md', cwd);
      }).toThrow(/Null byte detected/i);
    });

    test('rejects path traversal escaping .agent/skills/', () => {
      expect(() => {
        validateSkillTarget('../../evil.md', cwd);
      }).toThrow(/Path traversal detected/i);

      expect(() => {
        validateSkillTarget('../../../package.json', cwd);
      }).toThrow(/Path traversal detected/i);
    });

    test('rejects absolute path outside skills directory', () => {
      const outsidePath = path.resolve(cwd, 'package.json');
      expect(() => {
        validateSkillTarget(outsidePath, cwd);
      }).toThrow(/Path traversal detected/i);
    });

    test('accepts valid relative skill path inside .agent/skills/', () => {
      const resolved = validateSkillTarget('test-sec-skill/SKILL.md', cwd);
      const expected = path.resolve(cwd, '.agent', 'skills', 'test-sec-skill', 'SKILL.md');
      expect(resolved).toBe(expected);
    });

    test('accepts valid path starting with .agent/skills/', () => {
      const resolved = validateSkillTarget('.agent/skills/test-sec-skill/SKILL.md', cwd);
      const expected = path.resolve(cwd, '.agent', 'skills', 'test-sec-skill', 'SKILL.md');
      expect(resolved).toBe(expected);
    });
  });

  describe('cmdOptimizeStep CLI execution', () => {
    test('fails on traversal attempt without modifying target', () => {
      const outsideFile = path.resolve(cwd, 'test_traversal_target.txt');
      const processArgs = [
        'node',
        'tk',
        'optimize-step',
        '--skill-path',
        '../../test_traversal_target.txt',
        '--edits-json',
        JSON.stringify([{ op: 'append', content: 'malicious payload' }]),
      ];

      const success = cmdOptimizeStep(processArgs, true);
      expect(success).toBe(false);
      expect(fs.existsSync(outsideFile)).toBe(false);
    });

    test('fails on null byte without modifying target', () => {
      const processArgs = [
        'node',
        'tk',
        'optimize-step',
        '--skill-path',
        'test-sec-skill\0/SKILL.md',
        '--edits-json',
        JSON.stringify([{ op: 'append', content: 'malicious payload' }]),
      ];

      const success = cmdOptimizeStep(processArgs, true);
      expect(success).toBe(false);
    });

    test('succeeds for valid skill path inside .agent/skills/', () => {
      const processArgs = [
        'node',
        'tk',
        'optimize-step',
        '--skill-path',
        'test-sec-skill/SKILL.md',
        '--edits-json',
        JSON.stringify([{ op: 'append', content: 'Securely appended' }]),
      ];

      const success = cmdOptimizeStep(processArgs, true);
      expect(success).toBe(true);
      const updated = fs.readFileSync(testSkillFile, 'utf8');
      expect(updated).toContain('Securely appended');
    });
  });
});
