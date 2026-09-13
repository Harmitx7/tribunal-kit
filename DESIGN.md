# Tribunal Kit Design System — Classical Neo-Brutalism & Kinetic Governance

> **Visual Identity Guideline v1.0**  
> Synthesized from Neo-Brutalist classical sculpture, Setlife kinetic speed typography, Boostio Swiss editorial layout, and MarCardona industrial verification label decals.

---

## 🎨 1. Core Color System (Semantic Tokens)

```css
:root {
  /* Surface & Ink */
  --ink-void: #060709;          /* Deep pitch obsidian void */
  --ink-charcoal: #0e1117;      /* Primary module & container fill */
  --ink-surface-card: #141822;  /* Elevated card background */
  --ink-border: #222634;        /* Crisp structural 1px wire border */

  /* The Incandescent Flame (Accent Primary) */
  --flame-vermilion: #ff3300;   /* High-impact kinetic orange-red (Primary action / speed cut) */
  --flame-bright: #ff4d1a;      /* Highlights, diode alerts, and hover glows */
  --flame-burn: #cc2900;        /* Deep shade for halftone depth & duotone shadows */

  /* Substrates & Print Stock */
  --paper-bone: #f5f2eb;        /* Warm unbleached bone parchment */
  --paper-cream: #ebe7de;       /* Secondary editorial paper fill */
  --paper-chalk: #ffffff;       /* Pure high-contrast typographical white */

  /* Industrial Label Chrome */
  --tape-silver: #d4d8e0;       /* Cool galvanized industrial inspection tape */
  --tape-steel: #8a92a3;        /* Muted mechanical metadata text */
  --tape-dark: #1f232e;         /* Dark label tape base */
}
```

---

## 🔤 2. Typographic Hierarchy

1. **Kinetic Display Title:** Ultra-bold extended grotesque with horizontal speed-cut slicing through crossbars (Setlife Studios motif).
2. **Bisected Staggered Headers:** Condensed ultra-bold grotesque split horizontally along the midline with halftone classical sculpture inlaid inside the incision (Demandas motif).
3. **Hardware Mechanical Keycaps:** 3D beveled keyboard keycaps with laser-etched uppercase glyphs for terminal flags and core acronyms (`[P][R][O][O][F]`, `[A][S][T]`).
4. **Swiss Editorial Notation:** High-density, letter-spaced uppercase metadata (`ESTD. 2026 // ARTICLE IV § 12 // ZERO DEPENDENCIES`).
5. **Telemetry & Code:** Strict monospace (`ui-monospace, 'JetBrains Mono', Consolas, monospace`) for latency markers, AST diffs, and CLI commands.

---

## 🏛️ 3. Five Signature Graphic Motifs

### I. Halftone Classical Statuary (The Tribunal Magistrate)
- Classical Roman/Greek sculpture (Praetor, Apollo, Lady Justice) rendered in high-contrast vector halftone raster dither.
- Duotone colorway: `--flame-vermilion` and `--ink-void` over `--paper-bone`.

### II. Kinetic Horizontal Speed-Lines
- Linear horizontal incisions cutting through letterforms and containers, evoking sub-10ms compiled execution speed.

### III. 3D Mechanical Keyboard Keycaps
- Beveled tactile hardware keycaps with top-down lighting and sharp drop shadows representing physical developer tooling.

### IV. The 8-Point Judicial Asterism (`✦` / `✸`)
- Sharp geometric compass star representing constitutional ground truth, cardinal direction, and uncompromising invariant enforcement.

### V. Industrial Inspection Label Decals & Decomposition Strips
- Industrial packaging tape borders with repeating symbol decomposition (solid silhouette → halftone dot → contour stroke → wireframe mesh), barcode calibrations, and security certification seals.

---

## 📐 4. Component Rules

- **No generic purple/violet AI gradients.**
- **No unstyled raw text boxes for performance metrics.**
- **Every metric must feel tangible:** Keycap badges, industrial tape tags, or technical telemetry chips.
- **High contrast guaranteed:** Always test against dark mode and light parchment backgrounds.
