// src/systems/AudioManager.js
// Web Audio API tone synthesizer — zero audio files needed, works 100% offline

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lastRevTime = 0;
    this.bgmPlaying = false;
    this.bgmStep = 0;
    this.nextNoteTime = 0;
    this.bgmTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playRev() {
    if (this.isMuted || !this.ctx) return;
    const now = Date.now();
    if (now - this.lastRevTime < 180) return; // Throttle revs
    this.lastRevTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(45, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {
      // Audio fallback
    }
  }

  playShoot() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {}
  }

  playBounce() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  playExplosion() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';

      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    } catch (e) {}
  }

  playMineDrop() {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.13);
    } catch (e) {}
  }

  playFanfare() {
    this.playVictory();
  }

  playVictory() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';

        const t = this.ctx.currentTime + (idx * 0.12);
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch (e) {}
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [392.00, 349.23, 311.13, 261.63]; // Descending
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        const t = this.ctx.currentTime + (idx * 0.16);
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch (e) {}
  }

  // --- Continuous Chiptune Background Music (BGM) ---

  startBGM() {
    if (this.bgmPlaying || this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerLoop();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  schedulerLoop() {
    if (!this.bgmPlaying || !this.ctx) return;

    // Lookahead scheduling window (0.12s) for rock-solid zero-jitter timing
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.playBGMStep(this.nextNoteTime, this.bgmStep);
      this.nextNoteTime += 0.22; // 8th note duration (~136 BPM upbeat arcade tempo)
      this.bgmStep = (this.bgmStep + 1) % 32;
    }

    this.bgmTimer = setTimeout(() => this.schedulerLoop(), 40);
  }

  playBGMStep(time, step) {
    if (this.isMuted || !this.ctx) return;

    // 32-step upbeat walking arcade bassline (triangle wave)
    const bassNotes = [
      65.41, 0, 65.41, 82.41, 98.00, 0, 82.41, 73.42,      // Bar 1: C - C E G - E D
      87.31, 0, 87.31, 110.00, 130.81, 0, 110.00, 98.00,  // Bar 2: F - F A C - A G
      98.00, 0, 98.00, 123.47, 146.83, 0, 123.47, 110.00, // Bar 3: G - G B D - B A
      65.41, 0, 98.00, 0, 130.81, 0, 65.41, 0              // Bar 4: C - G - C - C -
    ];

    // 32-step cheerful chiptune lead melody (square wave with soft decay)
    const melodyNotes = [
      261.63, 0, 329.63, 392.00, 523.25, 493.88, 392.00, 0,   // C E G C5 B G
      440.00, 0, 392.00, 329.63, 349.23, 329.63, 293.66, 0,   // A G E F E D
      392.00, 0, 440.00, 523.25, 587.33, 523.25, 440.00, 0,   // G A C5 D5 C5 A
      523.25, 0, 392.00, 0, 329.63, 0, 261.63, 0               // C5 - G - E - C -
    ];

    const bassFreq = bassNotes[step];
    if (bassFreq > 0) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassFreq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.19);
      } catch (e) {}
    }

    const melodyFreq = melodyNotes[step];
    if (melodyFreq > 0) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(melodyFreq, time);
        gain.gain.setValueAtTime(0.022, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.17);
      } catch (e) {}
    }
  }
}

export const audio = new AudioManager();
