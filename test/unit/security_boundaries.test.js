'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  assertWithinRoot,
  validateResourceId,
  isProhibitedIp,
  validateBrowserUrl,
} = require('../../src/security/boundary');

describe('Security Boundaries & Containment Engine', () => {
  const tmpDir = path.join(os.tmpdir(), `tribunal-sec-test-${Date.now()}`);

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'safe_sub'), { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  });

  describe('Filesystem Containment (assertWithinRoot)', () => {
    test('permits legitimate nested subdirectories and files', () => {
      const validSub = path.join(tmpDir, 'safe_sub');
      const resolved = assertWithinRoot(tmpDir, validSub);
      expect(resolved).toBe(path.resolve(validSub));

      const validRelative = 'safe_sub/inner.txt';
      const resolvedRel = assertWithinRoot(tmpDir, validRelative);
      expect(resolvedRel).toBe(path.resolve(tmpDir, validRelative));
    });

    test('strictly rejects relative path traversal attempts escaping root', () => {
      expect(() => {
        assertWithinRoot(tmpDir, '../outside.txt');
      }).toThrow(/Path security violation/i);

      expect(() => {
        assertWithinRoot(tmpDir, 'safe_sub/../../outside.txt');
      }).toThrow(/Path security violation/i);
    });

    test('strictly rejects absolute paths targeting outside directories', () => {
      const outside = os.platform() === 'win32' ? 'C:\\Windows\\System32' : '/etc/passwd';
      expect(() => {
        assertWithinRoot(tmpDir, outside);
      }).toThrow(/Path security violation/i);
    });

    test('rejects paths containing null bytes', () => {
      expect(() => {
        assertWithinRoot(tmpDir, 'safe_sub\0evil.txt');
      }).toThrow(/Null byte detected/i);
    });

    test('rejects empty or non-string inputs', () => {
      expect(() => assertWithinRoot(null, 'foo')).toThrow(/Invalid root/i);
      expect(() => assertWithinRoot(tmpDir, null)).toThrow(/Invalid target/i);
      expect(() => assertWithinRoot(tmpDir, '')).toThrow(/Invalid target/i);
    });
  });

  describe('Resource Identifier Sanitization (validateResourceId)', () => {
    test('accepts clean alphanumeric, dash, and underscore identifiers', () => {
      expect(validateResourceId('agent-shield')).toBe('agent-shield');
      expect(validateResourceId('logic_reviewer_v2')).toBe('logic_reviewer_v2');
      expect(validateResourceId('FastAPI123')).toBe('FastAPI123');
    });

    test('rejects directory separators, slashes, and traversal tokens', () => {
      expect(() => validateResourceId('../agent')).toThrow(/Invalid resource identifier/i);
      expect(() => validateResourceId('sub/agent')).toThrow(/Invalid resource identifier/i);
      expect(() => validateResourceId('sub\\agent')).toThrow(/Invalid resource identifier/i);
    });

    test('rejects shell metacharacters and control characters', () => {
      expect(() => validateResourceId('agent;rm -rf')).toThrow(/Invalid resource identifier/i);
      expect(() => validateResourceId('agent`id`')).toThrow(/Invalid resource identifier/i);
      expect(() => validateResourceId('agent\0hack')).toThrow(/Invalid resource identifier/i);
    });
  });

  describe('Network Boundary & SSRF Defense (isProhibitedIp & validateBrowserUrl)', () => {
    test('prohibits cloud metadata IP (169.254.169.254)', () => {
      expect(isProhibitedIp('169.254.169.254')).toBe(true);
      expect(() => validateBrowserUrl('http://169.254.169.254/latest/meta-data')).toThrow(
        /Cloud metadata \/ link-local address/i,
      );
    });

    test('prohibits private RFC 1918 subnets by default', () => {
      expect(isProhibitedIp('10.0.0.1')).toBe(true);
      expect(isProhibitedIp('172.16.0.1')).toBe(true);
      expect(isProhibitedIp('192.168.1.1')).toBe(true);

      expect(() => validateBrowserUrl('http://192.168.1.100')).toThrow(/Private RFC 1918 address/i);
    });

    test('prohibits loopback destinations by default', () => {
      expect(isProhibitedIp('127.0.0.1')).toBe(true);
      expect(isProhibitedIp('::1')).toBe(true);
      expect(() => validateBrowserUrl('http://localhost:3000')).toThrow(/Loopback address/i);
      expect(() => validateBrowserUrl('http://127.0.0.1:8080')).toThrow(/Loopback address/i);
    });

    test('prohibits Chrome DevTools Protocol management ports', () => {
      expect(() => validateBrowserUrl('http://example.com:9222')).toThrow(/Debugger port 9222/i);
      expect(() => validateBrowserUrl('http://example.com:9229')).toThrow(/Debugger port 9229/i);
    });

    test('prohibits non-HTTP/HTTPS schemes', () => {
      expect(() => validateBrowserUrl('file:///etc/passwd')).toThrow(/Unsupported URL scheme "file:"/i);
      expect(() => validateBrowserUrl('javascript:alert(1)')).toThrow(
        /Unsupported URL scheme "javascript:"/i,
      );
      expect(() => validateBrowserUrl('ftp://ftp.example.com')).toThrow(
        /Unsupported URL scheme "ftp:"/i,
      );
    });

    test('permits legitimate public routable HTTP/HTTPS URLs', () => {
      const url = validateBrowserUrl('https://example.com/test');
      expect(url.hostname).toBe('example.com');
      expect(url.protocol).toBe('https:');
    });
  });
});
