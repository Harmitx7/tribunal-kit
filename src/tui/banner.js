const {
  isTTY,
  hasColor,
  hasTrueColor,
  RGB,
  color,
  bold,
  dim,
  inverse,
  getColumns,
  visibleLength,
} = require('./theme');

function renderBanner(version = '9.2.9', quiet = false, options = {}) {
  if (quiet) return;
  if (!isTTY && !hasColor) {
    console.error(`TRIBUNAL-KIT v${version} — Anti-Hallucination Governance Layer`);
    return;
  }

  const cols = getColumns();
  const titleText = ' TRIBUNAL-KIT ';
  let styledTitle;
  if (hasTrueColor) {
    styledTitle = `\x1b[48;2;${RGB.FLAME[0]};${RGB.FLAME[1]};${RGB.FLAME[2]}m\x1b[38;2;${RGB.PURE_WHITE[0]};${RGB.PURE_WHITE[1]};${RGB.PURE_WHITE[2]}m\x1b[1m${titleText}\x1b[0m`;
  } else {
    styledTitle = inverse(bold(titleText));
  }

  const versionTag = dim(`v${version}`);
  const rightPillText = options.rightPill || '[Fortress Mode · Rust Core]';
  const rightPill = dim(rightPillText);

  const subtitle = options.subtitle || 'Autonomous Anti-Hallucination Governance Layer';
  const subtitleColored = color(RGB.ZINC_400, subtitle);

  console.log();
  if (cols < 58) {
    // Narrow terminal compact stacked header
    console.log(`  ${styledTitle} ${versionTag}`);
    console.log(`  ${rightPill}`);
    console.log(`  ${subtitleColored}`);
  } else {
    // Standard and wide responsive layout
    const width = Math.min(84, cols - 4);
    const leftLen = visibleLength(titleText) + visibleLength(`v${version}`) + 2;
    const rightLen = visibleLength(rightPillText);
    const spaces = Math.max(2, width - leftLen - rightLen);

    console.log(`  ${styledTitle}  ${versionTag}${' '.repeat(spaces)}${rightPill}`);
    console.log(`  ${subtitleColored}`);
  }
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
