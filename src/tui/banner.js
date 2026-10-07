'use strict';

/**
 * Minimalist header cards and status banners.
 * Redesigned for Pro-Max Aesthetic.
 */

const { isTTY, hasColor, hasTrueColor, RGB, color, bold, dim, inverse, getColumns } = require('./theme');

function renderBanner(version = '9.2.8', quiet = false) {
  if (quiet) return;
  if (!isTTY && !hasColor) {
    console.error(`TRIBUNAL-KIT v${version} — Anti-Hallucination Governance Layer`);
    return;
  }

  const cols = getColumns();
  const width = Math.min(84, Math.max(64, cols));

  const titleText = ` TRIBUNAL-KIT `;
  let styledTitle;
  if (hasTrueColor) {
    styledTitle = `\x1b[48;2;${RGB.FLAME[0]};${RGB.FLAME[1]};${RGB.FLAME[2]}m\x1b[38;2;${RGB.PURE_WHITE[0]};${RGB.PURE_WHITE[1]};${RGB.PURE_WHITE[2]}m\x1b[1m${titleText}\x1b[0m`;
  } else {
    styledTitle = inverse(bold(titleText));
  }

  const versionTag = dim(`v${version}`);
  const rightPill = dim('[Fortress Mode · Rust Core]');
  const leftLen = titleText.length + versionTag.length - (hasTrueColor ? 0 : 0); 
  
  // Roughly calculate spaces
  const spaces = Math.max(2, width - titleText.length - `v${version}`.length - '[Fortress Mode · Rust Core]'.length - 4);

  const subtitle = 'Autonomous Anti-Hallucination Governance Layer';
  const subtitleColored = color(RGB.ZINC_400, subtitle);

  console.log();
  console.log(`  ${styledTitle}  ${versionTag}${' '.repeat(spaces)}${rightPill}`);
  console.log(`  ${subtitleColored}`);
  console.log();
}

function renderSectionHeader(title, subtitle = '') {
  const boldTitle = bold(color(RGB.WHITE, title));
  if (subtitle) {
    console.log(`\n  ${boldTitle}  ${dim(subtitle)}\n`);
  } else {
    console.log(`\n  ${boldTitle}\n`);
  }
}

module.exports = {
  renderBanner,
  renderSectionHeader,
};
