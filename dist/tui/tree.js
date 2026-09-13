'use strict';

/**
 * Hierarchical action tree nodes (⏺ / ⎿) matching the Brainless agent specification.
 */

const { isTTY, RGB, GLYPHS, color, bold } = require('./theme');

class ActionTree {
  constructor(options = {}) {
    this.staggerMs = isTTY ? (options.staggerMs ?? 15) : 0;
  }

  sleep(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async action(verb, target = null) {
    const g = GLYPHS;
    const bullet = color(RGB.EMERALD, g.bullet);
    const coloredVerb = color(RGB.WHITE, bold(verb));

    if (target) {
      const openParen = color(RGB.ZINC_600, '(');
      const coloredTarget = color(RGB.CYAN, target);
      const closeParen = color(RGB.ZINC_600, ')');
      console.log(`  ${bullet} ${coloredVerb}${openParen}${coloredTarget}${closeParen}`);
    } else {
      console.log(`  ${bullet} ${coloredVerb}`);
    }

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  async branch(message) {
    const g = GLYPHS;
    const branchGlyph = color(RGB.ZINC_600, g.branch);
    const coloredMsg = color(RGB.ZINC_400, message);
    console.log(`    ${branchGlyph} ${coloredMsg}`);

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  async itemSuccess(title, detail = null) {
    const g = GLYPHS;
    const check = color(RGB.EMERALD, g.success);
    const coloredTitle = color(RGB.WHITE, title);

    if (detail) {
      const coloredDetail = color(RGB.ZINC_500, detail);
      console.log(`    ${check} ${coloredTitle} ${coloredDetail}`);
    } else {
      console.log(`    ${check} ${coloredTitle}`);
    }

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  itemWarning(message) {
    const g = GLYPHS;
    const warn = color(RGB.AMBER, g.warning);
    const coloredMsg = color(RGB.AMBER, message);
    console.log(`    ${warn} ${coloredMsg}`);
  }

  itemError(message) {
    const g = GLYPHS;
    const err = color(RGB.ROSE, g.failure);
    const coloredMsg = color(RGB.ROSE, message);
    console.log(`    ${err} ${coloredMsg}`);
  }

  complete(message) {
    const g = GLYPHS;
    const check = color(RGB.EMERALD, g.success);
    const boldMsg = bold(message);
    const colored = color(RGB.WHITE, boldMsg);
    console.log();
    console.log(`  ${check} ${colored}`);
    console.log();
  }
}

module.exports = {
  ActionTree,
};
