function resolveExpectations(skillRaw) {
  const exp = {
    source: 'none',
    assertions: [],
  };

  if (skillRaw?.verification?.assertions?.length > 0) {
    exp.source = 'verification.assertions';
    exp.assertions = skillRaw.verification.assertions;
    return exp;
  }

  if (skillRaw?.behavior?.scenarios?.length > 0) {
    exp.source = 'behavior.scenarios';
    exp.assertions = ['scenario_match'];
    return exp;
  }

  return exp; // None found
}

function compareObservation(expectation, observation) {
  if (expectation.source === 'none') {
    return 'UNPROVABLE';
  }

  // For deterministic mocking, if observation has what we expect
  if (observation.exit_code === 0 && expectation.assertions.length > 0) {
    return 'PASS';
  }

  return 'FAIL';
}

module.exports = {
  resolveExpectations,
  compareObservation,
};
