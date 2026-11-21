'use strict';

/**
 * human_approval_gate_security.test.js — Security Invariants & Audit for Controlled Mutations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ControlledWriteService, ReviewExecutor, ProviderAdapter } = require('../../src/execution');

describe('Stage 2.1: Human Approval Gate & Mutation Security Audit', () => {
  let tmpDir;
  let writeService;
  const realRepoRoot = path.resolve(__dirname, '../../');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-sec-gate-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agent', 'rules'), { recursive: true });

    // Seed fixture files
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'config.json'),
      '{"env":"prod","debug":false}',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tmpDir, '.agent', 'rules', 'policy.md'),
      '# Governance Policy',
      'utf8',
    );

    // Review executor configured with deterministic approved verdict so review passes and lands in HUMAN_APPROVAL_REQUIRED
    const mockProvider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 0.98,
        findings: [],
      }),
    });

    const reviewExecutor = new ReviewExecutor({
      provider: mockProvider,
      repoRoot: realRepoRoot,
    });

    writeService = new ControlledWriteService({
      workspaceRoot: tmpDir,
      reviewExecutor,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  test('unapproved proposals do not mutate files on disk', async () => {
    const req = {
      requestId: 'req_unapproved',
      workspaceId: tmpDir,
      reason: 'Change production configuration',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/config.json',
          operation: 'MODIFY',
          content: '{"env":"hacked","debug":true}',
        },
      ],
    };

    const res = await writeService.requestWrite(req);
    expect(res.status).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(res.token).toBeDefined();

    // Invariant: file on disk MUST NOT have changed!
    const diskContent = fs.readFileSync(path.join(tmpDir, 'src', 'config.json'), 'utf8');
    expect(diskContent).toBe('{"env":"prod","debug":false}');
  });

  test('rejects unauthorized approvers: AI agents and automated callers cannot self-authorize', async () => {
    const req = {
      requestId: 'req_self_auth',
      workspaceId: tmpDir,
      reason: 'Modify protected config',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/config.json',
          operation: 'MODIFY',
          content: '{"env":"prod","debug":true}',
        },
      ],
    };

    const res = await writeService.requestWrite(req);
    const token = res.token;

    // AI agents and bots must be blocked
    expect(() => writeService.approveWrite(token, 'ai', 'sig123')).toThrow(/cannot self-approve/);
    expect(() => writeService.approveWrite(token, 'agent', 'sig123')).toThrow(
      /cannot self-approve/,
    );
    expect(() => writeService.approveWrite(token, 'mcp_client', 'sig123')).toThrow(
      /cannot self-approve/,
    );
    expect(() => writeService.approveWrite(token, 'bot', 'sig123')).toThrow(/cannot self-approve/);
    expect(() => writeService.approveWrite(token, 'agent-specialist', 'sig123')).toThrow(
      /cannot self-approve/,
    );

    // Missing signature must be blocked
    expect(() => writeService.approveWrite(token, 'alice_admin', '')).toThrow(
      /requires a valid, non-empty confirmation signature/,
    );
  });

  test('rejects invalid, unknown, or expired tokens', async () => {
    expect(() => writeService.previewWrite('tok_nonexistent')).toThrow(/Invalid or expired token/);
    expect(() => writeService.approveWrite('tok_nonexistent', 'alice', 'sig')).toThrow(
      /Invalid or expired token/,
    );
    await expect(writeService.commitWrite('tok_nonexistent')).rejects.toThrow(
      /Invalid or expired token/,
    );
  });

  test('replayed approval tokens cannot execute the same transaction twice', async () => {
    const req = {
      requestId: 'req_replay',
      workspaceId: tmpDir,
      reason: 'Add new module',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/new_module.js',
          operation: 'CREATE',
          content: 'module.exports = { ok: true };',
        },
      ],
    };

    const res = await writeService.requestWrite(req);
    const token = res.token;

    // Approve properly by human
    writeService.approveWrite(token, 'authorized_admin', 'sig_valid_123');

    // First commit succeeds
    const commitRes = await writeService.commitWrite(token);
    expect(commitRes.status).toBe('COMMITTED');
    expect(fs.existsSync(path.join(tmpDir, 'src', 'new_module.js'))).toBe(true);

    // Replay attempt with same token MUST throw Invalid or expired token
    await expect(writeService.commitWrite(token)).rejects.toThrow(/Invalid or expired token/);
  });

  test('failure during multi-file execution triggers full rollback leaving zero partial mutations', async () => {
    // Target 1: existing config.json
    // Target 2: invalid file that will fail (CREATE on already existing file triggers conflict)
    fs.writeFileSync(path.join(tmpDir, 'src', 'conflict.js'), 'original conflict file', 'utf8');

    const req = {
      requestId: 'req_atomic',
      workspaceId: tmpDir,
      reason: 'Batch atomic update',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/config.json',
          operation: 'MODIFY',
          content: '{"env":"staging"}',
        },
        {
          path: 'src/conflict.js',
          operation: 'CREATE', // FAILS because file already exists!
          content: 'new content',
        },
      ],
    };

    const res = await writeService.requestWrite(req);
    const token = res.token;

    writeService.approveWrite(token, 'admin_user', 'sig_admin');

    // Commit should fail atomic validation
    await expect(writeService.commitWrite(token)).rejects.toThrow(/CONFLICT: File already exists/);

    // Assert that src/config.json was NOT mutated or was rolled back!
    const configOnDisk = fs.readFileSync(path.join(tmpDir, 'src', 'config.json'), 'utf8');
    expect(configOnDisk).toBe('{"env":"prod","debug":false}');

    const conflictOnDisk = fs.readFileSync(path.join(tmpDir, 'src', 'conflict.js'), 'utf8');
    expect(conflictOnDisk).toBe('original conflict file');
  });

  test('rejects path traversal attacks attempting to escape workspace boundary', async () => {
    const maliciousReq = {
      requestId: 'req_escape',
      workspaceId: tmpDir,
      reason: 'Malicious path traversal',
      files: [
        {
          path: '../../outside_file.txt',
          operation: 'CREATE',
          content: 'pwned',
        },
      ],
    };

    await expect(writeService.requestWrite(maliciousReq)).rejects.toThrow(
      /Security Violation|Path security violation/,
    );
  });

  test('rejects expired tokens after token TTL has elapsed', async () => {
    // Configure write service with tiny 20ms TTL
    const fastExpireService = new ControlledWriteService({
      workspaceRoot: tmpDir,
      reviewExecutor: writeService.reviewExecutor,
      tokenTtlMs: 20,
    });

    const req = {
      requestId: 'req_expire',
      workspaceId: tmpDir,
      reason: 'Expiring token',
      requiresHumanApproval: true,
      files: [{ path: 'src/config.json', operation: 'MODIFY', content: '{"env":"test"}' }],
    };

    const res = await fastExpireService.requestWrite(req);
    const token = res.token;

    // Wait 35ms to ensure token has expired
    await new Promise(r => setTimeout(r, 35));

    expect(() => fastExpireService.previewWrite(token)).toThrow(/Invalid or expired token/);
    expect(() => fastExpireService.approveWrite(token, 'admin', 'sig')).toThrow(
      /Invalid or expired token/,
    );
    await expect(fastExpireService.commitWrite(token)).rejects.toThrow(/Invalid or expired token/);
  });

  test('rejects approval and commit when session mismatch occurs', async () => {
    const req = {
      requestId: 'req_session_guard',
      workspaceId: tmpDir,
      sessionId: 'sess_alpha',
      reason: 'Session-bound modification',
      requiresHumanApproval: true,
      files: [{ path: 'src/config.json', operation: 'MODIFY', content: '{"env":"alpha"}' }],
    };

    const res = await writeService.requestWrite(req);
    const token = res.token;

    // Attempt approval with wrong session
    expect(() =>
      writeService.approveWrite(token, 'lead_admin', 'sig123', { sessionId: 'sess_bravo' }),
    ).toThrow(/Session mismatch/);

    // Legitimate approval with correct session
    writeService.approveWrite(token, 'lead_admin', 'sig123', { sessionId: 'sess_alpha' });

    // Attempt commit with wrong session
    await expect(writeService.commitWrite(token, { sessionId: 'sess_bravo' })).rejects.toThrow(
      /Session mismatch/,
    );
  });

  test('rejects Windows drive-letter and reserved device path traversal attempts', async () => {
    const driveReq = {
      requestId: 'req_drive',
      workspaceId: tmpDir,
      reason: 'Windows drive escape',
      files: [
        {
          path: 'C:/Windows/System32/drivers/etc/hosts',
          operation: 'CREATE',
          content: '127.0.0.1 bad',
        },
      ],
    };
    await expect(writeService.requestWrite(driveReq)).rejects.toThrow(/Path security violation/);

    const deviceReq = {
      requestId: 'req_device',
      workspaceId: tmpDir,
      reason: 'Windows device file traversal',
      files: [{ path: 'src/CON.txt', operation: 'CREATE', content: 'device data' }],
    };
    await expect(writeService.requestWrite(deviceReq)).rejects.toThrow(/Path security violation/);
  });

  test('restores pre-transaction state if failure occurs during multi-file commit execution', async () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'first_file.js'), 'ORIGINAL_FIRST_CONTENT', 'utf8');

    const req = {
      requestId: 'req_commit_failure',
      workspaceId: tmpDir,
      reason: 'Multi-file commit that fails midway',
      requiresHumanApproval: true,
      files: [
        {
          path: 'src/first_file.js',
          operation: 'MODIFY',
          content: 'MUTATED_FIRST_CONTENT',
        },
      ],
    };

    const res = await writeService.requestWrite(req);
    const token = res.token;
    writeService.approveWrite(token, 'admin_user', 'sig_valid');

    // Simulate commit failure by sabotaging txManager.commit to throw midway
    const originalCommit = writeService.txManager.commit.bind(writeService.txManager);
    writeService.txManager.commit = () => {
      // Modify first file on disk directly to simulate midway failure during file writing loop
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'first_file.js'),
        'PARTIALLY_WRITTEN_CONTENT',
        'utf8',
      );
      throw new Error('SIMULATED_DISK_IO_FAILURE_DURING_COMMIT');
    };

    await expect(writeService.commitWrite(token)).rejects.toThrow(
      /SIMULATED_DISK_IO_FAILURE_DURING_COMMIT/,
    );

    // Invariant: Rollback must have restored ORIGINAL_FIRST_CONTENT!
    const restoredContent = fs.readFileSync(path.join(tmpDir, 'src', 'first_file.js'), 'utf8');
    expect(restoredContent).toBe('ORIGINAL_FIRST_CONTENT');
  });
});
