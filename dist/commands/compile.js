"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdCompile = cmdCompile;

const fs = require("fs");
const path = require("path");
const { log, err, ok, c, bold, _dbg } = require("../utils/logger");

async function cmdCompile(flags, quiet) {
    const cwd = process.cwd();
    const agentDir = path.join(cwd, ".agent");
    
    if (!fs.existsSync(agentDir)) {
        err("Tribunal Kit is not installed in this directory (.agent folder missing). Run 'tk init' first.");
        process.exit(1);
    }

    log(bold("Compiling Tribunal Kit rules..."));
    
    let compiledContext = "# Tribunal Kit Context\n\n";
    compiledContext += "The following are rules, agents, and skills from the Tribunal Kit.\n\n";

    // 1. Read GEMINI.md
    const geminiPath = path.join(agentDir, "rules", "GEMINI.md");
    if (fs.existsSync(geminiPath)) {
        compiledContext += "## Global Rules (GEMINI.md)\n\n";
        compiledContext += fs.readFileSync(geminiPath, "utf-8") + "\n\n";
    }

    // 2. Read Agents
    const agentsDir = path.join(agentDir, "agents");
    if (fs.existsSync(agentsDir)) {
        compiledContext += "## Agents\n\n";
        const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
        for (const file of agents) {
            const content = fs.readFileSync(path.join(agentsDir, file), "utf-8");
            compiledContext += `### Agent: ${file}\n\n`;
            compiledContext += content + "\n\n";
        }
    }

    // 3. Read Skills
    const skillsDir = path.join(agentDir, "skills");
    if (fs.existsSync(skillsDir)) {
        compiledContext += "## Skills\n\n";
        const skills = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const dirent of skills) {
            if (dirent.isDirectory()) {
                const skillPath = path.join(skillsDir, dirent.name, "SKILL.md");
                if (fs.existsSync(skillPath)) {
                    const content = fs.readFileSync(skillPath, "utf-8");
                    compiledContext += `### Skill: ${dirent.name}\n\n`;
                    compiledContext += content + "\n\n";
                }
            }
        }
    }

    // 4. Read Workflows
    const workflowsDir = path.join(agentDir, "workflows");
    if (fs.existsSync(workflowsDir)) {
        compiledContext += "## Workflows\n\n";
        const workflows = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));
        for (const file of workflows) {
            const content = fs.readFileSync(path.join(workflowsDir, file), "utf-8");
            compiledContext += `### Workflow: ${file}\n\n`;
            compiledContext += content + "\n\n";
        }
    }

    let targetFile = ".tribunal-compiled.md";
    if (flags.target) {
        if (flags.target === "aider") targetFile = ".aider.conf.yml";
        if (flags.target === "claude") targetFile = ".claude.json";
    }
    
    const outputPath = path.join(cwd, targetFile);
    fs.writeFileSync(outputPath, compiledContext, "utf-8");
    
    ok(`Compiled rules written to ${c('cyan', targetFile)}`);
    if (!quiet) {
        log(`  ${c('gray', 'Load this file into your terminal agent (e.g. Claude Code, Aider, OpenCode)')}`);
    }
}
