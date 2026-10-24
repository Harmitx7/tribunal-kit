# W3C WAI-ARIA Authoring Practices (APG) Reference

> **Authority**: W3C Web Accessibility Initiative (`https://www.w3.org/WAI/ARIA/apg/`)  
> **Applicable Domains**: Frontend UI/UX, Component Primitives, Accessibility  
> **Status**: Verified W3C Standard  

---

## 1. Core ARIA Principles (The First Rule of ARIA)

> **First Rule of ARIA**: If you can use a native HTML element or attribute with the semantics and behavior you require already built-in, do so instead of re-purposing an element and adding an ARIA role.

- Use `<button>` instead of `<div role="button">`
- Use `<dialog>` or `<nav>` instead of generic `<div>` wrappers
- Use native `<input type="checkbox">` instead of simulated role switches

---

## 2. Modal Dialog Pattern Standards

When creating an overlay dialog or modal, the following behaviors are **mandatory** for WCAG 2.1 AA compliance:

1. **Role & Labeling**:
   ```html
   <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
     <h2 id="dialog-title">Delete Project</h2>
     <p id="dialog-desc">This action cannot be undone.</p>
     ...
   </div>
   ```
2. **Focus Management**:
   - On open: Move focus to the first interactive element inside the dialog (or the close button).
   - On close: Restore focus to the trigger element that opened the dialog.
3. **Keyboard Trapping**:
   - Pressing `Tab` on the last focusable element must cycle focus back to the first focusable element.
   - Pressing `Shift+Tab` on the first element must cycle to the last element.
4. **Escape Key Handling**:
   - Pressing `Escape` must immediately close the dialog without triggering confirmation actions.

---

## 3. Disclosure & Accordion Pattern

For collapsibles, drawers, and accordions:
```html
<!-- Trigger button MUST have aria-expanded and aria-controls -->
<button 
  type="button" 
  aria-expanded="false" 
  aria-controls="section-content-1"
  id="section-header-1"
>
  Billing History
</button>

<!-- Target container MUST match ID -->
<div id="section-content-1" role="region" aria-labelledby="section-header-1" hidden>
  ...
</div>
```

- When expanded: update `aria-expanded="true"` and remove `hidden`.
- When collapsed: update `aria-expanded="false"` and set `hidden` (or `display: none`).
