'use strict';

/**
 * Zero-dependency interactive terminal multi-select wizard.
 * Handles keyboard navigation, space-to-toggle, and non-TTY fallback.
 * Upgraded for Pro-Max design.
 */

const readline = require('readline');
const { isTTY, RGB, GLYPHS, color, bold, bg, inverse } = require('./theme');

class WizardPrompt {
  displaySummary(question, options) {
    const g = GLYPHS;
    const prefix = color(RGB.AMBER, '?');
    const boldQ = bold(color(RGB.WHITE, question));
    console.log();
    console.log(`  ${prefix} ${boldQ}`);
    console.log();

    for (const opt of options) {
      const check = opt.selected ? color(RGB.EMERALD, g.check) : color(RGB.ZINC_600, g.uncheck);

      const labelColored = opt.selected
        ? color(RGB.PURE_WHITE, opt.label)
        : color(RGB.ZINC_500, opt.label);

      const detailColored = color(RGB.ZINC_600, opt.detail || '');

      console.log(`    ${check} ${labelColored} ${detailColored}`);
    }

    const hint = '[Space] Toggle · [Enter] Confirm · [A] Select All';
    console.log(`\n  ${color(RGB.ZINC_600, hint)}\n`);
  }

  async selectMultiple(question, initialOptions) {
    if (!isTTY || !process.stdin.isTTY) {
      this.displaySummary(question, initialOptions);
      return initialOptions;
    }

    const options = initialOptions.map(opt => ({ ...opt }));
    let cursor = 0;
    const g = GLYPHS;

    return new Promise(resolve => {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      // Hide cursor
      process.stdout.write('\x1b[?25l');

      const render = (isFinal = false) => {
        let out = '';
        const prefix = color(RGB.AMBER, '?');
        out += `\n  ${prefix} ${bold(color(RGB.WHITE, question))}\n\n`;

        options.forEach((opt, idx) => {
          const isCursor = idx === cursor;
          const pointer = isCursor ? color(RGB.FLAME, g.pointer) : '  ';
          const check = opt.selected ? color(RGB.EMERALD, g.check) : color(RGB.ZINC_600, g.uncheck);

          let labelColored = opt.label;
          if (isCursor) {
             labelColored = inverse(bold(` ${labelColored} `));
          } else if (opt.selected) {
             labelColored = color(RGB.PURE_WHITE, ` ${labelColored} `);
          } else {
             labelColored = color(RGB.ZINC_500, ` ${labelColored} `);
          }

          const detailColored = color(RGB.ZINC_600, opt.detail || '');
          out += `  ${pointer} ${check} ${labelColored} ${detailColored}\n`;
        });

        if (isFinal) {
          out += `\n  ${color(RGB.EMERALD, '✔ Configuration locked.')}\n`;
        } else {
          const hint = '[Space] Toggle · [Enter] Confirm · [A] All · [↑/↓] Move';
          out += `\n  ${color(RGB.ZINC_600, hint)}\n`;
        }

        return { out };
      };

      let renderedOnce = false;

      const draw = (isFinal = false) => {
        const { out } = render(isFinal);
        if (renderedOnce) {
          // Clear and rewrite lines (options length + 5 lines of headers/footers)
          process.stdout.write(`\x1b[${options.length + 5}A\r`);
        }
        process.stdout.write(out);
        renderedOnce = true;
      };

      draw();

      const onKeypress = (str, key) => {
        if (!key) return;

        if (key.ctrl && key.name === 'c') {
          cleanup();
          process.exit(130);
        }

        if (key.name === 'up' || key.name === 'k') {
          cursor = (cursor - 1 + options.length) % options.length;
          draw();
        } else if (key.name === 'down' || key.name === 'j') {
          cursor = (cursor + 1) % options.length;
          draw();
        } else if (key.name === 'space') {
          options[cursor].selected = !options[cursor].selected;
          draw();
        } else if (str === 'a' || str === 'A') {
          const allSelected = options.every(o => o.selected);
          options.forEach(o => (o.selected = !allSelected));
          draw();
        } else if (key.name === 'return' || key.name === 'enter') {
          cleanup();
          draw(true);
          resolve(options);
        }
      };

      const cleanup = () => {
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdout.write('\x1b[?25h'); // restore cursor
      };

      process.stdin.on('keypress', onKeypress);
    });
  }
}

module.exports = {
  WizardPrompt,
};
