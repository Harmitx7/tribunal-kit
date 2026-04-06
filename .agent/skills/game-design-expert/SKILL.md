---
name: game-design-expert
description: Game Design, UX, and Flow State mastery. Replaces fragmented legacy skills. Core gameplay loop design, 3Cs (Character, Camera, Controls), input buffering, coyote time, juice (game feel), telemetry tracking, narrative alignment, and audio spatialization integration. Use when crafting player experience, progression arcs, or systemic balance.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Game Design Expert — Player Experience & Flow Mastery

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
