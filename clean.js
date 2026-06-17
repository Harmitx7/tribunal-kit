const fs = require('fs');
const path = require('path');

const targets = [
    path.join(__dirname, 'scripts', 'postinstall.js'),
    path.join(__dirname, 'src')
];

for (const target of targets) {
    if (fs.existsSync(target)) {
        try {
            fs.rmSync(target, { recursive: true, force: true });
            console.log(`Deleted: ${target}`);
        } catch (e) {
            console.error(`Failed to delete ${target}:`, e.message);
        }
    }
}
