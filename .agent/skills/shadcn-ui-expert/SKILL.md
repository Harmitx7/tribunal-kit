---
name: shadcn-ui-expert
description: shadcn/ui mastery. Installation, customization via tailwind.config, component extraction, state management with Radix Primitives, theme variables (CSS custom properties), dark mode implementations, and overriding default designs. Use when building or modifying shadcn/ui components in React/Next.js projects.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# shadcn/ui Expert — Component Architecture Mastery

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

Do not treat `components/ui/*` as an immutable black box. You are *supposed* to modify them.

### Adding Variants via `cva` (Class Variance Authority)

```typescript
import { cva, type VariantProps } from "class-variance-authority"

// Adding a new "ghost-rounded" variant to the Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        // YOUR CUSTOM VARIANT:
        "ghost-rounded": "bg-transparent hover:bg-accent hover:text-accent-foreground rounded-full px-6",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
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
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ❌ BAD: String concatenation breeds conflicts
// hover:bg-blue-500 will fail if className contains hover:bg-red-500 earlier
const className = `px-4 py-2 bg-blue-500 hover:bg-blue-600 ${props.className}`

// ✅ GOOD: cn resolves conflicts correctly
const className = cn("px-4 py-2 bg-blue-500 hover:bg-blue-600", props.className)
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
