'use strict';

/**
 * cdp.js — Native Chrome DevTools Protocol Client for Tribunal-Kit
 *
 * Implements a zero-dependency CDP client utilizing Node.js 22's native WebSocket.
 * Communicates directly with headless Chrome over standard JSON-RPC.
 */

const http = require('http');

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
      const socket = new WebSocket(wsUrl);
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
