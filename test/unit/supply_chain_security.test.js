'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('TK-012: Supply Chain Security & CI Policy Enforcement', () => {
  const scriptsDir = path.resolve(__dirname, '../../scripts');
  const { checkWorkflows, checkMcpConfig, runAudit } = require(
    path.join(scriptsDir, 'ci_supply_chain_check'),
  );
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-supply-chain-test-'));

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('checkWorkflows detects unpinned action versions like @v4 or @stable', () => {
    const wfDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });

    const badWf = path.join(wfDir, 'bad.yml');
    fs.writeFileSync(
      badWf,
      `name: Test
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
`,
      'utf8',
    );

    const violations = checkWorkflows(wfDir);
    expect(violations.length).toBe(2);
    expect(violations[0].ref).toBe('actions/checkout@v4');
    expect(violations[1].ref).toBe('dtolnay/rust-toolchain@stable');
  });

  test('checkWorkflows accepts valid 40-character commit SHAs', () => {
    const wfDir = path.join(tempDir, 'valid_workflows');
    fs.mkdirSync(wfDir, { recursive: true });

    const goodWf = path.join(wfDir, 'good.yml');
    fs.writeFileSync(
      goodWf,
      `name: Test
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
`,
      'utf8',
    );

    const violations = checkWorkflows(wfDir);
    expect(violations.length).toBe(0);
  });

  test('checkMcpConfig detects mutable @latest tag and unpinned npx package', () => {
    const badConfigPath = path.join(tempDir, 'bad_mcp_config.json');
    fs.writeFileSync(
      badConfigPath,
      JSON.stringify(
        {
          mcpServers: {
            unpinned: { command: 'npx', args: ['unpinned-pkg', 'serve'] },
            latest: { command: 'npx', args: ['pkg@latest'] },
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    const violations = checkMcpConfig(badConfigPath);
    expect(violations.length).toBe(2);
    expect(violations.some(v => v.issue.includes('@latest'))).toBe(true);
    expect(violations.some(v => v.issue.includes('Unpinned package reference'))).toBe(true);
  });

  test('runAudit passes for active repository configurations', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const result = runAudit(repoRoot);
    expect(result.valid).toBe(true);
    expect(result.allViolations).toEqual([]);
  });
});
