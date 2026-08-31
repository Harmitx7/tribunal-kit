'use strict';

const {
  RGB,
  GLYPHS,
  color,
  bold,
  dim,
  ActionTree,
  ShimmerSpinner,
  renderShimmerText,
  renderReviewerGrid,
  ALL_REVIEWERS,
  WizardPrompt,
  renderBanner,
} = require('../../dist/tui');

describe('TUI System & Brainless Components', () => {
  let logSpy;
  let errSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  describe('Theme & Color Palette', () => {
    test('defines required RGB constants for Brainless tokens', () => {
      expect(RGB.SLATE_900).toEqual([13, 13, 15]);
      expect(RGB.FLAME).toEqual([205, 105, 74]);
      expect(RGB.EMERALD).toEqual([78, 169, 111]);
      expect(RGB.CYAN).toEqual([125, 207, 255]);
    });

    test('formats text with colors and weights', () => {
      const boldText = bold('test');
      expect(boldText).toContain('test');

      const colored = color(RGB.EMERALD, 'success');
      expect(colored).toContain('success');

      const dimmed = dim('metadata');
      expect(dimmed).toContain('metadata');
    });

    test('defines all required Unicode glyphs', () => {
      expect(GLYPHS.bullet).toBeDefined();
      expect(GLYPHS.branch).toBeDefined();
      expect(GLYPHS.success).toBeDefined();
      expect(GLYPHS.failure).toBeDefined();
      expect(GLYPHS.chevron).toBeDefined();
    });
  });

  describe('Banner & Header Cards', () => {
    test('suppresses banner when quiet is true', () => {
      renderBanner('8.0.0', true);
      expect(logSpy).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });

    test('renders banner when quiet is false', () => {
      renderBanner('8.0.0', false);
      // In non-TTY (Jest), banner falls back to console.error with plain text
      const logOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      const errOutput = errSpy.mock.calls.map(c => c[0]).join('\n');
      const combinedOutput = logOutput + '\n' + errOutput;
      expect(combinedOutput).toContain('TRIBUNAL-KIT');
    });
  });

  describe('ActionTree Builder', () => {
    test('renders hierarchical action, branch, and complete nodes', async () => {
      const tree = new ActionTree({ staggerMs: 0 });
      await tree.action('Synthesizing', 'bridges');
      await tree.branch('Cursor rules registered');
      await tree.itemSuccess('Bridges ready', '3 files');
      tree.itemWarning('Notice');
      tree.itemError('Failure');
      tree.complete('Done');

      const logs = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(logs).toContain('Synthesizing');
      expect(logs).toContain('bridges');
      expect(logs).toContain('Cursor rules registered');
      expect(logs).toContain('Bridges ready');
      expect(logs).toContain('Notice');
      expect(logs).toContain('Failure');
      expect(logs).toContain('Done');
    });
  });

  describe('Shimmering Animation', () => {
    test('renders shimmer text wave over characters', () => {
      const shimmer = renderShimmerText('Thinking…', 0);
      // Each character is individually wrapped in ANSI escape codes,
      // so a simple substring match won't work — check individual chars
      for (const ch of 'Thinking') {
        expect(shimmer).toContain(ch);
      }
      expect(shimmer).toContain('\x1b[');
    });

    test('starts and finishes ShimmerSpinner cleanly', () => {
      const spinner = new ShimmerSpinner('Verifying', '28 reviewers');
      spinner.start();
      spinner.finish('Verification complete');

      const logs = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(logs).toContain('Verification complete');
    });
  });

  describe('Reviewer Matrix', () => {
    test('contains all 28 parallel reviewers', () => {
      expect(ALL_REVIEWERS.length).toBe(28);
    });

    test('renders reviewer status board (TTY or fallback)', () => {
      renderReviewerGrid(28);
      const logs = logSpy.mock.calls.map(c => c[0]).join('\n');
      // In non-TTY mode, the grid renders a static fallback message
      // In TTY mode, it renders the full multi-column reviewer matrix
      const hasSwarm = logs.includes('Tribunal Parallel Reviewer Swarm');
      const hasFallback = logs.includes('28/28 Reviewers passed');
      expect(hasSwarm || hasFallback).toBe(true);
    });
  });

  describe('Wizard Prompt', () => {
    test('displays summary of selected options in non-interactive mode', () => {
      const wizard = new WizardPrompt();
      wizard.displaySummary('Select IDEs:', [
        { label: 'Cursor', detail: '(.cursorrules)', selected: true },
        { label: 'Windsurf', detail: '(.windsurfrules)', selected: false },
      ]);

      const logs = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(logs).toContain('Select IDEs:');
      expect(logs).toContain('Cursor');
      expect(logs).toContain('Windsurf');
    });
  });
});
