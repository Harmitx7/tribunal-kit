#!/usr/bin/env node
// VERIFY: Using native Node.js only. Zero dependencies to ensure instant execution.

const rawInput = process.argv.slice(2).join(' ');

if (!rawInput) {
  console.error("Usage: node prompt_compiler.js \"Your conversational prompt here\"");
  process.exit(1);
}

// 1. Strip conversational fluff (lowers token count)
let cleanInput = rawInput
  .replace(/hey,? /gi, '')
  .replace(/can you /gi, '')
  .replace(/could you /gi, '')
  .replace(/please /gi, '')
  .replace(/i want to /gi, '')
  .replace(/i need you to /gi, '')
  .replace(/for me/gi, '')
  .replace(/would it be possible to /gi, '')
  .trim();

// 2. Extract Action (Intent mapping)
const actionMatch = cleanInput.match(/^(build|create|fix|debug|refactor|update|write|design|audit)\b/i);
const action = actionMatch ? actionMatch[1].toLowerCase() : 'execute';

// Remove the action from the target string
if (actionMatch) {
  cleanInput = cleanInput.substring(actionMatch[0].length).trim();
}

// Strip leading articles
cleanInput = cleanInput.replace(/^(a|an|some)\s+/i, '');

// 3. Extract Technology Stack
const techKeywords = [
  'react', 'tailwind', 'next.js', 'sql', 'postgres', 'express', 
  'python', 'node', 'vue', 'svelte', 'typescript', 'js', 'css', 
  'html', 'prisma', 'drizzle'
];

const stack = [];
techKeywords.forEach(tech => {
  // Use word boundaries to prevent partial matches
  const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
  if (regex.test(cleanInput)) {
    stack.push(tech.toLowerCase());
  }
});

// 4. Output highly compressed YAML
console.log('---');
console.log(`action: ${action}`);
console.log(`target: ${cleanInput}`);
console.log(`stack: [${stack.join(', ')}]`);
console.log('---');
