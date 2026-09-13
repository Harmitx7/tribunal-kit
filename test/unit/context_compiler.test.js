'use strict';

const path = require('path');
const fs = require('fs');
const {
  analyzeSingleFile,
  analyzeMultiFileBridge,
  analyzeDirectory,
  renderSingleFileDossier,
  renderBridgeDossier,
  renderDirectoryDossier,
  syncVaultIndex,
  checkDrift
} = require('../../scripts/context_compiler');
const { handleRequest } = require('../../bin/mcp-server');

describe('Context Compiler Engine', () => {
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const targetFile = path.resolve(__dirname, '../../crates/core/src/commands/context_compress.rs');
  const targetDir = path.resolve(__dirname, '../../crates/core');

  test('extracts single-file AST, hashes, and invariants from Rust file', () => {
    const meta = analyzeSingleFile(targetFile, workspaceRoot);

    expect(meta.mode).toBe('single_file');
    expect(meta.sourceHash).toBeDefined();
    expect(meta.sourceHash.length).toBe(16);
    expect(meta.interfaceHash).toBeDefined();

    // Verify exports and types
    const exportNames = meta.exports.map(e => e.name);
    expect(exportNames).toContain('compress_context');

    const typeNames = meta.types.map(t => t.name);
    expect(typeNames).toContain('CompressResult');

    // Verify landmines (Chesterton's Fences)
    const hasVerifyComment = meta.landmines.some(l => l.content.includes('// VERIFY'));
    expect(hasVerifyComment).toBe(true);

    // Verify skills
    expect(meta.skills).toContain('rust-pro');
  });

  test('renders high-grade Flight Data HUD Markdown dossier', () => {
    const meta = analyzeSingleFile(targetFile, workspaceRoot);
    const md = renderSingleFileDossier(meta);

    // Verify YAML frontmatter
    expect(md).toContain('---');
    expect(md).toContain('version: 2.0.0');
    expect(md).toContain(`source_hash: "${meta.sourceHash}"`);

    // Verify AI Quick Inject Card
    expect(md).toContain('<!-- AI_QUICK_INJECT_START -->');
    expect(md).toContain('AI Prompt Injection Card');
    expect(md).toContain('<!-- AI_QUICK_INJECT_END -->');

    // Verify Mermaid topology
    expect(md).toContain('```mermaid');
    expect(md).toContain('graph LR');

    // Verify Public API contract table
    expect(md).toContain('Public API & Type Contract Matrix');
    expect(md).toContain('compress_context');

    // Verify Chesterton Fences
    expect(md).toContain("Chesterton's Fences");
  });

  test('analyzes project directory and maps subsystem clusters', () => {
    const dirMeta = analyzeDirectory(targetDir, workspaceRoot);

    expect(dirMeta.mode).toBe('directory_subsystem');
    expect(dirMeta.manifests).toContain('Cargo.toml');
    expect(dirMeta.subsystems.length).toBeGreaterThan(0);

    const md = renderDirectoryDossier(dirMeta);
    expect(md).toContain('PROJECT_AI_ONBOARDING_CARD');
    expect(md).toContain('Subsystem Architecture Clusters');
    expect(md).toContain('Cargo.toml');
  });

  test('analyzes multi-file interface bridge', () => {
    const fileA = path.resolve(__dirname, '../../.agent/scripts/graph_zoom.js');
    const fileB = path.resolve(__dirname, '../../crates/core/src/commands/graph.rs');

    const bridge = analyzeMultiFileBridge(fileA, fileB, workspaceRoot);
    expect(bridge.mode).toBe('multi_file_bridge');
    expect(bridge.fileA.filePath).toBeDefined();
    expect(bridge.fileB.filePath).toBeDefined();

    const md = renderBridgeDossier(bridge);
    expect(md).toContain('INTERFACE BRIDGE DOSSIER');
    expect(md).toContain('```mermaid');
  });

  test('maintains living vault registry and executes drift audit', () => {
    const sync = syncVaultIndex(workspaceRoot);
    expect(sync.indexedCount).toBeGreaterThan(0);
    expect(fs.existsSync(sync.indexFile)).toBe(true);

    const drift = checkDrift(workspaceRoot);
    expect(drift.total).toBeGreaterThan(0);
    expect(drift.fresh).toBeGreaterThanOrEqual(1);
    expect(drift.isHealthy).toBe(true);
  });
});

describe('MCP Server Integration for tribunal_get_context', () => {
  const targetFile = 'tribunal-kit/crates/core/src/commands/context_compress.rs';

  test('invokes tribunal_get_context tool and receives markdown payload', async () => {
    process.env.NODE_ENV = 'test';
    const req = {
      jsonrpc: '2.0',
      id: 99,
      method: 'tools/call',
      params: {
        name: 'tribunal_get_context',
        arguments: {
          target: targetFile,
          write: false,
        },
      },
    };

    const res = await handleRequest(req);
    expect(res).toBeDefined();
    expect(res.content).toBeDefined();
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('FILE DOSSIER:');
    expect(res.content[0].text).toContain('compress_context');
    expect(res.content[0].text).toContain('AI_QUICK_INJECT');
  });

  test('invokes tribunal_get_context with check: true and receives drift metrics', async () => {
    process.env.NODE_ENV = 'test';
    const req = {
      jsonrpc: '2.0',
      id: 100,
      method: 'tools/call',
      params: {
        name: 'tribunal_get_context',
        arguments: {
          check: true,
        },
      },
    };

    const res = await handleRequest(req);
    expect(res).toBeDefined();
    const driftData = JSON.parse(res.content[0].text);
    expect(driftData.total).toBeGreaterThan(0);
    expect(driftData.isHealthy).toBe(true);
  });
});
