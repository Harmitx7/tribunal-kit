---
name: shadcn-ui-expert
description: Use when shadcn/ui mastery. Installation, customization via tailwind.config, component extraction, state management with Radix Primitives, theme variables (CSS custom properties), dark mode implementations, and overriding default designs. Use when building or modifying shadcn/ui components in React/Next.js projects.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - build-primitive
  - react-specialist
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# shadcn/ui Expert — Component Architecture Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `shadcn-ui-expert` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when shadcn/ui mastery. Installation, customization via tailwind.config, component extraction, state management with Radix Primitives, theme variables (CSS custom properties), dark mode implementations, and overriding default designs. Use when building or modifying shadcn/ui components in React/Next.js projects.
- **DO NOT activate when:** The task falls outside the `shadcn-ui-expert` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ `import { Button } from 'shadcn-ui'` -> ✅ shadcn/ui is NOT a package; components are copied into YOUR project. Import from `@/components/ui/button`
- ❌ Using shadcn/ui without initializing it -> ✅ Run `npx shadcn@latest init` first; it generates tailwind config and utils
- ❌ Assuming all shadcn components are installed -> ✅ Each component must be added separately: `npx shadcn@latest add button`
- ❌ Overriding Radix primitive props without understanding accessibility -> ✅ Radix handles focus, keyboard, and ARIA; don't break it

---

---

## 1. Core Architecture

shadcn/ui leverages two layers:

1. **Radix UI Primitives**: Headless, fully accessible functionality (Focus management, ARIA, Keyboard nav).
2. **Tailwind CSS**: The styling layer mapped over the headless components.

```typescript
// ❌ BAD: Re-inventing the wheel for accessibility
const Select = ({ options }) => {
  const [open, setOpen] = useState(false)
  return <div onClick={() => setOpen(!open)}>...</div> // Breaks keyboard/screen readers
}

// ✅ GOOD: Using shadcn (Radix under the hood)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function MySelect() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

---

## 2. Component Modification (You Own The Code)

Do not treat `components/ui/*` as an immutable black box. You are _supposed_ to modify them.

### Adding Variants via `cva` (Class Variance Authority)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

// Adding a new "ghost-rounded" variant to the Button component
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors...',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // YOUR CUSTOM VARIANT:
        'ghost-rounded':
          'bg-transparent hover:bg-accent hover:text-accent-foreground rounded-full px-6',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
```

---

## 3. Theming & Dark Mode (CSS Variables)

shadcn/ui manages themes explicitly through CSS custom properties (variables), not Tailwind config hardcoding.

```css
/* app/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --primary: 217.2 91.2% 59.8%;
    /* ... */
  }
}
```

Implementation with Tailwind v4 CSS-first configuration:

```css
/* Note how standard colors map directly to the CSS vars */
@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

---

## 4. Using the `cn` Utility

The `cn` utility combines `clsx` (conditional classes) and `tailwind-merge` (fixing class conflicts).

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ❌ BAD: String concatenation breeds conflicts
// hover:bg-blue-500 will fail if className contains hover:bg-red-500 earlier
const className = `px-4 py-2 bg-blue-500 hover:bg-blue-600 ${props.className}`;

// ✅ GOOD: cn resolves conflicts correctly
const className = cn('px-4 py-2 bg-blue-500 hover:bg-blue-600', props.className);
```

---

## 5. Next.js App Router Integration

### Modals / Dialogs inside Server Components

Radix primitives (Dialog, Select, etc.) utilize React context and side effects. They must be Client Components.

```typescript
// ❌ BAD: Server Component trying to use a shadcn Dialog directly with state
export default function Page() {
  const [open, setOpen] = useState(false); // ERROR
  return <Dialog open={open}>...</Dialog>
}

// ✅ GOOD: Extract the interactive part to a Client Component
import { MyDialogComponent } from "./MyDialogComponent" // "use client" inside

export default async function Page() {
  const data = await fetchDb(); // Server Component fetches data
  return <MyDialogComponent data={data} /> // Passes data to interactive client component
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
