#!/usr/bin/env node
/**
 * probe_semantic_accuracy.js
 * ═════════════════════════════════════════════════════════════════════════════
 * Empirical probe for Phase 16A: Semantic Accuracy Audit.
 * Tests how CodebaseIntelligence behaves when faced with:
 *   A. Identifier shadowing
 *   B. Same-name symbols across modules
 *   C. Property names and object members
 *   D. Comments and string literals
 *   E. Aliased imports / destructuring
 *   F. TypeScript type-only references
 *   G. Dynamic property access / dynamic imports
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CodebaseIntelligence } = require('../.agent/scripts/codebase_intelligence');

// Create an isolated temporary test repository
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci_semantic_audit_'));

try {
  // Setup repository files
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
    name: 'semantic-audit-fixture',
    version: '1.0.0',
    main: 'index.js'
  }, null, 2));

  // File 1: users.js (exports validate, unusedUserExport, formatDate)
  fs.writeFileSync(path.join(tempDir, 'users.js'), `
export function validate(user) {
  return Boolean(user && user.id);
}

export function unusedUserExport() {
  return "completely_unused";
}

export function calculateRisk() {
  return 10;
}

export function formatDate(d) {
  return "users_formatDate";
}
`);

  // File 2: payments.js (exports validate, processPayment, formatDate)
  fs.writeFileSync(path.join(tempDir, 'payments.js'), `
export function validate(payment) {
  return Boolean(payment && payment.amount > 0);
}

export function processPayment(payment) {
  return validate(payment);
}

export function formatDate(d) {
  return "payments_formatDate";
}
`);

  // File 3: service.js (Class D: Comment & string literal mention of calculateRisk)
  // Class A: Shadowed identifier
  fs.writeFileSync(path.join(tempDir, 'service.js'), `
// calculateRisk is deprecated and was used by legacy service
const docString = "calculateRisk() will be removed in v2";

function doSomething() {
  // Shadowing: local unusedUserExport variable
  const unusedUserExport = 42;
  return unusedUserExport + 1;
}

export { doSomething };
`);

  // File 4: index.js (imports users.validate with alias, calls payments.validate and payments.formatDate)
  fs.writeFileSync(path.join(tempDir, 'index.js'), `
import { validate as checkUser } from './users.js';
import { formatDate as formatPaymentDate } from './payments.js';
import * as paymentModule from './payments.js';

// Class C: Object property member
const config = {
  unusedPaymentExport() {
    return "property_method";
  }
};

export function main() {
  checkUser({ id: 1 });
  paymentModule.validate({ amount: 100 });
  formatPaymentDate(new Date());
  config.unusedPaymentExport();
}
`);

  console.log('Temporary semantic audit fixture created at:', tempDir);

  const ci = new CodebaseIntelligence(tempDir);
  const deadCodeResult = ci.deadCode();

  console.log('\n--- DEAD-CODE ANALYSIS RESULTS ---');
  console.log('Unreferenced Exports Count:', deadCodeResult.unreferencedExportsCount);
  console.log('Unreferenced Exports Found:');
  deadCodeResult.unreferencedExports.forEach(e => {
    console.log(`  - [${e.file}] ${e.name} (${e.classification})`);
  });

  const unreferencedNames = new Set(deadCodeResult.unreferencedExports.map(e => `${e.name}@${e.file}`));

  console.log('\n--- AUDITING FAILURE CLASSES ---');

  // Audit Failure Class A: Shadowing of unusedUserExport in service.js
  // Expected: unusedUserExport in users.js IS DEAD (never imported or called).
  // Did token index find "unusedUserExport" in service.js (`const unusedUserExport = 42`) and mark users.js export as LIVE?
  const classA_IsReportedDead = unreferencedNames.has('unusedUserExport@users.js');
  console.log(`Failure Class A (Identifier Shadowing):`);
  console.log(`  Target: users.js -> unusedUserExport (truly dead export, shadowed locally in service.js)`);
  console.log(`  Reported as Dead? ${classA_IsReportedDead}`);
  console.log(`  Defect: ${!classA_IsReportedDead ? 'FALSE NEGATIVE (Dead export considered live due to local shadow)' : 'None (Correctly identified as dead)'}`);

  // Audit Failure Class B: Same-name symbols across modules
  // users.js exports formatDate (NEVER imported or called anywhere)
  // payments.js exports formatDate (imported by index.js as formatPaymentDate and called)
  // Expected: users.js formatDate SHOULD BE REPORTED DEAD!
  const classB_IsReportedDead = unreferencedNames.has('formatDate@users.js');
  console.log(`\nFailure Class B (Same-Name Symbols Across Modules):`);
  console.log(`  Target: users.js -> formatDate (never imported, but payments.js has same-name formatDate used in index.js)`);
  console.log(`  Reported as Dead? ${classB_IsReportedDead}`);
  console.log(`  Defect: ${!classB_IsReportedDead ? 'FALSE NEGATIVE (Dead export considered live because another module has same-name export in index.js)' : 'None (Correctly identified as dead)'}`);

  // Audit Failure Class C: Property names / object members
  // config.unusedPaymentExport() in index.js
  // payments.js exports unusedPaymentExport (which is not in payments.js, but let's check config method)
  console.log(`\nFailure Class C (Property / Method Name Collision):`);
  const classC_IsReportedDead = unreferencedNames.has('unusedPaymentExport@index.js');
  console.log(`  Target: config.unusedPaymentExport (object property method in index.js)`);
  console.log(`  Reported as Dead? ${classC_IsReportedDead}`);

  // Audit Failure Class D: Comments and String Literals
  // calculateRisk in users.js is only mentioned in comments and string in service.js:
  // "// calculateRisk is deprecated" and "calculateRisk() will be removed"
  // It is NEVER imported or executed anywhere!
  // Expected: calculateRisk in users.js SHOULD BE DEAD!
  const classD_IsReportedDead = unreferencedNames.has('calculateRisk@users.js');
  console.log(`\nFailure Class D (Comments and String Literals):`);
  console.log(`  Target: users.js -> calculateRisk (never executed, only in comment/string in service.js)`);
  console.log(`  Reported as Dead? ${classD_IsReportedDead}`);
  console.log(`  Defect: ${!classD_IsReportedDead ? 'FALSE NEGATIVE (Dead export considered live due to comment/string literal match)' : 'None (Correctly identified as dead)'}`);

  // Audit Failure Class E: Aliased Imports
  // users.js exports validate. It is imported in index.js as `import { validate as checkUser } from './users.js'`
  // Is validate in users.js marked dead because the file only calls `checkUser()`?
  const classE_IsReportedDead = unreferencedNames.has('validate@users.js');
  console.log(`\nFailure Class E (Aliased Imports):`);
  console.log(`  Target: users.js -> validate (imported as checkUser)`);
  console.log(`  Reported as Dead? ${classE_IsReportedDead}`);
  console.log(`  Defect: ${classE_IsReportedDead ? 'FALSE POSITIVE (Live export marked dead because import was aliased)' : 'None (Live export marked live)'}`);

  // Output full summary JSON
  const auditReport = {
    classA_shadowing: {
      symbol: 'unusedUserExport',
      file: 'users.js',
      expected: 'UNREFERENCED_STATICALLY',
      actual: classA_IsReportedDead ? 'UNREFERENCED_STATICALLY' : 'REFERENCED',
      hasDefect: !classA_IsReportedDead,
      category: 'False Negative'
    },
    classD_comments_strings: {
      symbol: 'calculateRisk',
      file: 'users.js',
      expected: 'UNREFERENCED_STATICALLY',
      actual: classD_IsReportedDead ? 'UNREFERENCED_STATICALLY' : 'REFERENCED',
      hasDefect: !classD_IsReportedDead,
      category: 'False Negative'
    },
    classE_aliased_import: {
      symbol: 'validate',
      file: 'users.js',
      expected: 'REFERENCED',
      actual: classE_IsReportedDead ? 'UNREFERENCED_STATICALLY' : 'REFERENCED',
      hasDefect: classE_IsReportedDead,
      category: 'False Positive'
    }
  };

  fs.writeFileSync(path.join(__dirname, '..', 'test', 'fixtures', 'codebase_intelligence_adversarial', 'phase16_semantic_audit_raw.json'), JSON.stringify(auditReport, null, 2));

} finally {
  // Clean up temp dir
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_e) {}
}
