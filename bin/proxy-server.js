const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const globalStore = require('./global-store');

let proxyServer = null;

function getSystemPrompt() {
  const agentPath = globalStore.getGlobalAgentPath();
  const rulesPath = path.join(agentPath, 'rules', 'GEMINI.md');

  let rules = 'You are governed by Tribunal Kit rules.';
  if (fs.existsSync(rulesPath)) {
    rules = fs.readFileSync(rulesPath, 'utf8');
  }

  return `<tribunal_rules>\n${rules}\n</tribunal_rules>\n`;
}

function injectRulesIntoAnthropicPayload(payloadString) {
  try {
    const payload = JSON.parse(payloadString);

    // Inject into Anthropic's system parameter
    const tribunalSystem = getSystemPrompt();

    if (payload.system) {
      if (Array.isArray(payload.system)) {
        payload.system.unshift({ type: 'text', text: tribunalSystem });
      } else if (typeof payload.system === 'string') {
        payload.system = tribunalSystem + '\n' + payload.system;
      }
    } else {
      payload.system = tribunalSystem;
    }

    return JSON.stringify(payload);
  } catch (e) {
    console.error('[Tribunal Proxy] Failed to parse payload for injection:', e);
    return payloadString;
  }
}

function startProxyServer(port) {
  return new Promise((resolve, reject) => {
    proxyServer = http.createServer((clientReq, clientRes) => {
      let body = '';
      clientReq.on('data', chunk => {
        body += chunk.toString();
        // 5MB payload limit to prevent memory exhaustion (DoS)
        if (body.length > 5 * 1024 * 1024) {
          console.error('[Tribunal Proxy] Request too large, aborting.');
          if (!clientRes.headersSent) {
            clientRes.writeHead(413, { 'Content-Type': 'text/plain' });
            clientRes.end('Payload Too Large');
          }
          clientReq.destroy();
        }
      });

      clientReq.on('end', () => {
        if (clientReq.destroyed) return;
        let modifiedBody = body;

        // Only intercept AI chat completion endpoints
        if (clientReq.url && clientReq.url.includes('/v1/messages')) {
          console.log(`[Tribunal Proxy] Intercepting request to ${clientReq.url}`);
          modifiedBody = injectRulesIntoAnthropicPayload(body);
        }

        const headers = { ...clientReq.headers, host: 'api.anthropic.com' };
        delete headers['transfer-encoding'];
        headers['content-length'] = Buffer.byteLength(modifiedBody);

        const options = {
          hostname: 'api.anthropic.com',
          port: 443,
          path: clientReq.url,
          method: clientReq.method,
          headers,
        };

        const proxyReq = https.request(options, proxyRes => {
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(clientRes, { end: true });
        });

        proxyReq.on('error', err => {
          console.error('[Tribunal Proxy] Proxy request error:', err);
          if (!clientRes.headersSent) {
            clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
            clientRes.end('Bad Gateway');
          }
        });

        if (modifiedBody && clientReq.method !== 'GET' && clientReq.method !== 'HEAD') {
          proxyReq.write(modifiedBody);
        }
        proxyReq.end();
      });
    });

    proxyServer.listen(port, () => {
      console.log(`[Tribunal Proxy] Listening on http://localhost:${port}`);
      resolve(port);
    });

    proxyServer.on('error', reject);
  });
}

function stopProxyServer() {
  if (proxyServer) {
    proxyServer.close();
  }
}

module.exports = {
  startProxyServer,
  stopProxyServer,
};
