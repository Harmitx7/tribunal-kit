/**
 * _colors.js — Tribunal Kit ANSI Color System
 * ════════════════════════════════════════════════════════════════
 * Single source of truth for all terminal color constants.
 * Import this module instead of duplicating color codes.
 *
 * Usage:
 *   const { RED, GREEN, BOLD, RESET } = require('./_colors');
 *   const C = require('./_colors');   // C.RED, C.banner('Title'), etc.
 */

'use strict';

// ── Core ANSI Escape Codes ──────────────────────────────────────────────────
const GREEN   = '\x1b[92m';
const YELLOW  = '\x1b[93m';
const CYAN    = '\x1b[96m';
const RED     = '\x1b[91m';
const BLUE    = '\x1b[94m';
const MAGENTA = '\x1b[95m';
const WHITE   = '\x1b[97m';
const GRAY    = '\x1b[90m';
const BOLD    = '\x1b[1m';
const DIM     = '\x1b[2m';
const ITALIC  = '\x1b[3m';
const UNDERLINE = '\x1b[4m';
const RESET   = '\x1b[0m';

// ── Box Drawing Characters ──────────────────────────────────────────────────
const BOX = {
    TL: '╔', TR: '╗', BL: '╚', BR: '╝',
    H:  '═', V:  '║',
    tl: '┌', tr: '┐', bl: '└', br: '┘',
    h:  '─', v:  '│',
    cross: '┼', teeL: '├', teeR: '┤', teeT: '┬', teeB: '┴',
    bullet: '●', bulletEmpty: '○',
    arrow: '→', arrowLeft: '←',
    check: '✔', cross_mark: '✖',
};

// ── Branded Output Helpers ──────────────────────────────────────────────────

/**
 * Generate a branded Tribunal banner box.
 * @param {string} title - Script title (e.g., "verify_all.js")
 * @param {object} [meta] - Optional metadata lines { key: value }
 * @returns {string} Formatted banner string
 */
function banner(title, meta = {}) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const lines = [
        `  ${BOLD}${CYAN}⚖️  TRIBUNAL KIT${RESET} ${DIM}— ${title}${RESET}`,
    ];

    const metaEntries = Object.entries(meta);
    if (metaEntries.length > 0) {
        for (const [key, value] of metaEntries) {
            lines.push(`  ${DIM}${key}:${RESET} ${value}`);
        }
    }
    lines.push(`  ${DIM}${timestamp}${RESET}`);

    const divider = `${CYAN}${'━'.repeat(56)}${RESET}`;
    return `\n${divider}\n${lines.join('\n')}\n${divider}`;
}

/**
 * Generate a section header with optional timing.
 * @param {string} title - Section title
 * @param {number} [index] - Step number (1-based)
 * @param {number} [ms] - Execution time in ms
 * @returns {string}
 */
function sectionHeader(title, index, ms) {
    const num = index != null ? `${index} — ` : '';
    const timing = ms != null ? `${DIM} (${formatMs(ms)})${RESET}` : '';
    return `\n${BOLD}${BLUE}━━━ ${num}${title} ━━━${RESET}${timing}`;
}

/**
 * Format milliseconds into a human-readable string.
 * @param {number} ms
 * @returns {string}
 */
function formatMs(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── Status Indicator Helpers ────────────────────────────────────────────────

/** @param {string} msg */
function ok(msg) { console.log(`  ${GREEN}✅ ${msg}${RESET}`); }

/** @param {string} msg */
function fail(msg) { console.log(`  ${RED}❌ ${msg}${RESET}`); }

/** @param {string} msg */
function warn(msg) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`); }

/** @param {string} msg */
function skip(msg) { console.log(`  ${YELLOW}⏭️  ${msg}${RESET}`); }

/** @param {string} msg */
function info(msg) { console.log(`  ${BLUE}ℹ️  ${msg}${RESET}`); }

// ── Summary Table Builder ───────────────────────────────────────────────────

/**
 * Build and print a box-drawing summary table.
 * @param {Array<{name: string, status: 'pass'|'fail'|'skip'|'warn', ms?: number}>} rows
 */
function summaryTable(rows) {
    const maxName = Math.max(...rows.map(r => r.name.length), 18);
    const colW = maxName + 2;

    const statusIcon = (s) => {
        if (s === 'pass') return `${GREEN} ✅ ${RESET}`;
        if (s === 'fail') return `${RED} ❌ ${RESET}`;
        if (s === 'skip') return `${YELLOW} ⏭️  ${RESET}`;
        if (s === 'warn') return `${YELLOW} ⚠️  ${RESET}`;
        return `${DIM} — ${RESET}`;
    };

    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));
    const top  = `  ${BOX.tl}${BOX.h.repeat(colW)}${BOX.teeT}${BOX.h.repeat(6)}${BOX.teeT}${BOX.h.repeat(10)}${BOX.tr}`;
    const mid  = `  ${BOX.teeL}${BOX.h.repeat(colW)}${BOX.cross}${BOX.h.repeat(6)}${BOX.cross}${BOX.h.repeat(10)}${BOX.teeR}`;
    const bot  = `  ${BOX.bl}${BOX.h.repeat(colW)}${BOX.teeB}${BOX.h.repeat(6)}${BOX.teeB}${BOX.h.repeat(10)}${BOX.br}`;
    const hdr  = `  ${BOX.v} ${BOLD}${pad('Check', colW - 2)}${RESET} ${BOX.v}${BOLD} Res ${RESET}${BOX.v} ${BOLD}${pad('Time', 8)}${RESET}${BOX.v}`;

    console.log(top);
    console.log(hdr);
    console.log(mid);

    for (const row of rows) {
        const time = row.ms != null ? formatMs(row.ms) : '—';
        const line = `  ${BOX.v} ${pad(row.name, colW - 2)} ${BOX.v}${statusIcon(row.status)}${BOX.v} ${pad(time, 8)}${BOX.v}`;
        console.log(line);
    }

    console.log(bot);
}

// ── High-Precision Timer ────────────────────────────────────────────────────

/**
 * Create a timer. Call returned function to get elapsed ms.
 * @returns {function(): number}
 */
function timer() {
    const start = process.hrtime.bigint();
    return () => Number(process.hrtime.bigint() - start) / 1e6;
}

module.exports = {
    // Core colors
    GREEN, YELLOW, CYAN, RED, BLUE, MAGENTA, WHITE, GRAY,
    BOLD, DIM, ITALIC, UNDERLINE, RESET,
    // Box drawing
    BOX,
    // Branded helpers
    banner, sectionHeader, formatMs,
    // Status indicators
    ok, fail, warn, skip, info,
    // Summary
    summaryTable,
    // Timing
    timer,
};
