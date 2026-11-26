'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectDispatch } = require('../../src/autopilot/dispatch_inventory');

const root = path.resolve(__dirname, '../..');

function withModifiedSource(file, change, verify) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dispatch-inventory-'));
  try {
    const required = [
      'src/cli.js',
      'bin/wrapper.js',
      'bin/mcp-server.js',
      '.agent/scripts/codebase_intelligence.js',
      '.agent/scripts/marathon_harness.js',
      '.agent/scripts/case_law_manager.js',
      'crates/core/src/main.rs',
      ...fs
        .readdirSync(path.join(root, 'src/commands'))
        .filter(name => name.endsWith('.js'))
        .map(name => 'src/commands/' + name),
    ];
    for (const source of required) {
      const target = path.join(temp, source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const original = fs.readFileSync(path.join(root, source), 'utf8');
      if (file === source) {
        const replacement = change(original);
        expect(replacement).not.toBe(original);
        fs.writeFileSync(target, replacement);
      } else {
        fs.writeFileSync(target, original);
      }
    }
    verify(() => collectDispatch(temp));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

test('indexes callable operations, aliases, unavailable handlers and native fallback requirements', () => {
  const all = collectDispatch(root);
  expect(all).toEqual(collectDispatch(root));
  const byId = new Map(all.map(entry => [entry.id, entry]));
  expect(byId.size).toBe(all.length);
  for (const entry of all) expect(byId.get(entry.operationId)?.operationId).toBe(entry.operationId);
  expect(byId.get('cli:context-broker').availability.adapter).toBe('cli-native');
  expect(byId.get('cli:min-context').availability.adapter).toBe('cli-native-or-js');
  expect(byId.get('cli:sdd:scratchpad').availability.adapter).toBe('cli-js');
  expect(byId.get('mcp:dispatch_swarm').availability.kind).toBe('unavailable');
  expect(byId.get('cli:similar').availability.kind).toBe('unavailable');
  expect(byId.get('cli:cases').operationId).toBe('cli:intelligence:cases');
  expect(byId.get('cli:review:flag-plan').locator).toBe('review --plan');
  expect(byId.get('cli:skill-intel:flag-g').operationId).toBe('cli:skill-intelligence:flag-gate');
  expect(byId.get('cli:tribunal-understand:deps').operationId).toBe('cli:understand:dependencies');
  expect(byId.get('mcp:tribunal_understand:trace').provenance.definitionKey).toBe('trace');
  expect(byId.get('mcp:tribunal_understand:trace')).toMatchObject({
    locator: 'tribunal_understand',
    fixedArguments: { subcommand: 'trace' },
  });
  expect(byId.get('mcp:recall_memory').sideEffectClass).toBe('write');
  expect(byId.get('mcp:tribunal_get_context').sideEffectClass).toBe('exec');
  expect(byId.get('mcp:tribunal_approve_write').sideEffectClass).toBe('policy');
});

test.each([
  ['src/cli.js', "case 'graph':", "case 'shadow':", 'CLI'],
  ['src/commands/system1.js', "case 'verify':", "case 'other':", 'CLI action'],
  ['crates/core/src/main.rs', 'Commands::AstExtract', 'Commands::Missing', 'native dispatcher'],
  ['bin/mcp-server.js', "name: 'recall_memory'", "name: 'renamed_tool'", 'MCP advertisement'],
  [
    'bin/mcp-server.js',
    "toolName === 'store_memory'",
    "toolName === 'renamed_handler'",
    'MCP handler',
  ],
  ['bin/mcp-server.js', "'change-impact',", "'missing-action',", 'MCP parameterized operation'],
])('rejects drift in %s', (file, before, after) => {
  withModifiedSource(
    file,
    source => source.replace(before, after),
    collect => {
      expect(collect).toThrow(/Dispatch drift/);
    },
  );
});
