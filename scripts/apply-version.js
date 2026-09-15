const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const PKG = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const VERSION = PKG.version;

function updateFiles() {
  const filesToUpdate = [
    'plugin.json',
    'gemini-extension.json',
    'npm/core-template/package.json',
    'README.md',
    'crates/core/Cargo.toml',
    'bin/adapter-install.js',
    'dist/tui/banner.js',
  ];

  for (const relPath of filesToUpdate) {
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');

      if (relPath.endsWith('.json')) {
        const json = JSON.parse(content);
        if (json.version) {
          json.version = VERSION;
        }
        fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n');
      } else if (relPath === 'crates/core/Cargo.toml') {
        content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${VERSION}"`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'README.md') {
        content = content.replace(/Release-v([0-9]+\.[0-9]+\.[0-9]+)/g, `Release-v${VERSION}`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'bin/adapter-install.js' || relPath === 'dist/tui/banner.js') {
        content = content.replace(/v\d+\.\d+\.\d+/g, `v${VERSION}`);
        content = content.replace(/version = '\d+\.\d+\.\d+'/g, `version = '${VERSION}'`);
        fs.writeFileSync(fullPath, content);
      }
      console.log(`Updated ${relPath} to ${VERSION}`);
    }
  }

  // Update optionalDependencies in package.json
  if (PKG.optionalDependencies) {
    for (const key of Object.keys(PKG.optionalDependencies)) {
      PKG.optionalDependencies[key] = `^${VERSION}`;
    }
    fs.writeFileSync(PKG_PATH, JSON.stringify(PKG, null, 2) + '\n');
    console.log(`Updated package.json optionalDependencies to ^${VERSION}`);
  }
}

updateFiles();
console.log('Applied version update across repository successfully.');
