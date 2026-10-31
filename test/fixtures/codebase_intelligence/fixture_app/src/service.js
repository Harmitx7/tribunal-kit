const { queryDb } = require('./db');
function processData(val) { return queryDb(val); }
module.exports = { processData };