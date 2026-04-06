---
name: webapp-testing
description: Comprehensive Web Application Testing strategy. Test Pyramid, Vitest/Jest for unit logic, React Testing Library for component integrity, MSW (Mock Service Worker) for API layer simulation, and visual regression. Use when setting up testing environments or defining global test strategies across a web stack.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Webapp Testing — Full Stack Pipeline Mastery

---

## 1. The Strategy (The Testing Trophy)

The traditional "Testing Pyramid" (lots of Unit, little E2E) is outdated for rich UI applications. Use the **Testing Trophy**:

1. **Static Analysis (10%)**: TypeScript, ESLint, Prettier (Catches typos and type mismatches instantly).
2. **Unit Tests (20%)**: Vitest (Tests complex pure functions: math, formatting, data mapping).
3. **Integration Tests (60%)**: React Testing Library + MSW (Tests components and network mock interactions together).
4. **End-to-End Tests (10%)**: Playwright (Tests the critical path: Login, Checkout, Account Creation on a real browser).

---

## 2. Integration Layer (React Testing Library + MSW)

Do not mock child components. Render the specific DOM tree and interact with it as a user would. 

To prevent network calls, utilize Mock Service Worker (MSW) which intercepts requests at the network layer natively.

```typescript
// ❌ BAD: Mocking implementation details
jest.mock('axios');
axios.get.mockResolvedValue({ data: { users: [] } });

// ✅ GOOD: MSW (Mock Service Worker) network level interception
// The component functions EXACTLY as it would in production
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John Appleseed' },
    ])
  }),
]
const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Component Testing (RTL)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('Should load users and render names', async () => {
  // userEvent closely replicates real browser physics (focusing, keystrokes)
  const user = userEvent.setup();
  
  render(<UserDashboard />);

  // Initial State
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // Async Resolution (Auto-waits for the MSW mock to return)
  const johnNode = await screen.findByText('John Appleseed');
  expect(johnNode).toBeInTheDocument();

  // Interaction
  const deleteBtn = screen.getByRole('button', { name: "Delete John" });
  await user.click(deleteBtn);

  // Verification 
  expect(johnNode).not.toBeInTheDocument();
});
```

---

## 3. Pure Unit Testing (Vitest)

Isolate business logic entirely from React.

```typescript
// ✅ Move complex logic OUT of the React component entirely
export function calculateTax(subtotal: number, state: string): number {
  if (subtotal < 0) throw new Error("Subtotal cannot be negative");
  if (state === "CA") return subtotal * 0.0825;
  return 0; // Default
}

// ✅ Test with extreme precision and coverage
import { describe, it, expect } from 'vitest';

describe('calculateTax()', () => {
  it('applies CA tax correctly', () => {
    expect(calculateTax(100, 'CA')).toBe(8.25);
  });
  
  it('throws on negative input', () => {
    expect(() => calculateTax(-50, 'CA')).toThrowError('negative');
  });
});
```

---
