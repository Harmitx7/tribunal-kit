'use strict';

/**
 * Tribunal-Kit MCP Module Entry Point
 */

const server = require('../../bin/mcp-server');
const optimizer = require('./response_optimizer');

module.exports = {
  ...server,
  ...optimizer,
};

