#!/usr/bin/env node
/**
 * auto_preview.js — Start, stop, or check a local development server.
 *
 * Usage:
 *   node .agent/scripts/auto_preview.js start
 *   node .agent/scripts/auto_preview.js stop
 *   node .agent/scripts/auto_preview.js status
 *   node .agent/scripts/auto_preview.js restart
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const net = require('net');

const PID_FILE = ".preview.pid";
const DEFAULT_PORT = 3000;
const TIMEOUT_SECONDS = 30;

const { GREEN, RED, YELLOW, BOLD, RESET } = require('./colors.js');

function findStartCommand() {
    const pkgPath = path.resolve("package.json");
    if (!fs.existsSync(pkgPath)) return { cmd: [], found: false };

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const scripts = pkg.scripts || {};
        if (scripts.dev) return { cmd: ["npm", "run", "dev"], found: true };
        if (scripts.start) return { cmd: ["npm", "run", "start"], found: true };
    } catch {
        // Ignore
    }
    return { cmd: [], found: false };
}

function getPortFromEnv() {
    const envPath = path.resolve(".env");
    if (fs.existsSync(envPath)) {
        try {
            const data = fs.readFileSync(envPath, 'utf8');
            for (const line of data.split('\n')) {
                if (line.trim().startsWith("PORT=")) {
                    return parseInt(line.split("=")[1].trim(), 10);
                }
            }
        } catch {}
    }
    return DEFAULT_PORT;
}

function isPortOpen(port) {
    return new Promise(resolve => {
        const client = new net.Socket();
        client.setTimeout(1000);
        client.once('connect', () => {
            client.destroy();
            resolve(true);
        }).once('timeout', () => {
            client.destroy();
            resolve(false);
        }).once('error', () => {
            resolve(false);
        }).connect(port, 'localhost');
    });
}

function readPid() {
    if (fs.existsSync(PID_FILE)) {
        try {
            return parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        } catch {}
    }
    return null;
}

function writePid(pid) {
    fs.writeFileSync(PID_FILE, String(pid), 'utf8');
}

function clearPid() {
    if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
    }
}

async function startServer() {
    const port = getPortFromEnv();

    if (await isPortOpen(port)) {
        console.log(`${YELLOW}⚠️  Port ${port} is already in use.${RESET}`);
        const pid = readPid();
        if (pid) console.log(`   Known PID: ${pid}`);
        return;
    }

    const { cmd, found } = findStartCommand();
    if (!found) {
        console.log(`${RED}❌ No dev/start script found.${RESET}`);
        console.log(`   This project has no package.json, or its package.json has no 'dev' or 'start' script.`);
        console.log(`   Add a script to package.json, or start your server manually.`);
        return;
    }

    console.log(`${BOLD}Starting: ${cmd.join(' ')}${RESET}`);
    // Adjust command for windows (npm.cmd instead of npm)
    const executable = process.platform === 'win32' ? `${cmd[0]}.cmd` : cmd[0];
    
    const proc = spawn(executable, cmd.slice(1), {
        stdio: 'pipe',
        detached: true
    });
    
    // Ignore children stdout inside detached mode to let node exit
    proc.stdout.unref();
    proc.stderr.unref();
    proc.unref();

    writePid(proc.pid);

    process.stdout.write(`Waiting for port ${port}…`);
    for (let i = 0; i < TIMEOUT_SECONDS; i++) {
        if (await isPortOpen(port)) {
            console.log(`\n${GREEN}✅ Server started${RESET}`);
            console.log(`   URL:     http://localhost:${port}`);
            console.log(`   PID:     ${proc.pid}`);
            console.log(`   Command: ${cmd.join(' ')}`);
            console.log(`\nStop with: node .agent/scripts/auto_preview.js stop`);
            return;
        }
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n${RED}❌ Server did not start within ${TIMEOUT_SECONDS}s${RESET}`);
    try {
        process.kill(proc.pid, 'SIGTERM');
    } catch {}
    clearPid();
}

function stopServer() {
    const pid = readPid();
    if (!pid) {
        console.log(`${YELLOW}⚠️  No stored server PID found${RESET}`);
        return;
    }
    try {
        process.kill(pid, 'SIGTERM');
        console.log(`${GREEN}✅ Server stopped (PID ${pid})${RESET}`);
    } catch {
        console.log(`${YELLOW}Process ${pid} was not running${RESET}`);
    } finally {
        clearPid();
    }
}

async function showStatus() {
    const port = getPortFromEnv();
    const pid = readPid();
    if (await isPortOpen(port)) {
        console.log(`${GREEN}🟢 Running — http://localhost:${port}${RESET}`);
        if (pid) console.log(`   PID: ${pid}`);
    } else {
        console.log(`${RED}🔴 Not running on port ${port}${RESET}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const actions = new Set(["start", "stop", "status", "restart"]);
    
    if (args.length < 1 || !actions.has(args[0])) {
        console.log(`Usage: node auto_preview.js [start|stop|status|restart]`);
        process.exit(1);
    }

    const action = args[0];
    if (action === "start") {
        await startServer();
    } else if (action === "stop") {
        stopServer();
    } else if (action === "status") {
        await showStatus();
    } else if (action === "restart") {
        stopServer();
        await new Promise(r => setTimeout(r, 1000));
        await startServer();
    }
}

if (require.main === module) {
    main();
}
