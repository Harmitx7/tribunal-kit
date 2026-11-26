'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateKeyPairSync, sign, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createEnvelope, evaluateCapability } = require('../../src/autopilot/policy_gate');
const { ControlledWriteService } = require('../../src/execution/controlled_write_service');
const {
  QuorumAndAggregationEngine,
} = require('../../src/runtime_reliability/quorum_and_aggregation_engine');
const workspace = require('../../src/autopilot/workspace_evidence');

const root = path.resolve(__dirname, '../..');
const request = { task: 'Build JWT authentication', targets: ['src/auth.js'], turnId: 'fixture-1' };
const snapshot = {
  root,
  fresh: true,
  baseDigest: 'a'.repeat(40),
  workingTreeDigest: 'b'.repeat(64),
  observedPaths: ['src/auth.js'],
};

beforeEach(() => {
  jest.spyOn(workspace, 'collectWorkspaceEvidence').mockReturnValue(snapshot);
  jest.resetModules();
  jest.doMock('../../src/autopilot/workspace_evidence', () => workspace);
});
afterEach(() => {
  jest.dontMock('../../src/autopilot/workspace_evidence');
  jest.restoreAllMocks();
});

const service = options =>
  require('../../src/autopilot/service').createAutopilotService({ root, ...options });

test('policy denies unknown executors and rejects recursive child envelopes', () => {
  const id = randomUUID();
  const envelope = createEnvelope(id, null, []);
  const child = createEnvelope(id, envelope, ['reserved']);
  expect(Object.isFrozen(child)).toBe(true);
  expect(Object.isFrozen(child.seenCapabilities)).toBe(true);
  expect(() => createEnvelope(id, child, [])).toThrow(/nested/i);
  const node = { id: 'cli:arbitrary', operationId: 'cli:arbitrary', scope: ['src/auth.js'] };
  const entry = { ...node, availability: { kind: 'executable' }, sideEffectClass: 'exec' };
  expect(evaluateCapability(node, entry, root, node.scope)).toBe('deny');
  expect(evaluateCapability({ ...node, scope: ['../outside'] }, entry, root, ['../outside'])).toBe(
    'deny',
  );
});

test('inspection executes once, advisory work remains pending, and writes use the existing gate', async () => {
  const inspectScope = jest.fn().mockResolvedValue([{ tier: 'HIGH' }]);
  const runtime = service({ inspectScope });
  const plan = runtime.plan(request);
  expect(runtime.plan(request).planId).toBe(plan.planId);
  const execution = runtime.execute({ planId: plan.planId });
  expect(await runtime.execute({ planId: plan.planId })).toMatchObject({
    reason: 'already-running',
  });
  const result = await execution;
  expect(result).toMatchObject({
    status: 'awaiting-evidence',
    pending: expect.arrayContaining(['security-review-guidance', 'write-approval']),
    writeHandoff: { request: 'tribunal_request_write', preview: 'tribunal_preview_write' },
  });
  expect(result.envelope.rootRunId).toBe(plan.planId);
  expect(await runtime.execute({ planId: plan.planId })).toEqual(result);
  expect(inspectScope).toHaveBeenCalledTimes(1);
});

test('cancellation propagates to the admitted inspection and stops subsequent dispatch', async () => {
  let entered;
  const started = new Promise(resolve => {
    entered = resolve;
  });
  const inspectScope = jest.fn(
    (_, __, signal) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
        entered();
      }),
  );
  const runtime = service({ inspectScope });
  const { planId } = runtime.plan(request);
  const execution = runtime.execute({ planId });
  await started;
  expect(runtime.cancel({ planId })).toEqual({ status: 'cancelled' });
  expect(await execution).toEqual({ status: 'cancelled' });
  expect(inspectScope).toHaveBeenCalledTimes(1);
});

test('workspace drift and fabricated plan fields fail closed', async () => {
  const inspectScope = jest.fn();
  const runtime = service({ inspectScope });
  const { planId } = runtime.plan(request);
  workspace.collectWorkspaceEvidence.mockReturnValue({
    ...snapshot,
    workingTreeDigest: 'c'.repeat(64),
  });
  await expect(runtime.execute({ planId, approval: true })).rejects.toThrow(
    'Invalid Autopilot arguments',
  );
  expect(await runtime.execute({ planId })).toMatchObject({ status: 'blocked' });
  expect(inspectScope).not.toHaveBeenCalled();
});

test('optional passes cannot mask a required failure', () => {
  const aggregator = new QuorumAndAggregationEngine({
    policyType: 'THRESHOLD_QUORUM',
    minSuccessThreshold: 0.5,
    requiredAgents: ['policy'],
    optionalAgents: ['optional-one', 'optional-two'],
  });
  expect(
    aggregator.evaluateResults([
      { agentId: 'policy', status: 'FAILED' },
      { agentId: 'optional-one', status: 'SUCCEEDED' },
      { agentId: 'optional-two', status: 'SUCCEEDED' },
    ]),
  ).toMatchObject({ status: 'FAILED', quorumSatisfied: false });
});

test('strict controlled writes accept external signatures and detect stale preimages', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-signed-write-'));
  try {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const gate = new ControlledWriteService({
      workspaceRoot: directory,
      requireSignedApproval: true,
      approvalPublicKey: publicKey.export({ type: 'spki', format: 'pem' }),
      authorizedApprovers: ['maintainer'],
      policyEngine: { evaluate: () => ({ action: 'ALLOW' }) },
    });
    const file = path.join(directory, 'page.css');
    fs.writeFileSync(file, 'body { color: black; }');
    const proposal = await gate.requestWrite({
      requestId: 'fixture-write',
      workspaceId: 'fixture',
      agentId: 'test-adapter',
      files: [{ path: 'page.css', operation: 'MODIFY', content: 'body { color: white; }' }],
    });
    expect(proposal.status).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(() => gate.approveWrite(proposal.token, 'maintainer', 'self-issued')).toThrow(
      /signature/i,
    );
    const preview = gate.previewWrite(proposal.token);
    const value = Buffer.from(
      JSON.stringify([
        proposal.token,
        'maintainer',
        preview.approval.proposalHash,
        preview.approval.requestHash,
        preview.policyDecision,
      ]),
    );
    expect(
      gate.approveWrite(
        proposal.token,
        'maintainer',
        sign(null, value, privateKey).toString('base64'),
      ),
    ).toEqual({ status: 'PENDING_COMMIT' });
    fs.writeFileSync(file, 'concurrent update');
    await expect(gate.commitWrite(proposal.token)).rejects.toThrow(/hash mismatch/i);
    expect(fs.readFileSync(file, 'utf8')).toBe('concurrent update');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Claude lifecycle hook produces a bounded hint without echoing prompt input', () => {
  const invoke = prompt =>
    execFileSync(process.execPath, [path.join(root, 'hooks/autopilot-prompt.js')], {
      encoding: 'utf8',
      input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'fixture', prompt }),
    });
  expect(invoke('Discuss authentication')).toBe('');
  const output = invoke('Change src/file.js token=fixture-secret');
  expect(output).toContain('tribunal_autopilot_plan');
  expect(output).not.toContain('fixture-secret');
});

test('MCP advertises the new tools and rejects unsigned execution inputs', async () => {
  const { handleRequest } = require('../../bin/mcp-server');
  const listed = await handleRequest({ method: 'tools/list' });
  expect(listed.tools.map(tool => tool.name)).toEqual(
    expect.arrayContaining([
      'tribunal_autopilot_plan',
      'tribunal_autopilot_execute',
      'tribunal_autopilot_cancel',
    ]),
  );
  const call = (name, args) =>
    handleRequest({ method: 'tools/call', params: { name, arguments: args } });
  const planned = await call('tribunal_autopilot_plan', { task: 'Discuss architecture' });
  expect(planned.content[0].text).toContain('noop');
  const denied = await call('tribunal_autopilot_execute', { planId: randomUUID() });
  expect(denied.content[0].text).toContain('unknown-or-expired-plan');
});

test('CLI executes the real bounded architecture inspector and returns pending write evidence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-autopilot-cli-'));
  const git = (...args) => execFileSync('git', ['-C', directory, ...args], { stdio: 'ignore' });
  try {
    fs.writeFileSync(
      path.join(directory, 'auth.js'),
      'module.exports = function authenticate() {};\n',
    );
    git('init');
    git('add', '--', 'auth.js');
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
    const command = path.join(root, 'src/cli.js');
    const output = execFileSync(
      process.execPath,
      [command, 'autopilot', 'inspect', 'Build JWT authentication', 'auth.js'],
      { cwd: directory, encoding: 'utf8', timeout: 15000 },
    );
    const { result } = JSON.parse(output);
    expect(result).toMatchObject({
      status: 'awaiting-evidence',
      results: expect.arrayContaining([
        {
          agentId: 'cli:understand:impact',
          status: 'SUCCEEDED',
          evidence: [{ file: 'auth.js', tier: expect.any(String), affected: 0 }],
        },
      ]),
      pending: expect.arrayContaining(['write-approval']),
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
