---
name: sounds-on-the-web
description: Web Audio API procedural sound synthesis for tactile micro-interaction feedback (clicks, pops, success chimes) with mute toggles and accessibility awareness.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Audio Feedback & Tactile Sound Synthesis
  tier: pro
  co-requires: [delight, micro-interaction]
  trigger-signals:
    strong: [sounds-on-the-web, Web Audio API sound, UI sound feedback, procedural audio click, audio feedback toggle]
    weak: [ui sound, audio click]
---

# Sounds on the Web — Web Audio API Sound Feedback

Synthesize lightweight, zero-dependency tactile sound effects for web micro-interactions.

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

## 🤖 LLM-Specific Traps

1. **Autoplay Audio Errors**: Triggering Web Audio API before user gesture interaction (violating browser autoplay policies).
2. **Missing Mute Toggle**: Failing to provide a persistent sound toggle switch in application settings.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is AudioContext initialized strictly inside/after user gesture handlers?
✅ Is volume gain kept subtle ($\le 0.15$ max volume)?
✅ Is a persistent sound mute option provided?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
