---
name: gsap-performance
description: Official GSAP skill for performance — prefer transforms, avoid layout thrashing, will-change, batching. Use when optimizing GSAP animations, reducing jank, or when the user asks about animation performance, FPS, or smooth 60fps.
license: MIT
---

# GSAP Performance

## When to Use This Skill

Apply when optimizing GSAP animations for smooth 60fps, reducing layout/paint cost, or when the user asks about performance, jank, or best practices for fast animations.

**Related skills:** Build animations with **gsap-core** (transforms, autoAlpha) and **gsap-timeline**; for ScrollTrigger performance see **gsap-scrolltrigger**.

## Prefer Transform and Opacity

Animating **transform** (`x`, `y`, `scaleX`, `scaleY`, `rotation`, `rotationX`, `rotationY`, `skewX`, `skewY`) and **opacity** keeps work on the compositor and avoids layout and most paint. Avoid animating layout-heavy properties when a transform can achieve the same effect.

- ✅ Prefer: **x**, **y**, **scale**, **rotation**, **opacity**.
- ❌ Avoid when possible: **width**, **height**, **top**, **left**, **margin**, **padding** (they trigger layout and can cause jank).

GSAP’s **x** and **y** use transforms (translate) by default; use them instead of **left**/**top** for movement.

## will-change

Use **will-change** in CSS on elements that will animate. It hints the browser to promote the layer.

```css
will-change: transform;
```

## Batch Reads and Writes

GSAP batches updates internally. When mixing GSAP with direct DOM reads/writes or layout-dependent code, avoid interleaving reads and writes in a way that causes repeated layout thrashing. Prefer doing all reads first, then all writes (or let GSAP handle the writes in one go).

## Many Elements (Stagger, Lists)

- Use **stagger** instead of many separate tweens with manual delays when the animation is the same; it’s more efficient.
- For long lists, consider **virtualization** or animating only visible items; avoid creating hundreds of simultaneous tweens if it causes jank.
- Reuse timelines where possible; avoid creating new timelines every frame.

## Frequently updated properties (e.g. mouse followers)

Prefer **gsap.quickTo()** for properties that are updated often (e.g. mouse-follower x/y). It reuses a single tween instead of creating new tweens on each update. 

```javascript
let xTo = gsap.quickTo("#id", "x", { duration: 0.4, ease: "power3" }),
    yTo = gsap.quickTo("#id", "y", { duration: 0.4, ease: "power3" });

document.querySelector("#container").addEventListener("mousemove", (e) => {
  xTo(e.pageX);
  yTo(e.pageY);
});
```

## ScrollTrigger and Performance

- **pin: true** promotes the pinned element; pin only what’s needed.
- **scrub** with a small value (e.g. `scrub: 1`) can reduce work during scroll; test on low-end devices.
- Call **ScrollTrigger.refresh()** only when layout actually changes (e.g. after content load), not on every resize; debounce when possible.

## Reduce Simultaneous Work

- Pause or kill off-screen or inactive animations when they’re not visible (e.g. when the user navigates away).
- Avoid animating huge numbers of properties on many elements at once; simplify or sequence if needed.

## Best practices

- ✅ Animate **transform** and **opacity**; use **will-change** in CSS only on elements that animate.
- ✅ Use **stagger** instead of many separate tweens with manual delays when the animation is the same.
- ✅ Use **gsap.quickTo()** for frequently updated properties (e.g. mouse followers).
- ✅ Clean up or kill off-screen animations; call **ScrollTrigger.refresh()** when layout changes, debounced when possible.

## Do Not

- ❌ Animate **width**/ **height**/ **top**/ **left** for movement when **x**/ **y**/ **scale** can achieve the same look.
- ❌ Set **will-change** or **force3D** on every element “just in case”; use for elements that are actually animating.
- ❌ Create hundreds of overlapping tweens or ScrollTriggers without testing on low-end devices.
- ❌ Ignore cleanup; stray tweens and ScrollTriggers keep running and can hurt performance and correctness.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

---

## 🚨 LLM Trap Table

|Pattern|What AI Does Wrong|What Is Actually Correct|
|:---|:---|:---|
|gsap-performance|Layout caching issues|Call ScrollTrigger.refresh() on height/layout changes|
|gsap-performance|Multiple separate tweens with delay|Use a single tween with stagger: 0.1|
|gsap-performance|will-change on everything|Use sparingly, or let GSAP handle it via willChange: "transform" option|

---

## ✅ Pre-Flight Self-Audit

Before producing any output, verify:
```
✅ Did I read the actual files before making claims about them?
✅ Did I verify all method names against official GSAP documentation?
✅ Did I add // VERIFY: on any uncertain API calls?
✅ Are all imports from packages that actually exist in package.json?
✅ Did I test my logic with edge cases (null, empty, 0, max)?
✅ Did I avoid generating code for more than one module at a time?
✅ Am I working from evidence, not assumption?
```

---

## 🔁 VBC Protocol (Verify → Build → Confirm)

```
VERIFY:  Read the actual codebase before writing anything
BUILD:   Generate the smallest meaningful unit of code
CONFIRM: Verify the output is correct before presenting
```
