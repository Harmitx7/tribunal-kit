---
name: sounds-on-the-web
description: "Use when Web Audio API procedural sound synthesis for tactile micro-interaction feedback (clicks, pops, success chimes) with mute toggles and accessibility awareness."
version: 5.0.0
last-updated: 2026-09-13
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

## 🛠️ Technical Architecture & Reference Recipes

---

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
