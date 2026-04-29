/**
 * Tribunal-Kit: Testing Patterns 2.0 (Mutation Engine)
 * 
 * Safely mutates source code and runs tests to detect false positives.
 * Includes absolute safety net for file restoration.
 * 
 * v2.1 — Context-aware mutations (skips strings/comments),
 *         line number reporting, configurable --max-mutants.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ── Mutation Definitions ──────────────────────────────────────────────────────
const MUTATIONS = [
    { name: 'Strict Equality',         pattern: /===/g,    replacement: '!==' },
    { name: 'Strict Inequality',       pattern: /!==/g,    replacement: '===' },
    { name: 'Logical AND',            pattern: /&&/g,     replacement: '||' },
    { name: 'Logical OR',             pattern: /\|\|/g,   replacement: '&&' },
    { name: 'True -> False',          pattern: /\btrue\b/g,  replacement: 'false' },
    { name: 'False -> True',          pattern: /\bfalse\b/g, replacement: 'true' },
    { name: 'Greater Than',           pattern: /(?<!=)>(?!=)/g, replacement: '<' },
    { name: 'Less Than',              pattern: /(?<!=)<(?!=)/g, replacement: '>' },
    { name: 'Return Early Removal',   pattern: /\breturn\b/g, replacement: '/* return */' },
];

// ── Context-Aware Token Map ───────────────────────────────────────────────────
// Builds a boolean mask: true = "live code", false = "inside string or comment"
function buildCodeMask(source) {
    const mask = new Array(source.length).fill(true);
    let inString = false;
    let stringChar = '';
    let inBlockComment = false;
    let inLineComment = false;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1] || '';

        if (inBlockComment) {
            mask[i] = false;
            if (ch === '*' && next === '/') {
                mask[i + 1] = false;
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (inLineComment) {
            mask[i] = false;
            if (ch === '\n') {
                inLineComment = false;
            }
            continue;
        }

        if (inString) {
            mask[i] = false;
            if (ch === '\\') {
                i++;
                if (i < source.length) mask[i] = false;
                continue;
            }
            if (ch === stringChar) {
                inString = false;
            }
            continue;
        }

        // Entering block comment
        if (ch === '/' && next === '*') {
            mask[i] = false;
            mask[i + 1] = false;
            inBlockComment = true;
            i++;
            continue;
        }

        // Entering line comment
        if (ch === '/' && next === '/') {
            mask[i] = false;
            mask[i + 1] = false;
            inLineComment = true;
            i++;
            continue;
        }

        // Entering string
        if (ch === '"' || ch === "'" || ch === '`') {
            mask[i] = false;
            inString = true;
            stringChar = ch;
            continue;
        }

        // Everything else is live code
        mask[i] = true;
    }

    return mask;
}

// ── Line Number Lookup ────────────────────────────────────────────────────────
function getLineNumber(source, charIndex) {
    let line = 1;
    for (let i = 0; i < charIndex && i < source.length; i++) {
        if (source[i] === '\n') line++;
    }
    return line;
}

// ── Safe Restore Globals ──────────────────────────────────────────────────────
let targetFile = null;
let originalContent = null;
let backupPath = null;

function safeRestore() {
    if (targetFile && originalContent) {
        try {
            fs.writeFileSync(targetFile, originalContent, 'utf-8');
        } catch (e) {
            // Last resort: tell user where the backup is
            if (backupPath) {
                console.error(`[Tribunal] CRITICAL: Could not restore file. Manual backup at: ${backupPath}`);
            }
        }
        if (backupPath && fs.existsSync(backupPath)) {
            try { fs.unlinkSync(backupPath); } catch (e) {}
        }
    }
}

// 🛑 ABSOLUTE SAFETY NET
process.on('SIGINT', () => {
    safeRestore();
    console.error('\n[Tribunal] Mutation Engine aborted. Target file restored.');
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    safeRestore();
    console.error('\n[Tribunal] Critical error. File restored.', err);
    process.exit(1);
});

process.on('exit', safeRestore);

// ── CLI Argument Parsing ──────────────────────────────────────────────────────
function parseCliArgs(argv) {
    const args = argv.slice(2);
    let maxMutants = 5;  // default per mutation type
    let fileToMutate = null;
    let testCommandParts = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--max-mutants' && args[i + 1]) {
            maxMutants = parseInt(args[i + 1], 10) || 5;
            i++; // skip next
        } else if (!fileToMutate) {
            fileToMutate = args[i];
        } else {
            testCommandParts.push(args[i]);
        }
    }

    return { fileToMutate, testCommand: testCommandParts.join(' '), maxMutants };
}

// ── Main Engine ───────────────────────────────────────────────────────────────
function runMutationTesting(fileToMutate, testCommand, maxMutantsPerType) {
    targetFile = path.resolve(fileToMutate);
    
    if (!fs.existsSync(targetFile)) {
        console.error(`ERROR: File not found: ${targetFile}`);
        process.exit(1);
    }
    
    originalContent = fs.readFileSync(targetFile, 'utf-8');
    backupPath = targetFile + '.bak';
    fs.writeFileSync(backupPath, originalContent, 'utf-8');
    
    console.log(`\n━━━ Tribunal Mutation Engine v2.1 ━━━`);
    console.log(`Target:       ${fileToMutate}`);
    console.log(`Test cmd:     ${testCommand}`);
    console.log(`Max/type:     ${maxMutantsPerType}`);
    console.log(`\nExecuting baseline test run...`);
    
    const baseline = spawnSync(testCommand, { shell: true, stdio: 'pipe' });
    if (baseline.status !== 0) {
        console.error(`ERROR: Baseline test failed! Fix your tests before mutating.`);
        console.error(baseline.stderr.toString());
        safeRestore();
        process.exit(1);
    }
    
    console.log(`Baseline passed. Building code mask & generating mutants...\n`);

    // Build the context mask once
    const codeMask = buildCodeMask(originalContent);
    
    let totalMutants = 0;
    let killedMutants = 0;
    let survivedMutants = 0;
    const survivors = []; // Track survivors for the report

    for (const mutation of MUTATIONS) {
        const regex = new RegExp(mutation.pattern.source, mutation.pattern.flags);
        const matchIndices = [];
        let m;
        
        while ((m = regex.exec(originalContent)) !== null && matchIndices.length < maxMutantsPerType) {
            // Context-aware: skip matches that are inside strings or comments
            const matchStart = m.index;
            const matchEnd = m.index + m[0].length - 1;
            const isLiveCode = codeMask[matchStart] && codeMask[matchEnd];
            
            if (isLiveCode) {
                matchIndices.push({ index: m.index, length: m[0].length, string: m[0] });
            }
        }
        
        for (const { index, length, string } of matchIndices) {
            totalMutants++;
            const lineNum = getLineNumber(originalContent, index);
            const mutatedString = string.replace(new RegExp(mutation.pattern.source), mutation.replacement);
            const mutatedContent = originalContent.substring(0, index) + mutatedString + originalContent.substring(index + length);
            
            fs.writeFileSync(targetFile, mutatedContent, 'utf-8');
            
            process.stdout.write(`  [Mutant #${totalMutants}] ${mutation.name} (L${lineNum}) ... `);
            const run = spawnSync(testCommand, { shell: true, stdio: 'pipe' });
            
            if (run.status !== 0) {
                console.log(`✅ KILLED`);
                killedMutants++;
            } else {
                console.log(`❌ SURVIVED`);
                survivedMutants++;
                survivors.push({ type: mutation.name, line: lineNum, original: string, mutated: mutatedString });
            }
            
            // Restore immediately after each mutant
            fs.writeFileSync(targetFile, originalContent, 'utf-8');
        }
    }
    
    const score = totalMutants > 0 ? Math.round((killedMutants / totalMutants) * 100) : 100;
    
    console.log(`\n━━━ Mutation Summary ━━━`);
    console.log(`  Total Mutants:  ${totalMutants}`);
    console.log(`  Killed:         ${killedMutants}`);
    console.log(`  Survived:       ${survivedMutants}`);
    console.log(`  Score:          ${score}%`);

    if (survivors.length > 0) {
        console.log(`\n━━━ Surviving Mutants (Weak Test Coverage) ━━━`);
        survivors.forEach((s, i) => {
            console.log(`  ${i + 1}. Line ${s.line}: ${s.type}  (${s.original} → ${s.mutated})`);
        });
        console.log(`\n  ⚠ These lines have no test that catches the mutation.`);
        console.log(`    Add assertions that would FAIL if the operator were swapped.`);
    }
    
    process.exit(score < 80 ? 1 : 0);
}

// ── Entry Point ───────────────────────────────────────────────────────────────
const { fileToMutate, testCommand, maxMutants } = parseCliArgs(process.argv);

if (!fileToMutate || !testCommand) {
    console.log(`Usage: node mutation_runner.js <target_file> [--max-mutants N] <test_command>`);
    console.log(`\nExamples:`);
    console.log(`  node mutation_runner.js src/math.js "npx jest src/math.test.js"`);
    console.log(`  node mutation_runner.js src/auth.js --max-mutants 10 "npx jest test/auth.test.js"`);
    process.exit(1);
}

runMutationTesting(fileToMutate, testCommand, maxMutants);
