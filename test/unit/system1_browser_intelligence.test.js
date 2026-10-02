'use strict';

const {
  evaluateBrowserRequirement,
  extractAffectedRoutes,
} = require('../../src/system1/browser_intelligence');

describe('System-1 Capability 5: Browser / Interaction Intelligence', () => {
  describe('Risk-Triggered Validation Levels', () => {
    test('Non-UI backend change requires no browser stage (NONE)', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/commands/native.js', 'src/utils/fs.js'],
        task: 'Optimize file system operations',
        diff: '+ function cleanPath() {}',
      });

      expect(result.requires_browser_verification).toBe(false);
      expect(result.validation_level).toBe('NONE');
      expect(result.status).toBe('SKIPPED');
      expect(result.escalate).toBe(false);
    });

    test('CSS-only styling change triggers lightweight SMOKE validation', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/styles/theme.css', 'src/styles/button.scss'],
        task: 'Update primary button color to dark cyan',
        diff: '+ .btn-primary { background-color: #008b8b; }',
        environment: { browserFound: { type: 'chrome', path: '/usr/bin/google-chrome' } },
      });

      expect(result.requires_browser_verification).toBe(true);
      expect(result.validation_level).toBe('SMOKE');
      expect(result.status).toBe('READY');
      expect(result.evidence.expected_checks).toContain('layout_shift_check');
    });

    test('Interactive form component triggers FUNCTIONAL browser validation', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/components/UserProfile.jsx'],
        task: 'Add form validation to user profile form',
        diff: '+ <form onSubmit={handleSubmit}>\n+ <input name="email" />\n+ </form>',
        environment: { browserFound: { type: 'edge', path: 'C:\\edge.exe' } },
      });

      expect(result.requires_browser_verification).toBe(true);
      expect(result.validation_level).toBe('FUNCTIONAL');
      expect(result.status).toBe('READY');
      expect(result.evidence.expected_checks).toContain('console_exceptions');
      expect(result.evidence.expected_checks).toContain('form_submission');
    });

    test('Authentication or Payment UI triggers HIGH_RISK browser verification', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/pages/checkout/payment.tsx'],
        task: 'Implement stripe card payment form with MFA confirmation',
        diff: '+ <form id="payment-form">\n+ <input id="credit-card" />\n+ <button>Submit Payment</button>\n+ </form>',
        environment: { browserFound: { type: 'chrome', path: '/bin/chrome' } },
      });

      expect(result.requires_browser_verification).toBe(true);
      expect(result.validation_level).toBe('HIGH_RISK');
      expect(result.status).toBe('READY');
      expect(result.evidence.expected_checks).toContain('security_headers');
      expect(result.evidence.expected_checks).toContain('auth_cookie_state');
    });
  });

  describe('Safety Invariants: Unavailable Browser Environment', () => {
    test('When browser is unavailable and verification is required, returns UNAVAILABLE and escalates', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/components/LoginForm.jsx'],
        task: 'Update login form with remember-me checkbox',
        diff: '+ <form>\n+ <input type="password" />\n+ </form>',
        environment: { browserFound: null }, // Simulated headless server without browser
      });

      expect(result.requires_browser_verification).toBe(true);
      expect(result.validation_level).toBe('HIGH_RISK');
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.browser_available).toBe('UNAVAILABLE');
      expect(result.escalate).toBe(true);
      expect(result.safety_notice).toContain('Automatic escalation enforced');
    });

    test('When browser is unavailable but no UI verification is needed, remains SKIPPED with no escalation', () => {
      const result = evaluateBrowserRequirement({
        files: ['README.md', 'docs/guide.md'],
        task: 'Update documentation',
        diff: '+ # New Documentation',
        environment: { browserFound: null },
      });

      expect(result.requires_browser_verification).toBe(false);
      expect(result.validation_level).toBe('NONE');
      expect(result.status).toBe('SKIPPED');
      expect(result.escalate).toBe(false);
    });
  });

  describe('Route & Target Extraction', () => {
    test('extracts affected routes from file paths and task text', () => {
      const routes = extractAffectedRoutes(
        ['src/app/dashboard/settings/page.tsx', 'src/pages/login.jsx'],
        'Check /checkout and /billing navigation flows',
      );

      expect(routes).toContain('/dashboard/settings');
      expect(routes).toContain('/login');
      expect(routes).toContain('/checkout');
      expect(routes).toContain('/billing');
    });
  });
});
