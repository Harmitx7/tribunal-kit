/**
 * Shared ANSI color constants for Tribunal Kit scripts.
 * Import this module instead of duplicating color codes.
 */

'use strict';

const GREEN   = '\x1b[92m';
const YELLOW  = '\x1b[93m';
const CYAN    = '\x1b[96m';
const RED     = '\x1b[91m';
const BLUE    = '\x1b[94m';
const MAGENTA = '\x1b[95m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const RESET   = '\x1b[0m';

module.exports = { GREEN, YELLOW, CYAN, RED, BLUE, MAGENTA, BOLD, DIM, RESET };
