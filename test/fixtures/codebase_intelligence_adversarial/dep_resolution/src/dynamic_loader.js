
function load(moduleName) {
  // Computed dynamic require
  const resolvedPath = './plugins/' + moduleName;
  return require(resolvedPath);
}
module.exports = { load };
