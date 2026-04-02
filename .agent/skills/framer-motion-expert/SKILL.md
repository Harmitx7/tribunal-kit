---
name: framer-motion-expert
description: Framer Motion 12+ mastery for React. Declarative animations, layout transitions, gestures, scroll-linked motion, AnimatePresence, useAnimate, useMotionValue, LazyMotion bundle optimization, and accessibility (prefers-reduced-motion). Use when building React component animations, page transitions, shared layout animations, or gesture-driven UI.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Framer Motion Expert — React Animation Library

> Framer Motion is declarative-first. If you're writing imperative animation loops in React, you're fighting the framework.
> Every `motion.div` must have a reason. Every `AnimatePresence` must have a `key`. Every `useMotionValue` must avoid re-renders.

---

## Core API — Declarative Animations

### The `motion` Component

```tsx
import { motion } from "framer-motion";

// motion.div, motion.span, motion.button, motion.svg, motion.path, etc.
// Any HTML or SVG element can be prefixed with `motion.`

function FadeInBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      Hello, animated world
    </motion.div>
  );
}

// ❌ HALLUCINATION TRAP: There is NO <Motion> component (capital M)
// ❌ HALLUCINATION TRAP: There is NO motion() function wrapper
// ✅ It's always motion.div, motion.span, etc. (lowercase dot notation)
```

### The `animate` Prop

```tsx
// Object syntax (most common)
<motion.div animate={{ x: 100, opacity: 1 }} />

// Dynamic — responds to state changes automatically
const [isOpen, setIsOpen] = useState(false);
<motion.div animate={{ height: isOpen ? "auto" : 0 }} />

// ❌ HALLUCINATION TRAP: `animate={{ height: "auto" }}` only works
// in Framer Motion 11+ with the layout animation engine.
// For older versions, use explicit pixel values or the `layout` prop.
```

### `initial`, `animate`, `exit`

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"              // ← key is REQUIRED inside AnimatePresence
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      Modal content
    </motion.div>
  )}
</AnimatePresence>

// ❌ HALLUCINATION TRAP: exit animations do NOT work without AnimatePresence
// ❌ HALLUCINATION TRAP: AnimatePresence children MUST have a unique `key`
```

### Variants (Declarative Animation Maps)

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,    // stagger between children
      delayChildren: 0.2,      // delay before first child
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function List() {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}

// Variant names propagate automatically to children
// Children inherit the current variant name from parent
// You do NOT need to set initial/animate on each child
```

---

## Transitions

### Tween (Default)

```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{
    type: "tween",        // default for most properties
    duration: 0.5,
    ease: "easeInOut",    // or [0.42, 0, 0.58, 1] (cubic-bezier)
    delay: 0.2,
    repeat: 2,            // number of repeats (Infinity for loop)
    repeatType: "reverse", // "loop", "reverse", "mirror"
    repeatDelay: 0.5,
  }}
/>
```

### Spring (Physics-Based)

```tsx
<motion.div
  animate={{ x: 100 }}
  transition={{
    type: "spring",
    stiffness: 300,       // spring tension (default: 100)
    damping: 20,          // resistance (default: 10)
    mass: 1,              // weight (default: 1)
    bounce: 0.25,         // shorthand: 0 = no bounce, 1 = max bounce
    // duration + bounce is an alternative to stiffness + damping
    duration: 0.8,        // approximate duration (auto-calculates stiffness/damping)
  }}
/>

// ❌ HALLUCINATION TRAP: You cannot use BOTH stiffness+damping AND duration+bounce
// Pick one pair. Using both causes unpredictable behavior.
```

### Inertia

```tsx
// Inertia transitions are used after drag gestures
<motion.div
  drag="x"
  dragTransition={{
    bounceStiffness: 600,
    bounceDamping: 20,
    power: 0.8,            // deceleration rate
    timeConstant: 750,     // ms to reach ~63% of projected distance
  }}
/>
```

### Orchestration

```tsx
// Parent controls when children animate
const parent = {
  visible: {
    transition: {
      when: "beforeChildren",  // "afterChildren", "beforeChildren"
      staggerChildren: 0.1,
      staggerDirection: 1,     // 1 = forward, -1 = reverse
      delayChildren: 0.3,
    },
  },
};
```

### Per-Property Transitions

```tsx
<motion.div
  animate={{ x: 100, opacity: 1 }}
  transition={{
    x: { type: "spring", stiffness: 300 },
    opacity: { duration: 0.2 },
    default: { duration: 0.5 },  // fallback for unlisted properties
  }}
/>
```

---

## Gestures

### Hover, Tap, Focus

```tsx
<motion.button
  whileHover={{ scale: 1.05, backgroundColor: "#4338ca" }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ boxShadow: "0 0 0 3px rgba(66, 153, 225, 0.6)" }}
  transition={{ type: "spring", stiffness: 400, damping: 15 }}
>
  Click me
</motion.button>
```

### Drag

```tsx
<motion.div
  drag              // "x", "y", or true for both axes
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
  dragElastic={0.2}  // 0 = hard stop, 1 = free (default: 0.35)
  dragMomentum={true} // continue with inertia after release (default: true)
  dragSnapToOrigin    // return to starting position on release
  onDragStart={(event, info) => console.log(info.point)}
  onDrag={(event, info) => console.log(info.offset)}
  onDragEnd={(event, info) => console.log(info.velocity)}
/>

// Drag within a parent container
function DragInContainer() {
  const constraintsRef = useRef(null);
  return (
    <motion.div ref={constraintsRef} style={{ width: 400, height: 400 }}>
      <motion.div drag dragConstraints={constraintsRef} />
    </motion.div>
  );
}
```

### `whileInView` (Scroll-Triggered)

```tsx
<motion.div
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{
    once: true,        // only animate once (do NOT re-trigger on scroll back)
    amount: 0.3,       // 30% of element must be visible
    margin: "-100px",  // shrink viewport detection area
  }}
  transition={{ duration: 0.6 }}
>
  Appears on scroll
</motion.div>

// ❌ HALLUCINATION TRAP: `viewport.once` defaults to false
// This means the animation replays every time the element enters/exits
// Most designs want `once: true` for entrance animations
```

---

## Layout Animations

### The `layout` Prop

```tsx
// The MAGIC of Framer Motion — automatic layout animations
// When a component's size or position changes,
// Framer Motion animates between the old and new layout automatically

function ExpandableCard({ isExpanded }) {
  return (
    <motion.div
      layout          // ← THIS is the magic prop
      style={{
        width: isExpanded ? 400 : 200,
        height: isExpanded ? 300 : 100,
      }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <motion.p layout="position">
        {/* layout="position" — only animate position, not size */}
        Card content
      </motion.p>
    </motion.div>
  );
}

// layout values:
// true       — animate both position and size
// "position" — only animate position (prevents text reflow flicker)
// "size"     — only animate size
// "preserve-aspect" — maintain aspect ratio during transition
```

### `layoutId` — Shared Element Transitions

```tsx
// The most powerful feature in Framer Motion
// Elements with the same layoutId across renders morph into each other

function ItemList({ selectedId, onSelect }) {
  return (
    <div className="grid">
      {items.map((item) => (
        <motion.div
          key={item.id}
          layoutId={`card-${item.id}`}
          onClick={() => onSelect(item.id)}
        >
          <motion.h2 layoutId={`title-${item.id}`}>{item.title}</motion.h2>
        </motion.div>
      ))}

      <AnimatePresence>
        {selectedId && (
          <motion.div
            layoutId={`card-${selectedId}`}
            className="expanded-card"
          >
            <motion.h2 layoutId={`title-${selectedId}`}>
              {items.find(i => i.id === selectedId).title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Expanded content...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ❌ HALLUCINATION TRAP: layoutId elements MUST be in the same LayoutGroup
// or be siblings under the same AnimatePresence. Cross-tree layoutId 
// requires wrapping in <LayoutGroup>.
```

### `LayoutGroup`

```tsx
import { LayoutGroup } from "framer-motion";

// Required when layoutId elements span different component trees
<LayoutGroup>
  <Sidebar />
  <MainContent />
</LayoutGroup>

// Also useful to prevent layout animations from affecting siblings
<LayoutGroup id="sidebar">
  {/* Layout animations here won't leak to the rest of the page */}
</LayoutGroup>
```

---

## Scroll Animations

### `useScroll`

```tsx
import { motion, useScroll, useTransform } from "framer-motion";

function ParallaxHero() {
  const { scrollYProgress } = useScroll();

  // Map scroll progress (0–1) to a y offset (-50 to 50)
  const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.div style={{ y, opacity }}>
      <h1>Parallax Hero</h1>
    </motion.div>
  );
}
```

### Element-Scoped Scroll Tracking

```tsx
function ProgressBar() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,                    // track this element's scroll position
    offset: ["start end", "end start"], // [trigger start, trigger end]
  });

  return (
    <div ref={ref}>
      <motion.div
        style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
        className="progress-bar"
      />
      Long content...
    </div>
  );
}
```

### `useTransform` Chains

```tsx
const { scrollYProgress } = useScroll();

// Chain multiple transforms
const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.5, 1]);
const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
const color = useTransform(
  scrollYProgress,
  [0, 0.5, 1],
  ["#ff0000", "#00ff00", "#0000ff"]
);

// Derived transforms
const invertedY = useTransform(scrollYProgress, (v) => 1 - v);
```

---

## Hooks

### `useAnimate` (Imperative Control)

```tsx
import { useAnimate, stagger } from "framer-motion";

function AnimatedList() {
  const [scope, animate] = useAnimate();

  async function handleClick() {
    // Imperative sequence
    await animate(".list-item", { opacity: 1, y: 0 }, {
      delay: stagger(0.1),
      duration: 0.3,
    });

    await animate(".cta-button", { scale: [1, 1.1, 1] }, {
      duration: 0.4,
    });
  }

  return (
    <div ref={scope}>
      {items.map((item) => (
        <div key={item.id} className="list-item" style={{ opacity: 0 }}>
          {item.name}
        </div>
      ))}
      <button className="cta-button" onClick={handleClick}>
        Show All
      </button>
    </div>
  );
}

// ❌ HALLUCINATION TRAP: useAnimate returns [scope, animate]
// NOT [ref, controls] — that was the old useCycle/useAnimationControls API
```

### `useMotionValue`

```tsx
import { motion, useMotionValue, useTransform } from "framer-motion";

function RotatingCard() {
  const x = useMotionValue(0);
  const rotateY = useTransform(x, [-200, 200], [-45, 45]);
  const background = useTransform(
    x,
    [-200, 0, 200],
    ["#ff008c", "#7700ff", "#00d4ff"]
  );

  return (
    <motion.div
      style={{ x, rotateY, background }}
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
    />
  );
}

// ✅ useMotionValue does NOT trigger React re-renders
// This is the key performance advantage over useState for animations
```

### `useSpring`

```tsx
import { useSpring, useMotionValue } from "framer-motion";

const x = useMotionValue(0);
const springX = useSpring(x, {
  stiffness: 300,
  damping: 30,
  restDelta: 0.001,   // stop spring when movement is below this
});

// springX automatically follows x with spring physics
// Use springX in style={{ x: springX }} for smooth following
```

### `useVelocity`

```tsx
import { useMotionValue, useVelocity, useTransform } from "framer-motion";

const x = useMotionValue(0);
const xVelocity = useVelocity(x);
const skewX = useTransform(xVelocity, [-1000, 0, 1000], [-15, 0, 15]);

// Skews element based on drag speed — creates a "rubber" feel
<motion.div style={{ x, skewX }} drag="x" />
```

---

## AnimatePresence (Mount/Unmount Animations)

```tsx
import { AnimatePresence, motion } from "framer-motion";

function Notifications({ items }) {
  return (
    <AnimatePresence
      mode="sync"      // "sync" | "wait" | "popLayout"
      initial={false}  // skip initial animation on first render
    >
      {items.map((item) => (
        <motion.div
          key={item.id}     // ← UNIQUE KEY IS MANDATORY
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {item.message}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// Modes:
// "sync"      — new and old animate simultaneously (default)
// "wait"      — wait for exit to finish before entering
// "popLayout" — uses FLIP to handle layout shifts during exit

// ❌ HALLUCINATION TRAP: `mode="wait"` used to be called `exitBeforeEnter`
// exitBeforeEnter was REMOVED in Framer Motion 7+
```

### Page Transitions (Next.js App Router)

```tsx
// layout.tsx
"use client";
import { AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  );
}

// page.tsx
"use client";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      Page content
    </motion.main>
  );
}
```

---

## Performance & Accessibility

### `m` vs `motion` — Bundle Optimization (LazyMotion)

```tsx
import { LazyMotion, domAnimation, m } from "framer-motion";

// LazyMotion + domAnimation = ~5KB instead of ~30KB
// Use `m.div` instead of `motion.div` inside LazyMotion

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Lightweight animation
      </m.div>
    </LazyMotion>
  );
}

// For full feature set (layout animations, drag, etc.):
import { domMax } from "framer-motion";
<LazyMotion features={domMax}>

// ❌ HALLUCINATION TRAP: m.div does NOT work without LazyMotion wrapper
// ❌ HALLUCINATION TRAP: layout animations require domMax, not domAnimation
```

### `prefers-reduced-motion` (Accessibility — Mandatory)

```tsx
import { useReducedMotion } from "framer-motion";

function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        x: shouldReduceMotion ? 0 : 100,
        opacity: 1,  // opacity changes are always safe
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.5,
      }}
    >
      Accessible animation
    </motion.div>
  );
}

// ✅ RULE: Opacity and color transitions are acceptable for reduced-motion users
// ❌ RULE: Position, scale, and rotation animations must be disabled or minimized
// ❌ RULE: Auto-playing looping animations MUST stop under reduced motion
```

### Performance Rules

```
✅ Use useMotionValue instead of useState for animation-driven values
   → useMotionValue does NOT trigger React re-renders

✅ Use useTransform to derive values from motion values
   → Avoids recomputation in the React render cycle

✅ Animate transform properties (x, y, scale, rotate, opacity)
   → These are GPU-composited and do not trigger layout

✅ Use LazyMotion + m.div in production to reduce bundle size
   → Cuts Framer Motion from ~30KB to ~5KB

❌ Do NOT animate width, height, top, left, padding, margin
   → These trigger layout recalculation every frame

❌ Do NOT create new motion values inside render
   → Causes GC pressure and breaks animation continuity

❌ Do NOT nest AnimatePresence unnecessarily
   → Each instance adds overhead to the reconciler
```

---

## Framework Considerations

### Next.js (App Router)

```tsx
// Framer Motion components MUST be client components
"use client"; // ← required at top of file

import { motion } from "framer-motion";

// ❌ HALLUCINATION TRAP: motion.div CANNOT be used in Server Components
// The `motion` component requires browser APIs (DOM, window, RAF)

// For server-rendered pages with client animations,
// split into a server-rendered layout + client animation wrapper
```

### Cleanup on Unmount

```tsx
// AnimatePresence handles unmount animations automatically
// But if using useAnimate or manual animation controls:

useEffect(() => {
  const controls = animate(".element", { opacity: 1 });

  return () => {
    controls.stop();  // ← ALWAYS stop animations on cleanup
  };
}, []);
```

### Vue / Non-React Usage

```
⚠️ Framer Motion is React-ONLY.

For Vue, use:
  - @vueuse/motion (Vue 3 motion library, similar API)
  - vue-kinesis (gesture-based)

For Svelte, use:
  - svelte/animate and svelte/transition (built-in)
  - Motion One (framework-agnostic, by Framer Motion creator)

For vanilla JS, use:
  - Motion One (motion.dev) — from the same team, but framework-agnostic
  - GSAP — use the gsap-expert skill instead

// ❌ HALLUCINATION TRAP: There is NO "framer-motion/vue" or "framer-motion/svelte"
// Framer Motion is exclusively a React library
```

---

## Common Animation Patterns

### Staggered List Entrance

```tsx
const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

<motion.ul variants={container} initial="hidden" animate="visible">
  {list.map((entry) => (
    <motion.li key={entry.id} variants={item}>
      {entry.name}
    </motion.li>
  ))}
</motion.ul>
```

### Smooth Tab Indicator

```tsx
function Tabs({ tabs, activeTab }) {
  return (
    <div className="tab-list">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="tab"
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"   // ← shared element
              className="tab-underline"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

### Card Hover Effect

```tsx
<motion.div
  whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
  className="card"
>
  <motion.img
    whileHover={{ scale: 1.03 }}
    transition={{ duration: 0.3 }}
    src={imageUrl}
  />
</motion.div>
```

### Expandable Accordion

```tsx
function Accordion({ title, children, isOpen, onToggle }) {
  return (
    <div>
      <button onClick={onToggle}>{title}</button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Scroll Progress Bar

```tsx
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: "left",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
        zIndex: 50,
      }}
    />
  );
}
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Framer Motion Expert Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Framer Motion Expert
FM Version:  12+
Scope:       [N files · N components]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when generating Framer Motion code. These are strictly forbidden:

1. **Inventing Component Names:** There is no `<Motion>`, `<MotionDiv>`, `<AnimatedDiv>`, or `motion()` wrapper function. The correct API is `motion.div`, `motion.span`, etc. (lowercase dot notation).
2. **Using Deprecated `exitBeforeEnter`:** This prop was removed in Framer Motion 7+. The correct replacement is `mode="wait"` on `AnimatePresence`.
3. **Missing `key` in AnimatePresence:** Every direct child of `AnimatePresence` MUST have a unique `key` prop for exit animations to work.
4. **Using `motion.div` in Server Components:** Framer Motion requires browser APIs. Components using `motion` MUST be marked `"use client"` in Next.js App Router.
5. **Confusing `useAnimation` (removed) with `useAnimate`:** The modern imperative API is `useAnimate()` which returns `[scope, animate]`, NOT `useAnimation()` which returned animation controls.
6. **Using `m.div` Without `LazyMotion`:** The `m` component is only valid inside a `<LazyMotion>` provider. Using it standalone produces no animations.
7. **Layout Animations Without `domMax`:** The `layout` prop and `layoutId` require `domMax` features in LazyMotion, not `domAnimation`.
8. **Over-Animating:** Adding spring animations to every element creates visual chaos. Be intentional — every animation must serve a UX purpose.
9. **Hallucinating Non-React Exports:** There is no `framer-motion/vue`, `framer-motion/svelte`, or `framer-motion/vanilla`. It is React-only.
10. **Animating Layout Properties:** Animating `width`, `height`, `top`, `left` directly instead of using `x`, `y`, `scale`, or the `layout` prop causes layout thrashing.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor` · `frontend-reviewer` · `performance-optimizer`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing animation errors without logging.
3. **Context Amnesia:** Forgetting the user's constraints (e.g., generating `motion.div` in a Server Component).
4. **Accessibility Neglect:** Failing to implement `prefers-reduced-motion` support is a hard block.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I use "use client" for all components using motion.*?
✅ Did I add a unique `key` to every AnimatePresence child?
✅ Did I use mode="wait" instead of the removed exitBeforeEnter?
✅ Did I use useMotionValue (not useState) for animation values?
✅ Did I animate transforms (x, y, scale) instead of layout props?
✅ Did I handle prefers-reduced-motion with useReducedMotion()?
✅ Did I use LazyMotion + m.div for bundle optimization?
✅ Did I stop/cleanup animations on unmount?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
