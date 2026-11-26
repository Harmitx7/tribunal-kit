'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createAutopilotService } = require('../../src/autopilot/service');
const { createResultCache } = require('../../src/autopilot/result_cache');
const { planAutopilot } = require('../../src/system1');

const root = path.resolve(__dirname, '../..');
const request = { task: 'Build JWT authentication', targets: ['auth.js'] };
const snapshot = {
  root,
  fresh: true,
  baseDigest: 'a'.repeat(40),
  workingTreeDigest: 'b'.repeat(64),
  observedPaths: request.targets,
};

test('content-addressed result retention is scoped to source, repository state and capability', () => {
  const cache = createResultCache(root, 'd'.repeat(64));
  const evidence = [{ file: 'auth.js', tier: 'LOW', affected: 0 }];
  const getKey = (
    id = 'inspection',
    targets = ['auth.js'],
    state = 'a'.repeat(64),
    source = 'b'.repeat(64),
  ) => cache.key(id, targets, state, source);
  cache.set(getKey(), evidence);
  const returned = cache.get(getKey());
  expect(returned).toEqual(evidence);
  returned[0].affected = 99;
  expect(cache.get(getKey())).toEqual(evidence);
  expect(cache.get(getKey('verification'))).toBeNull();
  expect(cache.get(getKey('inspection', ['other.js']))).toBeNull();
  expect(cache.get(getKey('inspection', ['auth.js'], 'c'.repeat(64)))).toBeNull();
  expect(cache.get(getKey('inspection', ['auth.js'], 'a'.repeat(64), 'c'.repeat(64)))).toBeNull();
  expect(cache.key('inspection', ['auth.js'], 'a'.repeat(64), null)).toBeNull();
});

test('runtime reserves a declared turn and enforces token and time limits', async () => {
  const inspectScope = jest.fn().mockResolvedValue([{ file: 'auth.js', tier: 'LOW', affected: 0 }]);
  const runtime = createAutopilotService({ root, collectEvidence: () => snapshot, inspectScope });
  expect(runtime.plan({ ...request, budget: { tokens: 1 } })).toEqual({
    status: 'blocked',
    reason: 'planning-budget-exhausted',
  });
  expect(runtime.plan({ ...request, budget: { milliseconds: 0 } })).toEqual({
    status: 'blocked',
    reason: 'planning-budget-exhausted',
  });
  const { planId } = runtime.plan({ ...request, turnId: 'same-turn', budget: { capabilities: 1 } });
  expect(runtime.plan({ ...request, turnId: 'same-turn', task: 'Fix authentication' })).toEqual({
    status: 'blocked',
    reason: 'turn-budget-already-reserved',
  });
  const result = await runtime.execute({ planId });
  expect(result.results).toHaveLength(1);
  expect(inspectScope).toHaveBeenCalledTimes(1);
});

test('classifier hints break eligible ties without admitting an unrelated capability', () => {
  const input = { ...request, workspace: snapshot };
  const preferred = 'mcp:tribunal_understand:impact';
  expect(
    planAutopilot({
      ...input,
      classifierHint: {
        version: 1,
        rankedCapabilityIds: ['mcp:tribunal_commit_write', preferred],
      },
    }).nodes[0].id,
  ).toBe(preferred);
  expect(
    planAutopilot({
      ...input,
      classifierHint: {
        version: 1,
        rankedCapabilityIds: ['unknown-capability', preferred],
      },
    }).nodes[0].id,
  ).toBe('cli:understand:impact');
});

test('production cache reuses verified reads then invalidates on ignored source and tracked edits', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-autopilot-cache-'));
  const git = (...args) => execFileSync('git', ['-C', directory, ...args], { stdio: 'ignore' });
  try {
    fs.writeFileSync(
      path.join(directory, 'auth.js'),
      'module.exports = function authenticate() {};\n',
    );
    fs.writeFileSync(path.join(directory, '.gitignore'), 'ignored.js\n');
    git('init');
    git('add', '--', '.gitignore', 'auth.js');
    git(
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'Fixture',
    );
    const runtime = createAutopilotService({ root: directory });
    const run = async turnId => {
      const { planId } = runtime.plan({ ...request, turnId });
      const result = await runtime.execute({ planId });
      expect(result.status).toBe('awaiting-evidence');
      return result.results.find(item => item.status === 'SUCCEEDED');
    };
    expect((await run('cold')).cacheHit).toBeUndefined();
    expect((await run('warm')).cacheHit).toBe(true);
    fs.writeFileSync(path.join(directory, 'ignored.js'), "require('./auth');\n");
    expect((await run('ignored-edit')).cacheHit).toBeUndefined();
    expect((await run('warm-again')).cacheHit).toBe(true);
    fs.appendFileSync(path.join(directory, 'auth.js'), '// tracked edit\n');
    expect((await run('tracked-edit')).cacheHit).toBeUndefined();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
