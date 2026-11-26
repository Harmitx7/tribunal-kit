'use strict';

const { classifySpeechAct } = require('../.agent/scripts/intent_extractor');

async function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 16384) return;
  }
  const event = JSON.parse(input);
  if (
    event.hook_event_name !== 'UserPromptSubmit' ||
    typeof event.session_id !== 'string' ||
    typeof event.prompt !== 'string' ||
    event.prompt.length > 4096 ||
    event.agent_id ||
    event.prompt.startsWith('<') ||
    classifySpeechAct(event.prompt) === 'discuss'
  )
    return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext:
          'For a repository change with concrete target paths, use tribunal_autopilot_plan once for this turn. A plan is advisory and does not authorize actions or grant new tools. Apply the existing permission and write approval workflow.',
      },
    }) + '\n',
  );
}

main().catch(() => {});
