const path = require('path');
const fs = require('fs');
const {
  auditWorkflowContent,
  findWorkflowFiles,
} = require('../../.agent/scripts/cicd_validator.js');

describe('cicd_validator.js', () => {
  it('should be a valid javascript module exporting audit functions', () => {
    const filePath = path.join(__dirname, '../../.agent/scripts/cicd_validator.js');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(typeof auditWorkflowContent).toBe('function');
    expect(typeof findWorkflowFiles).toBe('function');
  });

  it('should detect deprecated actions/checkout@v2 and @v3', () => {
    const yaml = `
name: Test
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v3
    `;
    const issues = auditWorkflowContent('.github/workflows/ci.yml', yaml);
    const codes = issues.map(i => i.code);
    expect(codes).toContain('CI-01');
    expect(issues.filter(i => i.code === 'CI-01').length).toBe(2);
  });

  it('should flag dangerous pull_request_target with head.sha checkout', () => {
    const yaml = `
name: PR
on: pull_request_target
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
    `;
    const issues = auditWorkflowContent('.github/workflows/pr.yml', yaml);
    const pwnIssues = issues.filter(i => i.code === 'CI-02');
    expect(pwnIssues.length).toBeGreaterThan(0);
    expect(pwnIssues[0].level).toBe('FAIL');
  });

  it('should flag permissions: write-all', () => {
    const yaml = `
name: CI
on: push
permissions: write-all
jobs:
  test:
    runs-on: ubuntu-latest
    `;
    const issues = auditWorkflowContent('.github/workflows/ci.yml', yaml);
    const permIssues = issues.filter(i => i.code === 'CI-04');
    expect(permIssues.length).toBe(1);
    expect(permIssues[0].level).toBe('FAIL');
  });

  it('should flag script injection into inline run commands', () => {
    const yaml = `
name: Comment
on: issue_comment
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ github.event.issue.title }}"
    `;
    const issues = auditWorkflowContent('.github/workflows/comment.yml', yaml);
    const injectionIssues = issues.filter(i => i.code === 'CI-10');
    expect(injectionIssues.length).toBe(1);
  });

  it('should pass for a clean, hardened workflow', () => {
    const yaml = `
name: CI
on:
  push:
    branches: [main]
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
    `;
    const issues = auditWorkflowContent('.github/workflows/ci.yml', yaml);
    expect(issues.length).toBe(0);
  });
});
