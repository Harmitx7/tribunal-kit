'use strict';

function unreferencedZombieFunction() {
  // Dead code candidate: never called in repo or tests
  return 'zombie';
}

module.exports = {
  unreferencedZombieFunction,
};

