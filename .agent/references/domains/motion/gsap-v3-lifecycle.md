# GSAP v3 Lifecycle & React Architecture Reference

> **Authority**: GreenSock Official Documentation (`https://gsap.com/docs/v3/`)  
> **Applicable Domains**: Motion Engineering, Frontend Architecture, Animation Systems  
> **Status**: Verified Specification Reference  

---

## 1. GSAP v3 Core Principles & Plugin Registration

GSAP v3 does not require global registration for core tweens, but specialized plugins MUST be registered before execution to prevent tree-shaking failures:
```javascript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
```

### Critical Animation Rules:
1. **Never animate layout properties**: Never animate `top`, `left`, `width`, `height`, or `margin`. Always animate composite-only transforms:
   ```javascript
   // ❌ Triggers layout recalculation & paint every frame
   gsap.to(el, { top: 100, left: 50, duration: 0.4 });

   // ✅ Hardware accelerated on compositor layer (60fps guaranteed)
   gsap.to(el, { y: 100, x: 50, duration: 0.4, ease: "power2.out" });
   ```
2. **Timeline Sequencing vs Delay Stacking**:
   Use `gsap.timeline()` for coordinating multi-element choreographies instead of guessing delays with `delay: 0.2, 0.4, 0.6`:
   ```javascript
   const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.6 } });
   tl.from('.hero-badge', { opacity: 0, y: -20 })
     .from('.hero-title', { opacity: 0, y: 30 }, '-=0.3')
     .from('.hero-cta',   { opacity: 0, scale: 0.95 }, '<0.2');
   ```

---

## 2. React 19 / SPA Integration with `@gsap/react`

In single-page applications (Next.js, Vite, React), animations must clean up when components unmount to avoid memory leaks and ghost ScrollTrigger listeners.

### The `useGSAP` Hook Protocol
```tsx
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export function AnimatedCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Selectors are automatically scoped to containerRef!
    gsap.from('.card-item', {
      opacity: 0,
      y: 40,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power2.out'
    });
  }, { scope: containerRef }); // Automatically reverts on unmount!

  return (
    <div ref={containerRef}>
      <div className="card-item">Item 1</div>
      <div className="card-item">Item 2</div>
    </div>
  );
}
```

---

## 3. ScrollTrigger Invariants

- **Refresh after DOM updates**: If dynamic content loads, call `ScrollTrigger.refresh()` to recalculate trigger trigger start/end positions.
- **Scrub & Pin Math**: When pinning elements, ensure the trigger wrapper has adequate height (`end: "+=1500"`) so the user can scroll smoothly through the scrubbed interpolation.
