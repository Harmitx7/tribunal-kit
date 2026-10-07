'use strict';

/**
 * Hierarchical action tree nodes matching the Pro-Max design system.
 * Uses connected timeline visuals to group steps contextually.
 */

const { isTTY, RGB, GLYPHS, color, bold, dim } = require('./theme');

class ActionTree {
  constructor(options = {}) {
    this.staggerMs = isTTY ? (options.staggerMs ?? 15) : 0;
    this.inProgress = false;
  }

  sleep(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _drawConnector(glyph, itemColor, indent = '  ') {
    return `${indent}${color(itemColor, glyph)}`;
  }

  _printLine(line) {
    if (line === undefined) {
      console.log();
    } else {
      console.log(line);
    }
  }

  async action(verb, target = null) {
    if (this.inProgress) {
      // Close previous action visually if it was left open
      this._printLine(`  ${color(RGB.SLATE_700, GLYPHS.boxV)}`);
    }
    this.inProgress = true;
    
    const bullet = color(RGB.EMERALD, GLYPHS.bullet);
    const coloredVerb = bold(color(RGB.WHITE, verb));

    if (target) {
      const coloredTarget = color(RGB.CYAN, target);
      this._printLine(`  ${bullet} ${coloredVerb} ${dim('➜')} ${coloredTarget}`);
    } else {
      this._printLine(`  ${bullet} ${coloredVerb}`);
    }

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  async branch(message) {
    const pipe = color(RGB.SLATE_700, GLYPHS.boxV);
    const branchGlyph = color(RGB.ZINC_600, GLYPHS.treeMid);
    const coloredMsg = color(RGB.ZINC_400, message);
    
    this._printLine(`  ${pipe}`);
    this._printLine(`  ${pipe} ${branchGlyph} ${coloredMsg}`);

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  async itemSuccess(title, detail = null) {
    const pipe = color(RGB.SLATE_700, GLYPHS.boxV);
    const check = color(RGB.EMERALD, GLYPHS.success);
    const coloredTitle = color(RGB.WHITE, title);
    const connector = color(RGB.ZINC_600, GLYPHS.treeMid);

    this._printLine(`  ${pipe}`);
    if (detail) {
      const coloredDetail = color(RGB.ZINC_500, detail);
      this._printLine(`  ${pipe} ${connector} ${check} ${coloredTitle} ${coloredDetail}`);
    } else {
      this._printLine(`  ${pipe} ${connector} ${check} ${coloredTitle}`);
    }

    if (this.staggerMs > 0) {
      await this.sleep(this.staggerMs);
    }
  }

  itemWarning(message) {
    const pipe = color(RGB.SLATE_700, GLYPHS.boxV);
    const warn = color(RGB.AMBER, GLYPHS.warning);
    const coloredMsg = color(RGB.AMBER, message);
    const connector = color(RGB.ZINC_600, GLYPHS.treeMid);
    this._printLine(`  ${pipe}`);
    this._printLine(`  ${pipe} ${connector} ${warn} ${coloredMsg}`);
  }

  itemError(message) {
    const pipe = color(RGB.SLATE_700, GLYPHS.boxV);
    const err = color(RGB.ROSE, GLYPHS.failure);
    const coloredMsg = color(RGB.ROSE, message);
    const connector = color(RGB.ZINC_600, GLYPHS.treeEnd);
    this._printLine(`  ${pipe}`);
    this._printLine(`  ${pipe} ${connector} ${err} ${coloredMsg}`);
    this.inProgress = false;
  }

  complete(message) {
    this.inProgress = false;
    const check = color(RGB.EMERALD, GLYPHS.success);
    const colored = bold(color(RGB.PURE_WHITE, message));
    
    // Cap off the timeline
    this._printLine(`  ${color(RGB.SLATE_700, GLYPHS.treeEnd)}`);
    this._printLine();
    this._printLine(`  ${check} ${colored}`);
    this._printLine();
  }
}

module.exports = {
  ActionTree,
};
