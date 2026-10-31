const { processData } = require('./service');
const { formatOutput } = require('./utils/helper');
function main() { return formatOutput(processData('test')); }
module.exports = { main };