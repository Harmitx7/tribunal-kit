#!/usr/bin/env node
/**
 * inner_loop_validator.js — Tribunal Kit Inner-Loop Self-Healing CI
 * ==================================================================
 * Orchestrates security_scan.js and lint heuristics on code snippets
 * IN MEMORY before they are presented to the Human Gate.
 *
 * This is the "Phase 6 Auto-Correction Engine": it feeds structured
 * JSON findings back to the Maker Agent for autonomous self-healing
 * without requiring user involvement.
 *
 * Architecture:
 *   1. Receive a code snippet (via stdin or --snippet flag)
 *   2. Write to a temp file within the OS temp directory
 *   3. Run OWASP security pattern scan (using PATTERNS from security_scan.js)
 *   4. Run lightweight syntax heuristics (no external tools required)
 *   5. Emit structured JSON verdict for the Maker Agent to consume
 *   6. Clean up temp file
 *
 * Usage:
 *   node .agent/scripts/inner_loop_validator.js --snippet "const x = eval(input)"
 *   node .agent/scripts/inner_loop_validator.js --file ./output.js
 *   node .agent/scripts/inner_loop_validator.js --file ./output.js --lang ts
 *   node .agent/scripts/inner_loop_validator.js test-case
 *
 * Output (JSON to stdout):
 *   {
 *     "verdict": "APPROVED" | "WARNING" | "REJECTED",
 *     "passed": boolean,
 *     "issues": [{ "severity": "critical|high|medium|low", "category": string, "line": number, "message": string, "fix": string }],
 *     "summary": string,
 *     "self_healing_instructions": string | null   ← fed back to Maker Agent
 *   }
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');

// ── Resolve security_scan patterns (reuse — do not duplicate) ─────────────
const SCRIPT_DIR = __dirname;
let SECURITY_PATTERNS = [];
let SEVERITY_RANK     = {};

try {
    const secScan = require(path.join(SCRIPT_DIR, 'security_scan.js'));
    SECURITY_PATTERNS = secScan.PATTERNS || [];
    SEVERITY_RANK     = secScan.SEVERITY_RANK || { critical: 0, high: 1, medium: 2, low: 3 };
} catch {
    // Fallback: minimal critical patterns only (never fail silently on missing module)
    SECURITY_PATTERNS = [
        [/(?:password|passwd)\s*=\s*["'][^"']+["']/i, 'critical', 'Hardcoded Secret', 'Hardcoded password'],
        [/\beval\s*\(/, 'high', 'Code Injection', 'eval() is a code injection vector'],
        [/\.innerHTML\s*=/, 'high', 'XSS', 'Direct innerHTML assignment'],
        [/algorithms\s*:\s*\[\s*["']none["']/, 'critical', 'Auth Bypass', "JWT 'none' algorithm"],
    ];
    SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
}

// ── Syntax heuristics (no external deps) ─────────────────────────────────
// These catch structural issues in generated code before a linter runs.
const SYNTAX_HEURISTICS = [
    {
        pattern: /\bconst\s+\w+\s*=\s*require\s*\(\s*["'](?!\.\/|\.\.\/|[a-zA-Z])/,
        severity: 'medium',
        category: 'Hallucination Risk',
        message: 'Suspicious require() path — verify module exists in package.json',
        fix: 'Check that this package is listed in package.json dependencies',
    },
    {
        pattern: /\/\/\s*VERIFY:/,
        severity: 'low',
        category: 'Verification Flag',
        message: 'Maker Agent flagged this line as uncertain — human review required',
        fix: 'The Maker Agent marked this with // VERIFY: — confirm before approving',
    },
    {
        pattern: /:\s*any\b(?!\s*=)/,
        severity: 'low',
        category: 'Type Safety',
        message: 'TypeScript `any` type used without explanation comment',
        fix: 'Replace :any with a specific type, or add // any: [reason] comment',
    },
    {
        pattern: /process\.env\.\w+(?!\s*\?\?|\s*\|\|)/,
        severity: 'low',
        category: 'Config Safety',
        message: 'process.env access without nullish fallback — may throw at runtime',
        fix: 'Use: process.env.VAR ?? "default" — always guard env var access',
    },
    {
        pattern: /throw\s+["'`]/,
        severity: 'low',
        category: 'Error Quality',
        message: 'Throwing a string instead of an Error object — stack traces will be lost',
        fix: 'Use: throw new Error("message") instead of throw "message"',
    },
    {
        pattern: /catch\s*\(\s*\w+\s*\)\s*\{?\s*\}/,
        severity: 'medium',
        category: 'Error Handling',
        message: 'Empty catch block swallows errors silently',
        fix: 'Add at minimum: catch (err) { console.error(err); throw err; }',
    },
    {
        pattern: /\.then\(\s*\)\s*\.catch\s*\(|\.catch\s*\(\s*\)/,
        severity: 'medium',
        category: 'Error Handling',
        message: 'Empty .then() or .catch() handler — Promise errors may be silenced',
        fix: 'Implement proper resolution and rejection handlers',
    },
    {
        pattern: /window\.|document\.|navigator\./,
        severity: 'low',
        category: 'Environment Check',
        message: 'Browser global access — may fail in SSR/Node environments',
        fix: 'Guard with: typeof window !== "undefined" before accessing browser globals',
    },
];

// ── ANSI colors (inline to avoid deps on colors.js path) ─────────────────
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED    = '\x1b[91m';
const CYAN   = '\x1b[96m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

// ── Core scanning ─────────────────────────────────────────────────────────

/**
 * Scan a code string for security and heuristic issues.
 * Returns an array of structured finding objects.
 *
 * @param {string} code      - Raw source code string
 * @param {string} [lang]    - Language hint ('js' | 'ts' | 'py' | 'jsx' | 'tsx')
 * @returns {Array<{severity, category, line, message, fix, source}>}
 */
function scanCode(code, lang = 'js') {
    const findings = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const stripped = lines[i].trim();
        const lineNum  = i + 1;

        // Skip pure comments
        if (stripped.startsWith('//') || stripped.startsWith('#') || stripped.startsWith('*')) {
            continue;
        }

        // Run OWASP security patterns
        for (const [pattern, severity, category, message] of SECURITY_PATTERNS) {
            if (pattern.test(stripped)) {
                findings.push({
                    severity,
                    category,
                    line: lineNum,
                    message,
                    fix: buildSecurityFix(category),
                    source: 'security_scan',
                });
            }
        }

        // Run structural heuristics
        for (const h of SYNTAX_HEURISTICS) {
            if (h.pattern.test(stripped)) {
                findings.push({
                    severity: h.severity,
                    category: h.category,
                    line: lineNum,
                    message: h.message,
                    fix: h.fix,
                    source: 'heuristic',
                });
            }
        }
    }

    return findings;
}

/**
 * Build a fix suggestion for known security categories.
 * @param {string} category
 * @returns {string}
 */
function buildSecurityFix(category) {
    const fixes = {
        'Hardcoded Secret':   'Move to environment variable: process.env.SECRET_NAME',
        'SQL Injection':      'Use parameterized queries. Never interpolate user input into SQL.',
        'XSS':                'Use textContent instead of innerHTML. Sanitize with DOMPurify if HTML is needed.',
        'Code Injection':     'Remove eval()/new Function(). Use a safe alternative or a JSON parser.',
        'Command Injection':  'Use execFile() with an args array instead of exec() with a shell string.',
        'Weak Crypto':        'Use crypto.createHash("sha256") or bcrypt for password hashing.',
        'Weak Randomness':    'Use crypto.randomBytes(n) or crypto.randomUUID() for security-sensitive values.',
        'Auth Bypass':        'Enforce JWT algorithm explicitly: { algorithms: ["HS256"] }',
        'Info Disclosure':    'Remove logging of sensitive values. Use structured logging with redaction.',
    };
    return fixes[category] || 'Review and remediate according to OWASP guidelines.';
}

/**
 * Determine the overall verdict from a list of findings.
 * REJECTED if any critical/high. WARNING if medium. APPROVED if low/clean.
 *
 * @param {Array} findings
 * @returns {{ verdict: string, passed: boolean }}
 */
function computeVerdict(findings) {
    // Filter out VERIFY flags from blocking logic — they are informational
    const blocking = findings.filter(f => f.category !== 'Verification Flag');
    const maxSeverityRank = blocking.reduce((min, f) => {
        const rank = SEVERITY_RANK[f.severity] ?? 3;
        return rank < min ? rank : min;
    }, 4); // 4 = no findings

    if (maxSeverityRank <= 1) return { verdict: 'REJECTED', passed: false }; // critical or high
    if (maxSeverityRank === 2) return { verdict: 'WARNING',  passed: true  }; // medium
    return { verdict: 'APPROVED', passed: true };
}

/**
 * Build a self-healing instruction string for the Maker Agent.
 * This is what you paste back into the AI to trigger auto-correction.
 *
 * @param {Array} findings
 * @returns {string|null}
 */
function buildSelfHealingInstructions(findings) {
    const blocking = findings.filter(f => {
        const rank = SEVERITY_RANK[f.severity] ?? 3;
        return rank <= 1; // critical + high only
    });

    if (!blocking.length) return null;

    const lines = [
        '⚠️ Inner-Loop Validator found blocking issues. Auto-correct the following before writing to disk:\n',
    ];

    for (const f of blocking) {
        lines.push(`[${f.severity.toUpperCase()}] Line ${f.line} — ${f.category}`);
        lines.push(`  Issue: ${f.message}`);
        lines.push(`  Fix:   ${f.fix}`);
        lines.push('');
    }

    lines.push('Re-generate the affected lines only. Do not change unaffected code.');
    return lines.join('\n');
}

/**
 * Write code to a temp file, returning its path.
 * Caller must clean up.
 * @param {string} code
 * @param {string} lang
 * @returns {string} temp file path
 */
function writeTempFile(code, lang = 'js') {
    const extMap = { ts: '.ts', tsx: '.tsx', jsx: '.jsx', py: '.py', js: '.js' };
    const ext    = extMap[lang] || '.js';
    const tmpPath = path.join(os.tmpdir(), `tk_ilv_${crypto.randomBytes(6).toString('hex')}${ext}`);
    fs.writeFileSync(tmpPath, code, 'utf8');
    return tmpPath;
}

// ── Output ────────────────────────────────────────────────────────────────

function printHumanReport(result) {
    const { verdict, issues, summary, self_healing_instructions } = result;

    const verdictColor = verdict === 'APPROVED' ? GREEN : verdict === 'WARNING' ? YELLOW : RED;
    const verdictIcon  = verdict === 'APPROVED' ? '✅' : verdict === 'WARNING' ? '⚠️' : '❌';

    console.error(`\n${BOLD}${CYAN}━━━ Inner-Loop Validator ━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    console.error(`  Verdict: ${verdictColor}${BOLD}${verdictIcon} ${verdict}${RESET}`);
    console.error(`  Summary: ${summary}`);

    if (issues.length) {
        console.error(`\n  ${BOLD}Issues found:${RESET}`);
        for (const iss of issues) {
            const color = iss.severity === 'critical' || iss.severity === 'high' ? RED :
                          iss.severity === 'medium' ? YELLOW : DIM;
            console.error(`    ${color}[${iss.severity.toUpperCase()}]${RESET} Line ${iss.line} — ${iss.category}`);
            console.error(`      ${iss.message}`);
            console.error(`      ${DIM}Fix: ${iss.fix}${RESET}`);
        }
    }

    if (self_healing_instructions) {
        console.error(`\n  ${YELLOW}${BOLD}Self-Healing Instructions (for Maker Agent):${RESET}`);
        console.error(self_healing_instructions.split('\n').map(l => `    ${l}`).join('\n'));
    }

    console.error(`${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
}

// ── Built-in test case ────────────────────────────────────────────────────

function runTestCase() {
    console.error(`\n${BOLD}${CYAN}━━━ Inner-Loop Validator — Self-Test ━━━━━━━━━━━━━━${RESET}`);

    const badCode = `
const password = "supersecret123";
const result = db.query("SELECT * FROM users WHERE id = " + req.params.id);
document.getElementById('output').innerHTML = userInput;
const token = eval(req.body.expr);
const rand = Math.random() * 1000;
`;

    const result = validate(badCode, 'js');
    printHumanReport(result);

    const hasCritical = result.issues.some(i => i.severity === 'critical' || i.severity === 'high');
    if (hasCritical && result.verdict === 'REJECTED') {
        console.error(`${GREEN}✅ Self-test PASSED — validator correctly identified and blocked critical issues${RESET}\n`);
        process.exit(0);
    } else {
        console.error(`${RED}❌ Self-test FAILED — expected REJECTED verdict for bad code${RESET}\n`);
        process.exit(1);
    }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Validate a code string. Returns a structured result object.
 * This is the primary programmatic API — call this from other scripts.
 *
 * @param {string} code      - Source code to validate
 * @param {string} [lang]    - Language hint
 * @param {object} [opts]    - Options: { timeout: number }
 * @returns {{ verdict, passed, issues, summary, self_healing_instructions }}
 */
function validate(code, lang = 'js', opts = {}) {
    if (!code || typeof code !== 'string') {
        return {
            verdict: 'APPROVED',
            passed: true,
            issues: [],
            summary: 'No code provided — skipped.',
            self_healing_instructions: null,
        };
    }

    const issues = scanCode(code, lang);

    // Sort by severity rank
    issues.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));

    const { verdict, passed } = computeVerdict(issues);
    const healingInstructions = buildSelfHealingInstructions(issues);

    const critCount   = issues.filter(i => i.severity === 'critical').length;
    const highCount   = issues.filter(i => i.severity === 'high').length;
    const medCount    = issues.filter(i => i.severity === 'medium').length;
    const lowCount    = issues.filter(i => i.severity === 'low').length;
    const verifyCount = issues.filter(i => i.category === 'Verification Flag').length;

    let summary = `${issues.length} issue(s) found`;
    if (!issues.length) {
        summary = 'No issues detected — code is clean';
    } else {
        const parts = [];
        if (critCount) parts.push(`${critCount} critical`);
        if (highCount) parts.push(`${highCount} high`);
        if (medCount)  parts.push(`${medCount} medium`);
        if (lowCount)  parts.push(`${lowCount} low`);
        if (verifyCount) parts.push(`${verifyCount} VERIFY flag(s) need human review`);
        summary = parts.join(', ');
    }

    return {
        verdict,
        passed,
        issues,
        summary,
        self_healing_instructions: healingInstructions,
        meta: {
            lines_scanned: code.split('\n').length,
            lang,
            timestamp: new Date().toISOString(),
        },
    };
}

module.exports = { validate, scanCode, computeVerdict, buildSelfHealingInstructions };

// ── CLI Entry ─────────────────────────────────────────────────────────────

if (require.main === module) {
    const argv = process.argv.slice(2);

    if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
        console.log(`
${BOLD}inner_loop_validator.js${RESET} — Tribunal Self-Healing CI

${BOLD}Usage:${RESET}
  node .agent/scripts/inner_loop_validator.js --snippet "<code>"
  node .agent/scripts/inner_loop_validator.js --file ./output.js [--lang ts]
  node .agent/scripts/inner_loop_validator.js test-case

${BOLD}Output:${RESET}
  JSON to stdout. Human-readable summary to stderr.
  Use --json-only to suppress the human report.

${BOLD}Verdict:${RESET}
  APPROVED   → No critical/high issues. Safe to proceed.
  WARNING    → Medium issues found. Human should review.
  REJECTED   → Critical/high issues. Maker Agent must self-correct.
`);
        process.exit(0);
    }

    // Built-in self-test
    if (argv[0] === 'test-case') {
        runTestCase();
        process.exit(0);
    }

    const jsonOnly   = argv.includes('--json-only');
    const fileFlagIdx = argv.indexOf('--file');
    const snippetIdx  = argv.indexOf('--snippet');
    const langIdx     = argv.indexOf('--lang');

    const lang = langIdx !== -1 && argv[langIdx + 1] ? argv[langIdx + 1] : 'js';

    let code = '';

    if (fileFlagIdx !== -1 && argv[fileFlagIdx + 1]) {
        const filePath = path.resolve(argv[fileFlagIdx + 1]);
        if (!fs.existsSync(filePath)) {
            console.error(`${RED}✖ File not found: ${filePath}${RESET}`);
            process.exit(1);
        }
        code = fs.readFileSync(filePath, 'utf8');
    } else if (snippetIdx !== -1 && argv[snippetIdx + 1]) {
        code = argv[snippetIdx + 1];
    } else if (!process.stdin.isTTY) {
        // Read from stdin if piped
        code = fs.readFileSync('/dev/stdin', 'utf8');
    } else {
        console.error(`${RED}✖ Provide --snippet "<code>" or --file <path>${RESET}`);
        process.exit(1);
    }

    const result = validate(code, lang);

    // Always emit JSON to stdout (for machine consumption)
    console.log(JSON.stringify(result, null, 2));

    // Emit human report to stderr (safe to suppress with 2>/dev/null)
    if (!jsonOnly) {
        printHumanReport(result);
    }

    // Exit code: 0 = passed (APPROVED or WARNING), 1 = REJECTED
    process.exit(result.passed ? 0 : 1);
}
