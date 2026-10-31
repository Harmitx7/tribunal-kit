
const { barrelExportA } = require('./barrel');

function activeFeature() {
  return barrelExportA();
}

function testOnlyHelper() {
  // Function referenced only in tests
  return 'test_only';
}

function chestertonsFence() {
  // VERIFY: Chesterton's fence - critical legacy invariant, do not prune
  return 'guarded';
}

function dynamicTarget() {
  return 'called_via_reflection';
}

const registry = {
  dynamicTarget
};

function dispatchDynamic(name) {
  return Reflect.apply(registry[name], null, []);
}

module.exports = {
  activeFeature,
  testOnlyHelper,
  chestertonsFence,
  dispatchDynamic
};
