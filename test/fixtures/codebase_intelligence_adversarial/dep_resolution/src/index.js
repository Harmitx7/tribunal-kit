
const express = require('express');
const { stepA } = require('./circular_a');
const service = require('./service'); // extensionless import
const dynamicLoader = require('./dynamic_loader');
const ghost = require('uninstalled-ghost-library'); // missing from package.json
const unresolvable = require('./does_not_exist_file.js'); // unresolvable local import

function startApp() {
  stepA();
  service.runService();
  dynamicLoader.load('plugin_v1');
}

module.exports = { startApp };
