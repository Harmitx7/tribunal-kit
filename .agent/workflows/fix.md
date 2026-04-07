---
description: Auto-fix known issues with lint, formatting, imports, and TypeScript errors. Runs lint_runner.py and auto-fixers. Human approval required before applying any changes. Shows a diff of what will change before writing to disk.
---

# /fix — Automated Error Resolution

$ARGUMENTS

---

## When to Use /fix

|Use `/fix` when...|Use something else when...|
|:---|:---|
|Lint errors blocking CI|Logic bugs → `/debug`|
|TypeScript type errors|Feature changes needed → `/enhance`|
|Formatting inconsistencies|Security vulnerabilities → `/tribunal-backend`|
|Missing imports auto-detectable|Structural changes → `/refactor`|
|After a dependency version upgrade breaks types||

---

## What /fix Handles (Auto-Fixable)

```
✅ AUTO-FIXABLE:
│ ESLint  → eslint --fix (formatting, unused imports, style)
│ Prettier → prettier --write (spacing, quotes, semicolons)
│ TypeScript → add missing required imports visible from types
│ Tailwind → class ordering (prettier-plugin-tailwindcss)
│ npm audit → npm audit fix (non-breaking dependency patches)

⚠️ REQUIRES HUMAN DECISION:
│ TypeScript strict mode errors (may require type narrowing by developer)
│ Breaking API changes after major version bump
│ Logic errors flagged by ESLint (not just style)
│ Security vulnerabilities (audit fix --force changes major versions)
```

---

## Execution Sequence

```bash
# 1. Run lint with auto-fix
python .agent/scripts/lint_runner.py . --fix

# 2. Fix remaining TypeScript errors (auto-detectable only)
npx tsc --noEmit 2>&1 | grep "error TS"

# 3. Format all files
npx prettier --write "src/**/*.{ts,tsx,js,json,css}"

# 4. Check npm audit (report, don't auto-fix without approval)
npm audit --audit-level=high
```

---

## Human Gate — Review Diff Before Applying

After running fixers:

```
━━━ Fix Preview ━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files that will change:
  src/components/Button.tsx        (lint: 3 unused imports removed)
  src/lib/auth.ts                  (lint: missing semicolons, trailing whitespace)
  src/app/api/users/route.ts       (prettier: formatting)

Diff preview:
  --- src/components/Button.tsx
  +++ src/components/Button.tsx
  - import { useState, useEffect, useCallback } from 'react'; // useEffect unused
  + import { useState, useCallback } from 'react';

━━━ Remaining Errors (Need Human Review) ━━━

  src/lib/payment.ts:34 — TS2345: Argument of type 'string | null' not assignable to 'string'
  → This requires deliberate type narrowing — cannot auto-fix safely

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Apply auto-fixes?  Y = write to disk | N = discard | S = select specific files
```

**No files are written without explicit "Y" approval.**

---

## Fix Guard

```
❌ Never run --force on npm audit fix without human approval (can break major APIs)
❌ Never auto-fix TypeScript errors that require business logic decisions
❌ Never apply lint fixes to generated test files without human review
❌ Never "fix" ESLint disable comments — they may be intentional suppressions
❌ Never mix fix + refactoring in the same run
```

---

## After /fix — Verify

```bash
# Verify fixes didn't introduce new errors
npx tsc --noEmit    # Must be clean
npm test            # Must still all pass
npm run lint        # Must be zero errors
```

If any verification step fails after fixes → report and revert auto-fixes for that file.

---
