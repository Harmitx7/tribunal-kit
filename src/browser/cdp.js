'use strict';

/**
 * cdp.js — Native Chrome DevTools Protocol Client for Tribunal-Kit
 *
 * Implements a zero-dependency CDP client utilizing Node.js 22's native WebSocket.
 * Communicates directly with headless Chrome over standard JSON-RPC.
 */

const http = require('http');
const crypto = require('crypto');

const WS_OPEN = 1;

function getNativeWebSocket() {
  if (typeof WebSocket !== 'undefined') return WebSocket;
  if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket !== 'undefined') return globalThis.WebSocket;
  if (typeof global !== 'undefined' && typeof global.WebSocket !== 'undefined') return global.WebSocket;
  return null;
}

/**
 * Zero-dependency RFC 6455 WebSocket client using Node.js standard http/crypto libraries.
 * Seamless fallback for Node < 22 or environments without a global WebSocket.
 */
function createNodeWebSocket(wsUrl) {
  const parsed = new URL(wsUrl);
  const key = crypto.randomBytes(16).toString('base64');

  const ws = {
    readyState: 0, // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    _socket: null,
    send(data) {
      if (this.readyState !== WS_OPEN || !this._socket) {
        throw new Error('WebSocket is not open: readyState ' + this.readyState);
      }
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      const mask = crypto.randomBytes(4);
      let header;

      if (payload.length < 126) {
        header = Buffer.alloc(2 + 4);
        header[0] = 0x81;
        header[1] = 0x80 | payload.length;
        mask.copy(header, 2);
      } else if (payload.length <= 65535) {
        header = Buffer.alloc(4 + 4);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(payload.length, 2);
        mask.copy(header, 4);
      } else {
        header = Buffer.alloc(10 + 4);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(payload.length), 2);
        mask.copy(header, 10);
      }

      const masked = Buffer.allocUnsafe(payload.length);
      for (let i = 0; i < payload.length; i++) {
        masked[i] = payload[i] ^ mask[i % 4];
      }

      this._socket.write(Buffer.concat([header, masked]));
    },
    close() {
      if (this.readyState === WS_OPEN && this._socket) {
        this.readyState = 2;
        const mask = crypto.randomBytes(4);
        const closeFrame = Buffer.concat([Buffer.from([0x88, 0x80]), mask]);
        try {
          this._socket.write(closeFrame);
        } catch {
          // Ignore
        }
        this._socket.end();
      }
      this.readyState = 3;
      if (this.onclose) {
        try {
          this.onclose();
        } catch {
          // Ignore
        }
      }
    },
  };

  const req = http.request({
    hostname: parsed.hostname || '127.0.0.1',
    port: parsed.port || 80,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      Host: `${parsed.hostname || '127.0.0.1'}:${parsed.port || 80}`,
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Key': key,
      'Sec-WebSocket-Version': '13',
    },
  });

  req.on('upgrade', (res, socket, head) => {
    ws._socket = socket;
    ws.readyState = WS_OPEN;

    let buffer = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 2) {
        const b0 = buffer[0];
        const opcode = b0 & 0x0f;
        const b1 = buffer[1];
        const isMasked = (b1 & 0x80) !== 0;
        let payloadLen = b1 & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) break;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) break;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        let mask = null;
        if (isMasked) {
          if (buffer.length < offset + 4) break;
          mask = buffer.slice(offset, offset + 4);
          offset += 4;
        }

        if (buffer.length < offset + payloadLen) {
          break;
        }

        let payload = buffer.slice(offset, offset + payloadLen);
        buffer = buffer.slice(offset + payloadLen);

        if (isMasked && mask) {
          const unmasked = Buffer.allocUnsafe(payloadLen);
          for (let i = 0; i < payloadLen; i++) {
            unmasked[i] = payload[i] ^ mask[i % 4];
          }
          payload = unmasked;
        }

        if (opcode === 1) {
          if (ws.onmessage) {
            try {
              ws.onmessage({ data: payload.toString('utf8') });
            } catch {
              // Ignore
            }
          }
        } else if (opcode === 8) {
          ws.close();
        } else if (opcode === 9) {
          const pongMask = crypto.randomBytes(4);
          const pongHeader = Buffer.from([0x8a, 0x80]);
          try {
            socket.write(Buffer.concat([pongHeader, pongMask]));
          } catch {
            // Ignore
          }
        }
      }
    });

    socket.on('error', (err) => {
      if (ws.onerror) {
        try {
          ws.onerror(err);
        } catch {
          // Ignore
        }
      }
    });

    socket.on('close', () => {
      ws.readyState = 3;
      if (ws.onclose) {
        try {
          ws.onclose();
        } catch {
          // Ignore
        }
      }
    });

    if (ws.onopen) {
      try {
        ws.onopen();
      } catch {
        // Ignore
      }
    }
  });

  req.on('error', (err) => {
    ws.readyState = 3;
    if (ws.onerror) {
      try {
        ws.onerror(err);
      } catch {
        // Ignore
      }
    }
  });

  req.end();
  return ws;
}

function createWebSocket(wsUrl) {
  const Native = getNativeWebSocket();
  if (Native) {
    return new Native(wsUrl);
  }
  return createNodeWebSocket(wsUrl);
}

class CdpClient {
  constructor() {
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Connect to Chrome target using a WebSocket debugger URL.
   * @param {string} wsUrl
   * @returns {Promise<void>}
   */
  async connect(wsUrl) {
    if (!wsUrl) throw new Error('CdpClient: wsUrl is required');

    return new Promise((resolve, reject) => {
      const socket = createWebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        resolve();
      };

      socket.onerror = (err) => {
        reject(new Error(`CDP WebSocket error: ${err.message || 'connection failed'}`));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve: pResolve, reject: pReject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) {
              pReject(new Error(msg.error.message || 'CDP command failed'));
            } else {
              pResolve(msg.result);
            }
          } else if (msg.method) {
            const listeners = this.eventListeners.get(msg.method) || [];
            for (const handler of listeners) {
              try {
                handler(msg.params);
              } catch (e) {
                // Ignore listener error
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      socket.onclose = () => {
        for (const { reject: pReject } of this.pending.values()) {
          pReject(new Error('CDP WebSocket closed'));
        }
        this.pending.clear();
      };
    });
  }

  /**
   * Send a CDP command and await response.
   * @param {string} method
   * @param {object} params
   * @returns {Promise<any>}
   */
  send(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WS_OPEN) {
      return Promise.reject(new Error('CdpClient is not connected'));
    }

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 30000);

      this.pending.set(id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * Register an event listener for CDP events.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  /**
   * Initialize standard domains (Page, Runtime, DOM, Network, Console)
   */
  async initDomains() {
    await Promise.all([
      this.send('Page.enable'),
      this.send('Runtime.enable'),
      this.send('DOM.enable'),
      this.send('Network.enable'),
      this.send('Console.enable'),
    ]);
  }

  /**
   * Navigate to a URL and wait for load.
   * @param {string} url
   * @returns {Promise<void>}
   */
  async navigate(url) {
    return new Promise(async (resolve, reject) => {
      let timeoutId;

      const onLoad = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      timeoutId = setTimeout(() => {
        // Fallback resolve after 15s even if load event stalls
        resolve();
      }, 15000);

      this.on('Page.loadEventFired', onLoad);

      try {
        await this.send('Page.navigate', { url });
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  }

  /**
   * Evaluate a JavaScript expression in the page context.
   * @param {string} expression
   * @returns {Promise<any>}
   */
  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  /**
   * Get outer HTML of the page.
   * @returns {Promise<string>}
   */
  async getHTML() {
    return (await this.evaluate('document.documentElement.outerHTML')) || '';
  }

  /**
   * Capture page screenshot as base64 PNG.
   * @returns {Promise<string>}
   */
  async captureScreenshot(format = 'png') {
    const res = await this.send('Page.captureScreenshot', { format });
    return res?.data || '';
  }

  /**
   * Close the WebSocket connection.
   */
  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }
}

/**
 * Fetch targets or create a new tab on Chrome debug port.
 * @param {number} port
 * @param {string} host
 * @returns {Promise<{ id: string, webSocketDebuggerUrl: string }>}
 */
function createNewTab(port = 9222, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    // Chrome 120+ requires PUT for /json/new
    const req = http.request(
      {
        host,
        port,
        path: '/json/new',
        method: 'PUT',
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const tab = JSON.parse(data);
            if (tab.webSocketDebuggerUrl) {
              return resolve(tab);
            }
          } catch {
            // Fallback to /json/list
          }
          getExistingTab(port, host).then(resolve).catch(reject);
        });
      },
    );

    req.on('error', () => {
      getExistingTab(port, host).then(resolve).catch(reject);
    });

    req.end();
  });
}

/**
 * Fallback to fetch existing tab from /json/list
 */
function getExistingTab(port = 9222, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    http.get(`http://${host}:${port}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const pageTab = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || list[0];
          if (pageTab && pageTab.webSocketDebuggerUrl) {
            resolve(pageTab);
          } else {
            reject(new Error('No valid page target found in /json/list'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Close a tab target on Chrome debug port.
 * @param {string} targetId
 * @param {number} port
 * @param {string} host
 */
function closeTab(targetId, port = 9222, host = '127.0.0.1') {
  return new Promise((resolve) => {
    http.get(`http://${host}:${port}/json/close/${targetId}`, () => resolve()).on('error', () => resolve());
  });
}

module.exports = {
  CdpClient,
  createNewTab,
  closeTab,
};
