#!/usr/bin/env node
// VERIFY: Using native Node.js only. Zero dependencies to ensure instant execution.

const rawInput = process.argv.slice(2).join(" ");

if (!rawInput) {
  console.error(
    'Usage: node prompt_compiler.js "Your conversational prompt here"',
  );
  process.exit(1);
}

// 1. Keep original input, only optionally strip leading "please" for action matching
const cleanInput = rawInput.trim();

// 2. Extract Action (Intent mapping)
const actionMatch = cleanInput.match(
  /^(?:(?:hey,?\s*|please\s+|can you\s+|could you\s+|would you\s+|i need you to\s+|i want to\s+)*)(build|create|fix|debug|refactor|update|write|design|audit)\b/i,
);
const action = actionMatch ? actionMatch[1].toLowerCase() : "execute";

// 3. Extract Technology Stack
const techKeywords = [
  "react",
  "tailwind",
  "next.js",
  "sql",
  "postgres",
  "express",
  "python",
  "node",
  "vue",
  "svelte",
  "typescript",
  "js",
  "css",
  "html",
  "prisma",
  "drizzle",
];

const stack = [];
techKeywords.forEach((tech) => {
  const regex = new RegExp(`\\b${tech.replace(".", "\\.")}\\b`, "i");
  if (regex.test(cleanInput)) {
    stack.push(tech.toLowerCase());
  }
});

// 4. Intelligent Pre-Routing
const routerMap = {
  react: ["react-specialist", "frontend-design"],
  tailwind: ["tailwind-patterns"],
  "next.js": ["nextjs-react-expert", "react-specialist"],
  sql: ["sql-pro", "database-design"],
  postgres: ["database-design"],
  express: ["nodejs-best-practices"],
  python: ["python-pro"],
  node: ["nodejs-best-practices"],
  vue: ["vue-expert"],
  svelte: ["frontend-design"],
  typescript: ["typescript-advanced"],
  js: ["clean-code"],
  css: ["tailwind-patterns"],
  html: ["frontend-design"],
  prisma: ["database-design"],
  drizzle: ["database-design"],
};

const actionRouter = {
  build: ["architecture"],
  create: ["architecture"],
  fix: ["systematic-debugging"],
  debug: ["systematic-debugging"],
  refactor: ["clean-code"],
  update: ["clean-code"],
  write: ["clean-code"],
  design: ["frontend-design"],
  audit: ["vulnerability-scanner", "lint-and-validate"],
};

const recommendedSkills = new Set();

if (actionRouter[action]) {
  actionRouter[action].forEach((s) => recommendedSkills.add(s));
}

stack.forEach((tech) => {
  if (routerMap[tech]) {
    routerMap[tech].forEach((s) => recommendedSkills.add(s));
  }
});

const finalSkills = Array.from(recommendedSkills).slice(0, 3);

// 5. Output highly compressed YAML
console.log("---");
console.log(`action: ${action}`);
console.log(`target: |`);
const indentedTarget = cleanInput
  .split("\n")
  .map((line) => "  " + line)
  .join("\n");
console.log(indentedTarget);
console.log(`stack: [${stack.join(", ")}]`);
console.log(`recommended_skills: [${finalSkills.join(", ")}]`);
console.log("---");
