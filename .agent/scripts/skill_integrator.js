#!/usr/bin/env node
/**
 * skill_integrator.js — Automated Skill-Script Integration Analyzer
 *
 * This script scans active skills in `.agent/skills/` and maps them to their
 * corresponding executable scripts in `.agent/scripts/`. It helps the Orchestrator
 * and other agents know which skills have automated CLI actions available.
 *
 * Usage:
 *   node .agent/scripts/skill_integrator.js
 *   node .agent/scripts/skill_integrator.js --skill <skill-name>
 *   node .agent/scripts/skill_integrator.js --report
 *   node .agent/scripts/skill_integrator.js --verify
 *   node .agent/scripts/skill_integrator.js --report --verify
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Colors for terminal output
const CYAN   = '\x1b[96m';
const GREEN  = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED    = '\x1b[91m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const REPORT_FILE = 'skill-integration-report.md';

function findAgentDir(startPathStr) {
    let current = path.resolve(startPathStr);
    const root = path.parse(current).root;
    while (current !== root) {
        const agentDir = path.join(current, '.agent');
        if (fs.existsSync(agentDir) && fs.statSync(agentDir).isDirectory()) {
            return agentDir;
        }
        current = path.dirname(current);
    }
    return null;
}

function getAssociatedScript(skillDir, scriptsDir) {
    /** Check if the skill has an explicit frontmatter script or an implicit script file. */
    const skillName = path.basename(skillDir);

    // 1. Implicit check: does a script with the same name exist? (Check for both .js and .py)
    const implicitJsScript = path.join(scriptsDir, `${skillName}.js`);
    if (fs.existsSync(implicitJsScript)) {
        return `.agent/scripts/${skillName}.js`;
    }
    
    const implicitPyScript = path.join(scriptsDir, `${skillName}.py`);
    if (fs.existsSync(implicitPyScript)) {
        return `.agent/scripts/${skillName}.py`;
    }

    // 2. Explicit check: does the SKILL.md define 'script:' in its frontmatter?
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
        try {
            const content = fs.readFileSync(skillMd, 'utf8');
            const match = content.match(/---([\s\S]*?)---/);
            if (match) {
                const frontmatter = match[1];
                const scriptMatch = frontmatter.match(/(?:^|\n)script:\s*([^\n]+)/);
                if (scriptMatch) {
                    return scriptMatch[1].trim();
                }
            }
        } catch (err) {
            // ignore
        }
    }

    return null;
}

function scanAllSkills(agentDir) {
    const skillsDir = path.join(agentDir, 'skills');
    const scriptsDir = path.join(agentDir, 'scripts');

    if (!fs.existsSync(skillsDir) || !fs.existsSync(scriptsDir)) {
        console.log(`${YELLOW}Warning: '.agent/skills' or '.agent/scripts' directory not found.${RESET}`);
        return {};
    }

    const integratedSkills = {};
    const items = fs.readdirSync(skillsDir, { withFileTypes: true });

    // sort items by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    for (const item of items) {
        if (item.isDirectory()) {
            const skillDir = path.join(skillsDir, item.name);
            const scriptPath = getAssociatedScript(skillDir, scriptsDir);
            if (scriptPath) {
                integratedSkills[item.name] = scriptPath;
            }
        }
    }

    return integratedSkills;
}

function verifyScript(scriptPathStr, workspaceRoot) {
    /**
     * Verify a mapped script exists on disk and has valid syntax.
     * Returns { valid: boolean, message: string }.
     */
    const fullPath = path.resolve(workspaceRoot, scriptPathStr);

    if (!fs.existsSync(fullPath)) {
        return { valid: false, message: `File not found: ${fullPath}` };
    }

    try {
        if (fullPath.endsWith('.js')) {
            // use node to syntax check
            execFileSync('node', ['-c', fullPath], { stdio: 'pipe' });
        } else if (fullPath.endsWith('.py')) {
             // use python to syntax check
             execFileSync('python', ['-m', 'py_compile', fullPath], { stdio: 'pipe' });
        }
        return { valid: true, message: 'Syntax OK' };
    } catch (e) {
        let msg = e.message;
        if (e.stderr) {
            msg = e.stderr.toString().trim();
        }
        return { valid: false, message: `Syntax error: ${msg.split('\n')[0]}` };
    }
}

function checkSkill(skillName, agentDir) {
    const skillDir = path.join(agentDir, 'skills', skillName);
    const scriptsDir = path.join(agentDir, 'scripts');

    if (!fs.existsSync(skillDir)) {
        console.log(`${YELLOW}Skill '${skillName}' not found in .agent/skills/${RESET}`);
        return;
    }

    const scriptPath = getAssociatedScript(skillDir, scriptsDir);
    if (scriptPath) {
        console.log(`${GREEN}✓ Associated script found:${RESET} ${scriptPath}`);
        const runner = scriptPath.endsWith('.py') ? 'python' : 'node';
        console.log(`\nTo execute:\n  ${runner} ${scriptPath}`);
    } else {
        console.log(`No executable script mapped for '${skillName}'.`);
    }
}

function cmdReport(integratedSkills, workspaceRoot) {
    /** Write a Markdown integration report to REPORT_FILE. */
    const keys = Object.keys(integratedSkills).sort();
    const generated = new Date().toISOString().slice(0, 16);
    
    let content = `# Skill-Script Integration Report\n\n`;
    content += `Generated: ${generated}\n`;
    content += `Integrated skills: ${keys.length}\n\n`;
    content += `---\n\n`;
    content += `| Skill | Script | Exists |\n`;
    content += `|---|---|---|\n`;

    for (const skill of keys) {
        const script = integratedSkills[skill];
        const scriptPath = path.resolve(workspaceRoot, script);
        const exists = fs.existsSync(scriptPath) ? '✅' : '❌ Missing';
        content += `| \`${skill}\` | \`${script}\` | ${exists} |\n`;
    }

    content += `\n---\n\n`;
    content += `_Run \`node .agent/scripts/skill_integrator.js --verify\` to validate syntax of all mapped scripts._\n`;

    const reportPath = path.join(workspaceRoot, REPORT_FILE);
    fs.writeFileSync(reportPath, content, 'utf8');

    console.log(`${GREEN}✅ Report written to:${RESET} ${reportPath}`);
}

function cmdVerify(integratedSkills, workspaceRoot) {
    /**
     * Validate each mapped script: check existence and syntax.
     * Returns true if all pass, false if any fail.
     */
    const keys = Object.keys(integratedSkills).sort();
    if (keys.length === 0) {
        console.log(`${YELLOW}No integrated scripts found to verify.${RESET}`);
        return true;
    }

    console.log(`\n${BOLD}${CYAN}━━━ Skill-Script Verification (${keys.length} scripts) ━━━${RESET}\n`);

    let allPassed = true;
    const failures = [];

    for (const skill of keys) {
        const script = integratedSkills[skill];
        const res = verifyScript(script, workspaceRoot);
        if (res.valid) {
            console.log(`  ${GREEN}✅ PASS${RESET}  ${BOLD}${skill}${RESET} → ${script}`);
        } else {
            console.log(`  ${RED}❌ FAIL${RESET}  ${BOLD}${skill}${RESET} → ${script}`);
            console.log(`         ${RED}${res.message}${RESET}`);
            allPassed = false;
            failures.push(skill);
        }
    }

    console.log(`\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    if (allPassed) {
        console.log(`${GREEN}All ${keys.length} mapped scripts passed verification.${RESET}\n`);
    } else {
        console.log(`${RED}${failures.length} script(s) failed verification. Fix before deploying.${RESET}\n`);
    }

    return allPassed;
}

function main() {
    const rawArgs = process.argv.slice(2);
    
    if (rawArgs.length > 0 && ['-h', '--help', 'help'].includes(rawArgs[0])) {
         console.log(`
${BOLD}skill_integrator.js${RESET} — Skill-Script Integrator

${BOLD}Usage:${RESET}
  node .agent/scripts/skill_integrator.js
  node .agent/scripts/skill_integrator.js --skill <skill-name>
  node .agent/scripts/skill_integrator.js --report
  node .agent/scripts/skill_integrator.js --verify
  node .agent/scripts/skill_integrator.js --report --verify
  
${BOLD}Options:${RESET}
  --skill <name>   Validate a specific skill by name
  --workspace <dir> Workspace root directory (default: current dir)
  --report         Generate a Markdown integration report (skill-integration-report.md)
  --verify         Validate syntax of all mapped scripts (exits 1 on any failure)
`);
        return;
    }

    // Parse args
    let skillArg = null;
    let workspaceArg = '.';
    let reportArg = false;
    let verifyArg = false;

    for (let i = 0; i < rawArgs.length; i++) {
        if (rawArgs[i] === '--skill' && i + 1 < rawArgs.length) {
            skillArg = rawArgs[++i];
        } else if (rawArgs[i] === '--workspace' && i + 1 < rawArgs.length) {
            workspaceArg = rawArgs[++i];
        } else if (rawArgs[i] === '--report') {
            reportArg = true;
        } else if (rawArgs[i] === '--verify') {
            verifyArg = true;
        }
    }

    const workspaceRoot = path.resolve(workspaceArg);
    const agentDir = findAgentDir(workspaceRoot);

    if (!agentDir) {
        console.log(`${YELLOW}Error: Could not find .agent directory starting from ${workspaceRoot}${RESET}`);
        process.exit(1);
    }

    if (skillArg) {
        checkSkill(skillArg, agentDir);
        return;
    }

    const integratedSkills = scanAllSkills(agentDir);

    if (reportArg) {
        cmdReport(integratedSkills, workspaceRoot);
    }

    if (verifyArg) {
        const passed = cmdVerify(integratedSkills, workspaceRoot);
        if (!passed) {
            process.exit(1);
        }
        return;
    }

    if (!reportArg && !verifyArg) {
        const keys = Object.keys(integratedSkills).sort();
        if (keys.length === 0) {
            console.log("No integrated scripts found for any active skills.");
        } else {
            console.log(`\n${BOLD}${CYAN}--- Skill-Script Integrations (${keys.length}) ---${RESET}\n`);
            for (const skill of keys) {
                const script = integratedSkills[skill];
                console.log(` ${BOLD}${skill}${RESET}`);
                console.log(`   ↳ ${GREEN}${script}${RESET}\n`);
            }
            console.log(`${CYAN}To run a skill script, use: python <path> or node <path>${RESET}\n`);
        }
    }
}

module.exports = { getAssociatedScript, verifyScript };

if (require.main === module) {
    main();
}
