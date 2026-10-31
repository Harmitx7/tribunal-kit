const { CodebaseIntelligence } = require('../.agent/scripts/codebase_intelligence');

const ci = new CodebaseIntelligence(process.cwd());
ci.getModel();
ci.deadCode(); // populate caches

const allFileContents = ci.allFileContentsCache;
const fileExportMap = ci.fileExportMapCache;

console.log('Exports count:', fileExportMap.length);
console.log('Files count:', allFileContents.size);

// Baseline method (exact copy of codebase_intelligence.js lines 1545-1568)
const t0 = performance.now();
const baselineUnref = [];
for (const exp of fileExportMap) {
  let isReferenced = false;
  const refRegex = new RegExp(`\\b${exp.name}\\b`);
  for (const [otherFile, otherContent] of allFileContents.entries()) {
    if (otherFile === exp.file) continue;
    if (refRegex.test(otherContent)) {
      isReferenced = true;
      break;
    }
  }
  if (!isReferenced) {
    baselineUnref.push({ name: exp.name, file: exp.file });
  }
}
const t1 = performance.now();

// Optimized inverted index method
const t2 = performance.now();
const wordFiles = new Map();
for (const [filePath, content] of allFileContents.entries()) {
  const tokens = content.match(/[a-zA-Z0-9_$]+/g) || [];
  const seen = new Set(tokens);
  for (const token of seen) {
    let s = wordFiles.get(token);
    if (!s) {
      s = new Set();
      wordFiles.set(token, s);
    }
    s.add(filePath);
  }
}

const optimizedUnref = [];
for (const exp of fileExportMap) {
  const filesWithToken = wordFiles.get(exp.name);
  const isReferenced = filesWithToken && (filesWithToken.size > 1 || !filesWithToken.has(exp.file));
  if (!isReferenced) {
    optimizedUnref.push({ name: exp.name, file: exp.file });
  }
}
const t3 = performance.now();

console.log('Baseline duration:', Math.round(t1 - t0), 'ms, found:', baselineUnref.length);
console.log('Optimized duration:', Math.round(t3 - t2), 'ms, found:', optimizedUnref.length);

const baselineKeys = new Set(baselineUnref.map(e => `${e.name}@${e.file}`));
const optimizedKeys = new Set(optimizedUnref.map(e => `${e.name}@${e.file}`));

let match = true;
if (baselineKeys.size !== optimizedKeys.size) {
  match = false;
} else {
  for (const k of baselineKeys) {
    if (!optimizedKeys.has(k)) {
      match = false;
      break;
    }
  }
}

console.log('EXACT MATCH EQUIVALENCE:', match);
if (!match) {
  console.log('Difference:');
  const inBaseOnly = [...baselineKeys].filter(k => !optimizedKeys.has(k)).slice(0, 5);
  const inOptOnly = [...optimizedKeys].filter(k => !baselineKeys.has(k)).slice(0, 5);
  console.log('In baseline only:', inBaseOnly);
  console.log('In opt only:', inOptOnly);
}
