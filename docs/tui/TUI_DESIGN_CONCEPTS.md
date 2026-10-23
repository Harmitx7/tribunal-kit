# Tribunal-Kit — Next-Generation Terminal UI: Creative Design Concepts

**Document Version:** 1.0.0  
**Phase:** Phase 2 — Creative Brainstorming Engine  
**Author:** Terminal UI Architecture & Creative Direction Team  
**Status:** PROPOSED FOR HUMAN APPROVAL

---

## 1. Creative Design Objectives

The redesigned Tribunal-Kit Terminal UI must transition from an ad-hoc collection of ANSI helpers into an elite, cohesive developer experience that communicates authority, precision, and architectural safety. It should evoke the feeling of a flight deck or mission control console for autonomous software engineering.

The 6 concepts explored below provide genuinely distinct visual identities, information structures, color philosophies, and ergonomics.

---

## 2. Six Distinct Visual Directions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPLORATION SPECTRUM: 6 CREATIVE DESIGN CONCEPTS                            │
├───────────────┬───────────────────────────────┬─────────────────────────────┤
│ Concept A     │ Dark Command Center           │ Mission-control density     │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Concept B     │ Cyber Intelligence Terminal   │ Security telemetry & HUD    │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Concept C     │ Premium Minimalist Developer  │ Editorial calm & precision  │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Concept D     │ Modern Command-Line Dashboard │ Instant metric cards & tiles│
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Concept E     │ Editorial Engineering Dossier │ Structured publication flow │
├───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Concept F     │ Adaptive Hybrid Architecture  │ Multi-mode layered cockpit  │
└───────────────┴───────────────────────────────┴─────────────────────────────┘
```

---

### Concept A — "Dark Command Center" (Mission-Control Density)

- **Philosophy:** High-density, disciplined system control room. Gives developers an immediate sense of omniscient operational command over agents, memory, and governance rules.
- **Visual Identity:** Deep slate backgrounds, precision micro-borders (`│`, `─`, `╭`, `╯`), high-contrast pill badges, and dual-column telemetry panes.
- **Color Palette:**
  - Backgrounds: `SLATE_950` (#09090b), `SLATE_900` (#0f0f14), `SLATE_800` (#1c1c23)
  - Base Text: `ZINC_200` (#e4e4e7), `WHITE` (#fafafa)
  - Accents: `AMBER` (#f59e0b) for radar/monitoring; `FLAME` (#e14b2d) for interventions
  - Status: `EMERALD` (#23c369) active/healthy; `ROSE` (#f43f5e) breaker trip
- **Header & Branding:** Compact single-line radar bar:
  `▰ TRIBUNAL ▰ CORE v9.2.9 │ FORTRESS MODE │ PID 49210 │ STACK: ACTIVE`
- **Command Output:** Dual-pane split: left pane displays agent status and circuit breakers; right pane streams live event logs and transaction WAL IDs.
- **Keyboard Model:** `Tab` toggles focus between telemetry pane and event log; `q` or `Esc` cancels; `Space` toggles items.
- **Narrow Terminal (≤60 cols):** Automatically collapses side-by-side split into stacked accordion view with summary pills.
- **Pros:** Maximum information density; ideal for continuous monitoring (`tk rsi watch`, `tk marathon`).
- **Cons:** Can feel overwhelming for quick single-shot commands like `tk status` or `tk case list`.

---

### Concept B — "Cyber Intelligence Terminal" (Security Telemetry & HUD)

- **Philosophy:** Inspired by zero-trust telemetry, hardware security modules, and red-team defensive cockpits. Emphasizes threat mitigation and anti-hallucination barriers.
- **Visual Identity:** Precision monospace grid, bracketed status badges (`[PASS]`, `[HALT]`), subtle ASCII geometry (`▰▱`, `◈`, `┼`), and cryptographic hash chips.
- **Color Palette:**
  - Backgrounds: Deep Obsidian (#050508), Technical Slate (#111318)
  - Primary Accent: Precision Cyan (#38bdf8) & Tactical Teal (#14b8a6)
  - Alert Accent: Neon Tangerine (#f97316) & Crimson (#ef4444)
  - Text: Cold White (#f1f5f9), Phosphor Dim (#64748b)
- **Header & Branding:**
  `[SHIELD: ARMED] ◈ TRIBUNAL-KIT v9.2.9 ◈ [POLICY: ZERO-TRUST-P0]`
- **Command Output:** Tabulated security reports with explicit severity scoring (CRIT, HIGH, MED, LOW), transaction IDs, and cryptographic verification hashes.
- **Keyboard Model:** Number-key shortcuts (`1` to `9`), Vim keys (`h/j/k/l`), `/` for instant filter.
- **Narrow Terminal:** Drops non-essential columns (hash IDs, timestamps), retaining severity and target paths.
- **Pros:** Strong brand distinction; reinforces Tribunal-Kit's role as an anti-hallucination governance gatekeeper.
- **Cons:** Risk of looking like a Hollywood hacker cliché if not strictly restrained and disciplined.

---

### Concept C — "Premium Minimalist Developer Tool" (Calm Precision)

- **Philosophy:** Influenced by modern minimalist developer favorites (Linear, Vercel CLI, Turborepo, Stripe CLI, Rust Cargo). Clean whitespace, hyper-legible typography, zero visual clutter.
- **Visual Identity:** Frameless vertical lists, subtle indentation, soft dot connectors (`·`), delicate single-line rules, no heavy boxing.
- **Color Palette:**
  - Monochromatic foundation: Pitch Black (#000000), Off-White (#ffffff), 4 shades of neutral gray (#a1a1aa, #71717a, #52525b, #27272a)
  - Single Signature Accent: Coral Flame (#e14b2d) used strictly for the brand badge and active cursor
  - Subtle Status: Mint (#10b981) for success, Rose (#f43f5e) for failure
- **Header & Branding:** Ultra-understated:
  `▲ tribunal 9.2.9`
- **Command Output:** Clean linear progression with clear hierarchy:
  `• Verified 28 parallel reviewers`  
  `  └── logic-auditor passed (0.12s)`
- **Keyboard Model:** Arrow keys, Enter to confirm, Escape to cancel. No complex modes.
- **Narrow Terminal:** Gracefully reflows without any horizontal clipping because it avoids rigid multi-column tables.
- **Pros:** Universally readable; fastest rendering speed; lowest maintenance; looks timeless on any terminal theme.
- **Cons:** Low information density; cannot show multi-dimensional live metrics at a single glance.

---

### Concept D — "Modern Command-Line Dashboard" (Card & Tile UI)

- **Philosophy:** Brings the structured visual cards of modern SaaS web dashboards to the terminal using rounded Unicode borders, key-value grids, and progress meters.
- **Visual Identity:** Multi-card layout. The terminal renders distinct cards: "Health", "Swarm Status", "Active Tasks", and "Recent Transgressions".
- **Color Palette:**
  - Surface fills: Subdued Zinc (#18181b, #27272a)
  - Text: Crisp High-Contrast White (#fafafa)
  - Accents: Electric Indigo (#6366f1) and Sky Cyan (#0ea5e9)
  - Status: Lime Green (#84cc16), Amber (#eab308)
- **Header & Branding:** Centered brand card with status badges in the top corners:
  `╭─ TRIBUNAL-KIT v9.2.9 ─────────────────── [System Healthy] ─╮`
- **Command Output:** Segmented cards with key-value pairs formatted as micro-tables with bold labels and dimmed metadata.
- **Keyboard Model:** Tab/Shift+Tab to cycle between active cards; arrow keys to navigate within selected card.
- **Narrow Terminal:** Cards reorder from horizontal grid (side-by-side) into vertical stacked sequence.
- **Pros:** Extremely accessible; visual grouping makes complex states immediately obvious to non-terminal experts.
- **Cons:** Higher rendering complexity; boxing consumes 4-6 columns per card, reducing usable text width.

---

### Concept E — "Editorial Engineering Dossier" (Publication Flow)

- **Philosophy:** Treats CLI outputs as formal engineering audit reports and architectural briefs. Emphasizes clear document sections, roman numerals or decimal section numbering, and executive summaries.
- **Visual Identity:** Strong typographic hierarchy, serif-like structured separators (`═`, `─`), indented bullet summaries, and clean tabular data with clean headers.
- **Color Palette:**
  - Classic Paper/Ink Dark: Warm Carbon (#121214), Warm Cream White (#fdfbf7), Slate Neutral (#87878d)
  - Accent: Deep Crimson (#991b1b) & Warm Amber (#d97706)
- **Header & Branding:**
  `TRIBUNAL GOVERNANCE REPORT ────────── Issue 9.2.9 / Production`
- **Command Output:** Numbered findings: `§1.0 Swarm Health`, `§2.0 Circuit Breaker History`, `§3.0 Memory Verification`.
- **Keyboard Model:** Page Up / Page Down / Space to scroll; `Enter` to expand detailed evidence.
- **Narrow Terminal:** Fluid text reflow; eliminates horizontal divider length hardcoding.
- **Pros:** Ideal for logging to CI artifacts, audit sign-offs, and compliance exports; highly professional.
- **Cons:** Lacks the feeling of an interactive, real-time tool; feels more like a static reporting tool.

---

### Concept F — "Adaptive Hybrid Architecture" (The Multi-Mode Cockpit)

- **Philosophy:** Rather than forcing every command into the same visual template, this concept introduces an **Adaptive 3-Tier Mode Engine**:
  1. **Stream Mode (Tier 1):** For standard CLI execution, scripts, and piping (`tk help`, `tk case list`). Ultra-clean, minimal indentation, linear, zero flicker.
  2. **Enhanced Action Mode (Tier 2):** For targeted operational steps (`tk init`, `tk validate`, `tk learn`). Features the iconic Flame pill banner, connected ActionTree timeline, and live parallel reviewer swarm grid.
  3. **Cockpit Dashboard Mode (Tier 3):** For long-running, multi-variable operations (`tk rsi status`, `tk rsi watch`, `tk marathon`). Features a dual-card overview, live health meters, circuit-breaker badge, and non-blocking interactive shortcuts.
- **Visual Identity:**
  - High-precision rounded box glyphs (`╭`, `╮`, `╰`, `╯`, `─`, `│`)
  - Sinusoidal RGB TrueColor gradient shimmer for active progress
  - Cohesive design tokens sharing one master palette with automatic fallback to 16-color ANSI and ASCII
  - Consistent header cards with contextual accessory pills (`[Fortress Mode · Rust Core]`)
- **Color Palette:**
  - Base: Deep Slate (`SLATE_950` [9,9,11], `SLATE_900` [15,15,20], `SLATE_800` [28,28,35])
  - Signature Accent: Flame Orange-Red (`RGB.FLAME` [225,75,45]) with Coral Glow ([245,120,95])
  - Neutral Text: Zinc Hierarchy (`ZINC_200` primary, `ZINC_400` secondary, `ZINC_600` muted)
  - Semantic Status: Sharper Emerald ([35,195,105]), Cyan ([56,189,248]), Amber ([245,158,11]), Rose ([244,63,94])
- **Narrow Terminal Behavior:**
  - Tier 1: 100% fluid reflow.
  - Tier 2: Swarm grid adapts from 3 cols (≥110 cols) to 2 cols (≥72 cols) to 1 col (<72 cols).
  - Tier 3: Stacked vertical cards with truncated hash strings.
- **Pros:** Solves the entire spectrum of Tribunal-Kit needs without compromising speed, scriptability, or visual punch.
- **Cons:** Requires a unified design system foundation and clear mode router.

---

## 3. Comparative Evaluation & Scoring Matrix

Each concept is scored on an objective 1–10 scale across 8 rigorous criteria:
1. **Visual Impact:** Immediate "wow factor" and premium feel.
2. **Professional Appearance:** Conveys enterprise engineering rigor vs looking like a toy.
3. **Readability:** Rapid scannability of diagnostic findings and warnings.
4. **Usability:** Keyboard ergonomics and clear status indicators.
5. **Terminal Compatibility:** Robustness across diverse emulators, SSH, CI, Windows CMD.
6. **Implementation Feasibility:** Ability to build with zero new npm runtime dependencies.
7. **Maintainability:** Code cleanliness, testability, and token centralization.
8. **Brand Distinctiveness:** Unmistakable Tribunal-Kit visual identity.

### Scoring Table

| Criteria (Weight) | Concept A: Command Center | Concept B: Cyber Intel | Concept C: Minimalist | Concept D: Dashboard | Concept E: Editorial | Concept F: Adaptive Hybrid |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Visual Impact (15%)** | 8.8 | 8.5 | 7.5 | 8.7 | 7.2 | **9.6** |
| **Professional Appearance (15%)** | 9.0 | 7.8 | 9.2 | 8.4 | 9.4 | **9.5** |
| **Readability (15%)** | 8.2 | 7.4 | 9.5 | 8.6 | 9.1 | **9.2** |
| **Usability (15%)** | 8.4 | 7.6 | 8.8 | 8.9 | 7.8 | **9.4** |
| **Terminal Compatibility (10%)** | 8.0 | 7.5 | 9.8 | 7.6 | 9.0 | **9.5** |
| **Feasibility (10%)** | 8.2 | 7.9 | 9.6 | 7.5 | 8.8 | **9.2** |
| **Maintainability (10%)** | 8.0 | 7.6 | 9.4 | 7.4 | 8.6 | **9.3** |
| **Brand Distinctiveness (10%)** | 8.5 | 8.8 | 7.0 | 8.0 | 8.2 | **9.6** |
| **WEIGHTED TOTAL (100%)** | **8.42** | **7.88** | **8.63** | **8.25** | **8.47** | **9.43** |

---

## 4. Concept Scoring Rationale & Ranking

1. **Rank 1: Concept F — Adaptive Hybrid Architecture (Score: 9.43 / 10)**  
   *Why it wins:* It does not commit the cardinal sin of forcing a heavy dashboard onto a simple 1-second CLI command (`tk case list`), nor does it reduce a rich multi-agent telemetry workflow (`tk rsi status`, `tk marathon`) to a boring stream of plain text. It leverages Tribunal-Kit's existing strengths (the Brainless flame palette, shimmer wave, and action tree) while standardizing them into an ultra-clean, zero-dependency design system that gracefully scales down to monochrome and CI environments.

2. **Rank 2: Concept C — Premium Minimalist Developer Tool (Score: 8.63 / 10)**  
   *Why it ranked high:* Superior terminal compatibility, blazing speed, and timeless aesthetics. However, it lacks the multi-agent mission-control presence needed for complex workflows like the 28-reviewer swarm and Recursive Self-Improvement Engine (RSIE).

3. **Rank 3: Concept E — Editorial Engineering Dossier (Score: 8.47 / 10)**  
   *Why it ranked high:* Exceptional for static audit reports and compliance exports, but lacks dynamic feedback (spinners, interactive wizards, live matrices).

4. **Rank 4: Concept A — Dark Command Center (Score: 8.42 / 10)**  
   *Why it ranked high:* Visually striking and dense, but difficult to reflow cleanly on standard 80×24 or narrow 60-column mobile SSH terminals.

5. **Rank 5: Concept D — Modern Command-Line Dashboard (Score: 8.25 / 10)**  
   *Why it ranked middle:* Great visual card layout, but border overhead consumes too much horizontal space for deeply nested code diffs and audit logs.

6. **Rank 6: Concept B — Cyber Intelligence Terminal (Score: 7.88 / 10)**  
   *Why it ranked lowest:* Tends toward aesthetic gimmicks that can distract developers during real debugging sessions and carries higher risk of visual fatigue.

---

## 5. Architectural Recommendation

**We formally recommend Concept F (Adaptive Hybrid Architecture).**

Concept F builds directly on Tribunal-Kit's existing strengths while resolving its architectural gaps:
1. Reconciles `src/utils/logger.js` and `src/tui/theme.js` into a unified tokens-based presentation layer.
2. Fixes the border alignment defect in `panel.js`.
3. Adds robust ANSI-safe text width calculations and terminal resize protection.
4. Upgrades `status`, `rsi`, `validate`, `init`, and `marathon` to first-class visual citizens with zero external npm dependencies.
