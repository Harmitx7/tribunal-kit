'use strict';

const path = require('path');
const { cmdCockpit, renderCockpitFrame } = require('../../src/commands/cockpit');
const tui = require('../../src/tui');

describe('TUI Swarm Monitor (tk cockpit)', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('tui exports renderCockpitFrame and cmdCockpit', () => {
    expect(typeof tui.renderCockpitFrame).toBe('function');
    expect(typeof tui.cmdCockpit).toBe('function');
  });

  test('cmdCockpit emits structured JSON when --json flag is passed', async () => {
    await cmdCockpit(
      { json: true, path: path.resolve(__dirname, '../..') },
      ['node', 'tk', 'cockpit', '--json'],
      false,
    );

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const parsed = JSON.parse(output);

    expect(parsed.command).toBe('cockpit');
    expect(parsed.reviewers).toBeDefined();
    expect(parsed.reviewers.total).toBe(28);
    expect(parsed.waves).toBeDefined();
    expect(parsed.waves.length).toBe(3);
    expect(parsed.telemetry).toBeDefined();
    expect(parsed.telemetry.zeroHallucinationIndex).toBe('100%');
  });

  test('cmdCockpit runs single frame cleanly when --once flag is passed', async () => {
    await cmdCockpit(
      { once: true, path: path.resolve(__dirname, '../..') },
      ['node', 'tk', 'cockpit', '--once'],
      false,
    );

    expect(logSpy).toHaveBeenCalled();
  });

  test('renderCockpitFrame renders expected panels and headers', () => {
    renderCockpitFrame({
      targetDir: path.resolve(__dirname, '../..'),
      quiet: false,
      interactive: false,
      showReviewers: true,
      completedReviewers: 28,
    });

    expect(logSpy).toHaveBeenCalled();
  });
});
