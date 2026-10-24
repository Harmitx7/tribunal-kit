# Playwright End-to-End Testing & Assertion Reference

> **Authority**: Microsoft Playwright Documentation (`https://playwright.dev/docs/intro`)  
> **Applicable Domains**: Testing, QA Automation, Web Quality Engineering  
> **Status**: Verified Production Specification  

---

## 1. Web-First Auto-Waiting Assertions

Playwright automatically retries assertions until a condition is met or the timeout expires. Always use web-first assertions (`expect(locator).toBeVisible()`) instead of manual sleeping.

### Anti-Pattern Ban:
- ❌ **STRICTLY BANNED**: `await page.waitForTimeout(3000);`  
  Hardcoded sleep timers cause test flakiness, inflate CI runtimes, and mask race conditions.

### Correct Assertion Replacements:
```typescript
// ❌ FLAKY
await page.click('button.submit');
await page.waitForTimeout(2000);
expect(await page.isVisible('.success-banner')).toBe(true);

// ✅ RESILIENT (Web-First auto-waiting)
await page.getByRole('button', { name: 'Submit' }).click();
await expect(page.getByText('Changes saved successfully')).toBeVisible();
```

---

## 2. User-Facing Locator Hierarchy

Prioritize locators that mirror how actual users perceive and interact with the page:

1. **`page.getByRole(role, { name })`**: Highest priority (verifies accessibility semantics simultaneously).
   ```typescript
   page.getByRole('button', { name: 'Sign in' });
   page.getByRole('dialog', { name: 'Confirm Payment' });
   ```
2. **`page.getByLabel(label)`**: For form inputs with associated `<label>`.
3. **`page.getByPlaceholder(text)`**: For inputs without explicit labels.
4. **`page.getByText(text)`**: For static content elements.
5. **`page.getByTestId(id)`**: Fallback when text/role is dynamic or ambiguous (`data-testid="user-avatar"`).
- ❌ **Avoid**: Fragile CSS selectors like `page.locator('div.container > div:nth-child(2) > span')`.

---

## 3. Network Mocking & Determinism

Intercept external API calls or payment gateways to keep test runs fast, deterministic, and isolated:

```typescript
test('displays user profile on network success', async ({ page }) => {
  // Mock API route before navigation
  await page.route('**/api/v1/user/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'usr_123', name: 'Alice Developer', role: 'admin' })
    });
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome, Alice Developer' })).toBeVisible();
});
```
