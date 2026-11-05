const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const PKG = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const VERSION = PKG.version;
const SKILLS_DIR = path.join(ROOT, '.agent', 'skills');
const SKILL_COUNT = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(entry =>
  entry.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, entry.name, 'SKILL.md')),
).length;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(VERSION)) {
  throw new Error(`Invalid package version: ${VERSION}`);
}

function updateFiles() {
  const filesToUpdate = [
    'plugins/core-plugin.json',
    'plugins/gemini/extension.json',
    'npm/core-template/package.json',
    'README.md',
    '.agent/config/system-prompt.md',
    'crates/core/Cargo.toml',
    'bin/adapter-install.js',
    'src/tui/banner.js',
    'src/runtime_reliability/checkpoint_recovery_engine.js',
    'src/runtime_reliability/execution_state_schemas.js',
    'src/supply_chain/sbom_engine.js',
  ];

  for (const relPath of filesToUpdate) {
    const fullPath = path.join(ROOT, relPath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');

      if (relPath.endsWith('.json')) {
        const json = JSON.parse(content);
        json.version = VERSION;
        fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + '\n');
      } else if (relPath === 'crates/core/Cargo.toml') {
        content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${VERSION}"`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'README.md') {
        content = content.replace(/Release-v([0-9]+\.[0-9]+\.[0-9]+)/g, `Release-v${VERSION}`);
        content = content.replace(/alt="Release v[0-9]+\.[0-9]+\.[0-9]+"/g, `alt="Release v${VERSION}"`);
        content = content.replace(/tribunal-kit@[0-9]+\.[0-9]+\.[0-9]+/g, `tribunal-kit@${VERSION}`);
        content = content.replace(/native core version \([0-9]+\.[0-9]+\.[0-9]+\)/g, `native core version (${VERSION})`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === '.agent/config/system-prompt.md') {
        content = content.replace(/Tribunal Kit v[0-9]+\.[0-9]+\.[0-9]+/g, `Tribunal Kit v${VERSION}`);
        content = content.replace(/\b[0-9]+-skill library/g, `${SKILL_COUNT}-skill library`);
        content = content.replace(/\b[0-9]+ skills\b/g, `${SKILL_COUNT} skills`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'src/runtime_reliability/checkpoint_recovery_engine.js') {
        content = content.replace(/(currentCodeRevision = options\.codeRevision \|\| ')[0-9]+\.[0-9]+\.[0-9]+(')/, `$1${VERSION}$2`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'src/runtime_reliability/execution_state_schemas.js') {
        content = content.replace(/(codeRevision: z\.string\(\)\.default\(')[0-9]+\.[0-9]+\.[0-9]+(')/, `$1${VERSION}$2`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'src/supply_chain/sbom_engine.js') {
        content = content.replace(/(this\.toolVersion = options\.toolVersion \|\| ')[0-9]+\.[0-9]+\.[0-9]+(')/, `$1${VERSION}$2`);
        fs.writeFileSync(fullPath, content);
      } else if (relPath === 'bin/adapter-install.js' || relPath === 'src/tui/banner.js') {
        content = content.replace(/v\d+\.\d+\.\d+/g, `v${VERSION}`);
        if (relPath === 'src/tui/banner.js') {
          content = content.replace(/version = '\d+\.\d+\.\d+'/g, `version = '${VERSION}'`);
        }
        fs.writeFileSync(fullPath, content);
      }
      console.log(`Updated ${relPath} to ${VERSION}`);
    }
  }

  // Update optionalDependencies in package.json
  if (PKG.optionalDependencies) {
    for (const key of Object.keys(PKG.optionalDependencies)) {
      if (key.startsWith('@tribunal-kit/core-')) PKG.optionalDependencies[key] = `^${VERSION}`;
    }
    fs.writeFileSync(PKG_PATH, JSON.stringify(PKG, null, 2) + '\n');
    console.log(`Updated package.json optionalDependencies to ^${VERSION}`);
  }

  const lockPath = path.join(ROOT, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = VERSION;
    if (lock.packages?.['']) {
      lock.packages[''].version = VERSION;
      lock.packages[''].optionalDependencies = { ...PKG.optionalDependencies };
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    console.log(`Updated package-lock.json to ${VERSION}`);
  }

  const cargoLockPath = path.join(ROOT, 'Cargo.lock');
  if (fs.existsSync(cargoLockPath)) {
    const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
    const packagePattern = /(\[\[package\]\]\r?\nname = "tribunal-core"\r?\nversion = ")[^"]+(")/;
    const updatedCargoLock = cargoLock.replace(packagePattern, `$1${VERSION}$2`);
    if (updatedCargoLock === cargoLock && !packagePattern.test(cargoLock)) {
      throw new Error('Cargo.lock does not contain the tribunal-core package entry');
    }
    fs.writeFileSync(cargoLockPath, updatedCargoLock);
    console.log(`Updated Cargo.lock tribunal-core to ${VERSION}`);
  }
}

updateFiles();
console.log('Applied version update across repository successfully.');
