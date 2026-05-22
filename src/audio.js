class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  playRoll() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Play 4 small rolling impacts over 300ms
    for (let i = 0; i < 4; i++) {
      const time = now + i * 0.08 + Math.random() * 0.03;
      this._playImpact(time);
    }
  }

  _playImpact(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Noise-like frequency sweep for rolling die impact
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 80, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.08);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.02, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.085);
  }

  playClick() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.035);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playScore() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Play double major-third chime
    this._playChime(523.25, now, 0.15); // C5
    this._playChime(659.25, now + 0.08, 0.18); // E5
  }

  _playChime(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.002, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  playGameOver() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Happy fanfare (C4 - E4 - G4 - C5 chord progression)
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      this._playChime(freq, now + idx * 0.12, 0.35);
    });
  }
}

export const audio = new AudioEngine();
