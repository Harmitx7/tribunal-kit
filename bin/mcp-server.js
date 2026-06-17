#!/usr/bin/env node

/**
 * Tribunal-Kit MCP Server
 * 
 * This file exposes tribunal-kit tools via the Model Context Protocol (MCP)
 * over standard I/O, allowing AI clients (Cursor, Windsurf, Claude) to natively 
 * invoke tribunal checks.
 * 
 * Protocol: MCP 2024-11-05 over JSON-RPC 2.0 / stdio
 */

const { spawnSync } = require('child_process');
const path = require('path');

const CLI = path.resolve(__dirname, './tribunal-kit.js');
const PKG = require(path.resolve(__dirname, '../package.json'));

// Timeout for spawned processes (30 seconds)
const SPAWN_TIMEOUT_MS = 30000;

// Minimal JSON-RPC 2.0 over stdio
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

/**
 * Run a CLI command with timeout protection.
 * Returns { stdout, stderr, status }.
 */
function runCommand(args) {
    return spawnSync(process.execPath, [CLI, ...args], {
        encoding: 'utf8',
        timeout: SPAWN_TIMEOUT_MS,
    });
}

function handleRequest(req) {
    // MCP spec: method names follow path-style convention
    if (req.method === 'initialize') {
        return {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: "tribunal-kit-mcp",
                version: PKG.version
            }
        };
    }
    
    if (req.method === 'tools/list') {
        return {
            tools: [
                {
                    name: "run_tribunal_audit",
                    description: "Runs a full anti-hallucination audit across the workspace.",
                    inputSchema: { type: "object", properties: {}, additionalProperties: false }
                },
                {
                    name: "sync_ide_bridges",
                    description: "Synchronize IDE bridge files with the current GEMINI.md rules.",
                    inputSchema: { type: "object", properties: {}, additionalProperties: false }
                },
                {
                    name: "search_case_law",
                    description: "Search historical code rejections and legal precedent. Use this before writing code to avoid past mistakes.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query (e.g. 'useEffect state')" }
                        },
                        required: ["query"],
                        additionalProperties: false
                    }
                }
            ]
        };
    }

    if (req.method === 'tools/call') {
        const toolName = req.params && req.params.name;
        if (!toolName) {
            throw { code: -32602, message: "Missing required parameter: params.name" };
        }
        
        if (toolName === 'run_tribunal_audit') {
            const result = runCommand(['validate']);
            return { content: [{ type: "text", text: result.stdout || result.stderr || "No output" }] };
        }
        
        if (toolName === 'sync_ide_bridges') {
            const result = runCommand(['sync']);
            return { content: [{ type: "text", text: result.stdout || result.stderr || "No output" }] };
        }
        
        if (toolName === 'search_case_law') {
            const query = req.params && req.params.arguments && req.params.arguments.query;
            if (!query || typeof query !== 'string') {
                throw { code: -32602, message: "Missing or invalid required argument: query (string)" };
            }
            const script = path.resolve(__dirname, '../.agent/scripts/case_law_manager.js');
            // Arguments passed as array — no shell interpolation
            const result = spawnSync(process.execPath, [script, 'search-cases', '--query', query], {
                encoding: 'utf8',
                timeout: SPAWN_TIMEOUT_MS,
            });
            return { content: [{ type: "text", text: result.stdout || result.stderr || "No results" }] };
        }
        
        throw { code: -32601, message: `Unknown tool: ${toolName}` };
    }

    throw { code: -32601, message: `Unknown method: ${req.method}` };
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    
    let req;
    try {
        req = JSON.parse(line);
    } catch (parseErr) {
        // Invalid JSON — send a parse error
        const errorRes = {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error: " + parseErr.message }
        };
        console.log(JSON.stringify(errorRes));
        return;
    }
    
    try {
        const result = handleRequest(req);
        const res = { jsonrpc: "2.0", id: req.id, result };
        console.log(JSON.stringify(res));
        
        // After initialize, send the initialized notification per MCP spec
        if (req.method === 'initialize') {
            console.log(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }));
        }
    } catch (e) {
        // Send proper JSON-RPC error response
        const code = (e && typeof e.code === 'number') ? e.code : -32603;
        const message = (e && e.message) ? e.message : "Internal server error";
        const errorRes = {
            jsonrpc: "2.0",
            id: req.id || null,
            error: { code, message }
        };
        console.log(JSON.stringify(errorRes));
    }
});
