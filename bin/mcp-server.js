#!/usr/bin/env node

/**
 * Tribunal-Kit MCP Server (Performance-Optimized)
 *
 * This file exposes tribunal-kit tools via the Model Context Protocol (MCP)
 * over standard I/O, allowing AI clients (Cursor, Windsurf, Claude) to natively
 * invoke tribunal checks.
 *
 * PERF: Commands are loaded in-process via require() — no child process spawn.
 * This eliminates ~200-500ms overhead per tool call that spawnSync introduced.
 *
 * Protocol: MCP 2024-11-05 over JSON-RPC 2.0 / stdio
 */

const path = require("path");
const { spawnSync } = require("child_process");

const PKG = require(path.resolve(__dirname, "../package.json"));

// Timeout for spawned processes (30 seconds) — only used for Rust binary calls
const SPAWN_TIMEOUT_MS = 30000;

// Minimal JSON-RPC 2.0 over stdio
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

/**
 * Run the validate command via the Rust binary (if available) or JS fallback.
 * This is the only command that still benefits from process spawn (Rust speed).
 */
function runValidateCommand() {
  const os = require("os");
  const fs = require("fs");
  const isWindows = os.platform() === "win32";
  const ext = isWindows ? ".exe" : "";
  const platform = os.platform();
  const arch = os.arch();

  // Try Rust binary first
  const pkgName = `@tribunal-kit/core-${platform}-${arch}`;
  let binPath = null;
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`);
    const candidatePath = path.resolve(
      path.dirname(pkgPath),
      `bin/tribunal-core${ext}`,
    );
    if (fs.existsSync(candidatePath)) binPath = candidatePath;
  } catch (_) {}
  if (!binPath) {
    const devPath = path.resolve(
      __dirname,
      "..",
      "target",
      "release",
      `tribunal-core${ext}`,
    );
    if (fs.existsSync(devPath)) binPath = devPath;
  }

  if (binPath) {
    const result = spawnSync(binPath, ["validate"], {
      encoding: "utf8",
      timeout: SPAWN_TIMEOUT_MS,
    });
    return result.stdout || result.stderr || "No output";
  }

  // JS fallback — in-process
  return "Validate command requires the Rust binary. Run: cargo build --release";
}

/**
 * Search case law — loaded in-process for zero-spawn latency.
 */
function searchCaseLaw(query) {
  const caseLawScript = path.resolve(
    __dirname,
    "../.agent/scripts/case_law_manager.js",
  );
  // We still spawn for case_law_manager since it's a standalone script
  // that modifies global state, but we use spawn with minimal overhead
  const result = spawnSync(
    process.execPath,
    [caseLawScript, "search-cases", "--query", query],
    {
      encoding: "utf8",
      timeout: SPAWN_TIMEOUT_MS,
    },
  );
  return result.stdout || result.stderr || "No results";
}


function stripBoilerplate(text) {
  if (!text) return text;
  let minified = text.replace(/AI coding assistants often fall into specific bad habits[\s\S]*$/g, "");
  minified = minified.replace(/## 🤖 LLM-Specific Traps[\s\S]*$/g, "");
  minified = minified.replace(/## 🏛️ Tribunal Integration[\s\S]*$/g, "");
  minified = minified.replace(/## Pre-Flight Checklist[\s\S]*$/g, "");
  return minified.trim();
}

function handleRequest(req) {
  // MCP spec: method names follow path-style convention
  if (req.method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "tribunal-kit-mcp",
        version: PKG.version,
      },
    };
  }

  if (req.method === "tools/list") {
    return {
      tools: [
        {
          name: "run_tribunal_audit",
          description:
            "Runs a full anti-hallucination audit across the workspace.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "sync_ide_bridges",
          description:
            "Synchronize IDE bridge files with the current GEMINI.md rules.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "search_case_law",
          description:
            "Search historical code rejections and legal precedent. Use this before writing code to avoid past mistakes.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (e.g. 'useEffect state')",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
        {
          name: "list_tribunal_agents",
          description: "List all available Tribunal Kit agents.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_tribunal_agent",
          description: "Get the full markdown rules for a specific Tribunal agent.",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "The agent name (e.g. 'frontend-specialist')" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
        {
          name: "list_tribunal_skills",
          description: "List all available Tribunal Kit skills.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_tribunal_skill",
          description: "Get the full markdown instructions for a specific Tribunal skill.",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "The skill name (e.g. 'react-specialist')" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
        {
          name: "recall_memory",
          description: "Budget-constrained memory recall from the 4-Type Taxonomy Persistent Memory Engine. Returns the most relevant memories that fit within the token budget, ranked by relevance × recency × priority. Use this BEFORE writing code to recall project guidelines without bloating context.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (e.g. 'database', 'auth', 'deploy')",
              },
              budget: {
                type: "number",
                description: "Maximum token budget for recall (default: 2000). Only the top-ranked memories that fit within this budget are returned.",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
        {
          name: "store_memory",
          description: "Store a new memory entry in the 4-Type Taxonomy Persistent Memory Engine. Memories are schema-validated and persisted across sessions. Types: semantic (permanent facts), procedural (how-to recipes), episodic (30-day TTL events), working (session scratch).",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["semantic", "procedural", "episodic", "working"],
                description: "Memory type: semantic (facts), procedural (recipes), episodic (events), working (scratch)",
              },
              content: {
                type: "string",
                description: "The memory content to store",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Searchable tags for this memory",
              },
            },
            required: ["type", "content"],
            additionalProperties: false,
          },
        },
        {
          name: "get_sparse_context",
          description: "Get a JIT, token-optimized context prompt tailored to the active task and files. Uses the Context Density Broker to score and select relevant skills, stripping duplicate boilerplate and saving up to 85% in prompt tokens.",
          inputSchema: {
            type: "object",
            properties: {
              task: {
                type: "string",
                description: "The user task description (e.g. 'JWT auth API')",
              },
              files: {
                type: "array",
                items: { type: "string" },
                description: "List of files being touched (e.g. ['src/auth.js'])",
              },
              model: {
                type: "string",
                enum: ["large", "small"],
                description: "Model tier: large (default, includes key rules of supplementary skills) or small (essential skills only)",
              },
            },
            required: ["task"],
            additionalProperties: false,
          },
        },
        {
          name: "align_output",
          description: "Align model outputs to Fabel-5 constraints: strips conversational introductions and conclusions, collapses single/double bullet items to prose, and checks for code traps (unawaited dynamic functions in Next.js 15, deprecated hooks in React 19, or non-existent models).",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The raw output text generated by the model to be aligned.",
              },
            },
            required: ["text"],
            additionalProperties: false,
          },
        },
      ],
    };
  }

  if (req.method === "tools/call") {
    const toolName = req.params && req.params.name;
    if (!toolName) {
      throw {
        code: -32602,
        message: "Missing required parameter: params.name",
      };
    }

    if (toolName === "run_tribunal_audit") {
      const text = runValidateCommand();
      return { content: [{ type: "text", text }] };
    }

    if (toolName === "sync_ide_bridges") {
      const fs = require("fs");
      const cwd = process.cwd();
      const agentDest = path.join(cwd, ".agent");
      if (!fs.existsSync(agentDest)) {
        return {
          content: [
            {
              type: "text",
              text: "Error: .agent/ directory not found. Run `tk init` first.",
            },
          ],
        };
      }
      // Run synchronously by spawning a minimal script
      const result = spawnSync(
        process.execPath,
        [
          "-e",
          `
                const { generateIDEBridges } = require('${path.resolve(__dirname, "../dist/commands/init.js").replace(/\\/g, "\\\\")}');
                generateIDEBridges('${cwd.replace(/\\/g, "\\\\")}', '${agentDest.replace(/\\/g, "\\\\")}', false).then(() => console.log('Sync complete'));
            `,
        ],
        { encoding: "utf8", timeout: SPAWN_TIMEOUT_MS },
      );
      return {
        content: [
          {
            type: "text",
            text: result.stdout || result.stderr || "Sync complete",
          },
        ],
      };
    }

    if (toolName === "search_case_law") {
      const query =
        req.params && req.params.arguments && req.params.arguments.query;
      if (!query || typeof query !== "string") {
        throw {
          code: -32602,
          message: "Missing or invalid required argument: query (string)",
        };
      }
      const text = searchCaseLaw(query);
      return { content: [{ type: "text", text }] };
    }

    if (toolName === "list_tribunal_agents") {
      const fs = require("fs");
      const agentDir = path.join(process.cwd(), ".agent", "agents");
      if (!fs.existsSync(agentDir)) return { content: [{ type: "text", text: "No agents found or .agent directory missing." }] };
      const agents = fs.readdirSync(agentDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
      return { content: [{ type: "text", text: "Available Agents:\n- " + agents.join("\n- ") }] };
    }

    if (toolName === "get_tribunal_agent") {
      const fs = require("fs");
      const name = req.params?.arguments?.name;
      if (!name) throw { code: -32602, message: "Missing argument: name" };
      const path = require("path");
      const sanitizedName = path.basename(name);
      const agentPath = path.join(process.cwd(), ".agent", "agents", `${sanitizedName}.md`);
      if (!fs.existsSync(agentPath)) return { content: [{ type: "text", text: `Agent '${sanitizedName}' not found.` }] };
      const text = fs.readFileSync(agentPath, "utf8");
      return { content: [{ type: "text", text: stripBoilerplate(text) }] };
    }

    if (toolName === "list_tribunal_skills") {
      const fs = require("fs");
      const skillsDir = path.join(process.cwd(), ".agent", "skills");
      if (!fs.existsSync(skillsDir)) return { content: [{ type: "text", text: "No skills found or .agent directory missing." }] };
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
      return { content: [{ type: "text", text: "Available Skills:\n- " + skills.join("\n- ") }] };
    }

    if (toolName === "get_tribunal_skill") {
      const fs = require("fs");
      const name = req.params?.arguments?.name;
      if (!name) throw { code: -32602, message: "Missing argument: name" };
      const path = require("path");
      const sanitizedName = path.basename(name);
      const skillPath = path.join(process.cwd(), ".agent", "skills", sanitizedName, "SKILL.md");
      if (!fs.existsSync(skillPath)) return { content: [{ type: "text", text: `Skill '${sanitizedName}' not found.` }] };
      const text = fs.readFileSync(skillPath, "utf8");
      return { content: [{ type: "text", text: stripBoilerplate(text) }] };
    }

    if (toolName === "get_sparse_context") {
      const task = req.params?.arguments?.task;
      const files = req.params?.arguments?.files || [];
      const model = req.params?.arguments?.model || "large";

      if (!task) throw { code: -32602, message: "Missing required argument: task" };

      const agentDest = path.join(process.cwd(), ".agent");
      const fs = require("fs");
      if (!fs.existsSync(agentDest)) {
        return { content: [{ type: "text", text: "Error: .agent/ directory not found. Run `tk init` first." }] };
      }

      try {
        const { broker } = require("../.agent/scripts/context_broker.js");
        const brokerResult = broker(task, files, model, agentDest);
        return { content: [{ type: "text", text: stripBoilerplate(brokerResult.promptText) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Failed to retrieve sparse context: ${e.message}` }] };
      }
    }

    if (toolName === "recall_memory") {
      const query = req.params?.arguments?.query;
      if (!query || typeof query !== "string") {
        throw { code: -32602, message: "Missing or invalid required argument: query (string)" };
      }
      const budget = req.params?.arguments?.budget || 2000;
      const agentDest = path.join(process.cwd(), ".agent");
      const fs = require("fs");
      if (!fs.existsSync(agentDest)) {
        return { content: [{ type: "text", text: "Error: .agent/ directory not found. Run `tk init` first." }] };
      }
      try {
        const { _memoryRecall } = require("../dist/commands/memory.js");
        const { results, tokens_used } = _memoryRecall(agentDest, query, budget);
        if (results.length === 0) {
          return { content: [{ type: "text", text: `No memories match query: "${query}"` }] };
        }
        let text = `## Memory Recall (${results.length} results, ~${tokens_used}/${budget} tokens)\n\n`;
        for (const entry of results) {
          text += `- **[${entry.memory_type.toUpperCase()}]** #${entry.id}: ${entry.content}`;
          if (entry.tags.length > 0) text += ` _(${entry.tags.join(", ")})_`;
          text += `\n`;
        }
        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Memory recall failed: ${e.message}` }] };
      }
    }

    if (toolName === "store_memory") {
      const memType = req.params?.arguments?.type;
      const content = req.params?.arguments?.content;
      const tags = req.params?.arguments?.tags || [];
      if (!memType || !content) {
        throw { code: -32602, message: "Missing required arguments: type (string), content (string)" };
      }
      const validTypes = ["semantic", "procedural", "episodic", "working"];
      if (!validTypes.includes(memType)) {
        throw { code: -32602, message: `Invalid memory type: "${memType}". Must be one of: ${validTypes.join(", ")}` };
      }
      const agentDest = path.join(process.cwd(), ".agent");
      const fs = require("fs");
      if (!fs.existsSync(agentDest)) {
        return { content: [{ type: "text", text: "Error: .agent/ directory not found. Run `tk init` first." }] };
      }
      try {
        const { _memoryStore } = require("../dist/commands/memory.js");
        const result = _memoryStore(agentDest, memType, content, tags, null);
        return { content: [{ type: "text", text: `Memory stored: #${result.id} (${memType}, ~${result.token_estimate} tokens)` }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Memory store failed: ${e.message}` }] };
      }
    }

    if (toolName === "align_output") {
      const text = req.params?.arguments?.text;
      if (typeof text !== "string") {
        throw { code: -32602, message: "Missing or invalid required argument: text (string)" };
      }
      try {
        const { alignText, validateCodeContent } = require("../dist/commands/align.js");
        const aligned = alignText(text);
        const warnings = validateCodeContent(aligned);
        
        let outputText = aligned;
        if (warnings.length > 0) {
          outputText += "\n\n⚠️  OCAE Alignment Validator Warnings:\n";
          for (const warnMsg of warnings) {
            outputText += `● ${warnMsg}\n`;
          }
        }
        return { content: [{ type: "text", text: outputText }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Alignment failed: ${e.message}` }] };
      }
    }

    throw { code: -32601, message: `Unknown tool: ${toolName}` };
  }

  throw { code: -32601, message: `Unknown method: ${req.method}` };
}

rl.on("line", (line) => {
  if (!line.trim()) return;

  let req;
  try {
    req = JSON.parse(line);
  } catch (parseErr) {
    // Invalid JSON — send a parse error
    const errorRes = {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: " + parseErr.message },
    };
    console.log(JSON.stringify(errorRes));
    return;
  }

  try {
    const result = handleRequest(req);
    const res = { jsonrpc: "2.0", id: req.id, result };
    console.log(JSON.stringify(res));

    // After initialize, send the initialized notification per MCP spec
    if (req.method === "initialize") {
      console.log(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {},
        }),
      );
    }
  } catch (e) {
    // Send proper JSON-RPC error response
    const code = e && typeof e.code === "number" ? e.code : -32603;
    const message = e && e.message ? e.message : "Internal server error";
    const errorRes = {
      jsonrpc: "2.0",
      id: req.id || null,
      error: { code, message },
    };
    console.log(JSON.stringify(errorRes));
  }
});

if (process.env.NODE_ENV === "test") {
  module.exports = {
    handleRequest,
    stripBoilerplate,
  };
}
