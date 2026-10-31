// VERIFY: DB connection pooling invariant must remain untouched
function queryDb(query) { return 'result:' + query; }
module.exports = { queryDb };