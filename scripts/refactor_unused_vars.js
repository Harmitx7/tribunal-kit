const fs = require('fs');
const path = require('path');
const parser = require('../node_modules/@babel/parser');
const traverse = require('../node_modules/@babel/traverse').default;

const reportPath = path.resolve(__dirname, '../eslint-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('eslint-report.json not found! Run eslint with --format json first.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

let totalFiles = 0;
let totalEdits = 0;
let filesWithErrors = 0;

for (const fileReport of report) {
  const unusedMsgs = fileReport.messages.filter(m => m.ruleId === 'no-unused-vars');
  if (unusedMsgs.length === 0) continue;

  const filePath = fileReport.filePath;
  const code = fs.readFileSync(filePath, 'utf8');

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch (err) {
    console.error(`Failed to parse ${filePath}: ${err.message}`);
    filesWithErrors++;
    continue;
  }

  // Map locations "line:col" -> warning
  // Note: ESLint columns are 1-based.
  const warningMap = new Map();
  for (const m of unusedMsgs) {
    warningMap.set(`${m.line}:${m.column}`, m);
  }

  const edits = [];
  const processedIdentifiers = new Set();

  function recordEdit(start, end, replacement, desc) {
    // Prevent duplicate edits on same span
    const key = `${start}:${end}`;
    if (processedIdentifiers.has(key)) return;
    processedIdentifiers.add(key);
    edits.push({ start, end, replacement, desc });
  }

  // Pass 1: traverse AST to find matched identifiers
  traverse(ast, {
    Identifier(idPath) {
      const loc = idPath.node.loc.start;
      const key = `${loc.line}:${loc.column + 1}`;
      const msg = warningMap.get(key);
      if (!msg) return;

      const name = idPath.node.name;
      // If already starts with underscore, skip
      if (name.startsWith('_')) return;

      const newName = '_' + name;
      const parent = idPath.parent;
      const parentType = parent.type;

      // Handle ObjectProperty in destructuring
      if (parentType === 'ObjectProperty') {
        if (parent.shorthand) {
          if (parent.key === idPath.node) {
            if (parent.value.type === 'AssignmentPattern') {
              // { foo = 'default' } -> { foo: _foo = 'default' }
              recordEdit(
                idPath.node.start,
                idPath.node.end,
                `${name}: ${newName}`,
                'shorthand with default',
              );
            } else {
              // { foo } -> { foo: _foo }
              recordEdit(idPath.node.start, idPath.node.end, `${name}: ${newName}`, 'shorthand');
            }
          }
        } else if (parent.value === idPath.node) {
          // { key: val } -> { key: _val }
          recordEdit(idPath.node.start, idPath.node.end, newName, 'non-shorthand value');
        }
        return;
      }

      // Handle AssignmentPattern in params or vars
      if (parentType === 'AssignmentPattern') {
        if (parent.left === idPath.node) {
          // Check if parent of AssignmentPattern is ObjectProperty shorthand
          if (
            idPath.parentPath.parent.type === 'ObjectProperty' &&
            idPath.parentPath.parent.shorthand
          ) {
            const propKey = idPath.parentPath.parent.key;
            recordEdit(
              propKey.start,
              propKey.end,
              `${name}: ${newName}`,
              'shorthand with default in assignment',
            );
          } else {
            recordEdit(idPath.node.start, idPath.node.end, newName, 'assignment pattern left');
          }
        }
        return;
      }

      // Handle VariableDeclarator
      if (parentType === 'VariableDeclarator') {
        if (parent.id === idPath.node) {
          recordEdit(idPath.node.start, idPath.node.end, newName, 'variable declarator');
          // Check if there are constantViolations (assignments) that also need renaming
          const binding = idPath.scope.getBinding(name);
          if (binding && binding.constantViolations) {
            for (const v of binding.constantViolations) {
              if (v.isAssignmentExpression() && v.node.left.type === 'Identifier') {
                recordEdit(
                  v.node.left.start,
                  v.node.left.end,
                  newName,
                  'constant violation assignment',
                );
              }
            }
          }
        }
        return;
      }

      // Handle AssignmentExpression where variable was flagged at assignment
      if (parentType === 'AssignmentExpression') {
        if (parent.left === idPath.node) {
          recordEdit(idPath.node.start, idPath.node.end, newName, 'assignment expression left');
          const binding = idPath.scope.getBinding(name);
          if (binding && binding.identifier) {
            recordEdit(
              binding.identifier.start,
              binding.identifier.end,
              newName,
              'binding decl for assignment',
            );
          }
          if (binding && binding.constantViolations) {
            for (const v of binding.constantViolations) {
              if (v.isAssignmentExpression() && v.node.left.type === 'Identifier') {
                recordEdit(v.node.left.start, v.node.left.end, newName, 'constant violation');
              }
            }
          }
        }
        return;
      }

      // Handle ArrayPattern
      if (parentType === 'ArrayPattern') {
        recordEdit(idPath.node.start, idPath.node.end, newName, 'array pattern element');
        return;
      }

      // Handle CatchClause
      if (parentType === 'CatchClause') {
        if (parent.param === idPath.node) {
          recordEdit(idPath.node.start, idPath.node.end, newName, 'catch param');
        }
        return;
      }

      // Handle FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, ClassMethod
      if (
        [
          'FunctionDeclaration',
          'FunctionExpression',
          'ArrowFunctionExpression',
          'ClassMethod',
        ].includes(parentType)
      ) {
        if (parent.params && parent.params.includes(idPath.node)) {
          recordEdit(idPath.node.start, idPath.node.end, newName, 'function param');
        } else if (parent.id === idPath.node) {
          recordEdit(idPath.node.start, idPath.node.end, newName, 'function id');
        }
        return;
      }

      // Fallback: direct identifier rename
      recordEdit(idPath.node.start, idPath.node.end, newName, 'generic identifier fallback');
    },
  });

  if (edits.length === 0) continue;

  // Sort descending by start position to apply edits from bottom to top
  edits.sort((a, b) => b.start - a.start);

  // Check for overlapping edits
  let hasOverlap = false;
  for (let i = 0; i < edits.length - 1; i++) {
    if (edits[i + 1].end > edits[i].start) {
      console.warn(
        `Overlap detected in ${filePath}: edit [${edits[i + 1].start}, ${edits[i + 1].end}] overlaps [${edits[i].start}, ${edits[i].end}]`,
      );
      hasOverlap = true;
    }
  }
  if (hasOverlap) {
    filesWithErrors++;
    continue;
  }

  let refactoredCode = code;
  for (const edit of edits) {
    refactoredCode =
      refactoredCode.slice(0, edit.start) + edit.replacement + refactoredCode.slice(edit.end);
  }

  // Validate syntax
  try {
    parser.parse(refactoredCode, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });
  } catch (err) {
    console.error(`SYNTAX ERROR AFTER REFACTOR IN ${filePath}: ${err.message}`);
    filesWithErrors++;
    continue;
  }

  totalFiles++;
  totalEdits += edits.length;

  if (!isDryRun) {
    fs.writeFileSync(filePath, refactoredCode, 'utf8');
  }
}

console.log(`\n=== REFACTOR SUMMARY ===`);
console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE APPLIED'}`);
console.log(`Files refactored: ${totalFiles}`);
console.log(`Total edits applied: ${totalEdits}`);
console.log(`Syntax errors: ${filesWithErrors}`);
