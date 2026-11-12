// Fully synthesised soundscape — no audio files.
// Wind (filtered pink noise + slow LFOs), campfire crackle, ambient pad,
// pentatonic chimes and game cues.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [62, 64, 66, 69, 71];            // D major pentatonic
const CHORDS = [
  [38, 45, 50, 54, 57, 64],                    // D  (add9)
  [35, 42, 47, 50, 54, 61],                    // Bm (add9)
  [31, 38, 43, 47, 50, 57],                    // G  (add9)
  [33, 40, 45, 49, 52, 59],                    // A  (add9)
];

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.intensity = 0.5;
    this.fire = 0.5;
    this.day = 0;
    this._chord = 0;
    this._timers = [];
  }

  get ready() { return !!this.ctx; }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(4.2, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);

    this._buildWind();
    this._buildFire();
    this._buildPad();
    this._applyVolume(2.5);
    this._loopChime();
    this._loopChord();
    this._loopCrackle();
    this._loopBirds();
    this.resume();
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }

  setVolume(v) { this.volume = Math.min(1, Math.max(0, v)); this._applyVolume(0.06); }
  setMuted(m) { this.muted = !!m; this._applyVolume(0.12); }
  _applyVolume(tc) {
    if (!this.ctx) return;
    const target = this.muted ? 0 : this.volume * this.volume * 0.9;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, tc);
  }

  /** 0..1 — follows the aurora; opens the pad filter and quickens the chimes. */
  setIntensity(x) {
    x = Math.min(1, Math.max(0, x));
    if (Math.abs(x - this.intensity) < 0.01) return;
    this.intensity = x;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(380 + x * 2100, t, 1.2);
    this.padGain.gain.setTargetAtTime(0.42 + x * 0.3, t, 1.5);
    this.shimmerGain.gain.setTargetAtTime(0.004 + x * 0.03, t, 1.5);
  }

  /* ----- building blocks ----- */
  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  _pinkNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      // crossfade the tail into the head so the loop is seamless
      const fade = Math.floor(ctx.sampleRate * 0.5);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        d[i] = d[i] * k + d[len - fade + i] * (1 - k);
      }
    }
    return buf;
  }

  _lfo(freq, depth, param) {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
    return o;
  }

  _buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    this.noise = this._pinkNoise(8);
    src.buffer = this.noise;
    src.loop = true;
    src.loopEnd = src.buffer.duration - 0.5;

    // body of the wind across the grassland
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.55;
    const g1 = ctx.createGain();
    g1.gain.value = 0.34;
    src.connect(bp).connect(g1).connect(this.master);
    this._lfo(0.057, 190, bp.frequency);
    this._lfo(0.031, 90, bp.frequency);
    this._lfo(0.11, 0.13, g1.gain);
    this._lfo(0.043, 0.10, g1.gain);

    // thin whistle through the fence
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 1500; hp.Q.value = 3.2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.03;
    src.connect(hp).connect(g2);
    g2.connect(this.master);
    g2.connect(this.reverb);
    this._lfo(0.037, 520, hp.frequency);
    this._lfo(0.071, 0.024, g2.gain);

    // low rumble
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 130;
    const g3 = ctx.createGain();
    g3.gain.value = 0.30;
    src.connect(lp).connect(g3).connect(this.master);
    this._lfo(0.05, 0.12, g3.gain);

    src.start();
  }

  /* ----- campfire: low roar + random crackles ----- */
  _buildFire() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.loopEnd = src.buffer.duration - 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.4;
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0.2 * this.fire;
    src.connect(lp).connect(this.fireGain).connect(this.master);
    this._lfo(0.9, 0.03, this.fireGain.gain);
    this._lfo(0.23, 40, lp.frequency);
    src.start(0, 3.1);
    this.crackleBus = ctx.createGain();
    this.crackleBus.gain.value = 0.9;
    this.crackleBus.connect(this.master);
  }

  /** 0..1 — how lively the campfire is. */
  setFire(level) {
    this.fire = Math.min(1, Math.max(0, level));
    if (!this.ctx) return;
    this.fireGain.gain.setTargetAtTime(0.06 + 0.26 * this.fire, this.ctx.currentTime, 0.4);
  }

  _crackle(when, vel) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const dur = 0.008 + Math.random() * 0.035;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 3600;
    bp.Q.value = 0.8 + Math.random() * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(bp).connect(g).connect(this.crackleBus);
    src.start(when, Math.random() * 6, dur + 0.02);
  }

  _loopCrackle() {
    const next = () => {
      const wait = (0.05 + Math.random() * 0.42) / (0.35 + this.fire);
      const id = setTimeout(() => {
        if (this.ctx && this.ctx.state === 'running' && !document.hidden) {
          const t = this.ctx.currentTime + 0.01;
          const n = Math.random() < 0.18 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            this._crackle(t + i * (0.02 + Math.random() * 0.05), (0.05 + Math.random() * 0.28) * (0.3 + this.fire));
          }
        }
        next();
      }, wait * 1000);
    };
    next();
  }

  /** One footfall in grass (or a splash when wading). */
  step(wet) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = wet ? 1700 + Math.random() * 900 : 420 + Math.random() * 260;
    f.Q.value = wet ? 0.7 : 0.9;
    const g = ctx.createGain();
    const dur = wet ? 0.22 : 0.11;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(wet ? 0.16 : 0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 6, dur + 0.03);
  }

  /** 0..1 — how close the stream is. */
  setStream(level) {
    if (!this.ctx) return;
    if (!this.streamGain) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      src.loopEnd = src.buffer.duration - 0.5;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.5;
      this.streamGain = ctx.createGain();
      this.streamGain.gain.value = 0;
      src.connect(bp).connect(this.streamGain).connect(this.master);
      this._lfo(0.31, 420, bp.frequency);
      this._lfo(1.7, 0.012, this.streamGain.gain);
      src.start(0, 5.2);
      this._stream = -1;
    }
    if (Math.abs(level - this._stream) < 0.02) return;
    this._stream = level;
    this.streamGain.gain.setTargetAtTime(0.11 * level * level, this.ctx.currentTime, 0.5);
  }

  /** 0 night .. 1 morning: birdsong comes in with the light. */
  setDay(d) { this.day = d; }

  _chirp(when, f0, f1, dur, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vel, when + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    o.start(when); o.stop(when + dur + 0.02);
  }

  _loopBirds() {
    const next = () => {
      const wait = 1.2 + Math.random() * 4.5;
      setTimeout(() => {
        if (this.ctx && this.ctx.state === 'running' && !document.hidden && this.day > 0.5) {
          const t = this.ctx.currentTime + 0.02;
          const base = 2300 + Math.random() * 2400;
          const n = 2 + Math.floor(Math.random() * 5);
          const up = Math.random() < 0.5;
          const vel = (0.012 + Math.random() * 0.02) * this.day;
          for (let i = 0; i < n; i++) {
            const f = base * (1 + (Math.random() - 0.5) * 0.25);
            this._chirp(t + i * (0.09 + Math.random() * 0.07), f, f * (up ? 1.35 : 0.72), 0.05 + Math.random() * 0.07, vel);
          }
        }
        next();
      }, wait * 1000);
    };
    next();
  }

  /** Throwing a log on: a soft whoosh and a flurry of pops. */
  stoke() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(240, t);
    bp.frequency.exponentialRampToValueAtTime(1300, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, 1.0, 1.3);
    for (let i = 0; i < 9; i++) this._crackle(t + 0.05 + Math.random() * 0.8, 0.15 + Math.random() * 0.35);
  }

  _buildPad() {
    const ctx = this.ctx;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 380 + this.intensity * 2100;
    this.padFilter.Q.value = 0.6;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.5;
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.master);
    this.padGain.connect(this.reverb);
    this._lfo(0.08, 0.08, this.padGain.gain);

    this.voices = CHORDS[0].map((m, i) => {
      const f = midi(m);
      const a = ctx.createOscillator();
      a.type = 'sine'; a.frequency.value = f; a.detune.value = -5;
      const b = ctx.createOscillator();
      b.type = 'triangle'; b.frequency.value = f; b.detune.value = 6;
      const g = ctx.createGain();
      g.gain.value = i < 2 ? 0.075 : 0.05;
      a.connect(g); b.connect(g);
      g.connect(this.padFilter);
      this._lfo(0.05 + i * 0.017, 0.018, g.gain);
      a.start(); b.start();
      return { a, b };
    });

    // airy shimmer that blooms with the aurora
    const sh = ctx.createOscillator();
    sh.type = 'sine'; sh.frequency.value = midi(86);
    const sh2 = ctx.createOscillator();
    sh2.type = 'sine'; sh2.frequency.value = midi(93); sh2.detune.value = 7;
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0.004;
    sh.connect(this.shimmerGain); sh2.connect(this.shimmerGain);
    this.shimmerGain.connect(this.reverb);
    this._lfo(0.13, 0.004, this.shimmerGain.gain);
    this.shimmer = [sh, sh2];
    sh.start(); sh2.start();
  }

  _loopChord() {
    const id = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this._chord = (this._chord + 1 + (Math.random() < 0.25 ? 1 : 0)) % CHORDS.length;
      const t = this.ctx.currentTime;
      CHORDS[this._chord].forEach((m, i) => {
        const f = midi(m);
        this.voices[i].a.frequency.setTargetAtTime(f, t, 2.2);
        this.voices[i].b.frequency.setTargetAtTime(f, t, 2.6);
      });
      const top = CHORDS[this._chord][5] + 24;
      this.shimmer[0].frequency.setTargetAtTime(midi(top), t, 3);
      this.shimmer[1].frequency.setTargetAtTime(midi(top + 7), t, 3);
    }, 22000);
    this._timers.push(id);
  }

  _loopChime() {
    const next = () => {
      const wait = (6.5 - 4.2 * this.intensity) * (0.55 + Math.random() * 0.9);
      const id = setTimeout(() => {
        if (this.ctx && this.ctx.state === 'running' && !document.hidden) {
          const oct = Math.random() < 0.35 + this.intensity * 0.4 ? 12 : 0;
          const i = Math.floor(Math.random() * PENTA.length);
          const t = this.ctx.currentTime + 0.05;
          this._bell(midi(PENTA[i] + oct), t, 0.05 + this.intensity * 0.03, 3.5);
          if (Math.random() < 0.3 + this.intensity * 0.3) {
            const j = (i + (Math.random() < 0.5 ? 2 : 3)) % PENTA.length;
            this._bell(midi(PENTA[j] + oct + (j < i ? 12 : 0)), t + 0.32 + Math.random() * 0.3, 0.04, 3.5);
          }
        }
        next();
      }, wait * 1000);
      this._timers.push(id);
    };
    next();
  }

  _bell(freq, when, vel, dur) {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vel, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    const o1 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = freq * 2.756;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.28, when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.35);
    const o3 = ctx.createOscillator();
    o3.type = 'sine'; o3.frequency.value = freq * 2.0;
    const g3 = ctx.createGain();
    g3.gain.value = 0.18;
    o1.connect(g);
    o2.connect(g2).connect(g);
    o3.connect(g3).connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    for (const o of [o1, o2, o3]) { o.start(when); o.stop(when + dur + 0.1); }
  }

  /* ----- game cues ----- */
  collect(combo) {
    if (!this.ctx) return;
    const step = Math.min(combo, 14);
    const note = PENTA[step % 5] + 12 * Math.floor(step / 5) + 12;
    this._bell(midi(note), this.ctx.currentTime + 0.01, 0.10, 1.6);
  }

  node(index) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const note = PENTA[index % 5] + 12 * (Math.floor(index / 5) % 2);
    this._bell(midi(note), t, 0.13, 2.8);
    this._bell(midi(note + 7), t + 0.07, 0.07, 2.4);
  }

  comboBurst(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const base = 74 + Math.min(level, 4) * 2;
    [0, 4, 7, 12].forEach((iv, i) => this._bell(midi(base + iv), t + i * 0.045, 0.075, 2.2));
  }

  complete() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    [62, 66, 69, 73, 76, 81, 86].forEach((m, i) => this._bell(midi(m), t + i * 0.11, 0.11, 4.2));
    // warm swell underneath
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = midi(38);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    o.start(t); o.stop(t + 4.7);
  }

  storm() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    [74, 78, 81, 85, 90].forEach((m, i) => this._bell(midi(m), t + i * 0.07, 0.085, 3.2));
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(midi(50), t);
    o.frequency.exponentialRampToValueAtTime(midi(62), t + 2.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.0);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    o.start(t); o.stop(t + 4.2);
  }

  wish() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    [86, 83, 81, 78, 74, 81, 86, 90].forEach((m, i) => this._bell(midi(m), t + i * 0.085, 0.09, 3.6));
  }

  meteor() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.01;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2400, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(g).connect(this.reverb);
    o.start(t); o.stop(t + 1.1);
  }
}
