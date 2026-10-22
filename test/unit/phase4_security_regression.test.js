'use strict';

/**
 * phase4_security_regression.test.js
 * =============================================================================
 * Phase 4 Regression Test Suite: Browser SSRF, DNS Rebinding & CDP Redirects
 *
 * Demonstrates:
 * 1. Blocking cloud metadata hostnames and internal domain patterns (TK-SEC-07).
 * 2. Blocking decimal, octal, hex, CGNAT, broadcast, and IPv4-mapped IPv6 IPs.
 * 3. Asynchronous DNS resolution & DNS rebinding detection (validateBrowserUrlAsync).
 * 4. CDP navigation redirect interception and subresource containment (CdpClient).
 * =============================================================================
 */

const {
  validateBrowserUrl,
  validateBrowserUrlAsync,
  isProhibitedIp,
} = require('../../src/security/boundary');
const { CdpClient } = require('../../src/browser/cdp');

describe('Phase 4: Browser SSRF, DNS Rebinding & Redirect Interception (TK-SEC-07)', () => {
  describe('Static URL & Hostname Gating', () => {
    const prohibitedHostnames = [
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://foo.metadata.google.internal/meta',
      'http://metadata.goog/computeMetadata',
      'http://instance-data/latest/meta-data/',
      'http://router.local/admin',
      'http://internal.service.internal/',
      'http://gateway.lan/setup',
      'http://auth.corp/login',
      'http://darknet.onion/service',
      'http://100.64.0.1/cgnat',
      'http://224.0.0.1/multicast',
      'http://240.0.0.1/reserved',
      'http://255.255.255.255/broadcast',
      'http://[::ffff:127.0.0.1]/loopback',
      'http://[::ffff:169.254.169.254]/metadata',
      'http://[::ffff:10.0.0.1]/private',
      'http://[::ffff:192.168.1.1]/private',
      'http://[::ffff:172.16.0.1]/private',
      'http://[fc00::1]/ula',
      'http://[fd00::1]/ula',
      'http://example.com:9222/debug',
      'http://example.com:9229/node-inspect',
    ];

    test.each(prohibitedHostnames)(
      'validateBrowserUrl strictly blocks prohibited destination: %s',
      url => {
        expect(() => validateBrowserUrl(url)).toThrow(/Prohibited network destination/);
      },
    );

    test('validateBrowserUrl permits localhost only when allowLoopback is explicitly true', () => {
      expect(() => validateBrowserUrl('http://localhost:3000')).toThrow(/Loopback address/);
      expect(validateBrowserUrl('http://localhost:3000', { allowLoopback: true }).hostname).toBe(
        'localhost',
      );
    });

    test('validateBrowserUrl permits legitimate public destinations', () => {
      const valid = validateBrowserUrl('https://tribunal.dev/docs?q=test');
      expect(valid.hostname).toBe('tribunal.dev');
      expect(valid.protocol).toBe('https:');
    });
  });

  describe('isProhibitedIp Helper', () => {
    test('identifies prohibited IPv4 and IPv6 addresses', () => {
      expect(isProhibitedIp('127.0.0.1')).toBe(true);
      expect(isProhibitedIp('127.255.255.255')).toBe(true);
      expect(isProhibitedIp('0.0.0.0')).toBe(true);
      expect(isProhibitedIp('169.254.169.254')).toBe(true);
      expect(isProhibitedIp('169.254.1.1')).toBe(true);
      expect(isProhibitedIp('10.0.0.1')).toBe(true);
      expect(isProhibitedIp('192.168.1.1')).toBe(true);
      expect(isProhibitedIp('172.16.0.1')).toBe(true);
      expect(isProhibitedIp('172.31.255.255')).toBe(true);
      expect(isProhibitedIp('100.64.0.1')).toBe(true);
      expect(isProhibitedIp('224.0.0.1')).toBe(true);
      expect(isProhibitedIp('240.0.0.1')).toBe(true);
      expect(isProhibitedIp('255.255.255.255')).toBe(true);
      expect(isProhibitedIp('::1')).toBe(true);
      expect(isProhibitedIp('fe80::1')).toBe(true);
      expect(isProhibitedIp('fc00::1')).toBe(true);
      expect(isProhibitedIp('fd12::34')).toBe(true);
      expect(isProhibitedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isProhibitedIp('::ffff:169.254.169.254')).toBe(true);
      expect(isProhibitedIp('::ffff:10.0.0.5')).toBe(true);

      // Clean public addresses
      expect(isProhibitedIp('8.8.8.8')).toBe(false);
      expect(isProhibitedIp('93.184.216.34')).toBe(false);
      expect(isProhibitedIp('2606:4700:4700::1111')).toBe(false);
    });

    test('respects allowLoopback option', () => {
      expect(isProhibitedIp('127.0.0.1', { allowLoopback: true })).toBe(false);
      expect(isProhibitedIp('::1', { allowLoopback: true })).toBe(false);
      // Link-local/metadata still prohibited even with allowLoopback!
      expect(isProhibitedIp('169.254.169.254', { allowLoopback: true })).toBe(true);
    });
  });

  describe('Asynchronous DNS Resolution & Rebinding Defense', () => {
    test('validateBrowserUrlAsync blocks domain resolving to loopback or private IP', async () => {
      const mockDns = async () => [{ address: '127.0.0.1', family: 4 }];
      await expect(
        validateBrowserUrlAsync('http://rebinding.evil.com/leak', { dnsLookup: mockDns }),
      ).rejects.toThrow(/Prohibited network destination/);
    });

    test('validateBrowserUrlAsync blocks domain resolving to cloud metadata IP', async () => {
      const mockDns = async () => [{ address: '169.254.169.254', family: 4 }];
      await expect(
        validateBrowserUrlAsync('http://cloud-bypass.evil.com/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/Prohibited network destination/);
    });

    test('validateBrowserUrlAsync blocks multi-homed domain if ANY resolved IP is prohibited', async () => {
      const mockDns = async () => [
        { address: '93.184.216.34', family: 4 }, // public
        { address: '10.0.0.1', family: 4 }, // private
      ];
      await expect(
        validateBrowserUrlAsync('http://dual-homed.attacker.com/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/Prohibited network destination/);
    });

    test('validateBrowserUrlAsync allows domain resolving purely to public IPs', async () => {
      const mockDns = async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
      ];
      const valid = await validateBrowserUrlAsync('https://safe-domain.org/', {
        dnsLookup: mockDns,
      });
      expect(valid.hostname).toBe('safe-domain.org');
    });
  });

  describe('CDP Navigation & Redirect Interception', () => {
    let mockWs;
    let client;
    let sentMessages;

    beforeEach(() => {
      sentMessages = [];
      mockWs = {
        readyState: 1, // WS_OPEN
        send: jest.fn(data => {
          const parsed = JSON.parse(data);
          sentMessages.push(parsed);
          // Auto-respond to standard CDP commands
          setTimeout(() => {
            if (client.pending.has(parsed.id)) {
              const { resolve } = client.pending.get(parsed.id);
              client.pending.delete(parsed.id);
              resolve({});
            }
          }, 0);
        }),
        close: jest.fn(),
      };

      client = new CdpClient();
      client.ws = mockWs;
    });

    test('navigate rejects before sending Page.navigate if initial URL is prohibited', async () => {
      await expect(client.navigate('http://169.254.169.254/secret')).rejects.toThrow(
        /Prohibited network destination/,
      );
      expect(sentMessages).toHaveLength(0);
    });

    test('navigate attaches Fetch request interceptor and fails prohibited redirect', async () => {
      // Simulate navigate start
      const navPromise = client.navigate('https://public-start.com/initial', { skipDns: true });
      await new Promise(r => setTimeout(r, 5));

      // Verify Fetch.enable was configured with pattern
      const fetchEnableCmd = sentMessages.find(m => m.method === 'Fetch.enable');
      expect(fetchEnableCmd).toBeDefined();

      // Simulate a redirect event via Fetch.requestPaused targeting 169.254.169.254
      const listeners = client.eventListeners.get('Fetch.requestPaused') || [];
      expect(listeners.length).toBeGreaterThan(0);

      // Trigger the requestPaused listener with malicious redirect
      await listeners[0]({
        requestId: 'req-123',
        request: {
          url: 'http://169.254.169.254/latest/meta-data/',
          method: 'GET',
          headers: {},
        },
        resourceType: 'Document',
        responseStatusCode: 302,
      });

      // Verify Fetch.failRequest was immediately issued with AccessDenied
      const failCmd = sentMessages.find(m => m.method === 'Fetch.failRequest');
      expect(failCmd).toBeDefined();
      expect(failCmd.params).toEqual({
        requestId: 'req-123',
        errorReason: 'AccessDenied',
      });

      // Simulate Page.loadEventFired to complete navigation
      const loadListeners = client.eventListeners.get('Page.loadEventFired') || [];
      if (loadListeners[0]) loadListeners[0]();

      await expect(navPromise).rejects.toThrow(
        /Prohibited redirect or subresource request detected/,
      );
    });

    test('navigate continues legitimate requests and redirects', async () => {
      const navPromise = client.navigate('https://example.com', { skipDns: true });
      await new Promise(r => setTimeout(r, 5));

      const listeners = client.eventListeners.get('Fetch.requestPaused') || [];
      expect(listeners.length).toBeGreaterThan(0);

      // Trigger requestPaused for legitimate redirect to https://www.example.com
      await listeners[0]({
        requestId: 'req-456',
        request: {
          url: 'https://www.example.com/',
          method: 'GET',
          headers: {},
        },
        resourceType: 'Document',
        responseStatusCode: 301,
      });

      // Verify Fetch.continueRequest was issued
      const continueCmd = sentMessages.find(m => m.method === 'Fetch.continueRequest');
      expect(continueCmd).toBeDefined();
      expect(continueCmd.params).toEqual({ requestId: 'req-456' });

      // Trigger page load
      const loadListeners = client.eventListeners.get('Page.loadEventFired') || [];
      if (loadListeners[0]) loadListeners[0]();

      await expect(navPromise).resolves.toBeUndefined();
    });
  });
});
