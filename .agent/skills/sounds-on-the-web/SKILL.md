---
name: sounds-on-the-web
description: Web Audio API procedural sound synthesis for tactile micro-interaction feedback (clicks, pops, success chimes) with mute toggles and accessibility awareness.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - delight
  - micro-interaction
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Sounds on the Web — Web Audio API Sound Feedback

---

## Mandatory Pre-Flight Context Inspection

Before implementing web audio feedback, you MUST inspect:

1. Autoplay Policy Rules (Section 78) → Initialize `AudioContext` strictly after/inside user gesture interaction handlers
2. Gain Volume Caps → Keep gain volume subtle ($\le 0.15$ max gain) to prevent user auditory discomfort
3. Mute Preference Toggle (Section 66) → Provide a persistent sound mute option in settings or local storage

Synthesize lightweight, zero-dependency tactile sound effects for web micro-interactions.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Web Audio API procedural sound synthesis for tactile micro-interaction feedback (clicks, pops, success chimes) with mute toggles and accessibility awareness..
- **DO NOT activate when:** The task falls strictly outside sounds-on-the-web domain or belongs to a different dedicated specialist.

---

## Zero-Asset Web Audio API Click Synthesizer

Never load external MP3 audio files for simple UI clicks. Synthesize clean sine/triangle pops procedurally in under 10 lines of code:

```typescript
// Lightweight procedural Web Audio pop synthesizer
class SoundFeedback {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  public playPop(frequency = 600, duration = 0.04) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    // Frequency pitch drop for tactile "pop"
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime); // Low volume
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }
}

export const soundFX = new SoundFeedback();
```

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
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
