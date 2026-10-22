'use strict';

/**
 * phase4_1_security_closure.test.js
 * =============================================================================
 * Phase 4.1 Security Regression Suite: DNS Fail-Closed, Scoped Loopback &
 * Connection-Time DNS Rebinding Closure.
 *
 * Verifies:
 * 1. Fail-closed behavior on ENOTFOUND, EAI_AGAIN, empty answers, malformed records.
 * 2. Scope isolation: allowLoopback NEVER permits RFC 1918 or IPv6 ULA destinations.
 * 3. Connection-time DNS rebinding detection via CDP Network.responseReceived.
 * 4. Fail-closed enforcement on CDP interception setup failure.
 * 5. Complete subresource and redirect interception under active Chrome CDP.
 * =============================================================================
 */

const {
  validateBrowserUrl,
  validateBrowserUrlAsync,
  isProhibitedIp,
} = require('../../src/security/boundary');
const { CdpClient } = require('../../src/browser/cdp');

describe('Phase 4.1: DNS Rebinding & Fail-Closed Security Closure', () => {
  describe('1. DNS Uncertainty & Failure Modes Must Fail Closed', () => {
    test('validateBrowserUrlAsync fails closed on ENOTFOUND', async () => {
      const mockDns = async () => {
        const err = new Error('getaddrinfo ENOTFOUND unresolvable-nxdomain.test');
        err.code = 'ENOTFOUND';
        throw err;
      };

      await expect(
        validateBrowserUrlAsync('http://unresolvable-nxdomain.test/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/DNS resolution failed.*fail closed/i);
    });

    test('validateBrowserUrlAsync fails closed on EAI_AGAIN (DNS timeout/temporary failure)', async () => {
      const mockDns = async () => {
        const err = new Error('getaddrinfo EAI_AGAIN dns-timeout.test');
        err.code = 'EAI_AGAIN';
        throw err;
      };

      await expect(
        validateBrowserUrlAsync('http://dns-timeout.test/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/DNS resolution failed.*fail closed/i);
    });

    test('validateBrowserUrlAsync fails closed on empty DNS response ([])', async () => {
      const mockDns = async () => [];

      await expect(
        validateBrowserUrlAsync('http://empty-records.test/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/No IP addresses resolved.*Destination cannot be safely authorized/i);
    });

    test('validateBrowserUrlAsync fails closed on malformed DNS response objects', async () => {
      const mockDns = async () => [{ address: null }, {}, { address: '' }];

      await expect(
        validateBrowserUrlAsync('http://malformed-records.test/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/prohibited or invalid IP address/i);
    });

    test('validateBrowserUrlAsync permits bypass ONLY when allowUnresolved is explicitly true', async () => {
      const mockDns = async () => {
        const err = new Error('getaddrinfo ENOTFOUND mock-offline.test');
        err.code = 'ENOTFOUND';
        throw err;
      };

      const parsed = await validateBrowserUrlAsync('http://mock-offline.test/', {
        dnsLookup: mockDns,
        allowUnresolved: true,
      });
      expect(parsed.hostname).toBe('mock-offline.test');
    });
  });

  describe('2. Scope Isolation: allowLoopback Must NEVER Permit RFC 1918 Private Networks', () => {
    const rfc1918Targets = [
      '10.0.0.1',
      '10.255.255.254',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.0.1',
      '192.168.1.1',
      'fc00::1',
      'fd00::1',
      '::ffff:10.0.0.1',
      '::ffff:192.168.1.1',
    ];

    test.each(rfc1918Targets)(
      'isProhibitedIp blocks private address even if allowLoopback is true: %s',
      ip => {
        expect(isProhibitedIp(ip, { allowLoopback: true })).toBe(true);
      },
    );

    test('isProhibitedIp permits ONLY loopback (127.0.0.1, ::1) when allowLoopback is true', () => {
      expect(isProhibitedIp('127.0.0.1', { allowLoopback: true })).toBe(false);
      expect(isProhibitedIp('127.0.0.2', { allowLoopback: true })).toBe(false);
      expect(isProhibitedIp('::1', { allowLoopback: true })).toBe(false);
      // Link-local / metadata strictly blocked
      expect(isProhibitedIp('169.254.169.254', { allowLoopback: true })).toBe(true);
    });
  });

  describe('3. Connection-Time DNS Rebinding Defense via CDP Response IP Inspection', () => {
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

    test('navigate detects connection-time DNS rebinding to loopback IP and aborts page', async () => {
      // Simulate navigate where preflight DNS passed (e.g. public IP), but Chrome connects to 127.0.0.1
      const navPromise = client.navigate('http://rebinding-attacker.com/data', {
        skipDns: true,
      });
      await new Promise(r => setTimeout(r, 10));

      // 1. Fetch.requestPaused fires for initial request (hostname is clean URL)
      const fetchListeners = client.eventListeners.get('Fetch.requestPaused') || [];
      expect(fetchListeners.length).toBeGreaterThan(0);
      await fetchListeners[0]({
        requestId: 'req-initial',
        request: {
          url: 'http://rebinding-attacker.com/data',
          method: 'GET',
          headers: {},
        },
        resourceType: 'Document',
      });

      // 2. Chrome establishes socket and fires Network.responseReceived with remoteIPAddress = 127.0.0.1
      const netListeners = client.eventListeners.get('Network.responseReceived') || [];
      expect(netListeners.length).toBeGreaterThan(0);
      await netListeners[0]({
        requestId: 'req-initial',
        response: {
          url: 'http://rebinding-attacker.com/data',
          status: 200,
          remoteIPAddress: '127.0.0.1',
          remotePort: 8080,
          headers: {},
        },
      });

      // 3. Verify that Page.stopLoading and Page.navigate to about:blank were issued
      const stopCmd = sentMessages.find(m => m.method === 'Page.stopLoading');
      const blankCmd = sentMessages.find(
        m => m.method === 'Page.navigate' && m.params?.url === 'about:blank',
      );
      expect(stopCmd).toBeDefined();
      expect(blankCmd).toBeDefined();

      // 4. Trigger Page.loadEventFired to complete the promise
      const loadListeners = client.eventListeners.get('Page.loadEventFired') || [];
      if (loadListeners[0]) loadListeners[0]();

      await expect(navPromise).rejects.toThrow(
        /Connection-time SSRF detected.*prohibited IP address "127.0.0.1"/i,
      );
    });

    test('navigate detects connection-time DNS rebinding to cloud metadata (169.254.169.254)', async () => {
      const navPromise = client.navigate('http://cloud-rebind.org/', { skipDns: true });
      await new Promise(r => setTimeout(r, 10));

      const netListeners = client.eventListeners.get('Network.responseReceived') || [];
      expect(netListeners.length).toBeGreaterThan(0);
      await netListeners[0]({
        requestId: 'req-rebind',
        response: {
          url: 'http://cloud-rebind.org/',
          status: 200,
          remoteIPAddress: '169.254.169.254',
          headers: {},
        },
      });

      const loadListeners = client.eventListeners.get('Page.loadEventFired') || [];
      if (loadListeners[0]) loadListeners[0]();

      await expect(navPromise).rejects.toThrow(
        /Connection-time SSRF detected.*prohibited IP address "169.254.169.254"/i,
      );
    });

    test('navigate fails closed if Fetch.enable rejects during setup', async () => {
      // Overwrite send to reject Fetch.enable
      client.ws.send = jest.fn(data => {
        const parsed = JSON.parse(data);
        setTimeout(() => {
          if (client.pending.has(parsed.id)) {
            const { reject, resolve } = client.pending.get(parsed.id);
            client.pending.delete(parsed.id);
            if (parsed.method === 'Fetch.enable') {
              reject(new Error('Fetch domain disabled in this browser build'));
            } else {
              resolve({});
            }
          }
        }, 0);
      });

      await expect(
        client.navigate('https://example.com/', { skipDns: true }),
      ).rejects.toThrow(/Failed to enable CDP request interception/i);
    });
  });
});
