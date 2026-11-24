'use strict';

async function cmdAutopilot(argv = process.argv) {
  const { createAutopilotService } = require('../autopilot/service');
  const [action, task, ...targets] = argv.slice(3);
  if (!['plan', 'inspect'].includes(action) || !task) {
    throw new Error('Usage: tk autopilot plan|inspect "outcome" [repository-relative targets]');
  }
  const service = createAutopilotService({ root: process.cwd() });
  const plan = service.plan({ task, targets });
  const result =
    action === 'inspect' && plan.planId ? await service.execute({ planId: plan.planId }) : null;
  console.log(JSON.stringify({ plan, ...(result && { result }) }));
  return { plan, ...(result && { result }) };
}

module.exports = { cmdAutopilot };
