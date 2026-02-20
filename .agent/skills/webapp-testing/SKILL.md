---
name: webapp-testing
description: Web application testing principles. E2E, Playwright, deep audit strategies.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Web Application Testing

> E2E tests are the most expensive tests to write and maintain.
> Write them for the flows that would wake someone up at 2am if they broke.

---

## What Belongs in E2E Tests

E2E tests simulate a real user in a real browser. Use them selectively:

**Should be E2E:**
- User can register and log in
- User can complete a purchase / checkout flow
- Critical form submission that triggers business logic
- OAuth login flows
- File upload and processing

**Should NOT be E2E:**
- Individual UI component appearance (use unit/visual tests)
- API data validation (use API/integration tests)
- Error message text (too brittle, too low value)
- Every edge case (test edge cases at the service/unit level)

---

## Playwright Patterns

### Page Object Model

Encapsulate page interactions to keep tests maintainable:

```ts
// page-objects/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  get emailInput() { return this.page.getByLabel('Email'); }
  get passwordInput() { return this.page.getByLabel('Password'); }
  get submitButton() { return this.page.getByRole('button', { name: 'Sign in' }); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// tests/auth.spec.ts
test('user can log in with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.goto('/login');
  await loginPage.login('user@test.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

### Locator Strategy (Priority Order)

Prefer locators that reflect how the user thinks about the element:

```ts
// 1. Role (most semantic, most resilient)
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Email' })

// 2. Label (tied to accessibility — good signal)
page.getByLabel('Email address')

// 3. Text (works but can be fragile if copy changes)
page.getByText('Welcome back')

// 4. Test ID (last resort — doesn't break on copy/layout changes)
page.getByTestId('submit-button')

// ❌ Never (fragile — breaks on any CSS refactor)
page.locator('.btn.btn-primary.submit')
page.locator('#form > div:nth-child(2) > input')
```

### Waiting for State

```ts
// ✅ Wait for network idle before asserting
await page.waitForLoadState('networkidle');

// ✅ Wait for a specific element
await page.waitForSelector('[data-testid="results"]');

// ✅ Assertion-based waiting (Playwright retries automatically)
await expect(page.getByText('Order confirmed')).toBeVisible();

// ❌ Fixed sleep (brittle — too short in CI, too slow locally)
await page.waitForTimeout(2000);
```

---

## Test Data Management

Keep test data predictable and isolated:

```ts
// Seed database before tests that need specific data
test.beforeEach(async ({ request }) => {
  await request.post('/api/test/seed', {
    data: { users: [testUser], products: [testProduct] }
  });
});

// Clean up after
test.afterEach(async ({ request }) => {
  await request.delete('/api/test/cleanup');
});
```

**Rules:**
- Each test owns its data and cleans up after itself
- Tests don't share state through the database
- Test accounts are distinguishable from real accounts (prefix: `test_`)

---

## CI/CD Integration

```yaml
# GitHub Actions example
playwright-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

**Key configurations:**

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,  // retry only in CI
  workers: process.env.CI ? 4 : 1,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});
```

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/playwright_runner.py` | Runs Playwright test suite and reports | `python scripts/playwright_runner.py <project_path>` |
