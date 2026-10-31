'use strict';

Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdActivity = cmdActivity;

const {
  formatActivity,
  announceAgent,
  announceSkill,
  ACTIVITY_STATES,
  resolveEnvironment,
} = require('../activity');
const { log, err } = require('../utils/logger');

async function cmdActivity(flags = {}, argv = process.argv, quiet = false) {
  const subArgs = argv.slice(3).filter(a => !a.startsWith('-'));
  const subCommand = subArgs[0] || 'help';
  const targetEnv = resolveEnvironment(flags);

  switch (subCommand) {
    case 'announce': {
      const agentName = subArgs[1];
      if (!agentName) {
        err('Usage: tk activity announce <agent-name> [context]');
        process.exit(1);
      }
      const context = subArgs.slice(2).join(' ') || (typeof flags.context === 'string' ? flags.context : '');
      const output = announceAgent(agentName, context, targetEnv);
      if (!quiet) console.log(output);
      break;
    }

    case 'skill': {
      const skillName = subArgs[1];
      if (!skillName) {
        err('Usage: tk activity skill <skill-name> [context]');
        process.exit(1);
      }
      const context = subArgs.slice(2).join(' ') || (typeof flags.context === 'string' ? flags.context : '');
      const output = announceSkill(skillName, context, targetEnv);
      if (!quiet) console.log(output);
      break;
    }

    case 'event': {
      const state = flags.state || ACTIVITY_STATES.OPERATION_STARTED;
      const title = flags.title || subArgs.slice(1).join(' ') || 'Operational Event';
      const summary = flags.summary || null;
      const progress = flags.current !== undefined && flags.total !== undefined ? {
        current: Number(flags.current),
        total: Number(flags.total),
        unit: flags.unit || 'steps',
        isAuthoritative: true,
      } : null;

      const output = formatActivity({
        eventType: state,
        title,
        summary,
        progress,
        nextAction: flags.next || null,
      }, targetEnv);

      if (!quiet) console.log(output);
      break;
    }

    case 'help':
    default: {
      log('Tribunal Activity Presentation CLI');
      log('  tk activity announce <agent-name> [context]');
      log('  tk activity skill <skill-name> [context]');
      log('  tk activity event --state=<state> --title=<title>');
      break;
    }
  }
}

