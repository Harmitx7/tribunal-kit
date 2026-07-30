---
name: ui-reasoning-engine
description: Enforces a structured cognitive pipeline that forces the agent to analyze user goals, information architecture, platform constraints, and design tokens before styling any component.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - product-aware-heuristics
  - interface-design
  - better-colors
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI Reasoning Engine — The Cognitive Design Loop

---

## Mandatory Pre-Flight Context Inspection

Before generating UI component code, you MUST inspect:
1. `DESIGN.md` / `package.json` → Identify visual style direction, color token specifications, and UI dependencies
2. The 16-Step Reasoning Pipeline (Section 1) → Execute intent classification, accessibility constraints, and platform layout rules
3. Target viewport & input mode → Check desktop vs mobile touch bounds (minimum 44x44px for coarse pointers)

To build state-of-the-art interfaces, you must think before you style. This skill enforces a structured reasoning process. Before writing any HTML, CSS, or Component code, you must execute the following 16-step analysis.

---

## The 16-Step Reasoning Pipeline

```
User Intent ↓ Product Classification ↓ User Classification ↓ Primary User Goals ↓ Task Frequency ↓ Information Architecture ↓ Interaction Model ↓ Content Hierarchy ↓ Platform Constraints ↓ Visual Direction ↓ Design System Selection ↓ Component Architecture ↓ Responsive Strategy ↓ Accessibility Strategy ↓ Motion Strategy ↓ Implementation
```

### 1. User Intent
*   **Input:** User prompt description.
*   **Analysis:** Analyze what the user is *actually* trying to accomplish.
*   **Result:** Is this an analytical task (comparing figures), an operational task (inputting records), a navigational task (getting to another screen), or an emotional/brand task (purchasing, onboarding)?

### 2. Product Classification
*   **Input:** Chosen intent.
*   **Analysis:** Categorize the product to choose the correct heuristic pack (see `product-aware-heuristics` skill).
*   **Result:** SaaS, Developer Tool, Analytics Dashboard, Luxury/Marketing, AI Interface, Healthcare, Fintech, E-commerce, or Experimental.

### 3. User Classification
*   **Input:** Product category.
*   **Analysis:** Identify the target audience's demographics and expertise.
*   **Result:** Is the user an expert operator (requires high density, shortcuts, speed), a casual consumer (requires clarity, onboarding, simplicity), or someone with temporary/permanent accessibility challenges?

### 4. Primary User Goals
*   **Input:** User classification.
*   **Analysis:** List the 3 most frequent tasks the user will perform on this screen.
*   **Result:** How do we make the primary task take the least physical and cognitive effort (Fitts's Law)?

### 5. Task Frequency & Pace
*   **Input:** Primary user goals.
*   **Analysis:** Determine whether this is a high-frequency daily tool (e.g., terminal, text editor) or a low-frequency workflow (e.g., onboarding, checkout).
*   **Result:** High frequency demands extreme speed, efficiency, and keyboard workflows. Low frequency demands validation, guardrails, and instructional microcopy.

### 6. Information Architecture (IA)
*   **Input:** Spacing guidelines.
*   **Analysis:** Map the relationships between data fields and screen areas.
*   **Result:** Group related data items together using Gestalt principles of proximity and common region. Do not separate related data with arbitrary containers.

### 7. Interaction Model
*   **Input:** IA relationships.
*   **Analysis:** Define how users navigate, filter, and modify data.
*   **Result:** Are we using modal dialogs, slide-out drawers, inline disclosures, tabs, or split-screen panels? Choose based on cognitive load and screen size.

### 8. Content Hierarchy
*   **Input:** Interaction model.
*   **Analysis:** Rank items by visual weight.
*   **Result:** The eye must see the most important element first (Primary Action / Primary Figure), followed by secondary details, then supporting metadata.

### 9. Platform Constraints
*   **Input:** Content hierarchy.
*   **Analysis:** Identify the target environment.
*   **Result:** Desktop (mouse precision, wide viewport), Mobile (coarse pointer, bottom action zone), or Cross-Platform.

### 10. Visual Direction & Mood
*   **Input:** Platform constraints.
*   **Analysis:** Select a distinctive theme that matches the product purpose (from `DESIGN.md`).
*   **Result:** Swiss Precision, Brutalist, Dark Luxury, Editorial, Neo-Glassmorphism, Soft Minimal, Retro Analog, or Neon Cyberpunk.

### 11. Design System Selection
*   **Input:** Visual Direction.
*   **Analysis:** Match colors, radius, and shadows to the Visual Direction.
*   **Result:** Never use raw hex colors. Use OKLCH semantic variables (`--bg-surface`, `--color-primary`, `--border-subtle`).

### 12. Component Architecture
*   **Input:** Design system.
*   **Analysis:** Decompose the UI into primitives (headless buttons, fields), components (cards, forms), and patterns (dashboards, headers).
*   **Result:** Prevent duplication. Reuse existing UI tokens and patterns.

### 13. Responsive Strategy
*   **Input:** Component list.
*   **Analysis:** Plan reflow, resizing, and pointer changes.
*   **Result:** Avoid scaling down desktop interfaces. Reorganize layouts using container queries (`@container`) and CSS clamp functions.

### 14. Accessibility (A11y) Strategy
*   **Input:** Responsive plan.
*   **Analysis:** Verify contrast, keyboard paths, and ARIA labels.
*   **Result:** Verify target sizes are at least 24px (standard AA) and preferably 44px (touch). Contrast must meet APCA Lc ratios.

### 15. Motion Strategy
*   **Input:** Accessibility strategy.
*   **Analysis:** Define transitions and state changes.
*   **Result:** Ensure all animations serve a purpose (feedback, orientation, or progression) and respect `prefers-reduced-motion`.

### 16. Implementation
*   **Input:** All prior steps trace.
*   **Analysis:** Generate the actual semantic markup, CSS custom properties, and logic.
*   **Result:** Output code block.

---

## Enforcement Protocol

When building any UI, the Maker Agent must document this reasoning loop before returning the final code. Output the reasoning as a collapsed markdown block:

```markdown
<details>
<summary>🧠 UI Reasoning Engine Trace</summary>

1. **Intent:** [Analytical/Operational/etc.]
2. **Product Category:** [SaaS/DevTool/etc.]
3. **User Type:** [Expert/Casual]
4. **Primary Goals:** [Goal 1, 2, 3]
5. **Frequency:** [High/Low]
6. **IA & Grouping:** [Data relationships]
7. **Interaction Model:** [Modals/Drawers/Tabs]
8. **Content Hierarchy:** [Primary → Secondary → Muted]
9. **Platform:** [Desktop/Mobile/Tablet]
10. **Visual Mood:** [Swiss/Editorial/etc.]
11. **Tokens Used:** [OKLCH variables]
12. **A11y Strategy:** [Focus paths, contrast levels]
13. **Responsive Plan:** [Breakpoints & clamp sizes]
14. **Motion Plan:** [Easing, durations]

</details>
```

---

## Pre-Flight Checklist
- [ ] Have I executed the 16-step UI Reasoning Loop?
- [ ] Have I identified the target Product Category and Visual Direction?
- [ ] Have I verified touch targets are 24px minimum (and 44px+ for coarse pointers)?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
