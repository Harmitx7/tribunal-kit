
const { stepB } = require('./circular_b');
function stepA() {
  return stepB();
}
module.exports = { stepA };
