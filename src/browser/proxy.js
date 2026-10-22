'use strict';

/**
 * proxy.js — Controlled Outbound Egress Proxy for Tribunal-Kit Browser Isolation
 * =============================================================================
 * Enforces network-level SSRF prevention and connection-time destination gating.
 *
 * Architecture:
 * - Runs a lightweight, zero-dependency HTTP/HTTPS forward proxy bound strictly to loopback (127.0.0.1).
 * - Intercepts all outbound Chrome traffic (documents, redirects, subresources, WebSockets, iframes).
 * - Pre-connection Gate: Resolves hostnames in Node.js and inspects EVERY resolved IP address against
 *   isProhibitedIp before opening any socket to the destination.
 * - Socket Pinning: If authorized, the proxy connects directly to the verified safe IP, eliminating
 *   the DNS rebinding TOCTOU window entirely.
 * - Zero-Transmission Guarantee: If a destination or IP is prohibited, the proxy immediately terminates
 *   the client request with HTTP 403 Forbidden and NEVER opens a TCP socket or transmits any packet
 *   to the prohibited destination.
 * =============================================================================
 */

const http = require('http');
const net = require('net');
const dns = require('dns');
const { validateBrowserUrl, isProhibitedIp } = require('../security/boundary');

class ControlledBrowserProxy {
  /**
   * @param {object} [options]
   * @param {boolean} [options.allowLoopback=false]
   * @param {boolean} [options.allowPrivateNetwork=false]
   * @param {Function} [options.dnsLookup]
   */
  constructor(options = {}) {
    this.options = options;
    this.server = null;
    this.port = 0;
    this.activeSockets = new Set();
  }

  /**
   * Starts the controlled proxy on an ephemeral or specified loopback port.
   * @param {number} [port=0]
   * @returns {Promise<ControlledBrowserProxy>}
   */
  async start(port = 0) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
      this.server.on('connect', (req, clientSocket, head) =>
        this.handleHttpsConnect(req, clientSocket, head),
      );

      this.server.on('connection', socket => {
        this.activeSockets.add(socket);
        socket.on('close', () => this.activeSockets.delete(socket));
      });

      this.server.on('error', reject);

      this.server.listen(port, '127.0.0.1', () => {
        this.port = this.server.address().port;
        resolve(this);
      });
    });
  }

  /**
   * Handles forward proxy HTTP requests (GET, POST, etc.).
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async handleHttpRequest(req, res) {
    try {
      let targetUrlStr = req.url;
      // If path is relative, construct from Host header
      if (targetUrlStr.startsWith('/')) {
        const host = req.headers.host || 'localhost';
        targetUrlStr = `http://${host}${targetUrlStr}`;
      }

      // 1. Static URL & Protocol Gating
      let parsedUrl;
      try {
        parsedUrl = validateBrowserUrl(targetUrlStr, this.options);
      } catch (err) {
        this.sendBlockedResponse(res, 403, `Blocked: ${err.message}`);
        return;
      }

      const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80;

      // 2. Pre-Connection DNS Resolution & Prohibited IP Gating
      let safeIp = hostname;
      if (!net.isIP(hostname)) {
        let addresses = [];
        try {
          if (typeof this.options.dnsLookup === 'function') {
            addresses = await this.options.dnsLookup(hostname);
          } else {
            addresses = await dns.promises.lookup(hostname, { all: true });
          }
        } catch (dnsErr) {
          this.sendBlockedResponse(res, 502, `DNS resolution failed: ${dnsErr.message}`);
          return;
        }

        if (!Array.isArray(addresses) || addresses.length === 0) {
          this.sendBlockedResponse(res, 502, 'DNS resolution returned no records');
          return;
        }

        for (const record of addresses) {
          const ip = typeof record === 'string' ? record : record?.address;
          if (!ip || isProhibitedIp(ip, this.options)) {
            this.sendBlockedResponse(
              res,
              403,
              `Blocked: Hostname "${hostname}" resolves to prohibited IP address "${ip}".`,
            );
            return;
          }
        }

        const firstRecord = addresses[0];
        safeIp = typeof firstRecord === 'string' ? firstRecord : firstRecord.address;
      } else {
        if (isProhibitedIp(hostname, this.options)) {
          this.sendBlockedResponse(res, 403, `Blocked: Prohibited destination IP "${hostname}".`);
          return;
        }
      }

      // 3. Pin Connection Directly to Safe Resolved IP (Zero Rebinding Window)
      const outgoingHeaders = { ...req.headers };
      outgoingHeaders.host = parsedUrl.host;
      delete outgoingHeaders['proxy-connection'];

      const outboundReq = http.request(
        {
          host: safeIp,
          port,
          method: req.method,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: outgoingHeaders,
          timeout: 15000,
        },
        outboundRes => {
          res.writeHead(outboundRes.statusCode, outboundRes.headers);
          outboundRes.pipe(res);
        },
      );

      outboundReq.on('error', err => {
        if (!res.headersSent) {
          this.sendBlockedResponse(res, 502, `Outbound connection failed: ${err.message}`);
        }
      });

      req.pipe(outboundReq);
    } catch (unexpected) {
      if (!res.headersSent) {
        this.sendBlockedResponse(res, 500, `Proxy internal error: ${unexpected.message}`);
      }
    }
  }

  /**
   * Handles HTTPS tunneling requests (CONNECT host:port).
   * @param {http.IncomingMessage} req
   * @param {net.Socket} clientSocket
   * @param {Buffer} head
   */
  async handleHttpsConnect(req, clientSocket, head) {
    try {
      let hostname;
      let port = 443;
      try {
        const parsed = new URL(`https://${req.url}`);
        hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
        port = parsed.port ? parseInt(parsed.port, 10) : 443;
      } catch {
        const lastColon = req.url.lastIndexOf(':');
        if (lastColon !== -1) {
          hostname = req.url.slice(0, lastColon).replace(/^\[|\]$/g, '').toLowerCase();
          port = parseInt(req.url.slice(lastColon + 1), 10) || 443;
        } else {
          hostname = req.url.replace(/^\[|\]$/g, '').toLowerCase();
        }
      }

      // 1. Static URL & Port Gating
      try {
        validateBrowserUrl(`https://${hostname}:${port}`, this.options);
      } catch (err) {
        this.rejectSocket(clientSocket, 403, `Blocked: ${err.message}`);
        return;
      }

      // 2. Pre-Connection DNS Resolution & Prohibited IP Gating
      let safeIp = hostname;
      if (!net.isIP(hostname)) {
        let addresses = [];
        try {
          if (typeof this.options.dnsLookup === 'function') {
            addresses = await this.options.dnsLookup(hostname);
          } else {
            addresses = await dns.promises.lookup(hostname, { all: true });
          }
        } catch (dnsErr) {
          this.rejectSocket(clientSocket, 502, `DNS resolution failed: ${dnsErr.message}`);
          return;
        }

        if (!Array.isArray(addresses) || addresses.length === 0) {
          this.rejectSocket(clientSocket, 502, 'DNS resolution returned no records');
          return;
        }

        for (const record of addresses) {
          const ip = typeof record === 'string' ? record : record?.address;
          if (!ip || isProhibitedIp(ip, this.options)) {
            this.rejectSocket(
              clientSocket,
              403,
              `Blocked: Hostname "${hostname}" resolves to prohibited IP address "${ip}".`,
            );
            return;
          }
        }

        const firstRecord = addresses[0];
        safeIp = typeof firstRecord === 'string' ? firstRecord : firstRecord.address;
      } else {
        if (isProhibitedIp(hostname, this.options)) {
          this.rejectSocket(clientSocket, 403, `Blocked: Prohibited destination IP "${hostname}".`);
          return;
        }
      }

      // 3. Connect Outbound Socket Directly to Verified IP
      const targetSocket = net.connect({ host: safeIp, port }, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length > 0) {
          targetSocket.write(head);
        }
        clientSocket.pipe(targetSocket);
        targetSocket.pipe(clientSocket);
      });

      targetSocket.on('error', () => {
        clientSocket.destroy();
      });

      clientSocket.on('error', () => {
        targetSocket.destroy();
      });
    } catch {
      this.rejectSocket(clientSocket, 500, 'Proxy internal error');
    }
  }

  sendBlockedResponse(res, statusCode, message) {
    res.writeHead(statusCode, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Tribunal-Security': 'Blocked-Prohibited-Destination',
      Connection: 'close',
    });
    res.end(message);
  }

  rejectSocket(socket, statusCode, message) {
    const statusText = statusCode === 403 ? 'Forbidden' : 'Bad Gateway';
    try {
      socket.write(
        `HTTP/1.1 ${statusCode} ${statusText}\r\n` +
          'Content-Type: text/plain; charset=utf-8\r\n' +
          'X-Tribunal-Security: Blocked-Prohibited-Destination\r\n' +
          'Connection: close\r\n\r\n' +
          `${message}\n`,
      );
    } catch {
      // Ignore
    }
    socket.destroy();
  }

  /**
   * Closes the proxy server and destroys all active client and outbound sockets.
   * @returns {Promise<void>}
   */
  async close() {
    for (const socket of this.activeSockets) {
      try {
        socket.destroy();
      } catch {
        // Ignore
      }
    }
    this.activeSockets.clear();

    if (this.server) {
      return new Promise(resolve => {
        this.server.close(() => resolve());
      });
    }
  }
}

/**
 * Helper to instantiate and start a ControlledBrowserProxy.
 * @param {object} [options]
 * @returns {Promise<ControlledBrowserProxy>}
 */
async function createControlledProxy(options = {}) {
  const proxy = new ControlledBrowserProxy(options);
  await proxy.start(0);
  return proxy;
}

module.exports = {
  ControlledBrowserProxy,
  createControlledProxy,
};
