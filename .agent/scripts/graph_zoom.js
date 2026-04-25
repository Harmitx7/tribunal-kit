#!/usr/bin/env node
/**
 * graph_zoom.js — Tribunal Kit Micro Zoomer
 * Provides an "X-Ray" structural view of a specific file for AI agents,
 * stripping out internal logic to save tokens and prevent context bloat.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function getFlag(name) {
    const idx = process.argv.indexOf(name);
    return (idx !== -1 && process.argv[idx + 1]) ? process.argv[idx + 1] : null;
}

const targetFile = getFlag('--focus');

if (!targetFile) {
    console.error('\x1b[31m✖ Error: Provide a file to zoom into. Usage: node graph_zoom.js --focus <filepath>\x1b[0m');
    process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(absolutePath)) {
    console.error(`\x1b[31m✖ Error: File not found at ${absolutePath}\x1b[0m`);
    process.exit(1);
}

function extractSkeleton(content) {
    const lines = content.split('\n');
    const skeleton = [];
    
    // State machine flags
    let inClass = false;
    let braceDepth = 0;

    // ── Regex Matchers ──
    const importRegex = /^import\s+.*$/;
    const requireRegex = /^(?:const|let|var)\s+.*require\(.*$/;
    const classRegex = /^(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+[\w.]+)?/;
    const functionRegex = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w*)\s*\(([^)]*)\)/;
    const arrowFuncRegex = /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/;
    // Heuristic for React Components (starts with Capital letter)
    const reactComponentRegex = /^(?:export\s+)?(?:const|let|var)\s+([A-Z]\w+)\s*=\s*(?:[^=;]+)?=>/; 
    const typeInterfaceRegex = /^(?:export\s+)?(?:type|interface)\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) continue;

        // Keep imports
        if (importRegex.test(trimmed) || requireRegex.test(trimmed)) {
            skeleton.push(line);
            continue;
        }

        // Keep types and interfaces
        if (typeInterfaceRegex.test(trimmed)) {
            skeleton.push(line + (trimmed.endsWith('{') ? ' /* ... */ }' : ''));
            continue;
        }

        // Keep classes
        const classMatch = classRegex.exec(trimmed);
        if (classMatch) {
            skeleton.push('\n' + line + (trimmed.endsWith('{') ? '' : ' {'));
            inClass = true;
            braceDepth = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
            continue;
        }

        // Keep function signatures
        const funcMatch = functionRegex.exec(trimmed);
        if (funcMatch) {
            skeleton.push('\n' + line + (trimmed.endsWith('{') ? ' /* logic stripped */ }' : ' { /* logic stripped */ }'));
            continue;
        }

        // Keep arrow functions
        const arrowMatch = arrowFuncRegex.exec(trimmed);
        if (arrowMatch) {
            skeleton.push('\n' + line + (trimmed.endsWith('{') ? ' /* logic stripped */ }' : ' { /* logic stripped */ }'));
            continue;
        }
        
        // Keep React Components / Standard constants
        const reactMatch = reactComponentRegex.exec(trimmed);
        if (reactMatch && !arrowMatch) {
            skeleton.push('\n' + line + (trimmed.endsWith('{') ? ' /* logic stripped */ }' : ' { /* logic stripped */ }'));
            continue;
        }

        // Very basic tracking of class methods (indentation heuristic)
        if (inClass && (line.startsWith('  ') || line.startsWith('\t')) && trimmed.includes('(') && trimmed.includes(')') && !trimmed.startsWith('//')) {
             // Avoid pushing if it's just a deeply nested logic block
             if (!trimmed.startsWith('if') && !trimmed.startsWith('for') && !trimmed.startsWith('switch')) {
                 skeleton.push('  ' + trimmed + ' { /* ... */ }');
             }
        }

        // Manage class brace depth to properly close the skeleton
        if (inClass) {
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;
            if (braceDepth <= 0) {
                skeleton.push('}\n');
                inClass = false;
                braceDepth = 0;
            }
        }
    }

    return skeleton.join('\n');
}

function main() {
    console.log(`\x1b[96m✦ Zooming into: ${targetFile}\x1b[0m`);
    
    try {
        const content = fs.readFileSync(absolutePath, 'utf8');
        
        // Strip comments to make regex parsing easier
        const noComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        
        let skeleton = extractSkeleton(noComments);
        
        // Fallback Logic: If the file produced practically no useful skeleton (e.g. pure data object or failed parsing)
        if (skeleton.trim().length < 20) {
             const lines = content.split('\n');
             skeleton = `// [WARNING: Parser yielded little structure. Falling back to truncated raw file]\n` + 
                        lines.slice(0, 100).join('\n') + 
                        (lines.length > 100 ? '\n\n... (truncated)' : '');
        }
        
        console.log('\n--- SKELETON START ---');
        console.log(skeleton);
        console.log('--- SKELETON END ---\n');
        
    } catch (e) {
        console.error(`\x1b[31m✖ Error parsing file: ${e.message}\x1b[0m`);
        // Fallback Logic: Return truncated raw on hard failure
        const rawContent = fs.readFileSync(absolutePath, 'utf8').split('\n').slice(0, 100).join('\n');
        console.log('\n--- RAW FILE FALLBACK (100 lines) ---');
        console.log(rawContent);
        console.log('-------------------------------------\n');
    }
}

main();
