---
name: testing-patterns
description: Testing mastery across stacks. Unit testing with Jest/Vitest/pytest, integration testing, E2E with Playwright, mocking strategies, test architecture (AAA, Given-When-Then), code coverage, snapshot testing, API testing, component testing with Testing Library, and TDD workflow. Use when writing tests, designing test architecture, or improving test coverage.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Testing Patterns — Cross-Stack Testing Mastery

---

## Test Architecture

### The Testing Pyramid

```
         /  E2E  \        ← Few: critical user flows (Playwright/Cypress)
        /──────────\
       / Integration \     ← Moderate: API routes, DB queries, component integration
      /──────────────\
     /   Unit Tests   \    ← Many: pure functions, hooks, utilities, business logic
    /──────────────────\

Rules:
- 70% unit, 20% integration, 10% E2E
- Unit tests: < 50ms each
- Integration tests: < 2s each
- E2E tests: < 30s each
- If a test takes > 5s, it's a design problem
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
// Every test follows the same structure
it("calculates total with tax", () => {
  // Arrange — set up the scenario
  const cart = new Cart();
  cart.addItem({ name: "Widget", price: 100 });
  cart.setTaxRate(0.08);

  // Act — perform the action being tested
  const total = cart.calculateTotal();

  // Assert — verify the result
  expect(total).toBe(108);
});

// ❌ BAD: Multiple acts in one test
it("does too many things", () => {
  cart.addItem({ name: "A", price: 10 });
  expect(cart.total).toBe(10);        // assert
  cart.addItem({ name: "B", price: 20 });
  expect(cart.total).toBe(30);        // another assert after another act
  cart.removeItem("A");
  expect(cart.total).toBe(20);        // yet another — split into 3 tests
});
```

### Test Naming Convention

```typescript
// Format: [unit] + [scenario] + [expected result]

// ✅ GOOD: Descriptive, reads like a specification
describe("calculateDiscount", () => {
  it("returns 0% when cart total is under $50", () => {});
  it("returns 10% when cart total is $50-$99", () => {});
  it("returns 20% when cart total is $100+", () => {});
  it("throws when cart is empty", () => {});
});

// ❌ BAD: Vague, implementation-focused
describe("calculateDiscount", () => {
  it("works", () => {});
  it("test1", () => {});
  it("should return correct value", () => {});
});
```

---

## Unit Testing (Vitest / Jest)

### Pure Function Testing

```typescript
// utils/math.ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// utils/math.test.ts
import { describe, it, expect } from "vitest";
import { clamp } from "./math";

describe("clamp", () => {
  it("returns the value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to min when value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to max when value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("handles equal min and max", () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it("handles floating point values", () => {
    expect(clamp(0.5, 0, 1)).toBeCloseTo(0.5);
  });
});
```

### Async Testing

```typescript
import { describe, it, expect, vi } from "vitest";

// Async function under test
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

describe("fetchUser", () => {
  it("returns user data on success", async () => {
    const mockUser = { id: "1", name: "Alice" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const user = await fetchUser("1");
    expect(user).toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith("/api/users/1");
  });

  it("throws on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchUser("999")).rejects.toThrow("HTTP 404");
  });
});
```

### Timer & Date Mocking

```typescript
describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays execution by specified ms", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled(); // not yet

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled(); // still not

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce(); // now
  });

  it("resets timer on subsequent calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced(); // reset timer
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled(); // timer was reset

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });
});

// Date mocking
it("formats today's date", () => {
  vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  expect(getFormattedDate()).toBe("June 15, 2024");
  vi.useRealTimers();
});
```

---

## Mocking Strategies

### Module Mocks

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { sendEmail } from "./email-service";
import { createUser } from "./user-service";

// Mock an entire module
vi.mock("./email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset call counts between tests
  });

  it("sends welcome email after creating user", async () => {
    await createUser({ name: "Alice", email: "alice@test.com" });

    expect(sendEmail).toHaveBeenCalledWith({
      to: "alice@test.com",
      subject: "Welcome!",
      body: expect.stringContaining("Alice"),
    });
  });

  it("does not send email on validation failure", async () => {
    await expect(createUser({ name: "", email: "" })).rejects.toThrow();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
```

### Spy Pattern

```typescript
// Spy on an existing method (don't replace it — observe it)
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

await riskyOperation();

expect(consoleSpy).toHaveBeenCalledWith(
  expect.stringContaining("failed"),
  expect.any(Error)
);

consoleSpy.mockRestore(); // restore original
```

### Dependency Injection Pattern (Testable by Design)

```typescript
// ❌ BAD: Hard-coded dependency — untestable without module mocking
class UserService {
  async getUser(id: string) {
    return await fetch(`/api/users/${id}`).then((r) => r.json());
  }
}

// ✅ GOOD: Injected dependency — naturally testable
interface HttpClient {
  get<T>(url: string): Promise<T>;
}

class UserService {
  constructor(private http: HttpClient) {}

  async getUser(id: string): Promise<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

// In test:
const mockHttp: HttpClient = {
  get: vi.fn().mockResolvedValue({ id: "1", name: "Alice" }),
};
const service = new UserService(mockHttp);

// ❌ HALLUCINATION TRAP: Prefer dependency injection over vi.mock()
// vi.mock() is global and can leak between tests
// DI makes tests isolated and explicit
```

---

## React Component Testing (Testing Library)

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls onSubmit with credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "alice@test.com",
      password: "secret123",
    });
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it("disables submit button while loading", async () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={true} />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });
});

// ❌ HALLUCINATION TRAP: Query priorities (use in this order):
// 1. getByRole — accessible role ("button", "textbox", etc.)
// 2. getByLabelText — form inputs with labels
// 3. getByPlaceholderText — when no label exists
// 4. getByText — non-interactive elements
// 5. getByTestId — LAST RESORT only
// ❌ Never default to getByTestId — it tests implementation, not behavior
```

---

## E2E Testing (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for navigation
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("wrong@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    await expect(page).toHaveURL("/login"); // no redirect
  });

  test("responsive: mobile menu toggles", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile only");

    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("navigation")).toBeVisible();
  });
});

// API testing with Playwright
test("API: create user returns 201", async ({ request }) => {
  const response = await request.post("/api/users", {
    data: { name: "Alice", email: "alice@test.com" },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toMatchObject({ name: "Alice", email: "alice@test.com" });
});
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: process.env.CI ? 2 : 0, // retry in CI only
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",      // save trace on failures
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chrome", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],
});
```

---

## API Testing

```typescript
// Testing REST APIs with supertest (Express/Fastify)
import request from "supertest";
import { app } from "./app";

describe("POST /api/users", () => {
  it("creates a user and returns 201", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ name: "Alice", email: "alice@test.com" })
      .expect(201)
      .expect("Content-Type", /json/);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: "Alice",
      email: "alice@test.com",
    });
  });

  it("returns 400 for missing required fields", async () => {
    await request(app)
      .post("/api/users")
      .send({ name: "" })
      .expect(400);
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/api/users")
      .send({ name: "Alice", email: "existing@test.com" })
      .expect(409);
  });
});
```

---

## Code Coverage

```jsonc
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/types/**",
        "**/mocks/**",
      ],
    },
  },
});

// Run: npx vitest --coverage
```

```
Coverage rules:
- 80% is the practical threshold (not 100%)
- 100% coverage ≠ 100% confidence
- Cover edge cases and error paths, not just happy paths
- Avoid testing implementation details (private methods, internal state)
- Focus coverage on: business logic, data transformations, auth/security
- Skip coverage on: config files, types-only files, generated code
```

---
