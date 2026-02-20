---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Web Interface Review Guidelines

> Good UI is invisible. Users think about their task, not about the interface.
> Bad UI puts itself in the way.

---

## Review Trigger

Load this skill when asked to:
- Review or audit a UI
- Check accessibility compliance
- Improve UX
- Check a site against best practices

---

## Review Categories

### 1. Accessibility (WCAG 2.2 Level AA)

Non-negotiable baseline for any public interface:

| Check | How to Verify |
|---|---|
| Color contrast ≥ 4.5:1 for text | Use WebAIM Contrast Checker or axe DevTools |
| All interactive elements reachable by keyboard | Tab through the page without a mouse |
| Focus states are visible | Not hidden with `outline: none` without an alternative |
| Images have alt text (descriptive = informative, empty = decorative) | Inspect `<img>` elements |
| Form inputs have associated `<label>` | Check for `for` attribute matching input `id` |
| No content only communicated by color | "Required fields in red" must also say "required" |
| Page has a document `<title>` and a semantic `<h1>` | Check the DOM |

### 2. Mobile Responsiveness

```css
/* Minimum viable responsive setup */
<meta name="viewport" content="width=device-width, initial-scale=1">

/* Touch targets: minimum 44×44px (WCAG), recommended 48×48px (Material) */
button, a, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

**Review on:** 375px (iPhone SE) and 390px (iPhone 14). If the layout breaks on these, it will for a significant portion of users.

### 3. Performance (Core Web Vitals)

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |

**CLS common causes:** images without dimensions, web fonts loading (causes text reflow), dynamically injected content above existing content.

**LCP common fixes:** Preload the hero image, use `loading="eager"` on above-fold images, use `fetchpriority="high"`.

### 4. Visual Design Quality

Evaluate these honestly:

- **Contrast between sections** — can users tell where one section ends and another begins?
- **Typography hierarchy** — is it clear what's a heading vs. body vs. caption?
- **Spacing consistency** — does spacing follow a scale (4px, 8px, 16px, 24px) or is it arbitrary?
- **Color palette** — is the palette controlled (3–5 colors) or are there 15 shades of slightly different blue?
- **Interactive states** — do buttons show hover, focus, active, disabled states?

### 5. Content and Copy

- Does each page have one clear purpose?
- Does the primary call-to-action stand out visually and verbally?
- Are error messages specific? ("Email must include @" not "Invalid input")
- Are loading states shown? Does the user know something is happening?
- Are empty states designed? (What does the user see when a list has no items?)

---

## Common Review Findings

| Finding | Severity | Fix |
|---|---|---|
| Missing focus styles | High | Add visible `:focus-visible` outline |
| Images without alt text | High | Add descriptive alt or `alt=""` for decorative |
| Touch targets under 44px | Medium | Increase button/link padding |
| No loading states | Medium | Add skeleton or spinner |
| Inconsistent spacing | Low | Standardize to 4px/8px scale |
| Purple as primary color | Low | Rethink palette — overused AI design cliché |

---

## Audit Format Template

When reporting a UI review:

```markdown
## UI Review: [Component/Page Name]

### Accessibility
- [BLOCKER] [Finding with specific element and fix]
- [WARN] [Finding]

### Responsiveness  
- [Finding]

### Performance
- [Finding]

### Visual Design
- [Finding]

### Copy/Content
- [Finding]

### Summary
X blockers, Y warnings, Z suggestions.
Recommended action before shipping: [specific steps]
```
