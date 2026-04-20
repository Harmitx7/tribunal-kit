const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    findAgentDir,
    validatePayload,
    buildWorkerPrompts,
    validateWorkerRequest,
    validateWorkerResult,
    validateSwarmPayload
} = require('../../.agent/scripts/swarm_dispatcher.js');

describe('swarm_dispatcher.js legacy mode', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swarm-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('findAgentDir finds .agent directory', () => {
        const agentDir = path.join(tmpDir, '.agent');
        fs.mkdirSync(agentDir);
        const subDir = path.join(tmpDir, 'src', 'deep', 'folder');
        fs.mkdirSync(subDir, { recursive: true });

        const result = findAgentDir(subDir);
        expect(result).not.toBeNull();
        expect(path.resolve(result)).toBe(path.resolve(agentDir));
    });

    test('findAgentDir returns null if not found', () => {
        const subDir = path.join(tmpDir, 'src', 'deep');
        fs.mkdirSync(subDir, { recursive: true });

        expect(findAgentDir(subDir)).toBeNull();
    });

    test('validatePayload valid', () => {
        const agentsDir = path.join(tmpDir, 'agents');
        fs.mkdirSync(agentsDir);
        fs.writeFileSync(path.join(agentsDir, 'test_agent.md'), '');

        const workspace = path.join(tmpDir, 'workspace');
        fs.mkdirSync(workspace);
        fs.writeFileSync(path.join(workspace, 'file1.txt'), '');

        const payload = {
            dispatch_micro_workers: [
                {
                    target_agent: "test_agent",
                    files_attached: ["file1.txt"]
                }
            ]
        };

        expect(validatePayload(payload, workspace, agentsDir)).toBe(true);
    });

    test('validatePayload missing workers', () => {
        expect(validatePayload({}, tmpDir, tmpDir)).toBe(false);
    });

    test('validatePayload files not a list', () => {
        const agentsDir = path.join(tmpDir, 'agents');
        fs.mkdirSync(agentsDir);
        fs.writeFileSync(path.join(agentsDir, 'test_agent.md'), '');

        const payload = {
            dispatch_micro_workers: [
                {
                    target_agent: "test_agent",
                    files_attached: "a single file string"
                }
            ]
        };

        expect(validatePayload(payload, tmpDir, agentsDir)).toBe(false);
    });

    test('validateSwarmPayload validates WorkerRequest correctly', () => {
        const agentsDir = path.join(tmpDir, 'agents');
        fs.mkdirSync(agentsDir);
        fs.writeFileSync(path.join(agentsDir, 'research.md'), '');

        const req = {
            task_id: "t123",
            type: "research",
            agent: "research",
            goal: "Find the root cause",
            context: "We have a bug here.",
            max_retries: 2
        };

        const errors = validateWorkerRequest(req, 0, agentsDir);
        expect(errors).toHaveLength(0);

        expect(validateSwarmPayload([req], agentsDir)).toBe(true);
    });
});
