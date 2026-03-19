---
name: mobile-design
description: Mobile-first and Spatial computing design thinking for iOS, Android, Foldables, and WebXR. Touch interaction, advanced haptics, on-device AI patterns, performance extremis. Teaches principles, not fixed values.
allowed-tools: Read, Glob, Grep, Bash
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Mobile & Spatial Design System (Pro-Max Level)

> **Philosophy:** Touch-first. Battery-conscious. Platform-respectful. Contextually aware.
> **Core Principle:** Mobile is NOT a small desktop. It is a sensor-rich, context-aware extension of the user. THINK constraints, EXPECT hardware diversity.

---

## 🔧 Runtime Scripts

**Execute these for validation (don't read, just run):**

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/mobile_audit.py` | Mobile UX & Touch Audit | `python scripts/mobile_audit.py <project_path>` |

---

## 🔴 MANDATORY: Read Reference Files Before Working!

**⛔ DO NOT start development until you read the relevant files:**

### Universal (Always Read)

| File | Content | Status |
|------|---------|--------|
| **[mobile-design-thinking.md](mobile-design-thinking.md)** | **⚠️ ANTI-MEMORIZATION: Forces thinking, prevents AI defaults** | **⬜ CRITICAL FIRST** |
| **[spatial-and-foldables.md](spatial-and-foldables.md)** | **Foldable screens, WebXR, dynamic viewports** | **⬜ CRITICAL** |
| **[on-device-ai.md](on-device-ai.md)** | **Streaming UI, local models, zero-wait states** | **⬜ CRITICAL** |
| **[touch-psychology.md](touch-psychology.md)** | **Advanced haptics, Fitts' Law, magnetic touch targets** | **⬜ CRITICAL** |
| **[mobile-performance.md](mobile-performance.md)** | **React Native/Flutter rendering at 120Hz** | **⬜ CRITICAL** |
| [mobile-navigation.md](mobile-navigation.md) | Tab/Stack/Drawer, deep linking, spatial z-axis nav | ⬜ Read |
| [decision-trees.md](decision-trees.md) | Framework/state/storage selection | ⬜ Read |

> 🧠 **mobile-design-thinking.md is PRIORITY!** This file ensures AI thinks instead of using memorized patterns.

---

## ⚠️ CRITICAL: ASK BEFORE ASSUMING (MANDATORY)

> **STOP! If the user's request is open-ended, DO NOT default to your favorites.**

### You MUST Ask If Not Specified:

| Aspect | Ask | Why |
|--------|-----|-----|
| **Form Factor** | "Standard mobile only, or support for Foldables/Tablets?" | Affects fluid layout geometry |
| **Performance** | "Is this targeting 60Hz or 120Hz ProMotion displays?" | Determines animation physics |
| **AI Integration**| "Are we streaming LLM responses to the UI?" | Defines loading vs streaming patterns |
| **Platform** | "iOS, Android, Spatial (VisionOS/WebXR), or cross-platform?" | Affects EVERY design decision |

### ⛔ AI MOBILE ANTI-PATTERNS (YASAK LİSTESİ)

> 🚫 **These are AI default tendencies that MUST be avoided!**

#### Performance & Display Sins
| ❌ NEVER DO | Why It's Wrong | ✅ ALWAYS DO |
|-------------|----------------|--------------|
| **Pure White Backgrounds** | Blinds users at night, drains battery | OLED True Black (`#000`) or off-white (`#FAFAFA`) |
| **Linear Animations** | Feels robotic and cheap | Spring physics (`stiffness`, `damping`) |
| **ScrollView for long lists** | Renders ALL items, memory explodes | Use `FlashList` / `ListView.builder` / Virtualization |
| **console.log in production** | Blocks JS thread severely | Remove before release build |

#### Touch & UX Sins
| ❌ NEVER DO | Why It's Wrong | ✅ ALWAYS DO |
|-------------|----------------|--------------|
| **Touch target < 48px** | Frustrating, violates modern Fitts' Law | Min 48px (iOS/Android), mathematically enforced |
| **Silent Interactions** | Breaks the illusion of tactility | Bind visual state changes to Advanced Haptic Feedback |
| **Blocking Spinners for AI** | "Thinking..." spinners cause abandonment | Stream skeleton → partial text → layout |
| **Gesture-only interactions** | Motor impaired users excluded | Always provide button alternative |

---

## 📱 Hardware & Context Adaptation

### 1. The Foldable & Dynamic Screen Era
Phones fold. Tablets resize. UIs must be perfectly fluid, not reliant on fixed breakpoints.
- **TwoPane Layouts:** List-Detail views that dynamically collapse into single stacks.
- **Hinge Awareness:** Do not place critical interactive elements across the physical hinge of a foldable device.

### 2. Advanced Haptics (Tactile UI)
Visuals are only half the UI. Mobile relies on touch.
- Bind `Haptics.impactAsync('light')` to micro-interactions (e.g., toggling a switch).
- Bind `Haptics.notificationAsync('success')` to state completions.
- *Never* overuse haptics. They must mean something.

### 3. Spatial Z-Axis & Depth
Modern OSs (iOS 18+, Android 15+) heavily utilize depth and blur.
- Utilize native `BlurView` or `VisualEffectView` materials for absolutely positioned overlays (tab bars, headers).
- Shadows must have multi-layered dispersion, not harsh CSS `box-shadow` single drops.

---

## 🧠 Mobile Extreme UX Psychology

### Fitts' Law for Touch & Magnetic Targets
Touch screens are wildly imprecise. 
- Touch targets MUST be >48px minimum.
- Important actions map to the THUMB ZONE (bottom arc).
- **Magnetic Padding:** Visual size can be small (24px icon), but the *hitbox* padding must expand to 48px.

### On-Device AI UX Patterns
- **Zero-Wait Illusion:** When a model is running, immediately populate the UI with contextual guesses or streaming tokens.
- **Progressive Disclosure of Confidence:** If AI confidence is low, the UI should reflect uncertainty visually (softer colors, explicit confirmation required).

---

## ⚡ Performance Extremis (Quick Reference)

### 120Hz Animation Mandate
If your animation drops below 120fps on modern hardware, it's failed.
- GPU-accelerated ONLY: `transform` (translate, scale, rotate) and `opacity`.
- CPU-bound AVOID: `width`, `height`, `margin`, `top/left/bottom/right`.
- React Native: MUST use Reanimated 3+ worklets for all motion; `Animated` API is legacy.

### React Native Critical Rules
```typescript
// ✅ CORRECT: FlashList for extreme performance
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={100} // CRITICAL for FlashList
  keyExtractor={(item) => item.id}
/>
```

---

## 📝 CHECKPOINT (MANDATORY Before Any Mobile Work)

> **Before writing ANY mobile code, you MUST complete this checkpoint:**

```
🧠 CHECKPOINT:

Platform target:   [ iOS / Android / Foldable / Spatial ]
Hardware expectation:[ 60Hz / 120Hz ]
Haptic Strategy:   [ Define trigger points ]

3 Extreme Principles I Will Apply:
1. _______________
2. _______________
3. _______________
```

> **Remember:** You are designing for a piece of glass that people stare at for 6 hours a day. Battery life, touch precision, and 120Hz fluidity are not optional features; they are the medium itself.

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Mobile Design Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
