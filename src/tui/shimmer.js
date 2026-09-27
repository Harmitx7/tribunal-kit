'use strict';

/**
 * Shimmering gradient text animation & zero-flicker Braille spinner.
 * Mirrors the Brainless CSS shimmer effect in Node.js ANSI TrueColor.
 */

const { isTTY, hasColor, hasTrueColor, RGB, GLYPHS, color, bold } = require('./theme');

function renderShimmerText(text, frame) {
  let out = '';
  const numChars = text.length;
  const wavePos = ((frame * 0.18) % (numChars + 4)) - 2;

  for (let i = 0; i < numChars; i++) {
    const dist = Math.abs(i - wavePos);
    const intensity = Math.max(0, Math.min(1, 1.0 - dist / 3.0));

    // Interpolate between FLAME #cd694a and bright CORAL #ffe4d6
    const r = Math.floor(205 + intensity * 50);
    const g = Math.floor(105 + intensity * 123);
    const b = Math.floor(74 + intensity * 140);

    out += `\x1b[38;2;${r};${g};${b}m\x1b[1m${text[i]}\x1b[0m`;
  }
  return out;
}

class ShimmerSpinner {
  constructor(verb, details = '') {
    this.verb = verb;
    this.details = details;
    this.timer = null;
    this.frame = 0;
    this.startTime = Date.now();
  }

  start() {
    if (!isTTY || !hasColor) {
      console.log(`  · ${this.verb} (${this.details})`);
      return this;
    }

    const braille = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    // Hide cursor to prevent flicker
    process.stderr.write('\x1b[?25l');

    this.timer = setInterval(() => {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const spinnerChar = braille[this.frame % braille.length];

      const shimmerVerb = hasTrueColor
        ? renderShimmerText(this.verb, this.frame)
        : bold(this.verb);

      const dot = color(RGB.FLAME, '·');
      const timerText = color(RGB.ZINC_500, `(${elapsed}s · ${this.details})`);
      const spinColored = color(RGB.FLAME, spinnerChar);

      process.stderr.write(`\r\x1b[2K  ${dot} ${spinColored} ${shimmerVerb} ${timerText}`);
      this.frame++;
    }, 60);

    return this;
  }

  finish(successMsg = null) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (isTTY && hasColor) {
      // Clear line and restore cursor
      process.stderr.write('\r\x1b[2K\x1b[?25h');
    }

    if (successMsg) {
      const g = GLYPHS;
      const check = color(RGB.EMERALD, g.success);
      const boldMsg = bold(successMsg);
      console.log(`  ${check} ${color(RGB.WHITE, boldMsg)}`);
    }
  }
}

module.exports = {
  ShimmerSpinner,
  renderShimmerText,
};
