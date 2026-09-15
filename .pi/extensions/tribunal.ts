import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ExtensionAPI {
  on(event: string, handler: (payload?: any) => Promise<any> | any): void;
}

const EXTREMELY_IMPORTANT_MARKER = '<EXTREMELY_IMPORTANT>';
const BOOTSTRAP_MARKER = 'tribunal-kit:master-governance bootstrap for pi';

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(extensionDir, '../..');
const skillsDir = resolve(packageRoot, '.agent', 'skills');
const rulesPath = resolve(packageRoot, '.agent', 'rules', 'GEMINI.md');

let cachedBootstrap: string | null | undefined;

export default function tribunalPiExtension(pi: ExtensionAPI) {
  let injectBootstrap = true;

  pi.on('resources_discover', async () => ({
    skillPaths: [skillsDir],
  }));

  pi.on('session_start', async () => {
    injectBootstrap = true;
  });

  pi.on('session_compact', async () => {
    injectBootstrap = true;
  });

  pi.on('agent_end', async () => {
    injectBootstrap = false;
  });

  pi.on('context', async (event: any) => {
    if (!injectBootstrap) return;
    if (event?.messages?.some(messageContainsBootstrap)) return;

    const bootstrap = getBootstrapContent();
    if (!bootstrap) return;

    const bootstrapMessage = {
      role: 'user' as const,
      content: [{ type: 'text' as const, text: bootstrap }],
      timestamp: Date.now(),
    };

    const messages = event?.messages || [];
    const insertAt = firstNonCompactionSummaryIndex(messages);

    return {
      messages: [...messages.slice(0, insertAt), bootstrapMessage, ...messages.slice(insertAt)],
    };
  });
}

function getBootstrapContent(): string | null {
  if (cachedBootstrap !== undefined) return cachedBootstrap;

  try {
    let body = '';
    if (existsSync(rulesPath)) {
      const raw = readFileSync(rulesPath, 'utf8');
      body = stripFrontmatter(raw);
    } else {
      body =
        '# Tribunal Kit Master Governance Active\nEnforce strict TDD and 28-specialist reviewer waves.';
    }

    cachedBootstrap = `${EXTREMELY_IMPORTANT_MARKER}
${BOOTSTRAP_MARKER}

Tribunal Agent Kit Master Governance is active.

The master rules and verification protocols are loaded for this Pi session. Follow them now.

${body}

${piToolMapping()}
</EXTREMELY_IMPORTANT>`;
    return cachedBootstrap;
  } catch {
    cachedBootstrap = null;
    return null;
  }
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return (match ? match[1] : content).trim();
}

function piToolMapping(): string {
  return `## Pi Tool Mapping for Tribunal Kit

Pi has native skills support. When a Tribunal rule or skill applies, load the relevant \`SKILL.md\` with \`read\`, or let a user invoke \`/skill:name\` explicitly.

Pi's built-in coding tools are lowercase: \`read\`, \`write\`, \`edit\`, \`bash\`, plus optional \`grep\`, \`find\`, and \`ls\`. Use those for the corresponding actions: read a file, create or edit files, run shell commands, search file contents, find files by name, and list directories.

Subagent-Driven Development (SDD):
- To run SDD preparation: use \`bash\` to invoke \`tk sdd brief <plan-path> <task-number>\`.
- To generate review diffs: use \`bash\` to invoke \`tk sdd diff <plan-path> <base-sha> <head-sha>\`.
- When delegating to subagents via \`pi-subagents\` or similar tools, supply the generated \`task-<N>-brief.md\` out-of-band and enforce the Iron Law of TDD.`;
}

function messageContainsBootstrap(message: unknown): boolean {
  const content = (message as { content?: unknown })?.content;
  if (typeof content === 'string') return content.includes(BOOTSTRAP_MARKER);
  if (!Array.isArray(content)) return false;
  return content.some(part => {
    return (
      part &&
      typeof part === 'object' &&
      (part as { type?: unknown }).type === 'text' &&
      typeof (part as { text?: unknown }).text === 'string' &&
      (part as { text: string }).text.includes(BOOTSTRAP_MARKER)
    );
  });
}

function firstNonCompactionSummaryIndex(messages: unknown[]): number {
  let index = 0;
  while ((messages[index] as { role?: unknown } | undefined)?.role === 'compactionSummary') {
    index += 1;
  }
  return index;
}
