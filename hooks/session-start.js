#!/usr/bin/env node
/**
 * Cross-Platform SessionStart Hook for Tribunal Kit
 *
 * Injects Tribunal Kit master governance instructions into the host agent session
 * on startup, clear, and context compaction.
 *
 * Supports:
 * - Cursor Agent (emits additional_context)
 * - Claude Code (emits hookSpecificOutput.additionalContext)
 * - GitHub Copilot CLI / Standard Agent SDK (emits additionalContext)
 */

const fs = require('fs');
const path = require('path');

function getPluginRoot() {
  if (process.env.CURSOR_PLUGIN_ROOT) return process.env.CURSOR_PLUGIN_ROOT;
  if (process.env.CLAUDE_PLUGIN_ROOT) return process.env.CLAUDE_PLUGIN_ROOT;
  return path.resolve(__dirname, '..');
}

function loadMasterRules(pluginRoot) {
  const candidates = [
    path.join(pluginRoot, '.agent', 'rules', 'GEMINI.md'),
    path.join(pluginRoot, '.agent', 'config', 'system-prompt.md'),
    path.join(pluginRoot, '.cursorrules'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate, 'utf8');
      } catch (_err) {
        // Continue to next candidate
      }
    }
  }

  return '# Tribunal Kit Master Governance Active\nEnforce strict TDD, out-of-band context isolation, and parallel reviewer waves.';
}

function main() {
  const pluginRoot = getPluginRoot();
  const rules = loadMasterRules(pluginRoot);

  const sessionContext = [
    '<EXTREMELY_IMPORTANT>',
    'Tribunal Kit Master Governance is active.',
    'You are operating under the Tribunal Anti-Hallucination & Subagent-Driven Development (SDD) protocol.',
    'Enforce: Iron Law of TDD (Red-Green-Refactor), 28-Specialist Review Waves, Out-of-Band Context Isolation, and Zero Placeholders.',
    '',
    rules,
    '</EXTREMELY_IMPORTANT>',
  ].join('\n');

  let outputObj;
  if (process.env.CURSOR_PLUGIN_ROOT) {
    // Cursor expects snake_case additional_context
    outputObj = { additional_context: sessionContext };
  } else if (process.env.CLAUDE_PLUGIN_ROOT && !process.env.COPILOT_CLI) {
    // Claude Code expects nested hookSpecificOutput
    outputObj = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: sessionContext,
      },
    };
  } else {
    // Standard SDK / Copilot CLI
    outputObj = { additionalContext: sessionContext };
  }

  process.stdout.write(JSON.stringify(outputObj, null, 2) + '\n');
}

main();
