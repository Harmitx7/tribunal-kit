const fs = require('fs');
const { execSync } = require('child_process');

console.log("Running ESLint to get JSON report...");
try {
  execSync('npx eslint . --format json > eslint_report.json', { stdio: 'pipe' });
} catch (_e) {
  // ESLint exits with 1 if there are errors, which is expected.
}

console.log("Parsing ESLint report...");
const reportStr = fs.readFileSync('eslint_report.json', 'utf8');
const report = JSON.parse(reportStr);

let fixedCount = 0;

for (const fileResult of report) {
  const filePath = fileResult.filePath;
  const messages = fileResult.messages.filter(m => m.ruleId === 'no-unused-vars');
  
  if (messages.length === 0) continue;
  
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  // Sort messages in reverse order (bottom-up, right-to-left) so modifications don't shift offsets
  messages.sort((a, b) => {
    if (a.line !== b.line) return b.line - a.line;
    return b.column - a.column;
  });
  
  for (const msg of messages) {
    const lineIdx = msg.line - 1;
    const colIdx = msg.column - 1;
    
    // Safety check: verify we are prefixing an alphabetical character
    const line = lines[lineIdx];
    if (line && /[a-zA-Z]/.test(line[colIdx])) {
      lines[lineIdx] = line.slice(0, colIdx) + '_' + line.slice(colIdx);
      fixedCount++;
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

console.log(`Successfully prefixed ${fixedCount} unused variables with '_'.`);
try { fs.unlinkSync('eslint_report.json'); } catch(_e){}
