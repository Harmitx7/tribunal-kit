"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.C = void 0;
exports.colorize = colorize;
exports.c = c;
exports.bold = bold;
exports.setLogLevels = setLogLevels;
exports.log = log;
exports.ok = ok;
exports.warn = warn;
exports.err = err;
exports.dim = dim;
exports.dbg = dbg;
// src/utils/logger.ts
exports.C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    blue: '\x1b[94m',
    magenta: '\x1b[95m',
    cyan: '\x1b[96m',
    white: '\x1b[97m',
    gray: '\x1b[90m',
    bgCyan: '\x1b[46m',
};
function colorize(color, text) {
    return `${exports.C[color]}${text}${exports.C.reset}`;
}
function c(color, text) {
    return `${exports.C[color]}${text}${exports.C.reset}`;
}
function bold(text) {
    return `${exports.C.bold}${text}${exports.C.reset}`;
}
let quiet = false;
let verbose = false;
function setLogLevels(q, v) {
    quiet = q;
    verbose = v;
}
function log(msg) { if (!quiet)
    console.log(msg); }
function ok(msg) { if (!quiet)
    console.log(`  ${c('green', '✔')} ${msg}`); }
function warn(msg) { if (!quiet)
    console.log(`  ${c('yellow', '⚠')}  ${msg}`); }
function err(msg) { console.error(`  ${c('red', '✖')} ${msg}`); }
function dim(msg) { if (!quiet)
    console.log(`  ${c('gray', msg)}`); }
function dbg(msg) { if (verbose)
    console.log(`  ${c('gray', '⊡')} ${c('gray', msg)}`); }
