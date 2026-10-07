'use strict';

const fs = require('fs');
const path = require('path');
const {
  ControlledWriteService,
  computeSha256,
} = require('../../src/execution/controlled_write_service');

describe('ControlledWriteService', () => {
  let service;
  let testWorkspace;

  beforeAll(() => {
    testWorkspace = path.join(__dirname, '..', 'fixtures', 'cws-workspace');
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
  });

  beforeEach(() => {
    service = new ControlledWriteService({ workspaceRoot: testWorkspace });

    // Mock reviewExecutor to speed up testing and decouple from LLMs
    service.reviewExecutor = {
      executeReview: async req => {
        // Dummy review results based on content
        if (req.code.includes('SECRET')) {
          return {
            reviewRunId: 'test-run',
            results: [
              {
                reviewerId: 'security-auditor',
                verdict: 'REJECTED',
                findings: [{ severity: 'CRITICAL', title: 'Secret detected' }],
              },
            ],
          };
        }
        return {
          reviewRunId: 'test-run',
          results: [
            {
              reviewerId: 'logic-reviewer',
              verdict: 'APPROVED',
              findings: [],
            },
          ],
        };
      },
    };
  });

  it('rejects missing workspaceId', async () => {
    await expect(service.requestWrite({ files: [], reason: 'test' })).rejects.toThrow(
      'Missing workspaceId',
    );
  });

  it('handles Tier 0 Fast-Path for ALLOW policy (dry run)', async () => {
    const res = await service.requestWrite(
      {
        requestId: 'req-1',
        workspaceId: 'test-ws',
        agentId: 'agent-1',
        files: [{ path: 'test.css', operation: 'CREATE', content: 'body { color: red; }' }],
        reason: 'Update the styles correctly',
      },
      { dryRun: true },
    );

    expect(res.policy).toBe('ALLOW');
    expect(res.verdict).toBe('APPROVED');
  });

  it('requires human approval for critical files', async () => {
    const res = await service.requestWrite({
      requestId: 'req-2',
      workspaceId: 'test-ws',
      agentId: 'agent-1',
      files: [
        { path: 'tribunal-kit/src/execution/index.js', operation: 'MODIFY', content: 'malicious' },
      ],
      reason: 'Hack',
    });

    expect(res.status).toBe('HUMAN_APPROVAL_REQUIRED');
  });

  it('commits successfully for approved transaction', async () => {
    const req = {
      requestId: 'req-3',
      workspaceId: 'test-ws',
      agentId: 'agent-1',
      files: [{ path: 'safe.js', operation: 'CREATE', content: 'console.log("hello");' }],
      reason: 'Add logic',
    };

    // safe.js could trigger REVIEW_REQUIRED depending on decision engine.
    // We mock the review so it will approve.
    const res = await service.requestWrite(req);
    // Since it's a JS file, tier > 0, policy -> REVIEW_REQUIRED. Mock review approves.
    expect(res.verdict).toBe('APPROVED');
    expect(res.status).toBe('PENDING_COMMIT');

    const commitRes = await service.commitWrite(res.token);
    expect(commitRes.status).toBe('COMMITTED');

    const fp = path.join(testWorkspace, 'safe.js');
    expect(fs.existsSync(fp)).toBe(true);
    fs.unlinkSync(fp); // cleanup
  });

  it('enforces TOCTOU hash binding', async () => {
    const req = {
      requestId: 'req-4',
      workspaceId: 'test-ws',
      agentId: 'agent-1',
      files: [{ path: 'safe.js', operation: 'CREATE', content: 'safe' }],
      reason: 'Add safe',
    };

    const res = await service.requestWrite(req);

    // Manually mutate the proposal hash to simulate a change
    const state = service.activeRequests.get(res.token);
    state.proposalHash = 'tampered';

    await expect(service.commitWrite(res.token)).rejects.toThrow('STALE_REVIEW');
  });

  it('rejects bypass due to unknown agent', async () => {
    const res = await service.requestWrite(
      {
        requestId: 'req-5',
        workspaceId: 'test-ws',
        agentId: 'UNKNOWN_AGENT',
        files: [{ path: 'test.css', operation: 'CREATE', content: 'body { color: red; }' }],
        reason: 'Update styles',
      },
      { dryRun: true },
    );

    expect(res.policy).toBe('REVIEW_REQUIRED'); // Unknown agent escalates
  });
});
