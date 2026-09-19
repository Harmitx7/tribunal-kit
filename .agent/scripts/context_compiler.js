#!/usr/bin/env node
/**
 * context_compiler.js — Tribunal Kit SOTA Context Compiler Engine
 * ════════════════════════════════════════════════════════════════════
 * Deterministic, high-speed context extraction engine for:
 *   1. Single Files (Flight Data HUD Dossier)
 *   2. Multi-File Pairs (Interface Bridge Dossier)
 *   3. Project Folders (Subsystem Macro Dossier)
 *   4. Batch Vault Crawling (--crawl)
 *   5. Semantic Drift Sentinel (--check)
 *
 * Designed for both CLI execution and in-process MCP server integration.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Optional ANSI colors
let C = {
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  CYAN: '\x1b[96m',
  RED: '\x1b[91m',
  BLUE: '\x1b[94m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RESET: '\x1b[0m',
};

try {
  const colorsMod = require('./_colors');
  if (colorsMod) C = Object.assign({}, C, colorsMod);
} catch {
  try {
    const colorsMod = require('../.agent/scripts/_colors');
    if (colorsMod) C = Object.assign({}, C, colorsMod);
  } catch {
    // Fallback C used
  }
}

// ── Hashing Helpers ─────────────────────────────────────────────────────────

function computeSha256(content) {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').substring(0, 16);
}

function computeInterfaceHash(signatures) {
  const text = signatures
    .map(s => `${s.kind}:${s.name}:${s.signature}`)
    .sort()
    .join('\n');
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').substring(0, 16);
}

// ── Multi-Language AST / Regex Skeleton Extractor ───────────────────────────

function extractFileSkeleton(filePath, rawContent) {
  const ext = path.extname(filePath).toLowerCase();
  const lines = rawContent.split(/\r?\n/);
  const imports = [];
  const exports = [];
  const types = [];
  const landmines = [];

  // 1. Comments and Landmines (Chesterton's Fences)
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (
      trimmed.includes('// VERIFY') ||
      trimmed.includes('// NOTE') ||
      trimmed.includes('// FIX') ||
      trimmed.includes('// HACK') ||
      trimmed.includes('// CAUTION') ||
      trimmed.includes('// INVARIANT') ||
      trimmed.includes('// DO NOT') ||
      trimmed.includes('# VERIFY') ||
      trimmed.includes('# NOTE')
    ) {
      landmines.push({
        line: idx + 1,
        content: trimmed,
      });
    }
  });

  // 2. Language-Specific Parsers
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.mjs') {
    // Phase 1: Try Rust AST Extraction
    try {
      const absPath = path.resolve(process.cwd(), filePath);
      let corePath = null;
      try {
        const { getBinaryPath } = require('./_utils');
        corePath = getBinaryPath();
      } catch (_) {
        try {
          const wrapper = require('../../bin/wrapper');
          corePath = wrapper.getBinaryPath ? wrapper.getBinaryPath() : null;
        } catch (_2) {}
      }

      if (!corePath && process.env.TRIBUNAL_CORE_PATH && fs.existsSync(process.env.TRIBUNAL_CORE_PATH)) {
        corePath = process.env.TRIBUNAL_CORE_PATH;
      }

      if (corePath && fs.existsSync(corePath)) {
        const result = require('child_process').execSync(`"${corePath}" ast-extract --file "${absPath}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const data = JSON.parse(result);
        if (data && data.success) {
           // We map the Rust JSON into the exact format expected by the rest of the JS code
           const mappedImports = data.imports.map(i => ({ source: i.source, specifiers: i.specifiers, line: 0 }));
           const mappedExports = data.exports.map(e => ({ kind: e.kind, name: e.name, signature: e.signature, line: 0 }));
           const mappedTypes = data.types.map(t => ({ kind: t.kind, name: t.name, signature: t.signature, line: 0 }));
           
           return {
             imports: mappedImports,
             exports: mappedExports,
             types: mappedTypes,
             landmines: data.landmines,
             interfaceHash: computeInterfaceHash(mappedExports.concat(mappedTypes))
           };
        }
      }
    } catch(e) {
      // Silent fallback to Regex parsing
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Imports
      const importMatch = trimmed.match(
        /^import\s+(?:type\s+)?(?:(.+?)\s+from\s+)?['"]([^'"]+)['"]/,
      );
      if (importMatch) {
        imports.push({
          source: importMatch[2],
          specifiers: importMatch[1] ? importMatch[1].trim() : '*',
          line: idx + 1,
        });
      }
      const requireMatch = trimmed.match(
        /(?:const|let|var)\s+(.+?)\s*=\s*require\(['"]([^'"]+)['"]\)/,
      );
      if (requireMatch) {
        imports.push({
          source: requireMatch[2],
          specifiers: requireMatch[1].trim(),
          line: idx + 1,
        });
      }

      // Exports
      const exportFunc = trimmed.match(
        /^export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*(\(.*?\))/,
      );
      if (exportFunc) {
        exports.push({
          kind: 'function',
          name: exportFunc[1],
          signature: `function ${exportFunc[1]}${exportFunc[2]}`,
          line: idx + 1,
        });
      }

      const exportConst = trimmed.match(
        /^export\s+const\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*(?:async\s+)?(?:\((.*?)\)|(\w+))\s*=>/,
      );
      if (exportConst) {
        exports.push({
          kind: 'arrow_function',
          name: exportConst[1],
          signature: `const ${exportConst[1]}: (${exportConst[3] || exportConst[4] || ''}) => ...`,
          line: idx + 1,
        });
      }

      const exportClass = trimmed.match(
        /^export\s+(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/,
      );
      if (exportClass) {
        exports.push({
          kind: 'class',
          name: exportClass[1],
          signature: `class ${exportClass[1]}${exportClass[2] ? ' extends ' + exportClass[2] : ''}`,
          line: idx + 1,
        });
      }

      // Types & Interfaces
      const exportType = trimmed.match(/^export\s+type\s+(\w+)(?:<.*?>)?\s*=/);
      if (exportType) {
        types.push({
          kind: 'type',
          name: exportType[1],
          signature: trimmed.replace(/;?$/, ''),
          line: idx + 1,
        });
      }

      const exportInterface = trimmed.match(
        /^export\s+interface\s+(\w+)(?:<.*?>)?(?:\s+extends\s+.*?)?\s*\{?/,
      );
      if (exportInterface) {
        types.push({
          kind: 'interface',
          name: exportInterface[1],
          signature: trimmed.replace(/\{?$/, '').trim(),
          line: idx + 1,
        });
      }
    });
  } else if (ext === '.rs') {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Use statements
      const useMatch = trimmed.match(/^(?:pub\s+)?use\s+([^;]+);/);
      if (useMatch) {
        imports.push({
          source: useMatch[1].trim(),
          specifiers: useMatch[1].trim(),
          line: idx + 1,
        });
      }

      // Public Functions
      const pubFn = trimmed.match(
        /^pub(?:\(.*?\))?\s+(?:async\s+)?fn\s+(\w+)(?:<.*?>)?\s*(\(.*?\))(?:\s*->\s*([^{;]+))?/,
      );
      if (pubFn) {
        exports.push({
          kind: 'function',
          name: pubFn[1],
          signature: `pub fn ${pubFn[1]}${pubFn[2]}${pubFn[3] ? ' -> ' + pubFn[3].trim() : ''}`,
          line: idx + 1,
        });
      }

      // Structs & Enums
      const pubStruct = trimmed.match(/^pub(?:\(.*?\))?\s+struct\s+(\w+)/);
      if (pubStruct) {
        types.push({
          kind: 'struct',
          name: pubStruct[1],
          signature: `pub struct ${pubStruct[1]}`,
          line: idx + 1,
        });
      }

      const pubEnum = trimmed.match(/^pub(?:\(.*?\))?\s+enum\s+(\w+)/);
      if (pubEnum) {
        types.push({
          kind: 'enum',
          name: pubEnum[1],
          signature: `pub enum ${pubEnum[1]}`,
          line: idx + 1,
        });
      }

      const pubTrait = trimmed.match(/^pub(?:\(.*?\))?\s+trait\s+(\w+)/);
      if (pubTrait) {
        types.push({
          kind: 'trait',
          name: pubTrait[1],
          signature: `pub trait ${pubTrait[1]}`,
          line: idx + 1,
        });
      }
    });
  } else if (ext === '.py') {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      const importMatch = trimmed.match(/^(?:from\s+([\w.]+)\s+)?import\s+(.+)$/);
      if (importMatch) {
        imports.push({
          source: importMatch[1] || importMatch[2],
          specifiers: importMatch[2],
          line: idx + 1,
        });
      }

      const defMatch = trimmed.match(
        /^(?:async\s+)?def\s+([a-zA-Z_]\w*)\s*(\(.*?\))(?:\s*->\s*([^:]+))?:/,
      );
      if (defMatch && !defMatch[1].startsWith('_')) {
        exports.push({
          kind: 'function',
          name: defMatch[1],
          signature: `def ${defMatch[1]}${defMatch[2]}${defMatch[3] ? ' -> ' + defMatch[3].trim() : ''}`,
          line: idx + 1,
        });
      }

      const classMatch = trimmed.match(/^class\s+([a-zA-Z_]\w*)(?:\((.*?)\))?:/);
      if (classMatch && !classMatch[1].startsWith('_')) {
        types.push({
          kind: 'class',
          name: classMatch[1],
          signature: `class ${classMatch[1]}${classMatch[2] ? '(' + classMatch[2] + ')' : ''}`,
          line: idx + 1,
        });
      }
    });
  }

  const allSignatures = exports.concat(types);
  const interfaceHash = computeInterfaceHash(allSignatures);

  return {
    imports,
    exports,
    types,
    landmines,
    interfaceHash,
  };
}

// ── Inbound Callers Discovery ───────────────────────────────────────────────

function findInboundCallers(targetFilePath, exportNames, workspaceRoot = process.cwd()) {
  const callers = [];
  const baseName = path.basename(targetFilePath);
  const stem = baseName.replace(/\.[^.]+$/, '');
  const relativeTarget = path.relative(workspaceRoot, targetFilePath).replace(/\\/g, '/');

  // Search tokens: module stem and exported symbol names
  const searchTokens = new Set([stem]);
  exportNames.slice(0, 8).forEach(n => searchTokens.add(n));

  // Try using git grep or ripgrep if available
  const grepOutputs = [];
  try {
    for (const token of searchTokens) {
      if (!token || token.length < 3) continue;
      try {
        const cmd = `git grep -n -I "${token}" -- ":!docs/" ":!node_modules/" ":!dist/" ":!target/" ":!*.lock"`;
        const res = execSync(cmd, {
          cwd: workspaceRoot,
          stdio: ['ignore', 'pipe', 'ignore'],
          encoding: 'utf8',
        });
        if (res) grepOutputs.push(...res.split('\n').filter(Boolean));
      } catch {
        // Ripgrep fallback
        try {
          const cmd = `rg -n --no-heading --color=never "${token}" -g "!docs/**" -g "!node_modules/**" -g "!target/**" -g "!dist/**"`;
          const res = execSync(cmd, {
            cwd: workspaceRoot,
            stdio: ['ignore', 'pipe', 'ignore'],
            encoding: 'utf8',
          });
          if (res) grepOutputs.push(...res.split('\n').filter(Boolean));
        } catch {
          // Silent catch
        }
      }
    }
  } catch {
    // Grep unavailable
  }

  const seenSites = new Set();

  for (const line of grepOutputs) {
    const parts = line.split(':');
    if (parts.length < 3) continue;
    const callerFile = parts[0].replace(/\\/g, '/');
    const lineNum = parseInt(parts[1], 10);
    const lineContent = parts.slice(2).join(':').trim();

    // Ignore self-references and context docs
    if (
      callerFile === relativeTarget ||
      callerFile.includes('.context.md') ||
      callerFile.includes('INDEX.md')
    ) {
      continue;
    }

    const key = `${callerFile}:${lineNum}`;
    if (seenSites.has(key)) continue;
    seenSites.add(key);

    callers.push({
      file: callerFile,
      line: lineNum,
      snippet: lineContent.substring(0, 100),
      isDirectImport:
        lineContent.includes('import') ||
        lineContent.includes('require') ||
        lineContent.includes('use '),
    });

    if (callers.length >= 12) break; // Cap callers for token efficiency
  }

  return callers;
}

// ── Test & Skill Discovery ──────────────────────────────────────────────────

function discoverTests(targetFilePath, workspaceRoot = process.cwd()) {
  const tests = [];
  const baseName = path.basename(targetFilePath);
  const stem = baseName.replace(/\.[^.]+$/, '');

  const testPatterns = [`${stem}.test.`, `${stem}.spec.`, `${stem}_test.`, `test_${stem}.`];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'target' ||
          entry.name === '.git' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Only walk tests dirs or immediate directories
          if (
            entry.name === 'tests' ||
            entry.name === '__tests__' ||
            entry.name === 'test' ||
            entry.name === 'crates'
          ) {
            walk(full);
          }
        } else if (entry.isFile()) {
          for (const pat of testPatterns) {
            if (entry.name.includes(pat)) {
              tests.push(path.relative(workspaceRoot, full).replace(/\\/g, '/'));
              break;
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  walk(workspaceRoot);
  return Array.from(new Set(tests)).slice(0, 5);
}

function resolveSkills(targetFilePath, content) {
  const skills = [];
  const ext = path.extname(targetFilePath).toLowerCase();
  const lowerContent = content.toLowerCase();

  if (ext === '.rs') skills.push('rust-pro');
  if (ext === '.py') skills.push('python-pro');
  if (ext === '.ts' || ext === '.tsx' || ext === '.js') {
    if (lowerContent.includes('react') || ext.endsWith('x')) skills.push('react-specialist');
    else skills.push('clean-code');
  }

  if (
    lowerContent.includes('auth') ||
    lowerContent.includes('jwt') ||
    lowerContent.includes('token') ||
    lowerContent.includes('crypto')
  ) {
    skills.push('backend-security-expert');
  }
  if (
    lowerContent.includes('query') ||
    lowerContent.includes('prisma') ||
    lowerContent.includes('sql') ||
    lowerContent.includes('database')
  ) {
    skills.push('database-architect');
  }
  if (
    lowerContent.includes('compress') ||
    lowerContent.includes('tokens') ||
    lowerContent.includes('prompt')
  ) {
    skills.push('context-engineering-pro');
  }

  skills.push('fabel-protocol');
  return Array.from(new Set(skills));
}

function resolvePath(targetPath, workspaceRoot = process.cwd()) {
  const clean = targetPath.replace(/^['"]|['"]$/g, '');
  if (path.isAbsolute(clean) && fs.existsSync(clean)) return clean;

  const direct = path.resolve(workspaceRoot, clean);
  if (fs.existsSync(direct)) return direct;

  if (clean.startsWith('tribunal-kit/') || clean.startsWith('tribunal-kit\\')) {
    const stripped = clean.replace(/^tribunal-kit[/\\]/, '');
    const strippedPath = path.resolve(workspaceRoot, stripped);
    if (fs.existsSync(strippedPath)) return strippedPath;
  }

  const parentPath = path.resolve(workspaceRoot, '..', clean);
  if (fs.existsSync(parentPath)) return parentPath;

  return direct;
}

function getDocsDir(workspaceRoot = process.cwd()) {
  const local = path.join(workspaceRoot, 'docs', 'context');
  if (fs.existsSync(local)) {
    try {
      const files = fs
        .readdirSync(local)
        .filter(f => f.endsWith('.context.md') || f.endsWith('.bridge.md'));
      if (files.length > 0) return local;
    } catch {
      // fallback
    }
  }
  const parent = path.join(workspaceRoot, '..', 'docs', 'context');
  if (fs.existsSync(parent)) {
    try {
      const files = fs
        .readdirSync(parent)
        .filter(f => f.endsWith('.context.md') || f.endsWith('.bridge.md'));
      if (files.length > 0) return parent;
    } catch {
      // fallback
    }
  }
  return local;
}

// ── Single-File Context Analysis ────────────────────────────────────────────

function analyzeSingleFile(targetPath, workspaceRoot = process.cwd()) {
  const absPath = resolvePath(targetPath, workspaceRoot);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const rawContent = fs.readFileSync(absPath, 'utf8');
  const relativePath = path.relative(workspaceRoot, absPath).replace(/\\/g, '/');
  const sourceHash = computeSha256(rawContent);
  const skeleton = extractFileSkeleton(relativePath, rawContent);
  const exportNames = skeleton.exports.map(e => e.name).concat(skeleton.types.map(t => t.name));
  const callers = findInboundCallers(absPath, exportNames, workspaceRoot);
  const tests = discoverTests(absPath, workspaceRoot);
  const skills = resolveSkills(relativePath, rawContent);

  // Determine domain layer
  let domainLayer = 'Core Logic / Utility';
  if (relativePath.includes('api') || relativePath.includes('route'))
    domainLayer = 'API / Gateway Layer';
  else if (relativePath.includes('service')) domainLayer = 'Service / Business Logic';
  else if (
    relativePath.includes('model') ||
    relativePath.includes('schema') ||
    relativePath.includes('db')
  )
    domainLayer = 'Data / Persistence Layer';
  else if (relativePath.includes('components') || relativePath.includes('ui'))
    domainLayer = 'UI / Presentation Layer';
  else if (relativePath.includes('commands')) domainLayer = 'Command / Dispatch Layer';

  return {
    mode: 'single_file',
    filePath: relativePath,
    sourceHash,
    interfaceHash: skeleton.interfaceHash,
    domainLayer,
    imports: skeleton.imports,
    exports: skeleton.exports,
    types: skeleton.types,
    landmines: skeleton.landmines,
    callers,
    tests,
    skills,
    lineCount: rawContent.split('\n').length,
    byteSize: Buffer.byteLength(rawContent, 'utf8'),
  };
}

// ── Multi-File Interface Bridge Analysis ────────────────────────────────────

function analyzeMultiFileBridge(pathA, pathB, workspaceRoot = process.cwd()) {
  const metaA = analyzeSingleFile(pathA, workspaceRoot);
  const metaB = analyzeSingleFile(pathB, workspaceRoot);

  const aImportsB = metaA.imports.some(imp =>
    imp.source.includes(path.basename(metaB.filePath).replace(/\.[^.]+$/, '')),
  );
  const bImportsA = metaB.imports.some(imp =>
    imp.source.includes(path.basename(metaA.filePath).replace(/\.[^.]+$/, '')),
  );

  const sharedTypes = [];
  const typeNamesA = new Set(metaA.types.map(t => t.name));
  for (const t of metaB.types) {
    if (typeNamesA.has(t.name)) sharedTypes.push(t.name);
  }

  return {
    mode: 'multi_file_bridge',
    fileA: metaA,
    fileB: metaB,
    coupling: {
      aImportsB,
      bImportsA,
      sharedTypes,
      relationship:
        aImportsB && bImportsA
          ? 'Bidirectional Coupling'
          : aImportsB
            ? 'A depends on B'
            : bImportsA
              ? 'B depends on A'
              : 'Sibling / Peer Modules',
    },
  };
}

// ── Directory / Project Subsystem Analysis ──────────────────────────────────

function analyzeDirectory(dirPath, workspaceRoot = process.cwd()) {
  const absDir = path.isAbsolute(dirPath) ? dirPath : path.resolve(workspaceRoot, dirPath);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    throw new Error(`Directory not found: ${absDir}`);
  }

  const relativeDir = path.relative(workspaceRoot, absDir).replace(/\\/g, '/') || '.';
  const manifests = [];
  const subsystems = [];
  let totalFiles = 0;
  const langCounts = {};

  const ignoreSet = new Set([
    'node_modules',
    'target',
    '.git',
    'dist',
    'coverage',
    '.gemini',
    'build',
  ]);

  // Check top-level manifests
  if (fs.existsSync(path.join(absDir, 'package.json'))) manifests.push('package.json');
  if (fs.existsSync(path.join(absDir, 'Cargo.toml'))) manifests.push('Cargo.toml');
  if (fs.existsSync(path.join(absDir, 'pyproject.toml'))) manifests.push('pyproject.toml');

  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreSet.has(entry.name) || entry.name.startsWith('.')) continue;
    const subFull = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      try {
        const subFiles = fs.readdirSync(subFull);
        subsystems.push({
          name: entry.name,
          fileCount: subFiles.length,
          keySample: subFiles.slice(0, 3).join(', '),
        });
      } catch {
        // Ignore unreadable
      }
    } else if (entry.isFile()) {
      totalFiles++;
      const ext = path.extname(entry.name).toLowerCase() || 'other';
      langCounts[ext] = (langCounts[ext] || 0) + 1;
    }
  }

  return {
    mode: 'directory_subsystem',
    dirPath: relativeDir,
    manifests,
    subsystems,
    directFiles: totalFiles,
    langCounts,
  };
}

// ── Markdown Dossier Generators ─────────────────────────────────────────────

function renderSingleFileDossier(data) {
  const callersTable =
    data.callers.length > 0
      ? data.callers
          .map(
            c =>
              `| \`${c.file}:${c.line}\` | \`${c.snippet}\` | ${c.isDirectImport ? 'Direct Import' : 'Symbol Reference'} |`,
          )
          .join('\n')
      : '| *None detected (potential root entrypoint or test)* | - | - |';

  const typesTable =
    data.exports.concat(data.types).length > 0
      ? data.exports
          .concat(data.types)
          .slice(0, 10)
          .map(s => `| \`${s.name}\` | \`${s.kind}\` | \`${s.signature}\` | Line ${s.line} |`)
          .join('\n')
      : '| *No explicit exported symbols detected* | - | - | - |';

  const landminesContent =
    data.landmines.length > 0
      ? data.landmines.map(l => `> [!CAUTION]\n> **Line ${l.line}:** \`${l.content}\``).join('\n\n')
      : '> [!NOTE]\n> No explicit defensive comments (`// VERIFY`, `// NOTE`, `// HACK`) found in source code.';

  const testCommand = data.tests.length > 0 ? `npm test -- ${data.tests[0]}` : `npm test`;

  return `---
version: 2.0.0
source_file: "${data.filePath}"
source_hash: "${data.sourceHash}"
interface_hash: "${data.interfaceHash}"
last_synced: "${new Date().toISOString().split('T')[0]}"
domain_layer: "${data.domainLayer}"
associated_skills:
${data.skills.map(s => `  - ${s}`).join('\n')}
associated_tests:
${data.tests.length > 0 ? data.tests.map(t => `  - ${t}`).join('\n') : '  - none'}
---

<!-- AI_QUICK_INJECT_START -->
> [!TIP]
> **AI Prompt Injection Card (Copy into future prompts touching this file):**
> \`\`\`yaml
> Target: ${data.filePath} (${data.domainLayer})
> Role: Core logic for ${path.basename(data.filePath)}.
> Exports: [${data.exports
    .map(e => e.name)
    .slice(0, 6)
    .join(', ')}]
> Inbound Callers: ${data.callers.length} active consumer sites.
> Invariant Check: Verify test passing before merge: ${testCommand}
> \`\`\`
<!-- AI_QUICK_INJECT_END -->

# 🧭 FILE DOSSIER: \`${path.basename(data.filePath)}\`
\`${data.filePath}\` • **${data.domainLayer}** • **Hash:** \`${data.sourceHash}\`

| Freshness | Blast Radius | Exports Count | Test Coverage | Primary Callers |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 **Fresh** (\`${data.sourceHash}\`) | **${data.callers.length} Callers** | **${data.exports.length} Symbols** | ${data.tests.length > 0 ? '✅ Linked (' + data.tests.length + ' files)' : '⚠️ Unlinked'} | \`${data.callers[0] ? data.callers[0].file : 'Entrypoint'}\` |

---

## ⚡ 30-Second Mental Model
> **Mission:** Implements ${data.domainLayer.toLowerCase()} responsibilities for \`${data.filePath}\`, exposing verified interfaces to callers while adhering to Tribunal safety standards.

---

## 📋 Public API & Type Contract Matrix

| Symbol | Kind | Signature | Location |
| :--- | :--- | :--- | :--- |
${typesTable}

---

## 🔗 Blast Radius & Call Topology

\`\`\`mermaid
graph LR
    classDef target fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef ext fill:#0f172a,stroke:#64748b,stroke-width:1px,color:#94a3b8;

    subgraph Inbound Callers
${
  data.callers
    .slice(0, 4)
    .map((c, i) => `        C${i}["${c.file}"]:::ext`)
    .join('\n') || '        C0["Entrypoint / CLI"]:::ext'
}
    end

    T["${path.basename(data.filePath)}"]:::target

    subgraph Dependencies
${
  data.imports
    .slice(0, 4)
    .map((imp, i) => `        D${i}["${imp.source}"]:::ext`)
    .join('\n') || '        D0["Stdlib"]:::ext'
}
    end

${
  data.callers
    .slice(0, 4)
    .map((_, i) => `    C${i} --> T`)
    .join('\n') || '    C0 --> T'
}
${
  data.imports
    .slice(0, 4)
    .map((_, i) => `    T --> D${i}`)
    .join('\n') || '    T --> D0'
}
\`\`\`

### Inbound Consumer Sites
| Caller File | Line Snippet | Vector |
| :--- | :--- | :--- |
${callersTable}

---

## ⚠️ Chesterton's Fences & Non-Obvious Quirks

${landminesContent}

---

## 🧪 Verification & Test Harness

\`\`\`bash
# Run isolated tests for this module:
${testCommand}
\`\`\`
`;
}

function renderBridgeDossier(data) {
  return `---
version: 2.0.0
bridge: "${data.fileA.filePath} <--> ${data.fileB.filePath}"
relationship: "${data.coupling.relationship}"
last_synced: "${new Date().toISOString().split('T')[0]}"
---

# 🌉 INTERFACE BRIDGE DOSSIER
**Module A:** \`${data.fileA.filePath}\`  
**Module B:** \`${data.fileB.filePath}\`  
**Coupling Relationship:** \`${data.coupling.relationship}\`

---

## 🗺️ Cross-Boundary Topology

\`\`\`mermaid
graph LR
    A["${path.basename(data.fileA.filePath)}"]
    B["${path.basename(data.fileB.filePath)}"]

    ${data.coupling.aImportsB ? 'A -->|"Imports & Calls"| B' : ''}
    ${data.coupling.bImportsA ? 'B -->|"Imports & Calls"| A' : ''}
    ${!data.coupling.aImportsB && !data.coupling.bImportsA ? 'A -.->|"Sibling / Parallel"| B' : ''}
\`\`\`

## 📦 Shared Types & Interfaces
${
  data.coupling.sharedTypes.length > 0
    ? data.coupling.sharedTypes.map(t => `- \`${t}\``).join('\n')
    : '- *No identical type names detected between modules.*'
}

## 📋 Interface Alignment Summary
- **${path.basename(data.fileA.filePath)} Exports:** ${data.fileA.exports.length} symbols.
- **${path.basename(data.fileB.filePath)} Exports:** ${data.fileB.exports.length} symbols.
`;
}

function renderDirectoryDossier(data) {
  return `---
version: 2.0.0
target_dir: "${data.dirPath}"
manifests: [${data.manifests.join(', ')}]
last_synced: "${new Date().toISOString().split('T')[0]}"
---

<!-- PROJECT_AI_ONBOARDING_CARD -->
Project Subsystem: ${data.dirPath}
Manifests: ${data.manifests.join(', ') || 'None'}
Subsystems: ${data.subsystems.map(s => s.name).join(', ')}
<!-- /PROJECT_AI_ONBOARDING_CARD -->

# 🏛️ SUBSYSTEM DOSSIER: \`${data.dirPath}\`

## 🗺️ Subsystem Architecture Clusters
\`\`\`mermaid
graph TD
${data.subsystems.map(s => `    S_${s.name}["${s.name} (${s.fileCount} files)"]`).join('\n')}
\`\`\`

## 📂 Subsystem Breakdown
| Subsystem Folder | File Count | Samples |
| :--- | :--- | :--- |
${data.subsystems.map(s => `| \`${s.name}/\` | ${s.fileCount} | \`${s.keySample}\` |`).join('\n')}
`;
}

// ── Living Vault Manager ───────────────────────────────────────────────────

function syncVaultIndex(workspaceRoot = process.cwd()) {
  const docsDir = getDocsDir(workspaceRoot);
  const indexFile = path.join(docsDir, 'INDEX.md');

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const files = fs
    .readdirSync(docsDir)
    .filter(f => f.endsWith('.context.md') || f.endsWith('.bridge.md'));

  const rows = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(docsDir, f), 'utf8');
    const sourceMatch = content.match(/source_file:\s*["']?([^"'\n]+)/);
    const bridgeMatch = content.match(/bridge:\s*["']?([^"'\n]+)/);
    const dirMatch = content.match(/target_dir:\s*["']?([^"'\n]+)/);
    const hashMatch = content.match(/source_hash:\s*["']?([^"'\n]+)/);
    const domainMatch = content.match(/domain_layer:\s*["']?([^"'\n]+)/);

    let source = f;
    let domain = 'General';
    const hash = hashMatch ? hashMatch[1] : 'n/a';
    let status = '🟢 Fresh';

    if (sourceMatch) {
      source = sourceMatch[1].replace(/["']/g, '');
      domain = domainMatch ? domainMatch[1].replace(/["']/g, '') : 'Single Module';
      const absSource = resolvePath(source, workspaceRoot);
      if (fs.existsSync(absSource)) {
        const curHash = computeSha256(fs.readFileSync(absSource, 'utf8'));
        if (curHash !== hash) {
          status = '🔴 Stale';
        }
      } else {
        status = '⚪ Missing';
      }
    } else if (bridgeMatch) {
      source = bridgeMatch[1].replace(/["']/g, '');
      domain = 'Interface Bridge';
      status = '🟢 Linked';
    } else if (dirMatch) {
      source = dirMatch[1].replace(/["']/g, '');
      domain = 'Subsystem Cluster';
      const absDir = resolvePath(source, workspaceRoot);
      status = fs.existsSync(absDir) ? '🟢 Active' : '⚪ Missing';
    }

    rows.push(`| [\`${source}\`](${f}) | ${domain} | \`${hash}\` | ${status} |`);
  }

  const indexContent = `# 📚 Codebase Context Vault Registry
> Living architectural catalog generated and verified by \`/context\`.

| Source Target | Domain Layer | Hash Snapshot | Status |
| :--- | :--- | :--- | :--- |
${rows.join('\n') || '| *No context dossiers generated yet. Run `/context <file>` to begin.* | - | - | - |'}

---
*Run \`node scripts/context_compiler.js --check\` to audit context freshness across all files.*
`;

  fs.writeFileSync(indexFile, indexContent, 'utf8');
  return { indexedCount: files.length, indexFile };
}

function checkDrift(workspaceRoot = process.cwd()) {
  const syncRes = syncVaultIndex(workspaceRoot);
  const content = fs.readFileSync(syncRes.indexFile, 'utf8');
  const staleCount = (content.match(/🔴 Stale/g) || []).length;
  const freshCount = (content.match(/🟢 Fresh/g) || []).length;

  return {
    total: syncRes.indexedCount,
    fresh: freshCount,
    stale: staleCount,
    isHealthy: staleCount === 0,
  };
}

// ── CLI Dispatcher ─────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const workspaceRoot = process.cwd();

  if (args.includes('--check')) {
    const drift = checkDrift(workspaceRoot);
    if (args.includes('--json')) {
      console.log(JSON.stringify(drift));
      process.exit(0);
    }
    console.log(`\n${C.BOLD}═══ Context Vault Drift Audit ═══${C.RESET}`);
    console.log(`Total Dossiers: ${drift.total}`);
    console.log(`🟢 Fresh:       ${drift.fresh}`);
    console.log(`🔴 Stale:       ${drift.stale}`);
    console.log(
      `Status:         ${drift.isHealthy ? C.GREEN + 'HEALTHY' : C.RED + 'DRIFT DETECTED'}${C.RESET}\n`,
    );
    process.exit(drift.isHealthy ? 0 : 1);
  }

  let fileArg = null;
  let dirArg = null;
  let multiArgs = [];
  const writeFlag = args.includes('--write');
  const jsonFlag = args.includes('--json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      fileArg = args[++i];
    } else if (args[i] === '--dir' && args[i + 1]) {
      dirArg = args[++i];
    } else if (args[i] === '--multi' && args[i + 1] && args[i + 2]) {
      multiArgs = [args[++i], args[++i]];
    } else if (!args[i].startsWith('--')) {
      if (!fileArg && !dirArg) {
        // Autodetect positional arg
        const candidate = args[i].replace(/^['"]|['"]$/g, '');
        if (fs.existsSync(candidate)) {
          if (fs.statSync(candidate).isDirectory()) {
            dirArg = candidate;
          } else {
            fileArg = candidate;
          }
        }
      }
    }
  }

  if (multiArgs.length === 2) {
    const result = analyzeMultiFileBridge(multiArgs[0], multiArgs[1], workspaceRoot);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const md = renderBridgeDossier(result);
      if (writeFlag) {
        const outName = `${path.basename(multiArgs[0]).replace(/\.[^.]+$/, '')}__${path.basename(multiArgs[1]).replace(/\.[^.]+$/, '')}.bridge.md`;
        const dest = path.join(workspaceRoot, 'docs', 'context', outName);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, md, 'utf8');
        syncVaultIndex(workspaceRoot);
        console.log(`${C.GREEN}✔ Bridge Dossier written to ${dest}${C.RESET}`);
      } else {
        console.log(md);
      }
    }
  } else if (dirArg) {
    const result = analyzeDirectory(dirArg, workspaceRoot);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const md = renderDirectoryDossier(result);
      if (writeFlag) {
        const outName = `${path.basename(dirArg)}.context.md`;
        const dest = path.join(workspaceRoot, 'docs', 'context', outName);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, md, 'utf8');
        syncVaultIndex(workspaceRoot);
        console.log(`${C.GREEN}✔ Directory Dossier written to ${dest}${C.RESET}`);
      } else {
        console.log(md);
      }
    }
  } else if (fileArg) {
    const result = analyzeSingleFile(fileArg, workspaceRoot);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const md = renderSingleFileDossier(result);
      if (writeFlag) {
        const outName = `${path.basename(fileArg).replace(/\.[^.]+$/, '')}.context.md`;
        const dest = path.join(workspaceRoot, 'docs', 'context', outName);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, md, 'utf8');
        syncVaultIndex(workspaceRoot);
        console.log(`${C.GREEN}✔ Single-File Dossier written to ${dest}${C.RESET}`);
      } else {
        console.log(md);
      }
    }
  } else {
    console.error(
      `${C.RED}Error: Provide --file <path>, --dir <path>, --multi <fileA> <fileB>, or --check${C.RESET}`,
    );
    process.exit(1);
  }
}

// Export functions for in-process MCP server use
module.exports = {
  analyzeSingleFile,
  analyzeMultiFileBridge,
  analyzeDirectory,
  renderSingleFileDossier,
  renderBridgeDossier,
  renderDirectoryDossier,
  syncVaultIndex,
  checkDrift,
};

if (require.main === module) {
  main();
}
