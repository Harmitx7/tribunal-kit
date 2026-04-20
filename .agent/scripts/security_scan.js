#!/usr/bin/env node
/**
 * security_scan.js — Deep security scanner for the Tribunal Agent Kit.
 *
 * Checks for OWASP Top 10 patterns in source code:
 *   - Hardcoded secrets and credentials
 *   - SQL injection patterns (string concatenation in queries)
 *   - XSS-prone code (innerHTML, dangerouslySetInnerHTML)
 *   - Insecure eval() usage
 *   - Missing auth patterns
 *   - Insecure crypto usage
 *
 * ⚠️  DISCLAIMER: This is a heuristic regex-based pattern scanner, NOT a
 * full static analysis tool. It may produce false positives (e.g., test
 * fixtures containing 'password') and cannot detect indirect vulnerabilities
 * (e.g., SQL injection via variable indirection). For production security
 * auditing, supplement with dedicated tools like Semgrep, CodeQL, or Snyk.
 *
 * Usage:
 *   node .agent/scripts/security_scan.js .
 *   node .agent/scripts/security_scan.js . --severity high
 *   node .agent/scripts/security_scan.js . --files src/auth.ts src/db.ts
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ━━━ ANSI colors ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RED     = '\x1b[91m';
const GREEN   = '\x1b[92m';
const YELLOW  = '\x1b[93m';
const BLUE    = '\x1b[94m';
const MAGENTA = '\x1b[95m';
const BOLD    = '\x1b[1m';
const RESET   = '\x1b[0m';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb']);
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', '__pycache__', '.agent',
    '.next', 'vendor', 'coverage', 'lcov-report', '.nyc_output',
    'test-results', '.jest-cache',
]);

const SEVERITY_COLORS = {
    critical: RED + BOLD,
    high:     RED,
    medium:   YELLOW,
    low:      BLUE,
};

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

// Pattern definitions: [regex, severity, category, message]
const PATTERNS = [
    // Secrets
    [/(?:password|passwd|pwd)\s*=\s*["'][^"']+["']/i, 'critical', 'Hardcoded Secret', 'Hardcoded password detected'],
    [/(?:api_key|apikey|api_secret)\s*=\s*["'][^"']+["']/i, 'critical', 'Hardcoded Secret', 'Hardcoded API key detected'],
    [/(?:secret|token|auth_token)\s*=\s*["'][A-Za-z0-9+/=]{16,}["']/i, 'critical', 'Hardcoded Secret', 'Hardcoded secret/token detected'],
    [/(?:PRIVATE_KEY|private_key)\s*=\s*["']/i, 'critical', 'Hardcoded Secret', 'Hardcoded private key detected'],

    // SQL Injection
    [/(?:query|execute|raw)\s*\(\s*[`"'].*\$\{/i, 'high', 'SQL Injection', 'String interpolation in SQL query — use parameterized queries'],
    [/(?:query|execute|raw)\s*\(\s*["'].*\+\s*(?:req|input|params|body)/i, 'high', 'SQL Injection', 'String concatenation with user input in SQL'],
    [/\.raw\s*\(\s*`/, 'medium', 'SQL Injection', 'Raw query with template literal — verify inputs are sanitized'],

    // XSS
    [/\.innerHTML\s*=/, 'high', 'XSS', 'Direct innerHTML assignment — use textContent or a sanitizer'],
    [/dangerouslySetInnerHTML/, 'medium', 'XSS', 'dangerouslySetInnerHTML used — ensure input is sanitized'],
    [/document\.write\s*\(/, 'high', 'XSS', 'document.write() is an XSS vector'],

    // Insecure Functions
    [/\beval\s*\(/, 'high', 'Code Injection', 'eval() is a code injection vector — avoid entirely'],
    [/new\s+Function\s*\(/, 'high', 'Code Injection', 'new Function() is equivalent to eval()'],
    [/child_process\.exec\s*\(/, 'medium', 'Command Injection', 'exec() with unsanitized input is a command injection vector'],
    [/subprocess\.call\s*\(\s*[^,\]]*\bshell\s*=\s*True/, 'high', 'Command Injection', 'subprocess with shell=True — use shell=False and pass args as list'],

    // Crypto
    [/createHash\s*\(\s*["']md5["']/, 'medium', 'Weak Crypto', 'MD5 is cryptographically broken — use SHA-256+'],
    [/createHash\s*\(\s*["']sha1["']/, 'medium', 'Weak Crypto', 'SHA-1 is deprecated — use SHA-256+'],
    [/Math\.random\s*\(/, 'low', 'Weak Randomness', 'Math.random() is not cryptographically secure — use crypto.randomBytes()'],

    // Auth Issues
    [/algorithms\s*:\s*\[\s*["']none["']/, 'critical', 'Auth Bypass', "JWT 'none' algorithm allows auth bypass"],
    [/verify\s*:\s*false/, 'high', 'Auth Bypass', 'SSL/TLS verification disabled'],
    [/rejectUnauthorized\s*:\s*false/, 'high', 'Auth Bypass', 'TLS certificate validation disabled'],

    // Information Disclosure
    [/console\.log\s*\(.*(?:password|secret|token|key)/i, 'medium', 'Info Disclosure', 'Sensitive data logged to console'],
    [/\.env(?:\.local|\.production)/, 'low', 'Info Disclosure', 'Env file reference — ensure not committed to git'],
];


/**
 * Scan a single file for security patterns.
 * @param {string} filepath - Absolute path to the file.
 * @param {string} projectRoot - Project root for relative path computation.
 * @returns {Array<{severity:string, category:string, file:string, line:number, message:string, snippet:string}>}
 */
function scanFile(filepath, projectRoot) {
    const findings = [];
    const relPath = path.relative(projectRoot, filepath);

    let content;
    try {
        content = fs.readFileSync(filepath, 'utf8');
    } catch {
        return findings;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const stripped = lines[i].trim();
        // Skip comments
        if (stripped.startsWith('//') || stripped.startsWith('#') || stripped.startsWith('*')) {
            continue;
        }

        for (const [pattern, severity, category, message] of PATTERNS) {
            if (pattern.test(stripped)) {
                findings.push({
                    severity,
                    category,
                    file: relPath,
                    line: i + 1,
                    message,
                    snippet: stripped.slice(0, 120),
                });
            }
        }
    }

    return findings;
}


/**
 * Recursively walk a directory yield file paths.
 * @param {string} dir - Directory to walk.
 * @param {Set<string>} skipDirs - Directory names to skip.
 * @returns {string[]} Array of file paths.
 */
function walkDir(dir, skipDirs) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) {
                results.push(...walkDir(path.join(dir, entry.name), skipDirs));
            }
        } else if (entry.isFile()) {
            results.push(path.join(dir, entry.name));
        }
    }
    return results;
}


/**
 * Scan all source files in a directory.
 * @param {string} projectRoot - Root directory to scan.
 * @param {string[]|null} targetFiles - Specific files to scan, or null for full scan.
 * @returns {Array} Array of finding objects.
 */
function scanDirectory(projectRoot, targetFiles) {
    const allFindings = [];

    if (targetFiles && targetFiles.length > 0) {
        for (const fpath of targetFiles) {
            const absPath = path.isAbsolute(fpath) ? fpath : path.join(projectRoot, fpath);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
                allFindings.push(...scanFile(absPath, projectRoot));
            }
        }
        return allFindings;
    }

    const files = walkDir(projectRoot, SKIP_DIRS);
    for (const filepath of files) {
        const ext = path.extname(filepath);
        if (!SOURCE_EXTENSIONS.has(ext)) continue;
        allFindings.push(...scanFile(filepath, projectRoot));
    }

    return allFindings;
}


/**
 * Print findings filtered by minimum severity. Returns count of displayed findings.
 */
function printFindings(findings, minSeverity) {
    const minRank = SEVERITY_RANK[minSeverity] ?? 3;
    const filtered = findings
        .filter(f => (SEVERITY_RANK[f.severity] ?? 3) <= minRank)
        .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));

    if (filtered.length === 0) {
        console.log(`\n  ${GREEN}✅ No security issues found at severity '${minSeverity}' or above${RESET}`);
        return 0;
    }

    let currentCategory = '';
    for (const finding of filtered) {
        if (finding.category !== currentCategory) {
            currentCategory = finding.category;
            console.log(`\n  ${BOLD}${currentCategory}${RESET}`);
        }
        const color = SEVERITY_COLORS[finding.severity] || '';
        console.log(`    ${color}[${finding.severity.toUpperCase()}]${RESET} ${finding.file}:${finding.line}`);
        console.log(`      ${finding.message}`);
        console.log(`      ${MAGENTA}→ ${finding.snippet}${RESET}`);
    }

    return filtered.length;
}


/**
 * Parse CLI arguments manually (no external dependencies).
 */
function parseArgs(argv) {
    const args = { path: null, severity: 'low', files: null };
    const raw = argv.slice(2);

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '--severity' && raw[i + 1]) {
            args.severity = raw[++i];
        } else if (raw[i] === '--files') {
            args.files = [];
            while (i + 1 < raw.length && !raw[i + 1].startsWith('--')) {
                args.files.push(raw[++i]);
            }
        } else if (!raw[i].startsWith('--') && !args.path) {
            args.path = raw[i];
        }
    }
    return args;
}


function main() {
    const args = parseArgs(process.argv);

    if (!args.path) {
        console.error(`Usage: node security_scan.js <path> [--severity critical|high|medium|low] [--files ...]`);
        process.exit(1);
    }

    const projectRoot = path.resolve(args.path);
    if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        console.error(`  ${RED}❌ Directory not found: ${projectRoot}${RESET}`);
        process.exit(1);
    }

    console.log(`${BOLD}Tribunal — security_scan.js${RESET}`);
    console.log(`Project: ${projectRoot}`);
    console.log(`Severity filter: ${args.severity}+`);

    const findings = scanDirectory(projectRoot, args.files);
    const count = printFindings(findings, args.severity);

    // Summary
    console.log(`\n${BOLD}━━━ Security Scan Summary ━━━${RESET}`);
    const bySeverity = {};
    for (const f of findings) {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }

    for (const sev of ['critical', 'high', 'medium', 'low']) {
        const c = bySeverity[sev] || 0;
        if (c > 0) {
            const color = SEVERITY_COLORS[sev] || '';
            console.log(`  ${color}${sev.toUpperCase()}: ${c}${RESET}`);
        }
    }

    if (count === 0) {
        console.log(`  ${GREEN}✅ No issues found — scan passed${RESET}`);
    } else {
        const criticalHigh = (bySeverity.critical || 0) + (bySeverity.high || 0);
        if (criticalHigh > 0) {
            console.log(`\n  ${RED}${BOLD}⚠️  ${criticalHigh} critical/high issue(s) require immediate attention${RESET}`);
        }
    }

    process.exit((bySeverity.critical || 0) > 0 ? 1 : 0);
}


// ━━━ Exports for testing & programmatic use ━━━
module.exports = { scanFile, scanDirectory, printFindings, PATTERNS, SEVERITY_RANK };

if (require.main === module) {
    main();
}
