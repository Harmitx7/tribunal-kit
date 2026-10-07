const fs = require('fs');
const originalReadFileSync = fs.readFileSync;
const originalExistsSync = fs.existsSync;
const originalReaddirSync = fs.readdirSync;
const path = require('path');

const usedFiles = new Set();
const repoRoot = path.resolve(__dirname, '..');

function record(p) {
  if (typeof p === 'string' && p.includes('phase')) {
    const rel = path.relative(repoRoot, path.resolve(p)).replace(/\\/g, '/');
    if (rel.startsWith('phase') && !rel.startsWith('test/')) {
      usedFiles.add(rel);
    }
  }
}

fs.readFileSync = function(p, options) {
  record(p);
  return originalReadFileSync.apply(this, arguments);
};

fs.existsSync = function(p) {
  record(p);
  return originalExistsSync.apply(this, arguments);
};

fs.readdirSync = function(p, options) {
  record(p);
  return originalReaddirSync.apply(this, arguments);
};

process.on('exit', () => {
  if (usedFiles.size > 0) {
    fs.writeFileSync('used_phase_files.json', JSON.stringify(Array.from(usedFiles), null, 2));
  }
});
