---
name: webapp-testing
description: Web application testing principles. E2E, Playwright, deep audit strategies.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Webapp Testing Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
