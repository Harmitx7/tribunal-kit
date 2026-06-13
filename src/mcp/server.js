#!/usr/bin/env node

/**
 * Tribunal-Kit MCP Server
 * 
 * This file exposes tribunal-kit tools via the Model Context Protocol (MCP)
 * over standard I/O, allowing AI clients (Cursor, Windsurf, Claude) to natively 
 * invoke tribunal checks.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const CLI = path.resolve(__dirname, '../../bin/tribunal-kit.js');

// Minimal JSON-RPC 2.0 over stdio
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function handleRequest(req) {
    if (req.method === 'mcp.initialize') {
        return {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: "tribunal-kit-mcp",
                version: "4.4.5"
            }
        };
    }
    
    if (req.method === 'mcp.listTools') {
        return {
            tools: [
                {
                    name: "run_tribunal_audit",
                    description: "Runs a full anti-hallucination audit across the workspace.",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "sync_ide_bridges",
                    description: "Synchronize IDE bridge files with the current GEMINI.md rules.",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "search_case_law",
                    description: "Search historical code rejections and legal precedent. Use this before writing code to avoid past mistakes.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query (e.g. 'useEffect state')" }
                        },
                        required: ["query"]
                    }
                }
            ]
        };
    }

    if (req.method === 'mcp.callTool') {
        const toolName = req.params.name;
        
        if (toolName === 'run_tribunal_audit') {
            const result = spawnSync(process.execPath, [CLI, 'validate'], { encoding: 'utf8' });
            return { content: [{ type: "text", text: result.stdout || result.stderr }] };
        }
        
        if (toolName === 'sync_ide_bridges') {
            const result = spawnSync(process.execPath, [CLI, 'sync'], { encoding: 'utf8' });
            return { content: [{ type: "text", text: result.stdout || result.stderr }] };
        }
        
        if (toolName === 'search_case_law') {
            const query = req.params.arguments.query;
            const script = path.resolve(__dirname, '../../.agent/scripts/case_law_manager.js');
            const result = spawnSync(process.execPath, [script, 'search-cases', '--query', query], { encoding: 'utf8' });
            return { content: [{ type: "text", text: result.stdout || result.stderr }] };
        }
        
        throw new Error(`Unknown tool: ${toolName}`);
    }

    throw new Error(`Unknown method: ${req.method}`);
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const req = JSON.parse(line);
        if (req.method === 'mcp.initialize') {
            const res = { jsonrpc: "2.0", id: req.id, result: handleRequest(req) };
            console.log(JSON.stringify(res));
            // Send initialized notification
            console.log(JSON.stringify({ jsonrpc: "2.0", method: "mcp.initialized", params: {} }));
        } else {
            const res = { jsonrpc: "2.0", id: req.id, result: handleRequest(req) };
            console.log(JSON.stringify(res));
        }
    } catch (e) {
        // Send error
    }
});
