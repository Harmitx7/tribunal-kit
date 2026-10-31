#!/usr/bin/env node
'use strict';

/**
 * Forwarding shim for canonical .agent/scripts/capability_evolution.js
 * Part of Tribunal Kit script harmonization (Task 3.2 [CLN-002]).
 */
const path = require('path');
const targetPath = path.resolve(__dirname, '../.agent/scripts/capability_evolution.js');
module.exports = require(targetPath);
