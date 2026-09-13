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
  'fastapi',
  'django',
  'graphql',
  'rust',
  'docker',
  'kubernetes',
  'aws',
  'terraform',
  'opentofu',
  'redis',
  'supabase',
  'playwright',
  'jest',
  'vitest',
  'react-native',
  'flutter',
  'expo',
  'c#',
  '.net',
  'blazor',
  'angular',
  'astro',
  'sqlite',
  'opentelemetry',
  'webgpu',
  'llm',
  'rag',
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
  fastapi: ['python-pro', 'api-patterns'],
  django: ['python-pro', 'database-design'],
  graphql: ['api-patterns', 'backend-security-expert'],
  rust: ['rust-pro', 'clean-code'],
  docker: ['containerization-pro', 'devops-engineer'],
  kubernetes: ['platform-engineer', 'containerization-pro'],
  aws: ['cloud-architect', 'devops-engineer'],
  terraform: ['platform-engineering-opentofu'],
  opentofu: ['platform-engineering-opentofu'],
  redis: ['database-design', 'backend-security-expert'],
  supabase: ['supabase-postgres-best-practices', 'database-design'],
  playwright: ['playwright-ai-e2e', 'webapp-testing'],
  jest: ['testing-patterns'],
  vitest: ['testing-patterns'],
  'react-native': ['mobile-design', 'expo-router-v4'],
  flutter: ['mobile-design'],
  expo: ['expo-router-v4', 'mobile-design'],
  'c#': ['csharp-developer'],
  '.net': ['csharp-developer'],
  blazor: ['csharp-developer'],
  angular: ['clean-code'],
  astro: ['frontend-design'],
  sqlite: ['database-design'],
  opentelemetry: ['opentelemetry-observability'],
  webgpu: ['webgpu-performance'],
  llm: ['llm-engineering', 'ai-app-hardening'],
  rag: ['advanced-rag-pipelines', 'llm-engineering'],
};

const ACTION_ROUTER = {
  build: ['architecture', 'clean-code'],
  create: ['architecture', 'clean-code'],
  fix: ['systematic-debugging', 'clean-code'],
  debug: ['systematic-debugging', 'diagnosing-bugs'],
  refactor: ['clean-code', 'codebase-design'],
  update: ['clean-code'],
  write: ['clean-code'],
  design: ['frontend-design', 'better-ui'],
  audit: ['vulnerability-scanner', 'lint-and-validate', 'code-review-checklist'],
  test: ['testing-patterns', 'property-based-testing'],
  benchmark: ['performance-profiling'],
  optimize: ['performance-profiling', 'clean-code'],
  deploy: ['deployment-procedures', 'devops-engineer'],
  migrate: ['database-design'],
  secure: ['vulnerability-scanner', 'backend-security-expert'],
  contract: ['domain-modeling', 'clean-code'],
};

/**
 * Sanitizes user input to prevent prompt injection attacks.
 * @param {string} text
 * @returns {string} Sanitized text
 */
function sanitizeUserInput(text) {
  // 1. Strip XML/HTML tags
  const sanitized = text.replace(/<[^>]+>/g, '');

  // 2. Check for injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
    /you\s+are\s+now\s+a?\s+/i,
    /\bDAN\b|jailbreak/i,
    /system\s*:\s*/i,
    /assistant\s*:\s*/i,
    /user\s*:\s*/i,
    /\[\[?INST\]?\]/i,
    /<<SYS>>/i,
    /bypass\s+(all\s+)?(guardrails|safety|tribunal)/i,
    /override\s+(system|model|all)\s+instructions/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      // Wrap in explicit delimiter if injection is detected
      return `USER_INPUT_START\n${sanitized}\nUSER_INPUT_END`;
    }
  }

  return sanitized;
}

/**
 * Classifies the governance impact tier (0-3) based on action and stack.
 * @param {string} action
 * @param {string[]} stack
 * @param {string} text
 * @returns {number} Tier (0-3)
 */
function inferImpactTier(action, stack, text) {
  const lower = text.toLowerCase();
  if (/auth|jwt|session|login|migration|breaking|schema|password|secret|key/i.test(lower)) {
    return 3;
  }
  if (['deploy', 'migrate', 'secure'].includes(action)) {
    return 3;
  }
  if (['build', 'create', 'refactor', 'contract'].includes(action) || stack.length >= 2) {
    return 2;
  }
  if (['fix', 'debug', 'update', 'test'].includes(action)) {
    return 1;
  }
  return 0;
}

/**
 * Programmatically compile a user request or spec object into a hyper-dense super-prompt string.
 * @param {string|object} input
 * @returns {string} Highly compressed YAML string
 */
function compileSuperPrompt(input) {
  let preStack = [];
  let preRules = [];

  let rawText = '';
  if (typeof input === 'object' && input !== null) {
    rawText = input.task || input.spec || '';
    if (Array.isArray(input.stack)) preStack = input.stack;
    if (Array.isArray(input.rules)) preRules = input.rules;
  } else {
    rawText = String(input || '');
  }

  // Sanitize the input to prevent prompt injection
  const originalInput = sanitizeUserInput(rawText);
  const trimmedInput = originalInput.trim();

  // 1. Extract Action (Intent mapping) using trimmed input
  const actionMatch = trimmedInput.match(
    /^(?:(?:hey,?\s*|please\s+|can you\s+|could you\s+|would you\s+|i need you to\s+|i want to\s+)*)(build|create|fix|debug|refactor|update|write|design|audit|test|benchmark|optimize|deploy|migrate|secure|contract)\b/i,
  );
  const action = actionMatch ? actionMatch[1].toLowerCase() : 'execute';

  // 2. Extract Tech Stack using trimmed input
  const stackSet = new Set(preStack.map(s => s.toLowerCase()));
  TECH_KEYWORDS.forEach(tech => {
    const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(trimmedInput)) {
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

  const finalSkills = Array.from(recommendedSkills).slice(0, 5);
  const impactTier = inferImpactTier(action, stack, trimmedInput);

  // 4. Compact YAML Generation with prompt injection defense
  // Preserve leading whitespace and escape leading "---" or "..." to prevent YAML document start
  const indentedTarget = originalInput
    .split('\n')
    .map(line => {
      const match = line.match(/^(\s*)/);
      const leadingSpaces = match[1];
      const content = line.substring(match[1].length);

      let escapedContent = content;
      if (content.startsWith('---')) {
        escapedContent = '- --' + content.substring(3);
      } else if (content.startsWith('...')) {
        escapedContent = '- ...' + content.substring(3);
      }

      const withIndent = '   ' + leadingSpaces + escapedContent; // 3 spaces for YAML indentation
      return withIndent;
    })
    .join('\n');

  return [
    '---',
    `action: ${action}`,
    `target: |`,
    indentedTarget,
    `stack: [${stack.join(', ')}]`,
    `impact_tier: ${impactTier}`,
    `recommended_skills: [${finalSkills.join(', ')}]`,
    `governance: tribunal-v9`,
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

module.exports = { compileSuperPrompt, sanitizeUserInput, inferImpactTier };
