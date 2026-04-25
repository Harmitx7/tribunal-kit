const fs = require('fs');
const path = require('path');

// Simple Markdown frontmatter and Tribunal header validator
function validateMarkdownFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let errors = [];

    // Check for frontmatter
    if (content.startsWith('---')) {
        const parts = content.split('---');
        if (parts.length < 3) {
            errors.push('Malformed YAML frontmatter (missing closing ---)');
        }
    }

    // If it's a skill, check for mandatory headers
    if (filePath.includes('/skills/') || filePath.includes('\\skills\\')) {
        // Exclude templates and documentation that aren't strict skills
        if (!filePath.includes('SKILL.md')) return errors;
        
        if (!content.includes('Pre-Flight Checklist') && !content.includes('Pre-Flight')) {
            errors.push('Missing mandatory header/section: Pre-Flight Checklist');
        }
        if (!content.includes('VBC Protocol') && !content.includes('VBC')) {
            errors.push('Missing mandatory header/section: VBC Protocol');
        }
    }

    return errors;
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function run() {
    const agentDir = path.join(__dirname, '..', '.agent');
    if (!fs.existsSync(agentDir)) {
        console.error('No .agent directory found.');
        process.exit(1);
    }

    let hasErrors = false;
    let checkedCount = 0;
    
    console.log('Validating .agent payload...');
    
    walkDir(agentDir, function(filePath) {
        if (filePath.endsWith('.md')) {
            checkedCount++;
            const errors = validateMarkdownFile(filePath);
            if (errors.length > 0) {
                console.error(`\x1b[31m[FAIL]\x1b[0m ${filePath}`);
                errors.forEach(e => console.error(`  - ${e}`));
                hasErrors = true;
            }
        }
    });

    if (hasErrors) {
        console.error(`\nPayload validation failed. Checked ${checkedCount} files.`);
        process.exit(1);
    } else {
        console.log(`\x1b[32mPayload validation passed.\x1b[0m Checked ${checkedCount} files.`);
    }
}

run();
