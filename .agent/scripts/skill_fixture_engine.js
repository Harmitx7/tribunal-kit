const fs = require('fs');
const path = require('path');
const os = require('os');
const _crypto = require('crypto');
const { assertWithinRoot } = require('./_utils');

let validateResourceId;
try {
  ({ validateResourceId } = require('../../src/security/boundary'));
} catch {
  validateResourceId = id => {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(
        `Invalid resource identifier: "${id}". Only alphanumeric characters, dashes, and underscores are permitted.`,
      );
    }
    return id;
  };
}

function createFixture(skillId) {
  validateResourceId(skillId);
  const tmpBase = os.tmpdir();
  const tmpDir = fs.mkdtempSync(path.join(tmpBase, `tribunal-fixture-${skillId}-`));
  assertWithinRoot(tmpBase, tmpDir);

  return {
    fixture_id: `FIX-${Date.now()}`,
    path: tmpDir,
    created_at: new Date().toISOString(),
    cleanup_policy: 'always',
    cleanup: () => {
      try {
        assertWithinRoot(tmpBase, tmpDir);
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_e) {}
    },
  };
}

module.exports = {
  createFixture,
};
