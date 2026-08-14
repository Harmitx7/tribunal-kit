#!/usr/bin/env node
// VERIFY: Using native Node.js only. Zero dependencies to ensure instant execution.

'use strict';

const TECH_KEYWORDS = [
  'react',
  'tailwind',
  'next.js',
  'sql',
  'postgres',
  'express',
  'python',
  'node',
  'vue',
  'svelte',
  'typescript',
  'js',
  'css',
  'html',
  'prisma',
  'drizzle',
];

const ROUTER_MAP = {
  react: ['react-specialist', 'frontend-design'],
  tailwind: ['tailwind-patterns'],
  'next.js': ['nextjs-react-expert', 'react-specialist'],
  sql: ['sql-pro', 'database-design'],
  postgres: ['database-design'],
  express: ['nodejs-best-practices'],
  python: ['python-pro'],
  node: ['nodejs-best-practices'],
  vue: ['vue-expert'],
  svelte: ['frontend-design'],
  typescript: ['typescript-advanced'],
  js: ['clean-code'],
  css: ['tailwind-patterns'],
  html: ['frontend-design'],
  prisma: ['database-design'],
  drizzle: ['database-design'],
};

const ACTION_ROUTER = {
  build: ['architecture'],
  create: ['architecture'],
  fix: ['systematic-debugging'],
  debug: ['systematic-debugging'],
  refactor: ['clean-code'],
  update: ['clean-code'],
  write: ['clean-code'],
  design: ['frontend-design'],
  audit: ['vulnerability-scanner', 'lint-and-validate'],
};

/**
 * Programmatically compile a user request or spec object into a hyper-dense super-prompt string.
 * @param {string|object} input
 * @returns {string} Highly compressed YAML string
 */
function compileSuperPrompt(input) {
  let cleanInput = '';
  let preStack = [];
  let preRules = [];

  if (typeof input === 'object' && input !== null) {
    cleanInput = (input.task || input.spec || '').trim();
    if (Array.isArray(input.stack)) preStack = input.stack;
    if (Array.isArray(input.rules)) preRules = input.rules;
  } else {
    cleanInput = String(input || '').trim();
  }

  // 1. Extract Action (Intent mapping)
  const actionMatch = cleanInput.match(
    /^(?:(?:hey,?\s*|please\s+|can you\s+|could you\s+|would you\s+|i need you to\s+|i want to\s+)*)(build|create|fix|debug|refactor|update|write|design|audit)\b/i,
  );
  const action = actionMatch ? actionMatch[1].toLowerCase() : 'execute';

  // 2. Extract Tech Stack
  const stackSet = new Set(preStack.map(s => s.toLowerCase()));
  TECH_KEYWORDS.forEach(tech => {
    const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(cleanInput)) {
      stackSet.add(tech.toLowerCase());
    }
  });
  const stack = Array.from(stackSet);

  // 3. Skill Pre-Routing
  const recommendedSkills = new Set(preRules);
  if (ACTION_ROUTER[action]) {
    ACTION_ROUTER[action].forEach(s => recommendedSkills.add(s));
  }

  stack.forEach(tech => {
    if (ROUTER_MAP[tech]) {
      ROUTER_MAP[tech].forEach(s => recommendedSkills.add(s));
    }
  });

  const finalSkills = Array.from(recommendedSkills).slice(0, 4);

  // 4. Compact YAML Generation
  const indentedTarget = cleanInput
    .split('\n')
    .map(line => '  ' + line)
    .join('\n');

  return [
    '---',
    `action: ${action}`,
    `target: |`,
    indentedTarget,
    `stack: [${stack.join(', ')}]`,
    `recommended_skills: [${finalSkills.join(', ')}]`,
    '---',
  ].join('\n');
}

if (require.main === module) {
  const rawInput = process.argv.slice(2).join(' ');

  if (!rawInput) {
    console.error('Usage: node prompt_compiler.js "Your conversational prompt here"');
    process.exit(1);
  }

  console.log(compileSuperPrompt(rawInput));
}

module.exports = { compileSuperPrompt };
