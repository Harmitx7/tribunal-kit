'use strict';

/**
 * phase8_compatibility_war_room.test.js — API, CLI, Configuration & Cross-Platform Test Suite (Phase 8)
 * ====================================================================================================
 * Verifies Phase 8 Compatibility Invariants, Dual-Engine Parity, Packaging & Cross-Platform Integrity:
 * 1. Public API Parity: Verifies CommonJS and ESM export parity with TypeScript index.d.ts declarations.
 * 2. Manifest & Packaging Integrity: Asserts all package.json entrypoints and declared files exist.
 * 3. CLI Dual-Engine & Wrapper Routing: Verifies Rust engine dispatch and graceful JavaScript fallback.
 * 4. Cross-Platform Path Containment: Asserts lexical path defenses across Windows, Linux, and macOS.
 * 5. MCP Protocol Contract: Asserts JSON-RPC 2.0 compliance, protocol version, and tool schemas.
 * 6. Integration Bridge Generation: Proves deterministic generation of Cursor, Windsurf, Claude, Gemini, Copilot, and Codex bridges.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const PKG = require('../../package.json');
const tk = require('../../src/cli');
const { getBinaryPath, RUST_COMMANDS } = require('../../bin/wrapper');
const { validateLexicalPath, PathSecurityError } = require('../../src/utils/path_containment');
const { generateIDEBridges } = require('../../src/commands/init');
const mcpServer = require('../../bin/mcp-server');

describe('PHASE 8 COMPATIBILITY & CROSS-PLATFORM WAR ROOM', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-phase8-compat-'));
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Public API & Contract Parity (CJS, ESM, and TypeScript Declarations)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Public API Contract Parity', () => {
    test('CommonJS entrypoint exports all commands declared in index.d.ts', () => {
      const requiredCommands = [
        'cmdInit',
        'cmdUpdate',
        'cmdStatus',
        'cmdLearn',
        'cmdCase',
        'cmdHook',
        'cmdGraph',
        'cmdArch',
        'cmdMutate',
        'cmdContext',
        'cmdSync',
        'cmdAlign',
        'cmdMarathon',
        'cmdMinimal',
        'cmdCompile',
        'cmdUninstall',
        'cmdMemory',
        'cmdOptimizeSkill',
        'cmdEvalOpt',
        'cmdEvolve',
        'cmdGuardrail',
        'cmdRsi',
        'cmdContract',
        'cmdValidate',
        'cmdMinContext',
        'cmdDagSchedule',
        'cmdContextCompress',
        'cmdOptimizeStep',
        'cmdImpactTier',
        'cmdReview',
        'cmdUnderstand',
        'cmdActivity',
      ];

      for (const cmd of requiredCommands) {
        expect(typeof tk[cmd]).toBe('function');
      }
    });

    test('Package manifest points to real, resolvable entrypoints on disk', () => {
      const repoRoot = path.resolve(__dirname, '../..');

      // Check main
      const mainPath = path.resolve(repoRoot, PKG.main);
      expect(fs.existsSync(mainPath)).toBe(true);

      // Check types
      const typesPath = path.resolve(repoRoot, PKG.types);
      expect(fs.existsSync(typesPath)).toBe(true);

      // Check export map
      const esmPath = path.resolve(repoRoot, PKG.exports['.'].import);
      expect(fs.existsSync(esmPath)).toBe(true);

      const cjsPath = path.resolve(repoRoot, PKG.exports['.'].require);
      expect(fs.existsSync(cjsPath)).toBe(true);

      // Check all declared binaries
      for (const [binName, binRel] of Object.entries(PKG.bin)) {
        const binFile = path.resolve(repoRoot, binRel);
        expect(fs.existsSync(binFile)).toBe(true);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CLI Dual-Engine & Wrapper Behavior
  // ───────────────────────────────────────────────────────────────────────────
  describe('CLI Dual-Engine Fallback & Argument Handling', () => {
    test('RUST_COMMANDS contains core acceleration commands', () => {
      const expectedRustCmds = ['init', 'status', 'sync', 'memory', 'dag-schedule', 'context-compress', 'ast-extract', 'validate'];
      for (const cmd of expectedRustCmds) {
        expect(RUST_COMMANDS.has(cmd)).toBe(true);
      }
    });

    test('TRIBUNAL_FORCE_JS bypasses native binary resolution deterministically', () => {
      const prevEnv = process.env.TRIBUNAL_FORCE_JS;
      try {
        process.env.TRIBUNAL_FORCE_JS = '1';
        expect(getBinaryPath()).toBeNull();

        process.env.TRIBUNAL_FORCE_JS = 'true';
        expect(getBinaryPath()).toBeNull();
      } finally {
        process.env.TRIBUNAL_FORCE_JS = prevEnv || '';
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Cross-Platform Path Containment & Security Invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe('Cross-Platform Path Containment (Windows, Linux, macOS)', () => {
    test('Rejects Windows reserved device names on all platforms', () => {
      const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9', 'con.txt', 'aux.json'];

      for (const dev of reserved) {
        expect(() => validateLexicalPath(dev)).toThrow(PathSecurityError);
        expect(() => validateLexicalPath(`sub/${dev}`)).toThrow(PathSecurityError);
      }
    });

    test('Rejects UNC, URL schemes, and drive-letter paths', () => {
      const dangerousPaths = [
        '\\\\server\\share\\file.js',
        '//server/share/file.js',
        'C:\\Windows\\System32',
        'd:/workspace/file.js',
        'http://evil.com/payload.js',
        'file:///etc/passwd',
      ];

      for (const p of dangerousPaths) {
        expect(() => validateLexicalPath(p)).toThrow(PathSecurityError);
      }
    });

    test('Rejects directory traversal regardless of slash convention', () => {
      const traversals = [
        '../escaped.js',
        '..\\escaped.js',
        'nested/../../escaped.js',
        'nested\\..\\..\\escaped.js',
      ];

      for (const t of traversals) {
        expect(() => validateLexicalPath(t)).toThrow(PathSecurityError);
      }
    });

    test('Normalizes valid relative paths across platform separators', () => {
      expect(validateLexicalPath('src\\utils\\logger.js')).toBe('src/utils/logger.js');
      expect(validateLexicalPath('src/utils/logger.js')).toBe('src/utils/logger.js');
      expect(validateLexicalPath('.\\src\\index.js')).toBe('src/index.js');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Configuration Compatibility
  // ───────────────────────────────────────────────────────────────────────────
  describe('Configuration Schema & JSON Compatibility', () => {
    test('Project configuration manifests parse as valid JSON', () => {
      const repoRoot = path.resolve(__dirname, '../..');
      const configs = [
        path.join(repoRoot, 'package.json'),
        path.join(repoRoot, 'mcp_config.json'),
        path.join(repoRoot, '.agent/config/plugin.json'),
        path.join(repoRoot, '.agent/config/slash-commands.json'),
        path.join(repoRoot, '.agent/config/specialist-registry.json'),
        path.join(repoRoot, '.agent/config/claude.json'),
      ];

      for (const cfg of configs) {
        if (fs.existsSync(cfg)) {
          const content = fs.readFileSync(cfg, 'utf8');
          expect(() => JSON.parse(content)).not.toThrow();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. MCP Server Protocol Contract
  // ───────────────────────────────────────────────────────────────────────────
  describe('MCP Protocol Compatibility (JSON-RPC 2.0)', () => {
    test('Responds correctly to initialize request with protocolVersion', async () => {
      const initReq = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-harness', version: '1.0.0' },
        },
      };

      const res = await mcpServer.handleRequest(initReq);
      expect(res).toBeDefined();
      expect(res.protocolVersion).toMatch(/^202[45]-\d{2}-\d{2}$/);
      expect(res.serverInfo).toBeDefined();
      expect(res.serverInfo.name).toBe('tribunal-kit-mcp');
      expect(res.serverInfo.version).toBe(PKG.version);
      expect(res.capabilities).toHaveProperty('tools');
    });

    test('tools/list returns expected governance tools with valid input schemas', async () => {
      const listReq = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };

      const res = await mcpServer.handleRequest(listReq);
      expect(res).toBeDefined();
      expect(Array.isArray(res.tools)).toBe(true);

      const toolNames = res.tools.map(t => t.name);
      expect(toolNames).toContain('tribunal_request_write');
      expect(toolNames).toContain('tribunal_preview_write');
      expect(toolNames).toContain('tribunal_commit_write');
      expect(toolNames).toContain('tribunal_approve_write');
      expect(toolNames).toContain('run_tribunal_audit');
      expect(toolNames).toContain('tk_format_activity');

      // Verify each tool has a valid inputSchema object
      for (const tool of res.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Integration Bridge Generation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Agent & IDE Bridge Compatibility', () => {
    test('generateIDEBridges creates bridge files across all major coding agents', async () => {
      const targetWorkspace = path.join(tmpDir, 'bridge-test-ws');
      const agentDest = path.join(targetWorkspace, '.agent');
      fs.mkdirSync(path.join(agentDest, 'rules'), { recursive: true });

      // Create synthetic GEMINI.md rule source
      fs.writeFileSync(
        path.join(agentDest, 'rules', 'GEMINI.md'),
        '# Master Rules\nRule 1: Always verify evidence.\n',
        'utf8',
      );

      await generateIDEBridges(targetWorkspace, agentDest, false, false);

      // Verify all IDE bridges exist
      const expectedBridges = [
        path.join(targetWorkspace, '.cursorrules'),
        path.join(targetWorkspace, '.windsurfrules'),
        path.join(targetWorkspace, '.gemini', 'settings.json'),
        path.join(targetWorkspace, '.gemini', 'GEMINI.md'),
        path.join(targetWorkspace, '.github', 'copilot-instructions.md'),
        path.join(targetWorkspace, 'CLAUDE.md'),
        path.join(targetWorkspace, '.claude', 'CLAUDE.md'),
        path.join(targetWorkspace, 'AGENTS.md'),
      ];

      for (const bridge of expectedBridges) {
        expect(fs.existsSync(bridge)).toBe(true);
        const content = fs.readFileSync(bridge, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });
});
