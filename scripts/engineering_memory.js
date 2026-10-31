#!/usr/bin/env node
'use strict';

/**
 * Forwarding shim for canonical .agent/scripts/engineering_memory.js
 * Part of Tribunal Kit script harmonization (Task 3.2 [CLN-002]).
 */
const path = require('path');
const targetPath = path.resolve(__dirname, '../.agent/scripts/engineering_memory.js');
module.exports = require(targetPath);
