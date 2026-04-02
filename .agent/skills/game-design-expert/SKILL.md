---
name: game-design-expert
description: Game Design, UX, and Flow State mastery. Replaces fragmented legacy skills. Core gameplay loop design, 3Cs (Character, Camera, Controls), input buffering, coyote time, juice (game feel), telemetry tracking, narrative alignment, and audio spatialization integration. Use when crafting player experience, progression arcs, or systemic balance.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Game Design Expert — Player Experience & Flow Mastery

> A game is not a list of features. It is a psychological loop.
> Perfect code evaluating a boring gameplay loop is a failed product.

---

## 1. The 3Cs (Character, Camera, Controls)

Before designing enemies, levels, or UI, the foundation of the player's interaction MUST feel flawless. If the player cannot intrinsically trust the controls, the entire system collapses.

### Input Buffering
Humans cannot click buttons flawlessly on the exact required frame.
If a player presses "Jump" 3 frames *before* they hit the ground, a naïve engine ignores it. A designed engine *buffers* the input in memory for 150ms and instantly executes the jump the millisecond the character's feet touch the dirt.

### Coyote Time
Named after Wile E. Coyote hovering off a cliff.
If a player runs off a ledge, a rigid physics engine drops them instantly.
A forgiving design allows the player to still press 'Jump' for exactly ~100ms *after* walking off the ledge. It prevents extreme frustration on close platforming jumps.

---

## 2. The Core Gameplay Loop

Every action a player takes must feed into a reinforcing psychological loop. 

**The Macro Loop (e.g., Destiny, Monster Hunter)**
1. **Action:** Fight complex monsters.
2. **Reward:** Collect physical parts and resources.
3. **Pacing:** Return to base.
4. **Upgrade:** Convert parts into stronger weapons.
5. **Goal:** Fight stronger, unkillable monsters (Back to Step 1).

*If step 4 (Upgrading) does not heavily alter step 1 (Fights are now faster, visually different, mechanically superior), the loop is broken and players churn.*

---

## 3. "Juice" and Game Feel 

"Juice" is the non-functional audiovisual feedback that makes an interaction feel heavy and satisfying.

1. **Screen Shake:** A minor, mathematically decaying camera displacement when heavy impacts occur. (Needs toggles for accessibility).
2. **Hitstop (Sleep Frames):** When a sword hits an enemy, freeze the entire game engine for exactly 3 frames (50ms). This creates an immense perceptual illusion of resistance and friction.
3. **Squash and Stretch:** A character jumping should stretch vertically. A character landing should squash horizontally. It breaks rigidity and infuses life.
4. **Particle Explosions:** Simple box collisions must be masked by explosive localized particle systems (dust kicks, sparks).

---

## 4. Narrative & Audio Synergies

Game design is not segregated from Audio. Audio is the primary vector for temporal feedback.

1. **Spatialization (HRTF):** Sound objects emit audio localized strictly to 3D space, heavily attenuated by environmental occlusions (muffled behind walls).
2. **Telegraphing State:** If an enemy swings a heavy axe, it MUST have a 300ms audio "wind-up" queue. The player relies on audio rhythm far faster than visual recognition to dodge.
3. **Dynamic Mixing (Ducking):** Essential dialogue or UI pings must automatically compress (lower the volume of) ambient music underneath to prevent cognitive overload.

---

## 5. Telemetry & Analytics Deficiencies

Design is hypotheses. Playtests are the reality.

Never rely on developers "feeling" the game. You must systematically log death coordinates (heatmaps). If 80% of players die at Level 2 Trap B, your design intent (teaching the mechanic) has failed. 

---

## 🤖 LLM-Specific Traps (Game Design)

1. **Ignoring Input Buffers:** The AI writes raw `if (Input.GetKeyDown() && isGrounded)` logic. This creates notoriously stiff, frustrating, and unresponsive controls.
2. **Feature Soup:** A user asks for game ideas, and the AI suggests a survival crafting multiplayer battle-royale with RPG skill trees. This is un-shippable scope creep. Force brutal constraint down to one core mechanic.
3. **Rigid Math Realism:** Dictating jump metrics strictly conforming to 9.8m/s² real-world gravity. Mario falls 3x faster than he jumps. Realism destroys game feel.
4. **Punishing Precision:** Missing Coyote Time implementations entirely, punishing the player for 10-millisecond execution errors rather than rewarding the intent.
5. **No Telegraphing:** AI designs boss attack patterns that instantly execute damage vectors simultaneously with the animation frame, making the attack literally impossible for a human reaction-time algorithm (200ms) to evade.
6. **The Linear Number Grind:** Proposing "Upgrades" that solely increment numbers (`+5% damage`) instead of altering the fundamental mechanical verbs (`Sword now shoots fireballs horizontally`). Number grinds fail retention tests.
7. **Dead UI Feedback:** Proposing UI UIs that simply flip variables to green, entirely omitting the requirement for scaling twin-interpolated bouncy animations that provide satisfying interaction juice.
8. **Constant Intensity Tiring:** Failing to design Pacing. Recommending non-stop constant action loops without enforcing quiet, ambient "Return to Base" reset periods. The human brain numbs to constant intensity within 20 minutes.
9. **Sound Sourcing Fallacies:** Treating Audio as a global 2D `Play()` function instead of enforcing 3D positional transforms anchored to the exact entity creating the disruption.
10. **The Wall of Text:** AI proposes delivering lore via explicit text-box dumps at the start of a level, rather than environmental design (blood stains leading to a locked door). Show, do not dump text.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are critical player actions protected significantly via Input Buffering and Coyote Time tolerances?
✅ Does the 'Juice' architecture implement Hitstop, Screen Shake, and impact framing safely?
✅ Are enemy damage sequences heavily telegraphed visually and auditorily BEFORE execution?
✅ Is the gameplay loop tightly bound (Action -> Reward -> Meaningful Upgrade -> Action)?
✅ Has scope creep been aggressively slashed to favor extreme polishing of the single Core Loop?
✅ Is gravity manipulated artificially (custom fast-fall modifiers) to improve character weight mechanics?
✅ Have rewards been mapped to change mechanical player verbs, rather than simple stat additions?
✅ Does the pacing explicitly enforce quiet, non-lethal downtime intervals?
✅ Is audio spatialized explicitly to the 3D entity geometry rather than firing globally?
✅ Are narrative/tutorial deliveries handled environmentally or organically instead of monolithic text walls?
```
