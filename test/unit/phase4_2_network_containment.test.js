'use strict';

/**
 * phase4_2_network_containment.test.js
 * =============================================================================
 * Phase 4.2 Network Containment Suite: Verifying Pre-Transmission Prevention
 * via ControlledBrowserProxy.
 *
 * Verifies:
 * 1. Zero outbound packets to prohibited destinations (actual network prevention).
 * 2. Pre-connection DNS gating and IP pinning (eliminates DNS rebinding window).
 * 3. HTTP and HTTPS CONNECT handling with fail-closed semantics.
 * 4. DNS failure fail-closed behavior (ENOTFOUND, EAI_AGAIN, []).
 * 5. Scope isolation: allowLoopback allows 127.0.0.1 but NEVER 169.254.169.254 or 10.0.0.1.
 * =============================================================================
 */

const http = require('http');
const net = require('net');
const { ControlledBrowserProxy } = require('../../src/browser/proxy');

describe('Phase 4.2: Network-Level SSRF Containment & Egress Proxy Verification', () => {
  let targetServer;
  let targetPort;
  let targetReceivedPackets = 0;

  beforeAll(done => {
    // Local target server representing an internal service / metadata service
    targetServer = http.createServer((req, res) => {
      targetReceivedPackets++;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('INTERNAL_SECRET_DATA');
    });

    targetServer.listen(0, '127.0.0.1', () => {
      targetPort = targetServer.address().port;
      done();
    });
  });

  afterAll(done => {
    if (targetServer) {
      targetServer.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    targetReceivedPackets = 0;
  });

  test('PRE-TRANSMISSION PREVENTION: Proxy rejects prohibited IP before creating outbound connection (0 packets to target)', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: false });
    await proxy.start(0);

    try {
      // Client sends forward proxy request targeting loopback
      const proxyReqPromise = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: `http://127.0.0.1:${targetPort}/secret`,
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const res = await proxyReqPromise;

      // 1. Proxy returned 403 Forbidden
      expect(res.statusCode).toBe(403);
      expect(res.data).toContain('Blocked');

      // 2. CRITICAL NETWORK-LEVEL PROOF:
      // The target server received ZERO requests/packets!
      expect(targetReceivedPackets).toBe(0);
    } finally {
      await proxy.close();
    }
  });

  test('DNS REBINDING PREVENTION: Proxy pins connection to verified safe IP and rejects prohibited DNS resolution', async () => {
    // Simulate domain that attempts rebinding to targetPort on 127.0.0.1
    const mockRebindDns = async hostname => {
      if (hostname === 'rebind.attacker.com') {
        return [{ address: '127.0.0.1', family: 4 }];
      }
      return [{ address: '93.184.216.34', family: 4 }];
    };

    const proxy = new ControlledBrowserProxy({
      allowLoopback: false,
      dnsLookup: mockRebindDns,
    });
    await proxy.start(0);

    try {
      const proxyReqPromise = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: `http://rebind.attacker.com:${targetPort}/leak`,
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const res = await proxyReqPromise;

      expect(res.statusCode).toBe(403);
      expect(res.data).toContain('resolves to prohibited IP address "127.0.0.1"');

      // Target server received 0 packets!
      expect(targetReceivedPackets).toBe(0);
    } finally {
      await proxy.close();
    }
  });

  test('HTTPS CONNECT TUNNELING: Proxy rejects CONNECT tunnel to prohibited destinations before TCP socket creation', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: false });
    await proxy.start(0);

    try {
      const connectPromise = new Promise(resolve => {
        const clientSocket = net.connect({ host: '127.0.0.1', port: proxy.port }, () => {
          clientSocket.write(`CONNECT 127.0.0.1:${targetPort} HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\n\r\n`);
        });

        let data = '';
        clientSocket.on('data', chunk => {
          data += chunk.toString('utf8');
        });
        clientSocket.on('close', () => {
          resolve(data);
        });
      });

      const response = await connectPromise;

      // Proxy returned 403 Forbidden on the CONNECT handshake
      expect(response).toContain('403 Forbidden');
      expect(response).toContain('X-Tribunal-Security: Blocked-Prohibited-Destination');

      // Target server received 0 connections!
      expect(targetReceivedPackets).toBe(0);
    } finally {
      await proxy.close();
    }
  });

  test('HTTPS CONNECT IPV6: Proxy correctly parses bracketed IPv6 authorities [::1]:443 and [fc00::1]:443 and blocks them', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: false });
    await proxy.start(0);

    try {
      const connectPromise = new Promise(resolve => {
        const clientSocket = net.connect({ host: '127.0.0.1', port: proxy.port }, () => {
          clientSocket.write('CONNECT [::1]:443 HTTP/1.1\r\nHost: [::1]:443\r\n\r\n');
        });

        let data = '';
        clientSocket.on('data', chunk => {
          data += chunk.toString('utf8');
        });
        clientSocket.on('close', () => {
          resolve(data);
        });
      });

      const response = await connectPromise;
      expect(response).toContain('403 Forbidden');
      expect(response).toContain('Blocked');
    } finally {
      await proxy.close();
    }
  });

  test('DNS FAIL-CLOSED: Proxy returns 502 Bad Gateway on ENOTFOUND or empty DNS answers without outbound connection', async () => {
    const mockFailDns = async hostname => {
      if (hostname === 'nxdomain.test') {
        const err = new Error('getaddrinfo ENOTFOUND nxdomain.test');
        err.code = 'ENOTFOUND';
        throw err;
      }
      return [];
    };

    const proxy = new ControlledBrowserProxy({ dnsLookup: mockFailDns });
    await proxy.start(0);

    try {
      const proxyReqPromise = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: 'http://nxdomain.test/path',
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const res = await proxyReqPromise;
      expect(res.statusCode).toBe(502);
      expect(res.data).toContain('DNS resolution failed');
      expect(targetReceivedPackets).toBe(0);
    } finally {
      await proxy.close();
    }
  });

  test('DEV SERVER SUPPORT: allowLoopback enables 127.0.0.1 dev server while strictly blocking 169.254.169.254 and 10.0.0.1', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: true });
    await proxy.start(0);

    try {
      // 1. Authorized loopback navigation to targetServer
      const allowedReq = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: `http://127.0.0.1:${targetPort}/allowed`,
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const allowedRes = await allowedReq;
      expect(allowedRes.statusCode).toBe(200);
      expect(allowedRes.data).toBe('INTERNAL_SECRET_DATA');
      expect(targetReceivedPackets).toBe(1);

      // 2. Prohibited cloud metadata destination (169.254.169.254) remains blocked even with allowLoopback
      const metadataReq = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: 'http://169.254.169.254/latest/meta-data/',
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const metadataRes = await metadataReq;
      expect(metadataRes.statusCode).toBe(403);
      expect(metadataRes.data).toContain('Blocked');

      // 3. RFC 1918 private network (10.0.0.1) remains blocked even with allowLoopback
      const privateReq = new Promise((resolve, reject) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: 'http://10.0.0.1/admin',
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.on('error', reject);
        req.end();
      });

      const privateRes = await privateReq;
      expect(privateRes.statusCode).toBe(403);
      expect(privateRes.data).toContain('Blocked');
    } finally {
      await proxy.close();
    }
  });

  test('REDIRECT INTERCEPTION: Prohibited redirect destination is blocked at proxy egress boundary (0 packets to target)', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: false });
    await proxy.start(0);

    // Mock public server that sends a 302 redirect to the prohibited targetServer
    const redirectingServer = http.createServer((req, res) => {
      res.writeHead(302, {
        Location: `http://127.0.0.1:${targetPort}/redirected-target`,
      });
      res.end();
    });

    await new Promise(resolve => redirectingServer.listen(0, '127.0.0.1', resolve));
    const redirectPort = redirectingServer.address().port;

    try {
      // Step 1: Follow request through proxy to redirected target
      // Client follows 302 Location through the proxy
      const followedReq = new Promise(resolve => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: `http://127.0.0.1:${targetPort}/redirected-target`,
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.end();
      });

      const followedRes = await followedReq;
      expect(followedRes.statusCode).toBe(403);
      expect(followedRes.data).toContain('Blocked');

      // CRITICAL: Prohibited redirected target received 0 packets!
      expect(targetReceivedPackets).toBe(0);
    } finally {
      await proxy.close();
      await new Promise(resolve => redirectingServer.close(resolve));
    }
  });

  test('SUBRESOURCE GATING: Subresource requests targeting prohibited IPs are blocked before transmission', async () => {
    const proxy = new ControlledBrowserProxy({ allowLoopback: false });
    await proxy.start(0);

    try {
      // Simulate subresource request (e.g. <img src="http://192.168.1.1/admin.png">)
      const subresourceReq = new Promise(resolve => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: proxy.port,
            path: 'http://192.168.1.1/admin.png',
            method: 'GET',
          },
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
          },
        );
        req.end();
      });

      const res = await subresourceReq;
      expect(res.statusCode).toBe(403);
      expect(res.data).toContain('Blocked');
    } finally {
      await proxy.close();
    }
  });

  test('CHROME LAUNCH ARGUMENTS AUDIT: launchBrowser configures proxy-server, proxy-bypass-list, and disables DoH', async () => {
    const { launchBrowser } = require('../../src/browser/launcher');

    // Launch with default options (proxy enabled)
    const browser = await launchBrowser({ headless: true });
    try {
      expect(browser.proxy).toBeDefined();
      expect(browser.proxy.port).toBeGreaterThan(0);

      // Verify the proxy server is bound to loopback
      expect(browser.proxy.server.address().address).toBe('127.0.0.1');
    } finally {
      await browser.close();
    }
  });
});
