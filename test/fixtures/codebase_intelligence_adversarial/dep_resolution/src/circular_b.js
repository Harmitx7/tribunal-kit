
const { stepC } = require('./circular_c');
function stepB() {
  return stepC();
}
module.exports = { stepB };
