'use strict';

const { startProxyServer, stopProxyServer, getProxyServer } = require('../../bin/proxy-server');

describe('SEC-002: Proxy Server Network Interface Containment', () => {
  afterEach(() => {
    stopProxyServer();
  });

  test('proxy server must bind strictly to 127.0.0.1 loopback interface, never 0.0.0.0 or wildcard', async () => {
    // Port 0 selects an available ephemeral port
    const port = await startProxyServer(0);
    expect(port).toBeGreaterThan(0);

    const server = getProxyServer();
    expect(server).toBeDefined();

    const address = server.address();
    expect(address).toBeDefined();
    expect(address.address).toBe('127.0.0.1');
    expect(address.address).not.toBe('0.0.0.0');
    expect(address.address).not.toBe('::');
  });
});
