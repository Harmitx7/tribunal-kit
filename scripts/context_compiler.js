#!/usr/bin/env node
'use strict';

/**
 * Forwarding shim for canonical .agent/scripts/context_compiler.js
 * Part of Tribunal Kit script harmonization (Task 3.2 [CLN-002]).
 */
const path = require('path');
const targetPath = path.resolve(__dirname, '../.agent/scripts/context_compiler.js');
module.exports = require(targetPath);
