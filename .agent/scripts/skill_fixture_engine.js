const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function createFixture(skillId) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `tribunal-fixture-${skillId}-`));

  return {
    fixture_id: `FIX-${Date.now()}`,
    path: tmpDir,
    created_at: new Date().toISOString(),
    cleanup_policy: 'always',
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {}
    },
  };
}

module.exports = {
  createFixture,
};
