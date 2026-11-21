#!/usr/bin/env node
/**
 * ci_supply_chain_check.js — Supply Chain Policy Enforcer
 * ═════════════════════════════════════════════════════════
 * Validates that:
 * 1. All GitHub Actions use exact 40-character commit SHAs (no tags, no @main/@master/@latest/@stable).
 * 2. All MCP packages in mcp_config.json are pinned to exact versions (no @latest, no unpinned npx packages).
 *
 * Exits with 0 if compliant, 1 if any violation is found.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function checkWorkflows(workflowsDir) {
  const violations = [];
  if (!fs.existsSync(workflowsDir)) return violations;

  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const SHA40_REGEX = /^[a-f0-9]{40}$/i;

  for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*-\s*uses:\s*([^\s#]+)/) || line.match(/^\s*uses:\s*([^\s#]+)/);
      if (match) {
        const actionRef = match[1];
        if (actionRef.startsWith('./') || actionRef.startsWith('docker://')) {
          continue; // Local actions or docker
        }
        const parts = actionRef.split('@');
        if (parts.length !== 2) {
          violations.push({
            file,
            line: i + 1,
            ref: actionRef,
            issue: 'Missing @commit-sha reference',
          });
          continue;
        }
        const [actionName, commitSha] = parts;
        if (!SHA40_REGEX.test(commitSha)) {
          violations.push({
            file,
            line: i + 1,
            ref: actionRef,
            issue: `Unpinned action ref '${commitSha}' (must be a 40-char commit SHA)`,
          });
        }
      }
    }
  }

  return violations;
}

function checkMcpConfig(configPath) {
  const violations = [];
  if (!fs.existsSync(configPath)) return violations;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    violations.push({
      file: configPath,
      line: 1,
      ref: configPath,
      issue: `Invalid JSON: ${err.message}`,
    });
    return violations;
  }

  const servers = config.mcpServers || {};
  for (const [serverName, serverDef] of Object.entries(servers)) {
    const args = serverDef.args || [];
    let skipNext = false;
    let checkedNpxPackage = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg !== 'string') continue;
      if (skipNext) {
        skipNext = false;
        continue;
      }
      if (arg.startsWith('--') || arg.startsWith('-')) {
        if (!arg.includes('=')) {
          skipNext = true;
        }
        continue;
      }
      if (arg.includes('@latest')) {
        violations.push({
          file: configPath,
          server: serverName,
          ref: arg,
          issue: `Found forbidden mutable '@latest' tag`,
        });
      }
      if (serverDef.command === 'npx' && !checkedNpxPackage) {
        checkedNpxPackage = true;
        if (arg !== 'mcp' && !arg.includes('@')) {
          violations.push({
            file: configPath,
            server: serverName,
            ref: arg,
            issue: `Unpinned package reference (must specify exact version with @version)`,
          });
        }
      }
    }
  }

  return violations;
}

function runAudit(rootDir = process.cwd()) {
  const workflowsDir = path.join(rootDir, '.github', 'workflows');
  const mcpConfigPath = path.join(rootDir, '.agent', 'mcp_config.json');

  const workflowViolations = checkWorkflows(workflowsDir);
  const mcpViolations = checkMcpConfig(mcpConfigPath);
  const allViolations = [...workflowViolations, ...mcpViolations];

  return {
    valid: allViolations.length === 0,
    workflowViolations,
    mcpViolations,
    allViolations,
  };
}

function main() {
  const rootDir = process.cwd();
  console.log('━━━ CI Supply Chain Policy Check ━━━');
  console.log(`Auditing: ${rootDir}`);

  const result = runAudit(rootDir);

  if (!result.valid) {
    console.error('\n❌ Supply chain policy violations detected:');
    for (const v of result.allViolations) {
      console.error(`  - [${v.file}${v.line ? `:${v.line}` : ''}] ${v.ref}: ${v.issue}`);
    }
    process.exit(1);
  }

  console.log(
    '✅ All GitHub Actions and MCP configurations comply with supply chain security policies.',
  );
  process.exit(0);
}

module.exports = {
  checkWorkflows,
  checkMcpConfig,
  runAudit,
};

if (require.main === module) {
  main();
}
