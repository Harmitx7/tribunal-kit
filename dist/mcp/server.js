#!/usr/bin/env node
"use strict";

/**
 * Compatibility entry point for the historical dist/mcp/server.js path.
 * bin/mcp-server.js is the single canonical MCP implementation.
 */
module.exports = require("../../bin/mcp-server.js");
