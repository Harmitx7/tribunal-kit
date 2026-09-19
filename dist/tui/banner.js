'use strict';

/**
 * Minimalist framed header cards and status banners.
 * Parity with Brainless & Claude Code design tokens.
 */

const { isTTY, hasColor, hasTrueColor, RGB, GLYPHS, color, bold, getColumns } = require('./theme');

function renderBanner(version = '9.2.2', quiet = false) {
  if (quiet) return;
  if (!isTTY && !hasColor) {
    console.error(`TRIBUNAL-KIT v${version} — Anti-Hallucination Governance Layer`);
    return;
  }

  const g = GLYPHS;
  const cols = getColumns();
  const width = Math.min(84, Math.max(64, cols));
  const innerWidth = width - 4;

  const titleLeft = `🛡️  TRIBUNAL-KIT  v${version}`;
  const rightPill = '[Fortress Mode · ⚡ Rust Core]';
  const leftLen = titleLeft.length; // emojis and text
  const rightLen = rightPill.length;

  const spaces = innerWidth > leftLen + rightLen ? innerWidth - (leftLen + rightLen) : 2;

  const borderTop = `  ${g.boxTl}${g.boxH.repeat(innerWidth + 2)}${g.boxTr}`;
  const borderBottom = `  ${g.boxBl}${g.boxH.repeat(innerWidth + 2)}${g.boxBr}`;

  const coloredBorderTop = color(RGB.SLATE_700, borderTop);
  const coloredBorderBottom = color(RGB.SLATE_700, borderBottom);
  const pipe = color(RGB.SLATE_700, g.boxV);

  // Gradient title line
  let boldTitle;
  if (hasTrueColor) {
    let res = '🛡️  ';
    const text = `TRIBUNAL-KIT  v${version}`;
    const len = text.length;
    for (let i = 0; i < len; i++) {
      const ratio = i / len;
      const r = 255;
      const gVal = Math.floor(105 + ratio * 80);
      const bVal = Math.floor(74 - ratio * 30);
      res += `\x1b[38;2;${r};${gVal};${bVal}m\x1b[1m${text[i]}\x1b[0m`;
    }
    boldTitle = res;
  } else {
    boldTitle = bold(titleLeft);
  }

  const coloredRightPill = color(RGB.ZINC_500, rightPill);
  const subtitle = 'Autonomous Anti-Hallucination Governance Layer for AI Coding Agents';
  const subSpaces = Math.max(0, innerWidth - subtitle.length);
  const coloredSubtitle = color(RGB.ZINC_400, subtitle);

  console.log();
  console.log(coloredBorderTop);
  console.log(`  ${pipe} ${boldTitle}${' '.repeat(spaces)}${coloredRightPill} ${pipe}`);
  console.log(`  ${pipe} ${coloredSubtitle}${' '.repeat(subSpaces)} ${pipe}`);
  console.log(coloredBorderBottom);
  console.log();
}

function renderSectionHeader(title) {
  const g = GLYPHS;
  const prefix = color(RGB.FLAME, g.chevron);
  const boldTitle = bold(title);
  console.log(`  ${prefix} ${boldTitle}`);
}

module.exports = {
  renderBanner,
  renderSectionHeader,
};
