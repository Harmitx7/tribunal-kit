'use strict';

/**
 * boundary.js — Centralized Security & Containment Boundary Service
 * =================================================================
 * Provides deterministic, verifiable security safeguards across Tribunal Kit:
 * 1. Filesystem boundary containment via path.relative and realpath validation.
 * 2. Logical resource identifier validation.
 * 3. Browser destination & URL SSRF defense.
 * 4. Error sanitization to prevent information disclosure.
 */

const fs = require('fs');
const path = require('path');

const SAFE_RESOURCE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Asserts that a target path is strictly contained within an authorized root directory.
 * Defeats '../' relative traversal, absolute path escapes, and sibling prefix collisions.
 *
 * @param {string} root - The trusted parent root directory
 * @param {string} targetPath - Relative or absolute target path
 * @param {object} [options]
 * @param {boolean} [options.checkSymlinks=true] - Verify realpath containment if path exists
 * @returns {string} The fully resolved, authorized target path
 * @throws {Error} If target escapes authorized root
 */
function assertWithinRoot(root, targetPath, options = {}) {
  if (!root || typeof root !== 'string') {
    throw new Error('Security Violation: Invalid root directory specified.');
  }
  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Security Violation: Invalid target path specified.');
  }

  // Reject null bytes immediately
  if (targetPath.includes('\0') || root.includes('\0')) {
    throw new Error('Security Violation: Null byte detected in path.');
  }

  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath);

  // Lexical containment verification using path.relative
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Path security violation: Security Violation: Path traversal detected. Target "${targetPath}" escapes authorized root "${root}".`,
    );
  }

  // Symlink escape verification if the target or any parent exists
  const checkSymlinks = options.checkSymlinks !== false;
  if (checkSymlinks && fs.existsSync(resolvedTarget)) {
    try {
      const realRoot = fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);
      const realTarget = fs.realpathSync.native ? fs.realpathSync.native(resolvedTarget) : fs.realpathSync(resolvedTarget);
      const relReal = path.relative(realRoot, realTarget);
      if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
        throw new Error(
          `Path security violation: Security Violation: Symlink target "${realTarget}" escapes authorized real root "${realRoot}".`,
        );
      }
    } catch (e) {
      if (e.message.includes('Security Violation: Symlink target')) {
        throw e;
      }
      // If stat/realpath fails on nonexistent segment, lexical check stands
    }
  }

  return resolvedTarget;
}

/**
 * Validates a logical resource identifier (agent name, skill name, workflow name, proposal ID).
 * Disallows directory separators, traversal tokens, extensions, and malformed characters.
 *
 * @param {string} id - The identifier to validate
 * @param {RegExp} [pattern] - Optional custom regex (defaults to /^[a-zA-Z0-9_-]+$/)
 * @returns {string} The validated, trimmed identifier
 * @throws {Error} If identifier is invalid
 */
function validateResourceId(id, pattern = SAFE_RESOURCE_ID_REGEX) {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid resource identifier: Identifier must be a non-empty string.');
  }

  const trimmed = id.trim();
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    !pattern.test(trimmed)
  ) {
    throw new Error(`Invalid resource identifier: "${id}". Only alphanumeric characters, dashes, and underscores are permitted.`);
  }

  return trimmed;
}

const dns = require('dns');
const net = require('net');

/**
 * Checks whether an IP address belongs to loopback, link-local / cloud metadata,
 * RFC 1918 private, Carrier Grade NAT, unique local IPv6, multicast, or broadcast ranges.
 *
 * @param {string} ip - IPv4 or IPv6 address string
 * @param {object} [options]
 * @param {boolean} [options.allowLoopback=false] - Whether to allow 127.0.0.0/8 and ::1
 * @returns {boolean} True if prohibited, false if public/routable
 */
function isProhibitedIp(ip, options = {}) {
  if (!ip || typeof ip !== 'string') return true;

  const allowLoopback = options.allowLoopback === true;
  const allowPrivateNetwork = options.allowPrivateNetwork === true;
  let cleanIp = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or WHATWG URL hex ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    const v4Part = cleanIp.slice(7);
    if (net.isIPv4(v4Part)) {
      cleanIp = v4Part;
    } else if (v4Part.includes(':')) {
      const parts = v4Part.split(':');
      if (parts.length === 2) {
        const h1 = parseInt(parts[0], 16);
        const h2 = parseInt(parts[1], 16);
        if (!isNaN(h1) && !isNaN(h2)) {
          cleanIp = `${(h1 >> 8) & 0xff}.${h1 & 0xff}.${(h2 >> 8) & 0xff}.${h2 & 0xff}`;
        }
      }
    }
  }

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) {
      return true; // Malformed IPv4 is prohibited
    }
    const [a, b, c, d] = parts;

    // Loopback (127.0.0.0/8) & "This host on this network" (0.0.0.0/8)
    if (a === 127 || a === 0) {
      return !allowLoopback;
    }

    // Link-Local & Cloud Metadata (169.254.0.0/16) - ALWAYS blocked even with allowLoopback!
    if (a === 169 && b === 254) {
      return true;
    }

    // Private RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) - Strictly isolated from allowLoopback
    if (a === 10) return !allowPrivateNetwork;
    if (a === 172 && (b >= 16 && b <= 31)) return !allowPrivateNetwork;
    if (a === 192 && b === 168) return !allowPrivateNetwork;

    // Carrier Grade NAT / Shared Address Space RFC 6598 (100.64.0.0/10)
    if (a === 100 && (b >= 64 && b <= 127)) {
      return true;
    }

    // Multicast (224.0.0.0/4), Reserved / Broadcast (240.0.0.0/4, 255.255.255.255)
    if (a >= 224) {
      return true;
    }

    // Documentation / TEST-NET (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 198.18.0.0/15)
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;

    return false;
  }

  if (net.isIPv6(cleanIp)) {
    // Loopback (::1) and Unspecified (::)
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1' || cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') {
      return !allowLoopback;
    }

    // Link-Local (fe80::/10 -> fe80 to febf) - ALWAYS blocked
    if (/^fe[89ab]/i.test(cleanIp)) {
      return true;
    }

    // Unique Local Addresses (fc00::/7 -> fc00 to fdff) - Strictly isolated from allowLoopback
    if (/^f[cd]/i.test(cleanIp)) {
      return !allowPrivateNetwork;
    }

    // Multicast (ff00::/8)
    if (/^ff/i.test(cleanIp)) {
      return true;
    }

    return false;
  }

  // Not a valid standard IP
  return false;
}

/**
 * Validates a browser navigation destination against SSRF, internal services, and local files.
 * Synchronously checks scheme, ports, known metadata domains, and literal IP addresses.
 *
 * @param {string} urlString - The destination URL string
 * @param {object} [options]
 * @param {boolean} [options.allowLoopback=false] - Explicitly permit localhost for dev server audits
 * @returns {URL} Parsed and validated URL instance
 * @throws {Error} If destination is prohibited
 */
function validateBrowserUrl(urlString, options = {}) {
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('Browser destination error: Missing or invalid URL string.');
  }

  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    throw new Error(`Browser destination error: Malformed URL (${err.message}).`);
  }

  // 1. Strict Protocol Gating: Only HTTP and HTTPS
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Browser destination error: Unsupported URL scheme "${protocol}". Only http: and https: are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const port = parsed.port ? parseInt(parsed.port, 10) : (protocol === 'https:' ? 443 : 80);

  // 2. Prohibit Chrome DevTools Protocol & Debugger management ports
  if (port === 9222 || port === 9229) {
    throw new Error(`Browser destination error: Prohibited network destination (Debugger port ${port} is blocked).`);
  }

  const allowLoopback = options.allowLoopback === true;

  // 3. Cloud Metadata & Known Internal Hostnames Defense
  const isCloudMetadataHost =
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.metadata.google.internal') ||
    hostname === 'metadata.goog' ||
    hostname === 'instance-data';

  if (isCloudMetadataHost) {
    throw new Error(`Browser destination error: Prohibited network destination (Cloud metadata host "${hostname}" is blocked).`);
  }

  // 4. Prohibited Local / Internal Suffixes (.local, .internal, .lan, .corp, .onion)
  if (
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.onion')
  ) {
    throw new Error(`Browser destination error: Prohibited network destination (Internal domain suffix "${hostname}" is blocked).`);
  }

  // 5. Loopback Hostname Defense
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    if (!allowLoopback) {
      throw new Error(`Browser destination error: Prohibited network destination (Loopback address "${hostname}" is blocked).`);
    }
  }

  // 6. IP Literal Defense (IPv4, IPv6, IPv4-mapped IPv6, decimal/octal parsed by WHATWG URL)
  if (net.isIP(hostname) || hostname.startsWith('::ffff:')) {
    if (isProhibitedIp(hostname, options)) {
      if (hostname === '169.254.169.254' || hostname.startsWith('169.254.') || hostname.startsWith('fe80')) {
        throw new Error(`Browser destination error: Prohibited network destination (Cloud metadata / link-local address "${hostname}" is blocked).`);
      }
      if (hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1' || hostname.startsWith('127.')) {
        throw new Error(`Browser destination error: Prohibited network destination (Loopback address "${hostname}" is blocked).`);
      }
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
        hostname.startsWith('fc00:') ||
        hostname.startsWith('fd00:')
      ) {
        throw new Error(`Browser destination error: Prohibited network destination (Private RFC 1918 address "${hostname}" is blocked).`);
      }
      throw new Error(`Browser destination error: Prohibited network destination (Prohibited IP address "${hostname}" is blocked).`);
    }
  }

  return parsed;
}

/**
 * Asynchronously validates a browser navigation destination against SSRF and DNS rebinding attacks.
 * Resolves the destination hostname via DNS and checks all returned IP addresses.
 *
 * @param {string} urlString - The destination URL string
 * @param {object} [options]
 * @param {boolean} [options.allowLoopback=false] - Explicitly permit localhost for dev server audits
 * @param {Function} [options.dnsLookup] - Custom DNS resolver function for testing or injection
 * @returns {Promise<URL>} Parsed and verified URL instance
 * @throws {Error} If destination or resolved IP is prohibited
 */
async function validateBrowserUrlAsync(urlString, options = {}) {
  // 1. Run static synchronous validation first
  const parsed = validateBrowserUrl(urlString, options);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 2. If already an IP address, static check was sufficient
  if (net.isIP(hostname) || hostname.startsWith('::ffff:')) {
    return parsed;
  }

  // 3. Resolve all IPv4 and IPv6 addresses for the hostname
  let addresses = [];
  try {
    if (typeof options.dnsLookup === 'function') {
      addresses = await options.dnsLookup(hostname);
    } else if (options.skipDns !== true) {
      addresses = await dns.promises.lookup(hostname, { all: true });
    }
  } catch (err) {
    if (options.allowUnresolved === true) {
      return parsed;
    }
    throw new Error(
      `Browser destination error: DNS resolution failed for "${hostname}" (${err.message}). DNS uncertainty must fail closed to prevent SSRF bypass.`,
    );
  }

  // 4. Verify that addresses resolved and none of the resolved IPs are prohibited
  if (options.skipDns !== true) {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      if (options.allowUnresolved === true) {
        return parsed;
      }
      throw new Error(
        `Browser destination error: No IP addresses resolved for "${hostname}". Destination cannot be safely authorized.`,
      );
    }

    for (const record of addresses) {
      const ip = typeof record === 'string' ? record : record?.address;
      if (!ip || isProhibitedIp(ip, options)) {
        throw new Error(
          `Browser destination error: Prohibited network destination (Hostname "${hostname}" resolves to prohibited or invalid IP address "${ip}").`,
        );
      }
    }
  }

  return parsed;
}

/**
 * Sanitizes an error message before returning to MCP client or caller to prevent
 * information disclosure of file contents (e.g. from V8 JSON.parse exceptions).
 *
 * @param {Error|any} error
 * @returns {string} Sanitized, safe error message
 */
function sanitizeErrorMessage(error) {
  if (!error) return 'An unknown error occurred.';
  const msg = typeof error === 'string' ? error : error.message || String(error);

  // V8 SyntaxError snippet leakage in JSON.parse:
  // e.g. "Unexpected token 'a', \"api_key=SECRET\"... is not valid JSON"
  if (
    error instanceof SyntaxError ||
    msg.includes('is not valid JSON') ||
    msg.includes('Unexpected token') ||
    msg.includes('Unexpected end of JSON')
  ) {
    return 'Invalid JSON payload: JSON parsing failed.';
  }

  return msg;
}

module.exports = {
  assertWithinRoot,
  validateResourceId,
  validateBrowserUrl,
  validateBrowserUrlAsync,
  isProhibitedIp,
  sanitizeErrorMessage,
  SAFE_RESOURCE_ID_REGEX,
};
