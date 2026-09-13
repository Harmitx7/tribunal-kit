'use strict';

const {
  trimHTML,
  stripSVG,
  truncateUTF8Bytes,
  toSemanticMarkdown,
  MAX_TRIMMED_BYTES,
} = require('../../dist/browser/trimmer');

describe('Browser Token Trimmer (htmltrim)', () => {
  test('strips scripts, styles, and HTML comments', () => {
    const raw = `
      <html>
        <head>
          <style>body { color: red; }</style>
          <script>console.log("secret script");</script>
        </head>
        <body>
          <!-- This is a comment -->
          <h1>Welcome to Tribunal Kit</h1>
          <p>Real content</p>
        </body>
      </html>
    `;

    const trimmed = trimHTML(raw);
    expect(trimmed).not.toContain('color: red');
    expect(trimmed).not.toContain('secret script');
    expect(trimmed).not.toContain('This is a comment');
    expect(trimmed).toContain('Welcome to Tribunal Kit');
    expect(trimmed).toContain('Real content');
  });

  test('strips nested SVG cleanly without premature termination', () => {
    const raw = `
      <div>
        <svg viewBox="0 0 100 100">
          <g>
            <svg><circle cx="50" cy="50" r="40" /></svg>
          </g>
        </svg>
        <button>Submit</button>
      </div>
    `;

    const cleaned = stripSVG(raw);
    expect(cleaned).not.toContain('<svg');
    expect(cleaned).not.toContain('</svg>');
    expect(cleaned).not.toContain('circle');
    expect(cleaned).toContain('<button>Submit</button>');
  });

  test('strips base64 data URIs', () => {
    const raw = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Logo" />`;
    const trimmed = trimHTML(raw);
    expect(trimmed).not.toContain('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB');
    expect(trimmed).toContain('[data-uri]');
  });

  test('enforces strict 4,000 byte limit without corrupting UTF-8 characters', () => {
    const multiByte = '🚀 Tribunal Kit 🛡️ Anti-Hallucination Governance '.repeat(200);
    const truncated = truncateUTF8Bytes(multiByte, MAX_TRIMMED_BYTES);

    const byteLen = Buffer.byteLength(truncated, 'utf8');
    expect(byteLen).toBeLessThanOrEqual(MAX_TRIMMED_BYTES);

    // Assert that the string is valid UTF-8 without replacement characters
    expect(truncated).not.toContain('\uFFFD');
  });

  test('converts HTML to structured semantic markdown', () => {
    const html = `
      <html>
        <head><title>Dashboard — MyApp</title></head>
        <body>
          <h1>Overview</h1>
          <h2>Metrics</h2>
          <button>Deploy App</button>
          <input type="text" placeholder="Search..." />
          <a href="/settings">Settings</a>
        </body>
      </html>
    `;

    const md = toSemanticMarkdown(html);
    expect(md).toContain('# Dashboard — MyApp');
    expect(md).toContain('# Overview');
    expect(md).toContain('## Metrics');
    expect(md).toContain('- [Button #1] "Deploy App"');
    expect(md).toContain('- [Input #2] type="text" (placeholder="Search...")');
    expect(md).toContain('- [Link #3] "Settings" -> /settings');
    expect(Buffer.byteLength(md, 'utf8')).toBeLessThanOrEqual(MAX_TRIMMED_BYTES);
  });
});
