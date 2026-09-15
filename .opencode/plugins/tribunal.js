/**
 * Tribunal Kit plugin for OpenCode.ai
 *
 * Injects Tribunal Master Governance bootstrap context via message transform.
 * Auto-registers skills directory via config hook (no symlinks needed).
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const extractAndStripFrontmatter = content => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
};

let _bootstrapCache = undefined;

export const TribunalPlugin = async ({ client: _client, directory: _directory } = {}) => {
  const packageRoot = path.resolve(__dirname, '../..');
  const tribunalSkillsDir = path.join(packageRoot, '.agent', 'skills');
  const rulesPath = path.join(packageRoot, '.agent', 'rules', 'GEMINI.md');

  const getBootstrapContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache;

    let rulesContent = '';
    if (fs.existsSync(rulesPath)) {
      const raw = fs.readFileSync(rulesPath, 'utf8');
      const { content } = extractAndStripFrontmatter(raw);
      rulesContent = content;
    } else {
      rulesContent =
        '# Tribunal Kit Master Governance Active\nEnforce strict TDD, out-of-band reviews, and 28-specialist waves.';
    }

    const toolMapping = `**Tool Mapping for OpenCode:**
When skills or tribunal workflows request actions, map them to OpenCode tools:
- Create or update tasks/todos → \`todowrite\`
- Subagent dispatches → \`task\` with \`subagent_type: "general"\` (or \`"explore"\` for read-only exploration)
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`apply_patch\`
- Run shell commands → \`bash\`
- Search files → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`
- Tribunal SDD commands → run via \`bash\` (\`tk sdd brief\`, \`tk sdd diff\`)`;

    _bootstrapCache = `<EXTREMELY_IMPORTANT>
Tribunal Kit Master Governance is active.

**IMPORTANT: The master governance rules and verification protocols are loaded for this session. Follow them strictly.**

${rulesContent}

${toolMapping}
</EXTREMELY_IMPORTANT>`;

    return _bootstrapCache;
  };

  return {
    config: async config => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(tribunalSkillsDir)) {
        config.skills.paths.push(tribunalSkillsDir);
      }
    },

    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info && m.info.role === 'user');
      if (!firstUser || !firstUser.parts || !firstUser.parts.length) return;

      if (
        firstUser.parts.some(
          p => p.type === 'text' && p.text && p.text.includes('EXTREMELY_IMPORTANT'),
        )
      )
        return;

      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
    },
  };
};

export default TribunalPlugin;
