const fs = require('fs');
const path = require('path');
const os = require('os');

const GLOBAL_STORE_PATH = path.join(os.homedir(), '.tribunal-kit');
const LOCAL_AGENT_PATH = path.join(__dirname, '..', '.agent');

function initializeGlobalStore() {
  if (!fs.existsSync(GLOBAL_STORE_PATH)) {
    console.log(`[Tribunal Kit] Initializing global knowledge base at ${GLOBAL_STORE_PATH}...`);
    fs.mkdirSync(GLOBAL_STORE_PATH, { recursive: true });
  }

  // Copy .agent folder if it doesn't exist in the global store or if we want to force update
  const globalAgentPath = path.join(GLOBAL_STORE_PATH, '.agent');
  if (!fs.existsSync(globalAgentPath)) {
    console.log(`[Tribunal Kit] Copying specialists and skills to global store...`);
    copyDirectoryRecursiveSync(LOCAL_AGENT_PATH, globalAgentPath);
  }
}

function copyDirectoryRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyDirectoryRecursiveSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function getGlobalAgentPath() {
  return path.join(GLOBAL_STORE_PATH, '.agent');
}

module.exports = {
  initializeGlobalStore,
  getGlobalAgentPath,
  GLOBAL_STORE_PATH,
};
