'use strict';

/**
 * negative_memory.test.js
 * =======================
 * Unit tests for Negative CBR memory buffer (Phase 2 SkillOpt v2).
 * Verifies rejection recording, loading, fuzzy matching, and negative prompt formatting.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  recordRejection,
  loadRejections,
  formatNegativeConstraints,
  isPreviouslyRejected,
} = require('../../src/evolution/negative_memory');

describe('Negative Memory Engine — Negative CBR & Anti-Oscillation Buffer', () => {
  let tmpAgentDir;

  beforeEach(() => {
    tmpAgentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-neg-mem-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpAgentDir)) {
      fs.rmSync(tmpAgentDir, { recursive: true, force: true });
    }
  });

  test('Records a rejected edit and saves it to history buffer', () => {
    const edits = [
      {
        op: 'replace',
        target: '## Guidelines',
        content: '## Guidelines\n- Always do X unconditionally',
      },
    ];

    const record = recordRejection(
      tmpAgentDir,
      'project-idioms',
      1,
      edits,
      'Validation score decreased to 0.0',
    );

    expect(record.id).toMatch(/^REJ-/);
    expect(record.skillName).toBe('project-idioms');
    expect(record.epoch).toBe(1);
    expect(record.reason).toContain('Validation score decreased');

    // Verify file written to disk
    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    expect(rejections).toHaveLength(1);
    expect(rejections[0].id).toBe(record.id);
  });

  test('Filters rejections by skillName when loaded', () => {
    recordRejection(tmpAgentDir, 'project-idioms', 1, [], 'Reason A');
    recordRejection(tmpAgentDir, 'lint-and-validate', 1, [], 'Reason B');

    const idiomsRejections = loadRejections(tmpAgentDir, 'project-idioms');
    const lintRejections = loadRejections(tmpAgentDir, 'lint-and-validate');
    const allRejections = loadRejections(tmpAgentDir);

    expect(idiomsRejections).toHaveLength(1);
    expect(lintRejections).toHaveLength(1);
    expect(allRejections).toHaveLength(2);
  });

  test('Formats negative constraints cleanly for reflection prompt', () => {
    recordRejection(
      tmpAgentDir,
      'project-idioms',
      1,
      [
        {
          op: 'replace',
          target: 'Old section',
          content: 'Bad replacement content that failed tests',
        },
      ],
      'Test harness failed with exit code 1',
    );

    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    const promptConstraint = formatNegativeConstraints(rejections);

    expect(promptConstraint).toContain('Previously Rejected Edits (Negative Constraints)');
    expect(promptConstraint).toContain('[OP: replace]');
    expect(promptConstraint).toContain('Test harness failed with exit code 1');
  });

  test('Fuzzy matching detects identical or near-identical previously rejected edits', () => {
    const rejectedEdits = [
      {
        op: 'append',
        content: 'Never use console.log in production code ever.',
      },
    ];
    recordRejection(tmpAgentDir, 'project-idioms', 1, rejectedEdits, 'Failed validation');
    const rejections = loadRejections(tmpAgentDir, 'project-idioms');

    // Exact match
    const candidateExact = {
      op: 'append',
      content: 'Never use console.log in production code ever.',
    };
    const exactCheck = isPreviouslyRejected(candidateExact, rejections);
    expect(exactCheck.rejected).toBe(true);

    // Near identical match
    const candidateSimilar = {
      op: 'append',
      content: 'Never use console.log in production code ever', // missing period
    };
    const similarCheck = isPreviouslyRejected(candidateSimilar, rejections);
    expect(similarCheck.rejected).toBe(true);

    // Completely different edit
    const candidateDifferent = {
      op: 'append',
      content: 'Always format code with Prettier before committing changes.',
    };
    const diffCheck = isPreviouslyRejected(candidateDifferent, rejections);
    expect(diffCheck.rejected).toBe(false);
  });
});
