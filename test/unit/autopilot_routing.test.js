'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { planAutopilot, collectWorkspaceEvidence } = require('../../src/system1');

const root = path.resolve(__dirname, '../..');
const fixture = (task, file, state = {}) => ({
  task,
  targets: [file],
  workspace: {
    root,
    fresh: true,
    baseDigest: 'a'.repeat(40),
    workingTreeDigest: 'b'.repeat(64),
    touchedPaths: [file],
    ...state,
  },
});

test('documentation discussion produces no capabilities even with changed authentication source', () => {
  expect(
    planAutopilot(fixture('Explain how to build JWT authentication in the docs', 'src/auth.js')),
  ).toMatchObject({ mode: 'discuss', status: 'noop', tier: 0, nodes: [] });
});

test('button color fast path only checks the supplied declaration', () => {
  const input = fixture('Change the button color', 'src/button.css', {
    diff: '- color: #000;\n+ color: #fff;',
  });
  expect(planAutopilot(input)).toMatchObject({
    mode: 'modify',
    status: 'noop',
    tier: 0,
    nodes: [],
    inlineVerification: 'single-color-declaration-checked',
  });
  input.workspace.diff = '';
  expect(planAutopilot(input).inlineVerification).toBe('pending');
});

test('a corroborated component edit proposes one UI capability', () => {
  const plan = planAutopilot(fixture('Change the button layout', 'src/Button.tsx'));
  expect(plan.tier).toBe(1);
  expect(plan.nodes.map(node => node.id)).toEqual(['agent:frontend-specialist']);
});

test('a blast ring raises the tier only for its corroborated target', () => {
  const input = fixture('Change the button layout', 'src/Button.tsx', {
    blastPaths: ['src/Elsewhere.tsx'],
    blastRisk: { 'src/Elsewhere.tsx': 'CRITICAL' },
  });
  expect(planAutopilot(input).tier).toBe(1);
  input.workspace.blastPaths.push('src/Button.tsx');
  input.workspace.blastRisk['src/Button.tsx'] = 'CRITICAL';
  expect(planAutopilot(input).tier).toBe(3);
});

test.each([
  ['Build JWT authentication', 'src/auth.js', 'implement'],
  ['Fix SQL injection by parameterizing the query', 'src/db.js', 'debug'],
])(
  '%s selects focused defensive review and verification with an approval requirement',
  (task, file, mode) => {
    const input = fixture(task, file);
    const plan = planAutopilot(input);
    expect(plan).toEqual(planAutopilot(input));
    expect(plan).toMatchObject({ mode, tier: 3, status: 'proposal', scope: [file] });
    expect(plan.nodes.map(node => node.id)).toEqual([
      'cli:understand:impact',
      'agent:security-auditor',
      'agent:test-engineer',
    ]);
    expect(plan.nodes[1].requires).toEqual(['cli:understand:impact']);
    expect(plan.nodes.every(node => node.announcementSuppressed)).toBe(true);
    expect(plan.requirements).toEqual(
      expect.arrayContaining(['write-approval', 'focused-verification-result']),
    );
    expect(plan.contextDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.manifestDigest).toMatch(/^[a-f0-9]{64}$/);
  },
);

test.each([{ fresh: false }, { touchedPaths: ['src/elsewhere.js'] }, { baseDigest: '' }])(
  'missing, stale or unrelated workspace evidence cannot escalate %#',
  patch => {
    expect(planAutopilot(fixture('Build JWT authentication', 'src/auth.js', patch))).toMatchObject({
      status: 'inspection-needed',
      tier: null,
      nodes: [],
    });
  },
);

test('planning carries no write approval request and ranking exposes deferred requirements', () => {
  const input = fixture('Plan JWT authentication', 'src/auth.js');
  input.budget = { capabilities: 1, tokens: 150, milliseconds: 500 };
  expect(planAutopilot(input)).toMatchObject({
    mode: 'plan',
    status: 'preview',
    nodes: [{ id: 'cli:understand:impact' }],
    deferred: ['security-review-guidance', 'focused-verification-plan'],
  });
  expect(planAutopilot(input).requirements).not.toContain('write-approval');
});

test('discussion and Tier 0 classification stay in memory with a p99 below 10 ms', () => {
  const cases = [
    fixture('Discuss authentication docs', 'src/auth.js'),
    fixture('Change the button color', 'src/button.css', {
      diff: '- color: #000;\n+ color: #fff;',
    }),
  ];
  const read = jest.spyOn(fs, 'readFileSync');
  const exists = jest.spyOn(fs, 'existsSync');
  try {
    for (let i = 0; i < 500; i++) planAutopilot(cases[i % cases.length]);
    const times = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      planAutopilot(cases[i % cases.length]);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[989]).toBeLessThan(10);
    expect(read).not.toHaveBeenCalled();
    expect(exists).not.toHaveBeenCalled();
    console.log(`Autopilot fast path p99 ${times[989].toFixed(4)} ms (1000 samples)`);
  } finally {
    read.mockRestore();
    exists.mockRestore();
  }
});

test('workspace adapter binds tracked and untracked evidence to Git state', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'autopilot-routing-'));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'ignore' });
  try {
    git('init');
    fs.writeFileSync(path.join(repo, 'button.css'), 'button { color: #000; }\n');
    git('add', '--', 'button.css');
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
    fs.writeFileSync(path.join(repo, 'button.css'), 'button { color: #fff; }\n');
    fs.writeFileSync(path.join(repo, 'note.txt'), 'first');
    const first = collectWorkspaceEvidence(repo, ['button.css', '../outside']);
    expect(first).toMatchObject({
      fresh: true,
      touchedPaths: ['button.css', 'note.txt'],
      observedPaths: ['button.css'],
    });
    const model = {
      entities: [
        { id: 'button', name: 'Button', scope: 'button.css', kind: 'component' },
        { id: 'page', name: 'Page', scope: 'page.html', kind: 'component' },
      ],
      relationships: [{ sourceId: 'page', targetId: 'button' }],
    };
    expect(
      collectWorkspaceEvidence(repo, ['button.css'], {
        model,
        workingTreeDigest: first.workingTreeDigest,
      }),
    ).toMatchObject({
      topologyPaths: ['button.css'],
      blastPaths: ['button.css'],
      blastRisk: { 'button.css': 'CRITICAL' },
    });
    fs.writeFileSync(path.join(repo, 'note.txt'), 'second');
    expect(collectWorkspaceEvidence(repo, ['button.css']).workingTreeDigest).not.toBe(
      first.workingTreeDigest,
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
