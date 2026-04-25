#!/usr/bin/env node
/**
 * graph_builder.js — Tribunal Kit Macro Graph Mapper
 * Parses project structure for imports, exports, and dependencies
 * using incremental caching and zero external dependencies.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.join(process.cwd(), '.agent');
const HISTORY_DIR = path.join(AGENT_DIR, 'history');
const CACHE_FILE = path.join(HISTORY_DIR, 'graph-cache.json');
const GRAPH_FILE = path.join(HISTORY_DIR, 'architecture-graph.yaml');

// ── Exclusions & Safety ───────────────────────────────────────────────────────
const DEFAULT_EXCLUSIONS = new Set([
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.agent', 'artifacts'
]);

function loadGitIgnore() {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (!fs.existsSync(gitignorePath)) return [];
    
    return fs.readFileSync(gitignorePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        // simplistic conversion from gitignore line to path check
        .map(line => line.replace(/\/$/, '').replace(/^\//, '')); 
}

const customExclusions = loadGitIgnore();

function isExcluded(filePath) {
    const parts = filePath.split(path.sep);
    
    // 1. Check against critical defaults (OOM prevention)
    if (parts.some(p => DEFAULT_EXCLUSIONS.has(p))) return true;
    
    // 2. Check against .gitignore rules
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    for (const pattern of customExclusions) {
        if (relativePath.includes(pattern)) return true;
    }
    return false;
}

// ── Traversal ─────────────────────────────────────────────────────────────────
function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir) || isExcluded(dir)) return fileList;

    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (err) {
        return fileList; // Permission denied or similar
    }

    for (const file of files) {
        const filePath = path.join(dir, file);
        if (isExcluded(filePath)) continue;

        if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
        } else {
            // Target standard JS/TS ecosystem files
            if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(file)) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

// ── Regex AST Extraction ──────────────────────────────────────────────────────
function parseFile(content) {
    const imports = new Set();
    const exports = new Set();

    // Strip comments to prevent false positives in regex
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    // Import extractors
    const importRegex = /import(?:(?:[\w*\s{},]*)\sfrom\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

    // Export extractors
    const exportRegex = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g;
    const moduleExportRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
    const defaultExportRegex = /export\s+default\s+([a-zA-Z0-9_]+)/g;

    let match;
    while ((match = importRegex.exec(cleanContent)) !== null) imports.add(match[1]);
    while ((match = requireRegex.exec(cleanContent)) !== null) imports.add(match[1]);
    while ((match = dynamicImportRegex.exec(cleanContent)) !== null) imports.add(match[1]);

    while ((match = exportRegex.exec(cleanContent)) !== null) exports.add(match[1]);
    while ((match = defaultExportRegex.exec(cleanContent)) !== null) exports.add(match[1]);
    
    // Extractor for module.exports = { a, b, c }
    while ((match = moduleExportRegex.exec(cleanContent)) !== null) {
        const tokens = match[1].split(',').map(s => s.trim().split(':')[0].trim());
        tokens.forEach(t => t && exports.add(t));
    }

    return {
        imports: Array.from(imports),
        exports: Array.from(exports)
    };
}

// ── YAML Generation ───────────────────────────────────────────────────────────
function generateYAML(data) {
    let yaml = '# Auto-generated Architecture Graph by Tribunal Kit\n';
    yaml += '# DO NOT EDIT MANUALLY - Auto-updates via incremental cache\n\n';
    
    for (const [file, info] of Object.entries(data)) {
        // Only include files that actually export or import things to reduce noise
        if (info.imports.length === 0 && info.exports.length === 0) continue;

        yaml += `"${file}":\n`;
        if (info.imports && info.imports.length > 0) {
            yaml += `  imports:\n`;
            info.imports.forEach(i => yaml += `    - "${i}"\n`);
        }
        if (info.exports && info.exports.length > 0) {
            yaml += `  exports:\n`;
            info.exports.forEach(e => yaml += `    - "${e}"\n`);
        }
    }
    return yaml;
}

// ── Main Execution ────────────────────────────────────────────────────────────
function main() {
    if (!fs.existsSync(AGENT_DIR)) {
        console.error('\x1b[31m✖ Error: .agent directory not found. Please run tribunal-kit init first.\x1b[0m');
        process.exit(1);
    }

    if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    // 1. Load incremental cache
    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
        try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch(e) {}
    }

    console.log('\x1b[96m✦ Building Architecture Graph...\x1b[0m');
    const files = walkDir(process.cwd());
    const graphData = {};

    let parsedCount = 0;
    let cachedCount = 0;

    // 2. Parse or hit cache
    for (const file of files) {
        const stat = fs.statSync(file);
        const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

        if (cache[relativePath] && cache[relativePath].mtimeMs === stat.mtimeMs) {
            graphData[relativePath] = { imports: cache[relativePath].imports, exports: cache[relativePath].exports };
            cachedCount++;
        } else {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const parsed = parseFile(content);
                graphData[relativePath] = parsed;
                
                cache[relativePath] = {
                    mtimeMs: stat.mtimeMs,
                    imports: parsed.imports,
                    exports: parsed.exports
                };
                parsedCount++;
            } catch (err) {
                // Graceful fallback on unreadable files
                console.warn(`\x1b[33m  ⚠ Skipping unreadable file: ${relativePath}\x1b[0m`);
            }
        }
    }

    // 3. Save states
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    const yamlOutput = generateYAML(graphData);
    fs.writeFileSync(GRAPH_FILE, yamlOutput);

    console.log(`\n\x1b[32m✔ Graph successfully built.\x1b[0m`);
    console.log(`  \x1b[2mParsed: ${parsedCount} files | Cached: ${cachedCount} files\x1b[0m`);
    console.log(`  \x1b[2mSaved to: ${GRAPH_FILE}\x1b[0m`);
}

main();
