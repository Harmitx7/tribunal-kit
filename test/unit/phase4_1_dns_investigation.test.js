'use strict';

/**
 * phase4_1_dns_investigation.test.js
 * =============================================================================
 * Phase 4.1 Security Investigation: DNS Failure Behavior & DNS Rebinding Gaps
 *
 * Verifies the actual behavior of validateBrowserUrlAsync and CdpClient under:
 * - ENOTFOUND
 * - EAI_AGAIN
 * - Empty DNS responses ([])
 * - Malformed DNS records
 * - Mixed public and prohibited responses
 * - DNS rebinding between validation and connection
 * =============================================================================
 */

const {
  validateBrowserUrl,
  validateBrowserUrlAsync,
  isProhibitedIp,
} = require('../../src/security/boundary');
const { CdpClient } = require('../../src/browser/cdp');

describe('Phase 4.1: DNS Failure Modes & Rebinding Investigation', () => {
  describe('DNS Failure Modes in validateBrowserUrlAsync', () => {
    test('BEHAVIOR AUDIT: ENOTFOUND currently fails open or closed?', async () => {
      const mockDns = async () => {
        const err = new Error('getaddrinfo ENOTFOUND unresolvable-host.test');
        err.code = 'ENOTFOUND';
        throw err;
      };

      // If it returns a parsed URL without throwing, it permitted an unverified destination!
      let returnedUrl = null;
      let errorThrown = null;
      try {
        returnedUrl = await validateBrowserUrlAsync('http://unresolvable-host.test/', {
          dnsLookup: mockDns,
        });
      } catch (err) {
        errorThrown = err;
      }

      console.log('ENOTFOUND result:', {
        permitted: !!returnedUrl,
        error: errorThrown?.message,
      });
      // Documenting current behavior
    });

    test('BEHAVIOR AUDIT: EAI_AGAIN currently fails open or closed?', async () => {
      const mockDns = async () => {
        const err = new Error('getaddrinfo EAI_AGAIN dns-timeout.test');
        err.code = 'EAI_AGAIN';
        throw err;
      };

      let returnedUrl = null;
      let errorThrown = null;
      try {
        returnedUrl = await validateBrowserUrlAsync('http://dns-timeout.test/', {
          dnsLookup: mockDns,
        });
      } catch (err) {
        errorThrown = err;
      }

      console.log('EAI_AGAIN result:', {
        permitted: !!returnedUrl,
        error: errorThrown?.message,
      });
    });

    test('BEHAVIOR AUDIT: Empty DNS response ([]) currently fails open or closed?', async () => {
      const mockDns = async () => [];

      let returnedUrl = null;
      let errorThrown = null;
      try {
        returnedUrl = await validateBrowserUrlAsync('http://empty-dns.test/', {
          dnsLookup: mockDns,
        });
      } catch (err) {
        errorThrown = err;
      }

      console.log('Empty DNS ([]) result:', {
        permitted: !!returnedUrl,
        error: errorThrown?.message,
      });
    });

    test('BEHAVIOR AUDIT: Malformed DNS records', async () => {
      const mockDns = async () => [{ address: null }, {}, { address: 12345 }];

      let returnedUrl = null;
      let errorThrown = null;
      try {
        returnedUrl = await validateBrowserUrlAsync('http://malformed-dns.test/', {
          dnsLookup: mockDns,
        });
      } catch (err) {
        errorThrown = err;
      }

      console.log('Malformed DNS records result:', {
        permitted: !!returnedUrl,
        error: errorThrown?.message,
      });
    });

    test('BEHAVIOR AUDIT: Mixed public and prohibited DNS responses', async () => {
      const mockDns = async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ];

      await expect(
        validateBrowserUrlAsync('http://mixed.evil.com/', { dnsLookup: mockDns }),
      ).rejects.toThrow(/Prohibited network destination/);
    });
  });

  describe('DNS Rebinding Gap: Node validation vs Chrome Connection', () => {
    test('BEHAVIOR AUDIT: Does CDP Fetch.requestPaused detect connection-time DNS rebinding?', async () => {
      // Step 1: Preflight DNS returns public IP (93.184.216.34)
      let dnsCallCount = 0;
      const rebindingDns = async () => {
        dnsCallCount++;
        // First call (Node.js pre-flight): returns safe public IP
        return [{ address: '93.184.216.34', family: 4 }];
      };

      const client = new CdpClient();
      const sentMessages = [];
      client.ws = {
        readyState: 1,
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

      // Start navigate with the rebinding domain
      const navPromise = client.navigate('http://rebinding-domain.com/', {
        dnsLookup: rebindingDns,
      });
      await new Promise(r => setTimeout(r, 10));

      // Notice: Fetch.requestPaused fires for the main document request
      const listeners = client.eventListeners.get('Fetch.requestPaused') || [];
      expect(listeners.length).toBeGreaterThan(0);

      // What parameters does Chrome provide to Fetch.requestPaused?
      // In CDP, Chrome passes request.url = 'http://rebinding-domain.com/'
      // It does NOT include remoteIPAddress!
      await listeners[0]({
        requestId: 'req-main',
        request: {
          url: 'http://rebinding-domain.com/',
          method: 'GET',
          headers: {},
        },
        resourceType: 'Document',
      });

      // What did CdpClient send?
      const continueCmd = sentMessages.find(m => m.method === 'Fetch.continueRequest');
      const failCmd = sentMessages.find(m => m.method === 'Fetch.failRequest');

      console.log('Rebinding CDP Request Interception:', {
        continued: !!continueCmd,
        failed: !!failCmd,
      });

      // Complete navigation
      const loadListeners = client.eventListeners.get('Page.loadEventFired') || [];
      if (loadListeners[0]) loadListeners[0]();

      let navError = null;
      try {
        await navPromise;
      } catch (err) {
        navError = err;
      }

      console.log('Rebinding Navigation Result:', {
        navigationSucceeded: !navError,
        error: navError?.message,
      });
    });
  });
});
