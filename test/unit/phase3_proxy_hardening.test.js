'use strict';

const http = require('http');
const { startProxyServer, stopProxyServer } = require('../../bin/proxy-server');
const { parseProxyArgs } = require('../../bin/tk-proxy');

describe('Phase 3: Proxy UTF-8 Byte Guard & Upstream Configuration (#4 & #10)', () => {
  let mockUpstreamServer;
  let mockUpstreamPort;
  let receivedRequests = [];

  beforeEach(done => {
    receivedRequests = [];
    mockUpstreamServer = http.createServer((req, res) => {
      let reqBody = '';
      req.on('data', chunk => {
        reqBody += chunk.toString();
      });
      req.on('end', () => {
        receivedRequests.push({
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: reqBody,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', echoed: reqBody }));
      });
    });

    mockUpstreamServer.listen(0, '127.0.0.1', () => {
      mockUpstreamPort = mockUpstreamServer.address().port;
      done();
    });
  });

  afterEach(done => {
    stopProxyServer();
    if (mockUpstreamServer) {
      mockUpstreamServer.close(done);
    } else {
      done();
    }
  });

  test('parseProxyArgs extracts custom upstream and intercept-path options', () => {
    const raw = [
      '--upstream',
      'http://127.0.0.1:8080',
      '--intercept-path',
      '/v1/chat/completions',
      'my-agent',
      '--arg1',
    ];
    const parsed = parseProxyArgs(raw);

    expect(parsed.upstream).toBe('http://127.0.0.1:8080');
    expect(parsed.interceptPath).toBe('/v1/chat/completions');
    expect(parsed.agentArgs).toEqual(['my-agent', '--arg1']);
  });

  test('parseProxyArgs supports equals syntax (--upstream=... --intercept-path=...)', () => {
    const raw = ['--upstream=http://custom.host:9000', '--intercept-path=/custom/api', 'agent-run'];
    const parsed = parseProxyArgs(raw);

    expect(parsed.upstream).toBe('http://custom.host:9000');
    expect(parsed.interceptPath).toBe('/custom/api');
    expect(parsed.agentArgs).toEqual(['agent-run']);
  });

  test('rejects payload exceeding 5MB bytes even when char count is < 5M (UTF-8 multi-byte guard #10)', async () => {
    const proxyPort = await startProxyServer(0, {
      upstream: `http://127.0.0.1:${mockUpstreamPort}`,
    });

    // 2,000,000 Chinese characters '中'.
    // In UTF-8, '中' is 3 bytes (0xE4 0xB8 0xAD).
    // Char count: 2,000,000 (< 5,242,880 chars - old .length check passed this!)
    // Byte count: 6,000,000 bytes (> 5MB MAX_PAYLOAD_BYTES - byte check triggers!)
    const chunkChars = '中'.repeat(100000); // 300,000 bytes per chunk
    const totalChunks = 20; // 2,000,000 chars = 6,000,000 bytes

    const statusCode = await new Promise(resolve => {
      const clientReq = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        res => {
          resolve(res.statusCode);
        },
      );

      clientReq.on('error', () => {
        // Stream aborted / destroyed is also an acceptable rejection
        resolve(413);
      });

      for (let i = 0; i < totalChunks; i++) {
        if (!clientReq.destroyed) {
          clientReq.write(chunkChars);
        }
      }
      clientReq.end();
    });

    expect(statusCode).toBe(413);
  });

  test('routes to custom upstream and intercepts custom intercept-path (#4)', async () => {
    const proxyPort = await startProxyServer(0, {
      upstream: `http://127.0.0.1:${mockUpstreamPort}`,
      interceptPath: '/v1/chat/completions',
    });

    const payload = JSON.stringify({
      model: 'custom-model',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    const responseData = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        res => {
          let body = '';
          res.on('data', chunk => {
            body += chunk.toString();
          });
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    expect(responseData.statusCode).toBe(200);
    expect(receivedRequests.length).toBe(1);
    expect(receivedRequests[0].url).toBe('/v1/chat/completions');

    // Verify system rules injection occurred on custom intercept path
    const forwardedBody = JSON.parse(receivedRequests[0].body);
    expect(forwardedBody.system).toBeDefined();
    expect(typeof forwardedBody.system === 'string' || Array.isArray(forwardedBody.system)).toBe(
      true,
    );
  });

  test('does not inject rules on non-intercepted paths', async () => {
    const proxyPort = await startProxyServer(0, {
      upstream: `http://127.0.0.1:${mockUpstreamPort}`,
      interceptPath: '/v1/messages',
    });

    const payload = JSON.stringify({ status: 'ping' });

    const responseData = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/health',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        res => {
          let body = '';
          res.on('data', chunk => {
            body += chunk.toString();
          });
          res.on('end', () => resolve({ statusCode: res.statusCode, body }));
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    expect(responseData.statusCode).toBe(200);
    expect(receivedRequests.length).toBe(1);
    expect(receivedRequests[0].body).toBe(payload);
  });
});
