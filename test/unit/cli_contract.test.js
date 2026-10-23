'use strict';

const fs = require('fs');
const path = require('path');

describe('CLI Contract & Routing Integrity', () => {
  const cliPath = path.resolve(__dirname, '../../src/cli.js');
  const commandsDir = path.resolve(__dirname, '../../src/commands');
  const cliContent = fs.readFileSync(cliPath, 'utf8');

  test('src/cli.js routes skill-intel and skill-intelligence', () => {
    expect(cliContent).toMatch(/case\s+'skill-intel':/);
    expect(cliContent).toMatch(/case\s+'skill-intelligence':/);
    expect(cliContent).toMatch(/cmdSkillIntel/);
  });

  test('src/cli.js help output includes skill-intel', () => {
    expect(cliContent).toMatch(/cmd\('skill-intel'/);
  });

  test('every command file in src/commands/*.js is registered in src/cli.js', () => {
    const files = fs
      .readdirSync(commandsDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.basename(f, '.js'));

    const knownAliases = {
      'evalopt': ['evalopt', 'redteam'],
      'evolve': ['evolve', 'auto-tune'],
      'optimize': ['optimize-skill'],
      'native': ['min-context', 'dag-schedule', 'context-compress', 'optimize-step', 'impact-tier'],
      'skill-intelligence': ['skill-intel', 'skill-intelligence'],
    };

    for (const file of files) {
      if (knownAliases[file]) {
        const hasAnyAlias = knownAliases[file].some(alias =>
          cliContent.includes(`case '${alias}':`),
        );
        expect(hasAnyAlias).toBe(true);
      } else {
        const hasRoute = cliContent.includes(`case '${file}':`);
        expect(hasRoute).toBe(true);
      }
    }
  });

  test('invoking tk skill-intel with --help executes cmdSkillIntel cleanly', async () => {
    const { cmdSkillIntel } = require('../../src/commands/skill-intelligence');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => {
      cmdSkillIntel({ path: path.resolve(__dirname, '../..') }, ['node', 'tk', 'skill-intel', '--help'], true);
    }).not.toThrow();

    logSpy.mockRestore();
  });
});
