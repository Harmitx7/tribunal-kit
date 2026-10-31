
const { stepA } = require('./circular_a');
function stepC() {
  return stepA();
}
module.exports = { stepC };
