const crypto = require('crypto');

function hashObservation(obs) {
  return crypto.createHash('sha256').update(JSON.stringify(obs)).digest('hex');
}

function observeExecution(skillId, fixture, mockOutputs = {}) {
  const obs = {
    observation_id: `OBS-${Date.now()}`,
    skill_id: skillId,
    execution_id: `EXEC-${Date.now()}`,
    outputs: mockOutputs,
    filesystem_diff: [], // empty for mock
    exit_code: 0,
    timestamp: new Date().toISOString(),
  };

  obs.sha256 = hashObservation(obs);
  return obs;
}

module.exports = {
  observeExecution,
  hashObservation,
};
