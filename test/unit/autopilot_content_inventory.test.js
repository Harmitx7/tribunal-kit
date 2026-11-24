'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectContent } = require('../../src/autopilot/content_inventory');

describe('packaged content inventory', () => {
  let root;
  const write = (file, value) => {
    const destination = path.join(root, '.agent', file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, typeof value === 'string' ? value : JSON.stringify(value));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-content-'));
    write('agents/legacy.md', '---\nname: legacy\n---\n');
    write('skills/format/SKILL.md', '---\nname: format\n---\n');
    write('workflows/format.md', '---\ndescription: Review format\n---\n');
    write('config/specialist-registry.json', {
      specialists: [{ name: 'legacy', active: false, status: 'deprecated' }],
    });
    write('config/slash-commands.json', {
      commands: [{ name: '/check', aliases: ['/format'] }, { name: '/summon' }],
    });
    write('skill_topic_map.json', {
      total_skills: 1,
      domain_routes: { style: ['format'] },
      file_extensions: { '.js': ['format'] },
    });
    write('routing_index.json', {
      agents: [{ name: 'legacy', file: 'agents/legacy.md' }],
      skills: [{ name: 'format' }],
      workflows: [{ name: 'format', file: 'workflows/format.md', command: '/check' }],
    });
  });
  afterEach(() => fs.rmSync(root, { force: true, recursive: true }));

  test('preserves alias identity, lifecycle, source-backed path hints and host-only status', () => {
    const entries = new Map(collectContent(root).map(entry => [entry.id, entry]));
    expect(entries.size).toBe(6);
    for (const id of ['workflow:format', 'slash:check', 'slash:format']) {
      expect(entries.get(id)).toMatchObject({
        operationId: 'workflow:format',
        availability: { kind: 'advisory', adapter: 'host' },
      });
    }
    expect(entries.get('agent:legacy')).toMatchObject({
      availability: { kind: 'unavailable' },
      provenance: { definitionKey: 'specialists/legacy/deprecated' },
    });
    expect(entries.get('slash:summon')).toMatchObject({
      locator: '/summon',
      availability: { kind: 'unavailable' },
    });
    expect(entries.get('skill:format').triggerSignals).toEqual([
      { fact: 'path', operator: 'has', value: '.js' },
    ]);
  });

  test.each([
    ['config/slash-commands.json', { commands: [{ name: '/ghost' }] }, /unresolved or ambiguous/],
    [
      'config/slash-commands.json',
      {
        commands: [
          { name: '/check', aliases: ['/format'] },
          { name: '/summon', aliases: ['/check'] },
        ],
      },
      /duplicate slash/,
    ],
    ['skill_topic_map.json', { domain_routes: {}, total_skills: 0 }, /skill topic map/],
    ['config/specialist-registry.json', { specialists: [] }, /specialist registry/],
    [
      'config/specialist-registry.json',
      { specialists: [{ name: 'legacy', status: 'experimental', active: true }] },
      /non-production/,
    ],
    ['skills/format/SKILL.md', '---\nname: other\n---\n', /wrong definition name/],
    ['routing_index.json', { agents: [], skills: [], workflows: [] }, /routing index agents/],
  ])('rejects drift in %s', (file, replacement, error) => {
    write(file, replacement);
    expect(() => collectContent(root)).toThrow(error);
  });
});
