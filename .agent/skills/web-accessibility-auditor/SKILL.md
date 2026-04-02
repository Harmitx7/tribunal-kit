---
name: web-accessibility-auditor
description: Web Accessibility (a11y) mastery. WCAG 2.2 AA standards, semantic HTML, ARIA attributes, keyboard navigation, focus management, screen reader compatibility, color contrast, and dynamic content announcements. Use when building UI components or auditing frontend code for accessibility compliance.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Web Accessibility (a11y) — Inclusive UI Mastery

> Semantic HTML solves 80% of accessibility problems before they start.
> ARIA is a polyfill for bad HTML. No ARIA is better than bad ARIA.

---

## 1. Semantic HTML over `<div>` Soup

The first rule of ARIA: **Use native HTML elements whenever possible.**

```html
<!-- ❌ BAD: Meaningless markup, screen readers see nothing, no keyboard focus -->
<div class="submit-button" onclick="submit()">Submit</div>

<!-- ✅ GOOD: Native semantic element (inherits focus, Enter/Space key behavior) -->
<button type="submit" class="button">Submit</button>

<!-- ❌ BAD: Div as a link -->
<div onclick="goToPath('/about')">About Us</div>

<!-- ✅ GOOD: Native anchor -->
<a href="/about">About Us</a>
```

### Layout Semantics
Replace `<div class="x">` with meaning:
- `<header>` / `<footer>`
- `<nav>` (Main navigations)
- `<main>` (The primary content)
- `<article>` (Self-contained content blocks)
- `<aside>` (Sidebars, callouts)

---

## 2. Keyboard Navigation & Focus Management

Every interactive element MUST be keyboard accessible.

```css
/* ❌ BAD: Removing focus outlines ruins keyboard navigation */
*:focus { outline: none; }

/* ✅ GOOD: Using :focus-visible for keyboard users only */
*:focus { outline: none; } /* Hide for click */
*:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; }
```

### Managing Focus in Modals (Dialogs)
When a modal opens:
1. Focus must move into the modal (first focusable element).
2. Focus must be trapped inside the modal (Tabbing loops inside it).
3. Background must be hidden from screen readers (`aria-hidden="true"`).
4. `Escape` key must close it.
5. When closed, focus returns to the button that opened it.

```html
<!-- ✅ BEST: Use the native <dialog> element. It handles focus trapping automatically! -->
<dialog id="myModal">
  <h2>Settings</h2>
  <button formmethod="dialog">Close</button>
</dialog>
<script>document.getElementById('myModal').showModal();</script>
```

---

## 3. ARIA Roles & Attributes

When you build complex custom widgets (like tabs or accordions), you must apply ARIA attributes to tell screen readers what it is and what state it's in.

```html
<!-- Example: Custom Accordion/Disclosure -->
<!-- ❌ BAD: Screen reader sees plain text, doesn't know it's expandable -->
<div class="accordion">
  <div class="header">Advanced Settings</div>
  <div class="content" style="display: none;">...</div>
</div>

<!-- ✅ GOOD: ARIA provides context -->
<div class="accordion">
  <button 
    aria-expanded="false" 
    aria-controls="panel-id"
    id="header-id"
  >
    Advanced Settings
  </button>
  <div 
    id="panel-id" 
    role="region" 
    aria-labelledby="header-id" 
    hidden
  >
    ...
  </div>
</div>
```

**Crucial ARIA states:**
- `aria-expanded="true/false"`: For accordions, dropdowns, menus.
- `aria-hidden="true"`: Removes decorative icons/containers from the screen reader tree.
- `aria-pressed="true/false"`: For toggle buttons.
- `aria-invalid="true"`: For invalid form fields.

---

## 4. Forms & Labels

**Every input must have an associated label.** `placeholder` is NOT a label (it disappears when typing, causing cognitive loss).

```html
<!-- ❌ BAD -->
<input type="text" placeholder="Email Address">

<!-- ✅ GOOD: Explicit linking via id/for -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

<!-- ✅ GOOD: Implicit wrapping -->
<label>
  Email Address
  <input type="email" name="email">
</label>

<!-- Accessible Error Messages -->
<label for="username">Username</label>
<input 
  type="text" 
  id="username" 
  aria-invalid="true" 
  aria-describedby="username-error"
>
<span id="username-error" role="alert" class="error-msg">Username is already taken</span>
```

---

## 5. Live Regions (Dynamic Updates)

When content changes dynamically without a page reload (e.g., Toast notifications, AI responding, search results updating), the screen reader needs to be notified.

```html
<!-- 
  role="alert": Interrupts the user immediately (e.g., error).
  role="status" (or aria-live="polite"): Waits until the user pauses, then announces.
-->
<div aria-live="polite" class="sr-only">
  <!-- JavaScript injects: "3 items found" here, screen reader reads it aloud -->
</div>
```

---

## 🤖 LLM-Specific Traps (Web Accessibility)

1. **The `<div>` Button:** AI loves writing `<div onClick={handleClick}>`. This completely breaks tab navigation. Demand `<button>`.
2. **Missing Alt Text Analysis:** AI writes `<img src="hero.jpg" alt="hero image" />`. Alt text should describe the *intent/content*, e.g., `alt="Three colleagues discussing a laptop"`. If it's purely decorative, use `alt=""`.
3. **Removing Focus Rings:** AI often adds CSS `outline: none` to fix visual quirks. Demand `:focus-visible` ring replacements.
4. **Placeholder as Label:** Relying entirely on `placeholder="Username"`. Screen reader users and cognitive-impaired users lose context once they start typing.
5. **Over-using ARIA:** Adding `role="button"` to native `<button>` tags, or scattering `aria-*` tags randomly. ARIA overrides native HTML semantics; use it sparingly.
6. **Form Inputs Without IDs:** Linking labels using `<label for="x">` but forgetting to give the input `id="x"`.
7. **Color Contrast Failures:** Generating UI designs with light gray text on white backgrounds (`#999` on `#FFF`). Ratios must be minimum 4.5:1 (WCAG AA).
8. **Missing `aria-expanded`:** Building custom dropdowns without tracking the expanded/collapsed state via ARIA.
9. **Modal Focus Traps:** Failing to implement `keydown` listeners to trap Tab strokes inside an open modal menu.
10. **Silent Dynamic Errors:** Showing a red text validation error visually but not applying `aria-invalid` or using an `aria-live` region, rendering it invisible to blind users.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are interactive elements native (<button> and <a>) rather than clickable <div>s?
✅ Is keyboard focus clearly visible using `:focus-visible`?
✅ Do images have descriptive `alt` attributes (or `alt=""` if decorative)?
✅ Are form inputs explicitly paired with `<label>` tags?
✅ Are error messages linked to inputs via `aria-describedby`?
✅ Do custom interactive components (dropdowns, accordions) track state with ARIA (e.g., `aria-expanded`)?
✅ Are dynamic notifications using `aria-live` or `role="alert"` so screen readers see them?
✅ Is text color contrast at least 4.5:1 against its background?
✅ Do modals/dialogs trap focus and respond to the Escape key?
✅ Did I rely on semantic HTML5 regions (<main>, <nav>, <aside>) instead of div soup?
```
