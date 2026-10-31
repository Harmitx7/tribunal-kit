async function loadPlugin(pluginName) {
  return await import(pluginName);
}
module.exports = { loadPlugin };