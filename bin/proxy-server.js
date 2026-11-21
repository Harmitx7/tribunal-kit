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

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function startProxyServer(port, options = {}) {
  const upstreamUrl =
    options.upstream || process.env.TK_PROXY_UPSTREAM || 'https://api.anthropic.com';
  const interceptPath =
    options.interceptPath || process.env.TK_PROXY_INTERCEPT_PATH || '/v1/messages';

  let upstream;
  try {
    upstream = new URL(upstreamUrl.startsWith('http') ? upstreamUrl : `https://${upstreamUrl}`);
  } catch {
    upstream = new URL('https://api.anthropic.com');
  }
  const isHttps = upstream.protocol === 'https:';
  const transport = isHttps ? https : http;
  const upstreamPort = upstream.port ? parseInt(upstream.port, 10) : isHttps ? 443 : 80;

  return new Promise((resolve, reject) => {
    proxyServer = http.createServer((clientReq, clientRes) => {
      const chunks = [];
      let totalBytes = 0;
      let aborted = false;

      clientReq.on('data', chunk => {
        if (aborted) return;
        totalBytes += chunk.length;
        // Byte-accurate 5MB payload limit to prevent memory exhaustion (DoS)
        if (totalBytes > MAX_PAYLOAD_BYTES) {
          aborted = true;
          console.error('[Tribunal Proxy] Request too large (exceeded 5MB limit), aborting.');
          if (!clientRes.headersSent) {
            clientRes.writeHead(413, { 'Content-Type': 'text/plain' });
            clientRes.end('Payload Too Large');
          }
          clientReq.destroy();
          return;
        }
        chunks.push(chunk);
      });

      clientReq.on('end', () => {
        if (aborted || clientReq.destroyed) return;
        const bodyBuffer = Buffer.concat(chunks);
        const body = bodyBuffer.toString('utf8');
        let modifiedBody = body;

        // Only intercept AI chat completion endpoints matching configured interceptPath
        if (clientReq.url && clientReq.url.includes(interceptPath)) {
          console.log(`[Tribunal Proxy] Intercepting request to ${clientReq.url}`);
          modifiedBody = injectRulesIntoAnthropicPayload(body);
        }

        const headers = { ...clientReq.headers, host: upstream.host };
        delete headers['transfer-encoding'];
        headers['content-length'] = String(Buffer.byteLength(modifiedBody));

        const targetPath =
          upstream.pathname && upstream.pathname !== '/'
            ? path.posix.join(upstream.pathname, clientReq.url)
            : clientReq.url;

        const proxyOptions = {
          hostname: upstream.hostname,
          port: upstreamPort,
          path: targetPath,
          method: clientReq.method,
          headers,
        };

        const proxyReq = transport.request(proxyOptions, proxyRes => {
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

    proxyServer.listen(port, '127.0.0.1', () => {
      const actualPort = proxyServer.address().port;
      console.log(`[Tribunal Proxy] Listening on http://127.0.0.1:${actualPort}`);
      resolve(actualPort);
    });

    proxyServer.on('error', reject);
  });
}

function stopProxyServer() {
  if (proxyServer) {
    proxyServer.close();
  }
}

function getProxyServer() {
  return proxyServer;
}

module.exports = {
  startProxyServer,
  stopProxyServer,
  getProxyServer,
  MAX_PAYLOAD_BYTES,
  injectRulesIntoAnthropicPayload,
};
