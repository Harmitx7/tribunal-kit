#!/usr/bin/env node

/**
 * Tribunal-Kit MCP Server (Performance-Optimized)
 *
 * This file exposes tribunal-kit tools via the Model Context Protocol (MCP)
 * over standard I/O, allowing AI clients (Cursor, Windsurf, Claude) to natively
 * invoke tribunal checks.
 *
 * In-process tools load reusable modules directly. Commands that depend on a
 * standalone CLI process remain isolated deliberately.
 *
 * Protocol: MCP 2024-11-05 over JSON-RPC 2.0 / stdio
 */

const path = require('path');
const { spawnSync } = require('child_process');

const PKG = require(path.resolve(__dirname, '../package.json'));

// Timeout for intentionally isolated child processes (30 seconds).
const SPAWN_TIMEOUT_MS = 30000;
const GENERAL_TOOL_TIMEOUT_MS = 60000;

// --- DSH Guard: Cooperative Timeout ---
async function withToolTimeout(fn, timeoutMs) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('TOOL_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve().then(fn), timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- DSH Guard: Loop Detection ---
class ToolRepeatGuard {
  constructor() {
    this.history = new Map();
  }

  observe(toolName, argsObj) {
    const canonicalize = obj => {
      if (Array.isArray(obj)) return obj.map(canonicalize);
      if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        for (const key of Object.keys(obj).sort()) {
          sorted[key] = canonicalize(obj[key]);
        }
        return sorted;
      }
      return obj;
    };

    const canonicalArgs = JSON.stringify(canonicalize(argsObj) || {});
    const key = `${toolName}::${canonicalArgs}`;

    const currentCount = (this.history.get(key) || 0) + 1;
    this.history.clear();
    this.history.set(key, currentCount);

    if (currentCount === 3) {
      return 'SYSTEM NOTIFICATION: You are repeating the exact same tool call with identical arguments. Carefully analyze the previous result before calling again: if the task is not complete, try a different approach or different arguments instead of repeating the call.';
    }
    if (currentCount >= 5) {
      return `SYSTEM NOTIFICATION: Repeated tool call detected:\n- tool: ${toolName}\n- consecutive_calls: ${currentCount}\n- arguments: ${canonicalArgs}\nThe repeated calls are not making progress. Do not call this tool with these exact arguments again. Inspect the latest result and choose a different action, different arguments, or finish the task.`;
    }
    return null;
  }
}
const repeatGuard = new ToolRepeatGuard();

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'RpcError';
  }
}

// Minimal JSON-RPC 2.0 over stdio
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

/**
 * Run the workspace integrity audit without invoking the CLI schema validator.
 * The MCP audit is about Tribunal assets, while `tk validate` validates one
 * explicitly supplied payload and schema.
 */
function runTribunalAudit() {
  const fs = require('fs');
  const projectRoot = process.cwd();
  const manifestScript = path.join(projectRoot, '.agent', 'scripts', 'integrity_manifest.js');

  if (!fs.existsSync(manifestScript)) {
    return 'Error: .agent/scripts/integrity_manifest.js was not found. Run `tk init` first.';
  }

  try {
    const { generateManifest } = require(manifestScript);
    const manifest = generateManifest(projectRoot);
    if (manifest.error) return `Error: ${manifest.error}`;

    const { integrity } = manifest;
    const lines = [
      'Tribunal audit complete.',
      `Agents: ${manifest.agents.total} (${manifest.agents.reviewer_count} reviewers)`,
      `Skills: ${manifest.skills.total}`,
      `Scripts: ${manifest.scripts.total}`,
      `Workflows: ${manifest.workflows.total}`,
      `References: ${integrity.total_references}; phantom references: ${integrity.phantom_references}`,
      `Count claims: ${integrity.total_claims}; invalid claims: ${integrity.invalid_claims}`,
    ];

    if (integrity.phantom_references > 0 || integrity.invalid_claims > 0) {
      lines.push(
        'Audit found integrity issues; run `tk guardrail --scan` for remediation details.',
      );
    } else {
      lines.push('All discovered references and global asset-count claims are valid.');
    }
    return lines.join('\n');
  } catch (error) {
    return `Audit failed: ${error.message}`;
  }
}

/**
 * Search case law in an isolated process because its CLI owns persistent state.
 */
function searchCaseLaw(query) {
  const caseLawScript = path.resolve(__dirname, '../.agent/scripts/case_law_manager.js');
  // case_law_manager is a standalone stateful CLI, so retain its process boundary.
  const result = spawnSync(process.execPath, [caseLawScript, 'search-cases', '--query', query], {
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
  });
  if (result.error) {
    if (result.error.code === 'ETIMEDOUT')
      return 'Error: Case law search timed out (exceeded 30s limit)';
    return `Error executing case law search: ${result.error.message}`;
  }
  return result.stdout || result.stderr || 'No results';
}

function stripBoilerplate(text) {
  if (!text) return text;
  let minified = text.replace(
    /AI coding assistants often fall into specific bad habits[\s\S]*$/g,
    '',
  );
  minified = minified.replace(/## 🤖 LLM-Specific Traps[\s\S]*$/g, '');
  minified = minified.replace(/## 🏛️ Tribunal Integration[\s\S]*$/g, '');
  minified = minified.replace(/## Pre-Flight Checklist[\s\S]*$/g, '');
  return minified.trim();
}

function getAgentDir() {
  const fs = require('fs');
  const local = path.join(process.cwd(), '.agent');
  if (fs.existsSync(local)) return local;
  return path.resolve(__dirname, '../.agent');
}

async function handleRequest(req) {
  const fs = require('fs');
  if (req.method === 'notifications/initialized' || req.method === 'notifications/cancelled') {
    return null;
  }
  if (req.method === 'ping') {
    return {};
  }

  // MCP spec: method names follow path-style convention
  if (req.method === 'initialize') {
    return {
      protocolVersion: '2025-03-26',
      capabilities: {
        tools: {},
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
      serverInfo: {
        name: 'tribunal-kit-mcp',
        version: PKG.version,
      },
    };
  }

  if (req.method === 'resources/list') {
    const agentDir = getAgentDir();
    const resources = [];

    // Agents
    const agentsDir = path.join(agentDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const name = path.basename(f, '.md');
        resources.push({
          uri: `tribunal://agent/${name}`,
          name: `Agent: ${name}`,
          description: `Tribunal Specialist Agent rule file for ${name}`,
          mimeType: 'text/markdown',
        });
      }
    }

    // Skills
    const skillsDir = path.join(agentDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory()) {
          const skillFile = path.join(skillsDir, d.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            resources.push({
              uri: `tribunal://skill/${d.name}`,
              name: `Skill: ${d.name}`,
              description: `Tribunal Skill instruction file for ${d.name}`,
              mimeType: 'text/markdown',
            });
          }
        }
      }
    }

    // Workflows
    const workflowsDir = path.join(agentDir, 'workflows');
    if (fs.existsSync(workflowsDir)) {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const name = path.basename(f, '.md');
        resources.push({
          uri: `tribunal://workflow/${name}`,
          name: `Workflow: ${name}`,
          description: `Tribunal Workflow guide for ${name}`,
          mimeType: 'text/markdown',
        });
      }
    }

    return { resources };
  }

  if (req.method === 'resources/read') {
    const uri = req.params && req.params.uri;
    if (!uri) throw new Error('Missing uri parameter');
    const agentDir = getAgentDir();
    let filePath = null;

    if (uri.startsWith('tribunal://agent/')) {
      const name = uri.replace('tribunal://agent/', '');
      filePath = path.join(agentDir, 'agents', `${name}.md`);
    } else if (uri.startsWith('tribunal://skill/')) {
      const name = uri.replace('tribunal://skill/', '');
      filePath = path.join(agentDir, 'skills', name, 'SKILL.md');
    } else if (uri.startsWith('tribunal://workflow/')) {
      const name = uri.replace('tribunal://workflow/', '');
      filePath = path.join(agentDir, 'workflows', `${name}.md`);
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const text = fs.readFileSync(filePath, 'utf8');
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text,
        },
      ],
    };
  }

  if (req.method === 'prompts/list') {
    const agentDir = getAgentDir();
    const prompts = [];
    const workflowsDir = path.join(agentDir, 'workflows');

    if (fs.existsSync(workflowsDir)) {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const name = path.basename(f, '.md');
        prompts.push({
          name,
          description: `Execute tribunal workflow /${name}`,
          arguments: [
            {
              name: 'task',
              description: 'The task or target file to execute the workflow against',
              required: false,
            },
          ],
        });
      }
    }

    return { prompts };
  }

  if (req.method === 'prompts/get') {
    const name = req.params && req.params.name;
    const task = (req.params && req.params.arguments && req.params.arguments.task) || '';
    if (!name) throw new Error('Missing prompt name parameter');

    const agentDir = getAgentDir();
    const workflowPath = path.join(agentDir, 'workflows', `${name}.md`);
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Prompt workflow not found: ${name}`);
    }

    const content = fs.readFileSync(workflowPath, 'utf8');
    const promptText = task ? `${content}\n\nTarget Task/File: ${task}` : content;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
    };
  }

  if (req.method === 'tools/list') {
    return {
      tools: [
        {
          name: 'run_tribunal_audit',
          description: 'Runs a full anti-hallucination audit across the workspace.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'sync_ide_bridges',
          description: 'Synchronize IDE bridge files with the current GEMINI.md rules.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'search_case_law',
          description:
            'Search historical code rejections and legal precedent. Use this before writing code to avoid past mistakes.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: "Search query (e.g. 'useEffect state')",
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
        {
          name: 'list_tribunal_agents',
          description: 'List all available Tribunal Kit agents.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'get_tribunal_agent',
          description: 'Get the full markdown rules for a specific Tribunal agent.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: "The agent name (e.g. 'frontend-specialist')" },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        {
          name: 'list_tribunal_skills',
          description: 'List all available Tribunal Kit skills.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'get_tribunal_skill',
          description: 'Get the full markdown instructions for a specific Tribunal skill.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: "The skill name (e.g. 'react-specialist')" },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        {
          name: 'recall_memory',
          description:
            'Budget-constrained memory recall from the 4-Type Taxonomy Persistent Memory Engine. Returns the most relevant memories that fit within the token budget, ranked by relevance × recency × priority. Use this BEFORE writing code to recall project guidelines without bloating context.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: "Search query (e.g. 'database', 'auth', 'deploy')",
              },
              budget: {
                type: 'number',
                description:
                  'Maximum token budget for recall (default: 2000). Only the top-ranked memories that fit within this budget are returned.',
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
        {
          name: 'store_memory',
          description:
            'Store a new memory entry in the 4-Type Taxonomy Persistent Memory Engine. Memories are schema-validated and persisted across sessions. Types: semantic (permanent facts), procedural (how-to recipes), episodic (30-day TTL events), working (session scratch).',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['semantic', 'procedural', 'episodic', 'working'],
                description:
                  'Memory type: semantic (facts), procedural (recipes), episodic (events), working (scratch)',
              },
              content: {
                type: 'string',
                description: 'The memory content to store',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Searchable tags for this memory',
              },
            },
            required: ['type', 'content'],
            additionalProperties: false,
          },
        },
        {
          name: 'get_sparse_context',
          description:
            'Get a JIT, token-optimized context prompt tailored to the active task and files. Uses the Context Density Broker to score and select relevant skills, stripping duplicate boilerplate and saving up to 85% in prompt tokens.',
          inputSchema: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: "The user task description (e.g. 'JWT auth API')",
              },
              files: {
                type: 'array',
                items: { type: 'string' },
                description: "List of files being touched (e.g. ['src/auth.js'])",
              },
              model: {
                type: 'string',
                enum: ['large', 'small'],
                description:
                  'Model tier: large (default, includes key rules of supplementary skills) or small (essential skills only)',
              },
            },
            required: ['task'],
            additionalProperties: false,
          },
        },
        {
          name: 'align_output',
          description:
            'Align model outputs to Fabel-5 constraints: strips conversational introductions and conclusions, collapses single/double bullet items to prose, and checks for code traps (unawaited dynamic functions in Next.js 15, deprecated hooks in React 19, or non-existent models).',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The raw output text generated by the model to be aligned.',
              },
            },
            required: ['text'],
            additionalProperties: false,
          },
        },
        {
          name: 'verify_contracts',
          description:
            'Verify proposed code changes against project behavioral contracts. Use BEFORE writing code to ensure compliance with team conventions.',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: "Relative or absolute file path to verify (e.g. 'src/api/user.ts')",
              },
              content: {
                type: 'string',
                description: 'Proposed file content to verify against loaded contracts',
              },
            },
            required: ['file', 'content'],
            additionalProperties: false,
          },
        },
        {
          name: 'query_semantic_graph',
          description:
            'Query the Ahead-of-Time (AOT) Semantic Context Graph to quickly resolve function signatures, dependencies, and file structures without inflating context windows.',
          inputSchema: {
            type: 'object',
            properties: {
              targetPath: {
                type: 'string',
                description: 'The directory to query (defaults to current workspace).',
              },
            },
            additionalProperties: false,
          },
        },
        {
          name: 'exit_plan_mode',
          description:
            'Present your finished plan for human reviewed designing your approach. Execution will suspend until the user approves or requests changes.',
          inputSchema: {
            type: 'object',
            properties: {
              plan_content: {
                type: 'string',
                description: 'The markdown content of your proposed plan.',
              },
            },
            required: ['plan_content'],
            additionalProperties: false,
          },
        },
      ],
    };
  }

  if (req.method === 'tools/call') {
    const toolName = req.params && req.params.name;
    const argsObj = req.params && req.params.arguments;
    if (!toolName) {
      throw new RpcError(-32602, 'Missing required parameter: params.name');
    }

    const reminder = repeatGuard.observe(toolName, argsObj);

    const executeTool = async () => {
      if (toolName === 'exit_plan_mode') {
        const planContent = req.params?.arguments?.plan_content;
        if (typeof planContent !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: plan_content (string)');
        }
        // The wrapper CLI can intercept this, but for the LLM context, we explicitly tell it to wait.
        return {
          content: [
            {
              type: 'text',
              text: 'PLAN_SUBMITTED_FOR_REVIEW: The plan has been presented to the human. Please suspend execution and wait for the human to approve or provide feedback in the next turn. Do not call any further tools until you receive a response.',
            },
          ],
        };
      }

      if (toolName === 'dispatch_swarm') {
        const payload = req.params?.arguments?.payload;
        const file = req.params?.arguments?.file;
        const workspace = req.params?.arguments?.workspace || '.';
        const mode = req.params?.arguments?.mode || 'legacy';
        const useTui = req.params?.arguments?.use_tui || false;

        if (!payload && !file) {
          throw new RpcError(
            -32602,
            'Missing required argument: either payload or file must be provided',
          );
        }

        if (payload && file) {
          throw new RpcError(-32602, 'Invalid arguments: provide either payload or file, not both');
        }

        const agentDir = getAgentDir();
        const fs = require('fs');
        if (!fs.existsSync(agentDir)) {
          return {
            content: [
              { type: 'text', text: 'Error: .agent/ directory not found. Run `tk init` first.' },
            ],
          };
        }

        try {
          let _payloadData;
          if (file) {
            const filePath = path.resolve(workspace, file);
            if (!fs.existsSync(filePath)) {
              throw new Error(`File not found: ${filePath}`);
            }
            _payloadData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } else {
            _payloadData = JSON.parse(payload);
          }

          // Import swarm dispatcher functions
          const _swarmDispatcher = require(path.join(agentDir, 'scripts', 'swarm_dispatcher.js'));

          // Execute the swarm dispatcher
          const originalArgv = process.argv;
          process.argv = ['node', 'swarm_dispatcher.js', '--mode', mode, '--workspace', workspace];

          if (useTui) {
            process.argv.push('--tui');
          }

          if (file) {
            process.argv.push('--file');
            process.argv.push(file);
          } else if (payload) {
            process.argv.push('--payload');
            process.argv.push(payload);
          }

          // Capture output
          const { spawnSync } = require('child_process');
          const result = spawnSync(
            process.execPath,
            [path.join(agentDir, 'scripts', 'swarm_dispatcher.js'), ...process.argv.slice(2)],
            {
              encoding: 'utf8',
              timeout: 30000,
            },
          );

          // Restore argv
          process.argv = originalArgv;

          if (result.error) {
            throw result.error;
          }

          return {
            content: [
              { type: 'text', text: result.stdout || result.stderr || 'Swarm dispatch completed' },
            ],
          };
        } catch (e) {
          return {
            content: [{ type: 'text', text: `Swarm dispatch failed: ${e.message}` }],
          };
        }
      }

      if (toolName === 'get_ast_context') {
        const targetPath = req.params?.arguments?.targetPath || process.cwd();
        try {
          const result = spawnSync(
            'node',
            [path.join(__dirname, '../scripts/build-graph.js'), targetPath],
            {
              encoding: 'utf8',
              timeout: 10000,
            },
          );
          if (result.error) throw result.error;
          return { content: [{ type: 'text', text: result.stdout || result.stderr }] };
        } catch (e) {
          return { content: [{ type: 'text', text: `Failed to query graph: ${e.message}` }] };
        }
      }

      if (toolName === 'validate_payload') {
        const payloadStr = req.params?.arguments?.payload;
        const schemaType = req.params?.arguments?.schemaType;

        if (!payloadStr || typeof payloadStr !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: payload (string)');
        }
        if (!schemaType || typeof schemaType !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: schemaType (string)');
        }

        const agentDir = getAgentDir();
        const fs = require('fs');
        if (!fs.existsSync(agentDir)) {
          return {
            content: [
              { type: 'text', text: 'Error: .agent/ directory not found. Run `tk init` first.' },
            ],
          };
        }

        try {
          const payloadData = JSON.parse(payloadStr);
          const {
            WorkerRequestSchema,
            WorkerResultSchema,
            SwarmPayloadSchema,
            validatePayloadOrThrow,
          } = require(path.join(agentDir, 'scripts', 'payload_schemas.js'));

          let schema;
          switch (schemaType) {
            case 'worker-request':
              schema = WorkerRequestSchema;
              break;
            case 'worker-result':
              schema = WorkerResultSchema;
              break;
            case 'swarm-payload':
              schema = SwarmPayloadSchema;
              break;
            default:
              throw new RpcError(
                -32602,
                `Invalid schemaType: ${schemaType}. Must be one of: worker-request, worker-result, swarm-payload`,
              );
          }

          const validatedData = validatePayloadOrThrow(payloadData, schema);
          return {
            content: [
              {
                type: 'text',
                text: `Payload validation successful.\n\nValidated payload:\n${JSON.stringify(validatedData, null, 2)}`,
              },
            ],
          };
        } catch (e) {
          if (e instanceof SyntaxError) {
            return { content: [{ type: 'text', text: `Invalid JSON payload: ${e.message}` }] };
          } else {
            return { content: [{ type: 'text', text: `Payload validation failed: ${e.message}` }] };
          }
        }
      }

      if (toolName === 'run_tribunal_audit') {
        const text = runTribunalAudit();
        return { content: [{ type: 'text', text }] };
      }

      if (toolName === 'sync_ide_bridges') {
        const fs = require('fs');
        const cwd = process.cwd();
        const agentDest = path.join(cwd, '.agent');
        if (!fs.existsSync(agentDest)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: .agent/ directory not found. Run `tk init` first.',
              },
            ],
          };
        }
        try {
          const { generateIDEBridges } = require(
            path.resolve(__dirname, '../dist/commands/init.js'),
          );
          // generateIDEBridges is async
          await generateIDEBridges(cwd, agentDest, true);
          return {
            content: [
              {
                type: 'text',
                text: 'Sync complete',
              },
            ],
          };
        } catch (e) {
          return {
            content: [
              {
                type: 'text',
                text: `Sync failed: ${e.message}`,
              },
            ],
          };
        }
      }

      if (toolName === 'search_case_law') {
        const query = req.params && req.params.arguments && req.params.arguments.query;
        if (!query || typeof query !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: query (string)');
        }
        const text = searchCaseLaw(query);
        return { content: [{ type: 'text', text }] };
      }

      if (toolName === 'list_tribunal_agents') {
        const fs = require('fs');
        const agentDir = path.join(getAgentDir(), 'agents');
        if (!fs.existsSync(agentDir))
          return {
            content: [{ type: 'text', text: 'No agents found or .agent directory missing.' }],
          };
        const agents = fs
          .readdirSync(agentDir)
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''));
        return { content: [{ type: 'text', text: 'Available Agents:\n- ' + agents.join('\n- ') }] };
      }

      if (toolName === 'get_tribunal_agent') {
        const fs = require('fs');
        const name = req.params?.arguments?.name;
        if (!name || typeof name !== 'string')
          throw new RpcError(-32602, 'Missing or invalid argument: name (string)');
        const sanitizedName = path.basename(name);
        const agentsDir = path.resolve(getAgentDir(), 'agents');
        const agentPath = path.resolve(agentsDir, `${sanitizedName}.md`);
        // Path containment: ensure resolved path stays within agents directory
        if (!agentPath.startsWith(agentsDir))
          throw new RpcError(-32602, 'Invalid agent name: path traversal detected');
        if (!fs.existsSync(agentPath))
          return { content: [{ type: 'text', text: `Agent '${sanitizedName}' not found.` }] };
        const text = fs.readFileSync(agentPath, 'utf8');
        return { content: [{ type: 'text', text: stripBoilerplate(text) }] };
      }

      if (toolName === 'list_tribunal_skills') {
        const fs = require('fs');
        const skillsDir = path.join(getAgentDir(), 'skills');
        if (!fs.existsSync(skillsDir))
          return {
            content: [{ type: 'text', text: 'No skills found or .agent directory missing.' }],
          };
        const skills = fs
          .readdirSync(skillsDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        return { content: [{ type: 'text', text: 'Available Skills:\n- ' + skills.join('\n- ') }] };
      }

      if (toolName === 'get_tribunal_skill') {
        const fs = require('fs');
        const name = req.params?.arguments?.name;
        if (!name || typeof name !== 'string')
          throw new RpcError(-32602, 'Missing or invalid argument: name (string)');
        const sanitizedName = path.basename(name);
        const skillsDir = path.resolve(getAgentDir(), 'skills');
        const skillPath = path.resolve(skillsDir, sanitizedName, 'SKILL.md');
        // Path containment: ensure resolved path stays within skills directory
        if (!skillPath.startsWith(skillsDir))
          throw new RpcError(-32602, 'Invalid skill name: path traversal detected');
        if (!fs.existsSync(skillPath))
          return { content: [{ type: 'text', text: `Skill '${sanitizedName}' not found.` }] };
        const text = fs.readFileSync(skillPath, 'utf8');
        return { content: [{ type: 'text', text: stripBoilerplate(text) }] };
      }

      if (toolName === 'get_sparse_context') {
        const task = req.params?.arguments?.task;
        const files = req.params?.arguments?.files || [];
        const model = req.params?.arguments?.model || 'large';

        if (!task) throw new RpcError(-32602, 'Missing required argument: task');

        const agentDest = getAgentDir();
        const fs = require('fs');
        if (!fs.existsSync(agentDest)) {
          return {
            content: [
              { type: 'text', text: 'Error: .agent/ directory not found. Run `tk init` first.' },
            ],
          };
        }

        try {
          const brokerScript = path.join(agentDest, 'scripts', 'context_broker.js');
          const { broker } = require(brokerScript);
          const brokerResult = broker(task, files, model, agentDest);
          return { content: [{ type: 'text', text: stripBoilerplate(brokerResult.promptText) }] };
        } catch (e) {
          return {
            content: [{ type: 'text', text: `Failed to retrieve sparse context: ${e.message}` }],
          };
        }
      }

      if (toolName === 'recall_memory') {
        const query = req.params?.arguments?.query;
        if (!query || typeof query !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: query (string)');
        }
        const budget = req.params?.arguments?.budget || 2000;
        const agentDest = getAgentDir();
        const fs = require('fs');
        if (!fs.existsSync(agentDest)) {
          return {
            content: [
              { type: 'text', text: 'Error: .agent/ directory not found. Run `tk init` first.' },
            ],
          };
        }
        try {
          const { _memoryRecall } = require('../dist/commands/memory.js');
          const { results, tokens_used } = _memoryRecall(agentDest, query, budget);
          if (results.length === 0) {
            return { content: [{ type: 'text', text: `No memories match query: "${query}"` }] };
          }
          let text = `## Memory Recall (${results.length} results, ~${tokens_used}/${budget} tokens)\n\n`;
          for (const entry of results) {
            text += `- **[${entry.memory_type.toUpperCase()}]** #${entry.id}: ${entry.content}`;
            if (entry.tags.length > 0) text += ` _(${entry.tags.join(', ')})_`;
            text += `\n`;
          }
          return { content: [{ type: 'text', text }] };
        } catch (e) {
          return { content: [{ type: 'text', text: `Memory recall failed: ${e.message}` }] };
        }
      }

      if (toolName === 'store_memory') {
        const memType = req.params?.arguments?.type;
        const content = req.params?.arguments?.content;
        const tags = req.params?.arguments?.tags || [];
        if (!memType || !content) {
          throw new RpcError(-32602, 'Missing required arguments: type (string), content (string)');
        }
        const validTypes = ['semantic', 'procedural', 'episodic', 'working'];
        if (!validTypes.includes(memType)) {
          throw new RpcError(
            -32602,
            `Invalid memory type: "${memType}". Must be one of: ${validTypes.join(', ')}`,
          );
        }
        const agentDest = getAgentDir();
        const fs = require('fs');
        if (!fs.existsSync(agentDest)) {
          return {
            content: [
              { type: 'text', text: 'Error: .agent/ directory not found. Run `tk init` first.' },
            ],
          };
        }
        try {
          const { _memoryStore } = require('../dist/commands/memory.js');
          const result = _memoryStore(agentDest, memType, content, tags, null);
          return {
            content: [
              {
                type: 'text',
                text: `Memory stored: #${result.id} (${memType}, ~${result.token_estimate} tokens)`,
              },
            ],
          };
        } catch (e) {
          return { content: [{ type: 'text', text: `Memory store failed: ${e.message}` }] };
        }
      }

      if (toolName === 'query_semantic_graph') {
        const targetPath = req.params?.arguments?.targetPath || process.cwd();
        try {
          const result = spawnSync(
            'node',
            [path.join(__dirname, '../scripts/build-graph.js'), targetPath],
            {
              encoding: 'utf8',
              timeout: 10000,
            },
          );
          if (result.error) throw result.error;
          return { content: [{ type: 'text', text: result.stdout || result.stderr }] };
        } catch (e) {
          return { content: [{ type: 'text', text: `Failed to query graph: ${e.message}` }] };
        }
      }

      if (toolName === 'align_output') {
        const text = req.params?.arguments?.text;
        if (typeof text !== 'string') {
          throw new RpcError(-32602, 'Missing or invalid required argument: text (string)');
        }
        try {
          const { alignText, validateCodeContent } = require('../dist/commands/align.js');
          const aligned = alignText(text);
          const warnings = validateCodeContent(aligned);

          let outputText = aligned;
          if (warnings.length > 0) {
            outputText += '\n\n⚠️  OCAE Alignment Validator Warnings:\n';
            for (const warnMsg of warnings) {
              outputText += `● ${warnMsg}\n`;
            }
          }
          return { content: [{ type: 'text', text: outputText }] };
        } catch (e) {
          return { content: [{ type: 'text', text: `Output alignment failed: ${e.message}` }] };
        }
      }

      if (toolName === 'verify_contracts') {
        const file = req.params?.arguments?.file;
        const content = req.params?.arguments?.content;

        if (!file || typeof file !== 'string' || typeof content !== 'string') {
          throw new RpcError(
            -32602,
            'Missing or invalid required arguments: file (string), content (string)',
          );
        }

        try {
          const projectRoot = process.cwd();
          const contractEnginePath = path.join(getAgentDir(), 'scripts', 'contract_engine.js');
          if (!require('fs').existsSync(contractEnginePath)) {
            return {
              content: [
                { type: 'text', text: 'Error: contract_engine.js not found. Run `tk init` first.' },
              ],
            };
          }

          const contractEngine = require(contractEnginePath);
          const contracts = contractEngine.loadContracts(projectRoot);

          if (contracts.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No active behavioral contracts found in .tribunal/contracts/.',
                },
              ],
            };
          }

          const relativePath = path.relative(projectRoot, file).replace(/\\/g, '/');
          const allViolations = [];

          for (const contract of contracts) {
            const vList = contractEngine.evaluateContract(contract, relativePath, content);
            if (vList.length > 0) {
              allViolations.push(...vList);
            }
          }

          if (allViolations.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: '✅ Contract check passed. Zero behavioral violations detected.',
                },
              ],
            };
          }

          let report = `📜 Contract Verification Results (${allViolations.length} violations):\n`;
          for (const v of allViolations) {
            report += `● [${v.severity.toUpperCase()}] ${v.contract}: ${v.message}\n`;
            if (v.line) report += `   Line ${v.line}: ${v.snippet || ''}\n`;
          }

          return { content: [{ type: 'text', text: report }] };
        } catch (e) {
          return {
            content: [{ type: 'text', text: `Contract verification failed: ${e.message}` }],
          };
        }
      }

      throw new RpcError(-32601, `Unknown tool: ${toolName}`);
    };

    try {
      const result = await withToolTimeout(executeTool, GENERAL_TOOL_TIMEOUT_MS);
      if (reminder) {
        result.content.push({ type: 'text', text: '\n\n' + reminder });
      }
      return result;
    } catch (e) {
      if (e.message === 'TOOL_TIMEOUT') {
        const errorMsg = `Error: Tool execution timed out after ${GENERAL_TOOL_TIMEOUT_MS}ms`;
        const result = { content: [{ type: 'text', text: errorMsg }] };
        if (reminder) result.content.push({ type: 'text', text: '\n\n' + reminder });
        return result;
      }
      throw e;
    }
  }

  throw new RpcError(-32601, `Unknown method: ${req.method}`);
}

async function processSingleRequest(req) {
  try {
    const result = await handleRequest(req);
    // If it's a notification, do not send a response
    if (req.id === undefined || req.id === null) {
      return null;
    }
    return { jsonrpc: '2.0', id: req.id, result };
  } catch (e) {
    const code = e && typeof e.code === 'number' ? e.code : -32603;
    const message = e && e.message ? e.message : 'Internal server error';
    if (req.id === undefined || req.id === null) {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code, message },
      };
    }
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code, message },
    };
  }
}

rl.on('line', async line => {
  if (line.length > 1048576) {
    // 1MB limit
    const errorRes = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: input line too long (exceeds 1MB limit)' },
    };
    console.log(JSON.stringify(errorRes));
    return;
  }
  if (!line.trim()) return;

  let req;
  try {
    req = JSON.parse(line);
  } catch (parseErr) {
    // Invalid JSON — send a parse error
    const errorRes = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: ' + parseErr.message },
    };
    console.log(JSON.stringify(errorRes));
    return;
  }

  if (Array.isArray(req)) {
    const responses = [];
    for (const singleReq of req) {
      const response = await processSingleRequest(singleReq);
      if (response) {
        responses.push(response);
      }
    }
    if (responses.length > 0) {
      console.log(JSON.stringify(responses));
    }
  } else {
    const response = await processSingleRequest(req);
    if (response) {
      console.log(JSON.stringify(response));
    }
  }
});

if (process.env.NODE_ENV === 'test') {
  module.exports = {
    handleRequest,
    stripBoilerplate,
    runTribunalAudit,
  };
}
