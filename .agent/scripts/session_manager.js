#!/usr/bin/env node
/**
 * session_manager.js — Agent session state tracking for multi-conversation work.
 *
 * Usage:
 *   node .agent/scripts/session_manager.js save "working on auth"
 *   node .agent/scripts/session_manager.js load
 *   node .agent/scripts/session_manager.js show
 *   node .agent/scripts/session_manager.js clear
 *   node .agent/scripts/session_manager.js status
 *   node .agent/scripts/session_manager.js tag <label>
 *   node .agent/scripts/session_manager.js list [--all]
 *   node .agent/scripts/session_manager.js export [--stdout]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATE_FILE = ".agent_session.json";

const GREEN  = "\x1b[92m";
const YELLOW = "\x1b[93m";
const BLUE   = "\x1b[94m";
const CYAN   = "\x1b[96m";
const RED    = "\x1b[91m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

const VALID_COMMANDS = new Set(["save", "load", "show", "clear", "status", "tag", "list", "export"]);
const LIST_PAGE_SIZE = 10;

function loadState() {
    if (!fs.existsSync(STATE_FILE)) return {};
    try {
        const content = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function cmdSave(note) {
    const state = loadState();
    const entry = {
        timestamp: new Date().toISOString(),
        note: note,
        session: (state.history || []).length + 1,
        tags: []
    };
    if (!state.history) state.history = [];
    state.history.push(entry);
    state.current = entry;
    saveState(state);
    
    console.log(`${GREEN}✅ Session saved:${RESET} ${note}`);
    console.log(`   Time:    ${entry.timestamp}`);
    console.log(`   Session: #${entry.session}`);
}

function cmdLoad() {
    const state = loadState();
    const current = state.current;
    if (!current) {
        console.log(`${YELLOW}No active session — use 'save' first.${RESET}`);
        return;
    }
    const tagsStr = (current.tags || []).join(", ") || "none";
    console.log(`${BOLD}Current session:${RESET}`);
    console.log(`  Session: #${current.session}`);
    console.log(`  Time:    ${current.timestamp}`);
    console.log(`  Note:    ${current.note}`);
    console.log(`  Tags:    ${tagsStr}`);
}

function cmdShow() {
    const state = loadState();
    const history = state.history || [];
    if (!history.length) {
        console.log(`${YELLOW}No session history.${RESET}`);
        return;
    }
    console.log(`${BOLD}Session History (${history.length} total):${RESET}`);
    const recent = history.slice(-10).reverse();
    for (const entry of recent) {
        const tagsStr = (entry.tags || []).join(", ") || "";
        const tagsDisplay = tagsStr ? `  [${tagsStr}]` : "";
        console.log(`\n  ${BLUE}#${entry.session}${RESET} — ${entry.timestamp.slice(0, 16)}${tagsDisplay}`);
        console.log(`  ${entry.note}`);
    }
}

function cmdClear() {
    if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
        console.log(`${GREEN}✅ Session state cleared.${RESET}`);
    } else {
        console.log(`${YELLOW}No session file found — nothing to clear.${RESET}`);
    }
}

function cmdStatus() {
    const state = loadState();
    const history = state.history || [];
    const current = state.current;

    if (!history.length) {
        console.log(`${YELLOW}No session history — use 'save' to start tracking.${RESET}`);
        return;
    }

    const total = history.length;
    const recent = history.slice(-3).reverse();

    console.log(`\n${BOLD}${CYAN}━━━ Session Status ━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.log(`  Total sessions: ${total}`);
    if (current) {
        console.log(`  Active:         #${current.session} — ${current.note.slice(0, 60)}`);
    }
    console.log(`\n${BOLD}  Last 3 sessions:${RESET}`);
    for (const entry of recent) {
        const tagsStr = (entry.tags || []).join(", ") || "";
        const tagsDisplay = tagsStr ? `  [${tagsStr}]` : "";
        const ts = entry.timestamp.slice(0, 16);
        console.log(`    ${BLUE}#${entry.session}${RESET} ${ts}${tagsDisplay}`);
        console.log(`    ${entry.note.slice(0, 70)}`);
    }
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdTag(label) {
    if (!label) {
        console.log(`${RED}Error: provide a tag label. Example: node session_manager.js tag v2-feature${RESET}`);
        process.exit(1);
    }
    const state = loadState();
    const current = state.current;
    if (!current) {
        console.log(`${YELLOW}No active session — use 'save' first before tagging.${RESET}`);
        process.exit(1);
    }
    if (!current.tags) current.tags = [];
    if (current.tags.includes(label)) {
        console.log(`${YELLOW}Tag '${label}' already exists on session #${current.session}.${RESET}`);
        return;
    }
    
    current.tags.push(label);
    state.current = current;
    
    if (state.history) {
        for (const entry of state.history) {
            if (entry.session === current.session) {
                if (!entry.tags) entry.tags = [];
                if (!entry.tags.includes(label)) {
                    entry.tags.push(label);
                }
                break;
            }
        }
    }
    
    saveState(state);
    console.log(`${GREEN}✅ Tagged session #${current.session} with '${label}'.${RESET}`);
}

function cmdList(showAll) {
    const state = loadState();
    const history = state.history || [];
    if (!history.length) {
        console.log(`${YELLOW}No session history.${RESET}`);
        return;
    }
    
    const total = history.length;
    const pageSize = showAll ? total : LIST_PAGE_SIZE;
    const recent = history.slice().reverse().slice(0, pageSize);
    
    console.log(`\n${BOLD}${CYAN}━━━ Session List (${total} total, showing ${recent.length}) ━━━━━━━${RESET}`);
    
    for (const entry of recent) {
        const tagsStr = (entry.tags || []).join(", ");
        const tagsDisplay = tagsStr ? `  [${YELLOW}${tagsStr}${RESET}]` : "";
        const ts = entry.timestamp.slice(0, 16);
        console.log(`\n  ${BOLD}${BLUE}#${entry.session}${RESET} — ${ts}${tagsDisplay}`);
        console.log(`  ${entry.note}`);
    }
    
    if (!showAll && total > pageSize) {
        const remaining = total - pageSize;
        console.log(`\n  ${YELLOW}... ${remaining} older session(s) not shown. Use '--all' to see all.${RESET}`);
    }
    console.log(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

function cmdExport(toStdout) {
    const state = loadState();
    const history = state.history || [];
    if (!history.length) {
        console.log(`${YELLOW}No session history to export.${RESET}`);
        return;
    }
    
    const lines = ["# Session Export\n"];
    lines.push(`Generated: ${new Date().toISOString().slice(0, 16)}\n`);
    lines.push(`Total sessions: ${history.length}\n\n---\n`);
    
    const reversed = history.slice().reverse();
    for (const entry of reversed) {
        const sessionNum = entry.session || "?";
        const ts = (entry.timestamp || "").slice(0, 16);
        const note = entry.note || "";
        const tags = entry.tags || [];
        const tagsStr = tags.length ? `\n**Tags:** ${tags.join(", ")}` : "";
        
        lines.push(`## Session #${sessionNum} — ${ts}\n`);
        lines.push(`${note}${tagsStr}\n\n---\n`);
    }
    
    const content = lines.join("\n");
    if (toStdout) {
        console.log(content);
    } else {
        const exportPath = path.resolve("session_export.md");
        fs.writeFileSync(exportPath, content, "utf8");
        console.log(`${GREEN}✅ Exported ${history.length} sessions to${RESET} ${exportPath}`);
    }
}

function main() {
    const args = process.argv.slice(2);
    if (!args.length) {
        console.log(`Usage: node session_manager.js [save <note>|load|show|clear|status|tag <label>|list [--all]|export [--stdout]]`);
        process.exit(1);
    }

    const cmd = args[0].toLowerCase();
    
    if (!VALID_COMMANDS.has(cmd)) {
        console.log(`${RED}Unknown command: '${cmd}'${RESET}`);
        console.log(`Valid commands: ${[...VALID_COMMANDS].sort().join(', ')}`);
        process.exit(1);
    }

    if (cmd === "save") {
        let note = args.slice(1).join(" ").trim();
        if (!note) note = `session ${new Date().toISOString().slice(0,16).replace('T', ' ')}`;
        cmdSave(note);
    } else if (cmd === "load") {
        cmdLoad();
    } else if (cmd === "show") {
        cmdShow();
    } else if (cmd === "clear") {
        cmdClear();
    } else if (cmd === "status") {
        cmdStatus();
    } else if (cmd === "tag") {
        const label = args.slice(1).join(" ").trim();
        cmdTag(label);
    } else if (cmd === "list") {
        const showAll = args.includes("--all");
        cmdList(showAll);
    } else if (cmd === "export") {
        const toStdout = args.includes("--stdout");
        cmdExport(toStdout);
    }
}

if (require.main === module) {
    main();
}
