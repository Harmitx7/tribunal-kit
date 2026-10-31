#!/usr/bin/env node
'use strict';

/**
 * Forwarding shim for canonical .agent/scripts/verification_auditor.js
 * Part of Tribunal Kit script harmonization (Task 3.2 [CLN-002]).
 */
const path = require('path');
const targetPath = path.resolve(__dirname, '../.agent/scripts/verification_auditor.js');
module.exports = require(targetPath);
