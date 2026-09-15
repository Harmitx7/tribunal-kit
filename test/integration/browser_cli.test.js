'use strict';

const http = require('http');
const { browse, auditURL } = require('../../dist/browser');

// Polyfill WebSocket for Node < 21
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}

describe('Browser Live Integration & Auditing', () => {
  let server;
  const PORT = 45678;
  const TEST_URL = `http://127.0.0.1:${PORT}`;

  beforeAll(done => {
    server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Tribunal Test Benchmark</title>
            <style>body { font-family: sans-serif; }</style>
          </head>
          <body>
            <h1>Welcome to Tribunal Kit Browser Test</h1>
            <h2>Secondary Section</h2>
            <p>Testing token-efficient extraction and live WCAG audit.</p>
            <button id="btn1">Start Analysis</button>
            <input type="text" id="username" placeholder="Enter username" />
            <a href="/docs">Documentation</a>
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Sample Logo" />
          </body>
        </html>
      `);
    });

    server.listen(PORT, '127.0.0.1', () => done());
  });

  afterAll(done => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  }, 15000);

  test('browse() navigates headlessly and extracts semantic markdown', async () => {
    const result = await browse(TEST_URL);

    expect(result.url).toBe(TEST_URL);
    expect(result.isClean).toBe(true);
    expect(result.threatLevel).toBe('clean');
    expect(result.markdown).toContain('# Tribunal Test Benchmark');
    expect(result.markdown).toContain('- [Button #1] "Start Analysis"');
    expect(result.markdown).toContain('- [Input #2] type="text" (placeholder="Enter username")');
    expect(result.markdown).toContain('- [Link #3] "Documentation" -> /docs');
    expect(Buffer.byteLength(result.markdown, 'utf8')).toBeLessThan(4000);
    expect(result.sandboxed).toContain('<untrusted_web_content');
  }, 25000);

  test('auditURL() conducts live accessibility, timing, and security checks', async () => {
    const report = await auditURL(TEST_URL);

    expect(report.url).toBe(TEST_URL);
    expect(report.page.title).toBe('Tribunal Test Benchmark');
    expect(report.scores.accessibility).toBeGreaterThanOrEqual(80);
    expect(report.violations.consoleErrors).toHaveLength(0);
    expect(report.violations.networkFailures).toHaveLength(0);
    expect(report.summary.passed).toBe(true);
  }, 25000);
});
