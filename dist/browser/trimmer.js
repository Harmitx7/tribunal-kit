'use strict';

/**
 * trimmer.js — High-Performance Token Pruning Engine for Tribunal-Kit
 *
 * Implements PinchTab's token-efficient htmltrim algorithm in Node.js.
 * Strips scripts, styles, comments, SVG (with nested depth tracking), data URIs,
 * and excess whitespace, then strictly truncates on UTF-8 rune boundaries to 4,000 bytes.
 * Also converts raw HTML into a compact, accessible semantic markdown representation.
 */

const MAX_TRIMMED_BYTES = 4000;

/**
 * Strips scripts, styles, comments, SVG, and data URIs, then caps at maxBytes.
 * @param {string} html
 * @param {number} maxBytes
 * @returns {string}
 */
function trimHTML(html, maxBytes = MAX_TRIMMED_BYTES) {
  if (!html || typeof html !== 'string') return '';

  // 1. Strip scripts, styles, comments
  let cleaned = html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '');

  // 2. Strip SVG with nested depth tracking (exact port of PinchTab's stripSVG)
  cleaned = stripSVG(cleaned);

  // 3. Strip long data URIs
  cleaned = cleaned.replace(/(data:[a-z\d.+-]+\/[a-z\d.+-]+;base64,[A-Za-z\d+/=]{30,})/gi, '[data-uri]');

  // 4. Collapse excess whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  // 5. Trim lines and filter empty
  const lines = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const joined = lines.join('\n');

  // 6. Truncate to exact UTF-8 byte boundary
  return truncateUTF8Bytes(joined, maxBytes);
}

/**
 * Strips SVG tags with depth tracking so nested SVG tags do not terminate prematurely.
 * @param {string} html
 * @returns {string}
 */
function stripSVG(html) {
  const lower = html.toLowerCase();
  let result = '';
  let i = 0;

  while (i < html.length) {
    const start = lower.indexOf('<svg', i);
    if (start === -1) {
      result += html.slice(i);
      break;
    }

    // Verify tag boundary
    const boundaryChar = lower[start + 4];
    if (boundaryChar && !/[\s>\/]/.test(boundaryChar)) {
      // e.g. <svgIcon>, not an SVG tag
      result += html.slice(i, start + 4);
      i = start + 4;
      continue;
    }

    result += html.slice(i, start);

    // Find closing </svg> considering depth
    let depth = 1;
    let curr = start + 4;
    let closed = false;

    while (curr < html.length) {
      const nextOpen = lower.indexOf('<svg', curr);
      const nextClose = lower.indexOf('</svg>', curr);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose && /[\s>\/]/.test(lower[nextOpen + 4] || '')) {
        depth++;
        curr = nextOpen + 4;
      } else {
        depth--;
        curr = nextClose + 6;
        if (depth === 0) {
          i = curr;
          closed = true;
          break;
        }
      }
    }

    if (!closed) {
      // Unterminated, append remainder
      result += html.slice(start);
      break;
    }
  }

  return result;
}

/**
 * Safely truncates a string so its UTF-8 byte representation does not exceed maxBytes.
 * Guarantees no split characters or invalid multi-byte code units.
 * @param {string} str
 * @param {number} maxBytes
 * @returns {string}
 */
function truncateUTF8Bytes(str, maxBytes) {
  const buf = Buffer.from(str, 'utf8');
  if (buf.length <= maxBytes) return str;

  // Slice buffer to maxBytes and step backwards if we split a UTF-8 sequence
  let end = maxBytes;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end--;
  }

  return buf.slice(0, end).toString('utf8');
}

/**
 * Extracts interactive elements and layout structure into a compact semantic markdown tree.
 * @param {string} html
 * @returns {string}
 */
function toSemanticMarkdown(html) {
  const trimmed = trimHTML(html, 16000);

  // Extract title
  const titleMatch = trimmed.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Page';

  const output = [`# ${title}\n`];

  // Headings
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = headingRegex.exec(trimmed)) !== null) {
    const level = '#'.repeat(parseInt(m[1], 10));
    const text = stripTags(m[2]).trim();
    if (text) output.push(`${level} ${text}`);
  }

  // Interactive Elements: Buttons, Links, Inputs
  output.push('\n### Interactive Elements:');

  let ref = 1;
  // Buttons
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  while ((m = buttonRegex.exec(trimmed)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text) output.push(`- [Button #${ref++}] "${text}"`);
  }

  // Inputs
  const inputRegex = /<input\b([^>]*)>/gi;
  while ((m = inputRegex.exec(trimmed)) !== null) {
    const attrs = m[1];
    const typeMatch = attrs.match(/type=["']([^"']+)["']/i) || attrs.match(/type=([^"'\s]+)/i);
    const nameMatch = attrs.match(/name=["']([^"']+)["']/i) || attrs.match(/name=([^"'\s]+)/i);
    const placeholderMatch = attrs.match(/placeholder=["']([^"']+)["']/i) || attrs.match(/placeholder=([^"'\s]+)/i);
    const type = typeMatch ? typeMatch[1] : 'text';
    const desc = placeholderMatch ? `placeholder="${placeholderMatch[1]}"` : nameMatch ? `name="${nameMatch[1]}"` : type;
    output.push(`- [Input #${ref++}] type="${type}" (${desc})`);
  }

  // Links (first 25 to preserve budget)
  const linkRegex = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkCount = 0;
  while ((m = linkRegex.exec(trimmed)) !== null && linkCount < 25) {
    const href = m[1];
    const text = stripTags(m[2]).trim();
    if (text && !href.startsWith('#') && !href.startsWith('javascript:')) {
      output.push(`- [Link #${ref++}] "${text}" -> ${href}`);
      linkCount++;
    }
  }

  const result = output.join('\n');
  return truncateUTF8Bytes(result, MAX_TRIMMED_BYTES);
}

/**
 * Helper to strip HTML tags
 */
function stripTags(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

module.exports = {
  MAX_TRIMMED_BYTES,
  trimHTML,
  stripSVG,
  truncateUTF8Bytes,
  toSemanticMarkdown,
};
