// Fully synthesised soundscape — no audio files.
// Wind (filtered pink noise + slow LFOs), campfire crackle, ambient pad,
// pentatonic chimes and game cues. Short sounds are placed left or right and nearer
// or farther (dry level against reverb), so the valley has some depth to it.

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
    // nothing useful lives below ~35 Hz: it only eats headroom and makes small speakers flap
    const sub = ctx.createBiquadFilter();
    sub.type = 'highpass'; sub.frequency.value = 35; sub.Q.value = 0.7;
    this.master.connect(sub).connect(comp).connect(ctx.destination);

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

  /** route a node to the mix at a place in the stereo field; `far` 0..1 trades dry level for reverb */
  _place(node, pan = 0, far = 0) {
    let out = node;
    if (this.ctx.createStereoPanner) {
      out = this.ctx.createStereoPanner();
      out.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(out);
    }
    const dry = this.ctx.createGain(), wet = this.ctx.createGain();
    dry.gain.value = 1 - 0.75 * far;
    wet.gain.value = 0.35 + 0.65 * far;
    out.connect(dry).connect(this.master);
    out.connect(wet).connect(this.reverb);
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
    g3.gain.value = 0.17;
    src.connect(lp).connect(g3).connect(this.master);
    this._lfo(0.05, 0.07, g3.gain);

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
    this.fireGain.gain.setTargetAtTime(0.05 + 0.20 * this.fire, this.ctx.currentTime, 0.4);
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

  /** One footfall in grass (or a splash when wading): a soft thud, then the swish of the blades. */
  step(wet) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    this._foot = -(this._foot || 1);                       // left, right, left…
    const bus = ctx.createGain();
    bus.gain.value = 0.8 + Math.random() * 0.4;            // no two steps quite alike
    this._place(bus, this._foot * 0.16, 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = wet ? 1700 + Math.random() * 900 : 380 + Math.random() * 340;
    f.Q.value = wet ? 0.7 : 0.9;
    const g = ctx.createGain();
    const dur = wet ? 0.22 : 0.10 + Math.random() * 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(wet ? 0.16 : 0.10, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 6, dur + 0.03);
    // weight coming down on turf
    const thud = ctx.createBufferSource();
    thud.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = wet ? 300 : 150 + Math.random() * 40;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(wet ? 0.10 : 0.16, t + 0.008);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    thud.connect(lp).connect(tg).connect(bus);
    thud.start(t, Math.random() * 6, 0.1);
  }

  /** A page turned: a dry papery swish that rises and falls, with a faint flick at the end. */
  page() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(2400, t);
    f.frequency.linearRampToValueAtTime(4200 + Math.random() * 800, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.012, t + 0.24);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.29);        // the edge flicks over
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    this._place(g, 0.1, 0);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 6, 0.42);
  }

  /**
   * The corgi, glad to see you: one or two soft "boof"s (a voiced pulse that drops in pitch,
   * through a mouth-like formant, with a breathy edge), then a few quick pants.
   * pan: -1..1 where it is; near: 0..1 how close.
   */
  bark(pan = 0, near = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t0 = ctx.currentTime + 0.02;
    const bus = ctx.createGain();
    bus.gain.value = 0.35 + 0.65 * near;
    this._place(bus, pan * 0.6, 0.12);
    const barks = Math.random() < 0.6 ? 2 : 1;
    for (let b = 0; b < barks; b++) {
      const t = t0 + b * (0.24 + Math.random() * 0.06);
      const f0 = 430 + Math.random() * 60 - b * 30;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 0.82, t);
      o.frequency.linearRampToValueAtTime(f0, t + 0.025);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.13);
      const form = ctx.createBiquadFilter();
      form.type = 'bandpass'; form.Q.value = 2.2;
      form.frequency.setValueAtTime(1100, t);
      form.frequency.linearRampToValueAtTime(760, t + 0.13);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(form).connect(lp).connect(g).connect(bus);
      o.start(t); o.stop(t + 0.2);
      // the breath behind it
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 1500; nf.Q.value = 0.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.035, t + 0.012);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
      n.connect(nf).connect(ng).connect(bus);
      n.start(t, Math.random() * 6, 0.12);
    }
    // a happy pant: short huffs of breath, in and out
    const tp = t0 + barks * 0.28 + 0.15;
    for (let i = 0; i < 6; i++) {
      const t = tp + i * 0.16;
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = i % 2 ? 1900 : 1400; f.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.022 * (1 - i * 0.1), t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      n.connect(f).connect(g).connect(bus);
      n.start(t, Math.random() * 6, 0.13);
    }
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
      // underneath the riffle, the lower voice of water turning over stones
      const low = ctx.createBufferSource();
      low.buffer = this.noise;
      low.loop = true;
      low.loopEnd = low.buffer.duration - 0.5;
      const gb = ctx.createBiquadFilter();
      gb.type = 'bandpass'; gb.frequency.value = 620; gb.Q.value = 1.6;
      this.gurgleGain = ctx.createGain();
      this.gurgleGain.gain.value = 0;
      low.connect(gb).connect(this.gurgleGain).connect(this.master);
      this._lfo(2.3, 170, gb.frequency);
      this._lfo(3.7, 110, gb.frequency);
      this._lfo(0.9, 0.006, this.gurgleGain.gain);
      low.start(0, 1.7);
      this._stream = -1;
    }
    if (Math.abs(level - this._stream) < 0.02) return;
    this._stream = level;
    this.streamGain.gain.setTargetAtTime(0.16 * level * level, this.ctx.currentTime, 0.5);
    this.gurgleGain.gain.setTargetAtTime(0.12 * level * level * level, this.ctx.currentTime, 0.5);   // only heard close to the bank
  }

  /** 0 night .. 1 morning: birdsong comes in with the light. */
  setDay(d) { this.day = d; }

  _chirp(when, f0, f1, dur, vel, out, vib = 0) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    if (vib > 0) {                                   // a warble inside the note
      const l = ctx.createOscillator();
      l.frequency.value = 22 + Math.random() * 14;
      const lg = ctx.createGain();
      lg.gain.value = f0 * vib;
      l.connect(lg).connect(o.frequency);
      l.start(when); l.stop(when + dur + 0.02);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vel, when + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(out);
    o.start(when); o.stop(when + dur + 0.02);
  }

  /** One bird, one phrase. Each kind has its own shape so the morning is not one call on repeat. */
  _birdPhrase(t, kind, pan, far, gain) {
    const out = this.ctx.createGain();
    out.gain.value = gain;
    this._place(out, pan, far);
    const r = Math.random;
    if (kind === 0) {                                // twitter: a handful of quick, uneven notes
      const base = 2500 + r() * 2200, up = r() < 0.5, n = 2 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const f = base * (1 + (r() - 0.5) * 0.25);
        this._chirp(t + i * (0.09 + r() * 0.07), f, f * (up ? 1.35 : 0.72), 0.05 + r() * 0.07, 1, out);
      }
    } else if (kind === 1) {                         // two falling notes, said twice or three times
      const f = 1900 + r() * 700, n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        this._chirp(t + i * 0.52, f, f * 0.97, 0.16, 0.9, out);
        this._chirp(t + i * 0.52 + 0.20, f * 0.79, f * 0.76, 0.20, 0.8, out);
      }
    } else if (kind === 2) {                         // a dry trill climbing a little
      const f = 3200 + r() * 1500, n = 8 + Math.floor(r() * 9), gap = 0.045 + r() * 0.02;
      for (let i = 0; i < n; i++) this._chirp(t + i * gap, f * (1 + i * 0.012), f * (1.06 + i * 0.012), 0.03, 0.7 * Math.sin(Math.PI * (i + 0.5) / n) + 0.3, out);
    } else {                                         // a slow, slurred whistle with a warble in it
      const f = 1500 + r() * 900;
      this._chirp(t, f, f * 1.28, 0.26, 0.9, out, 0.012);
      this._chirp(t + 0.30, f * 1.25, f * 0.92, 0.34, 0.8, out, 0.018);
      if (r() < 0.5) this._chirp(t + 0.72, f * 0.95, f * 1.10, 0.18, 0.6, out, 0.01);
    }
  }

  _loopBirds() {
    const next = () => {
      const wait = 1.0 + Math.random() * 4.2;
      setTimeout(() => {
        if (this.ctx && this.ctx.state === 'running' && !document.hidden && this.day > 0.5) {
          const t = this.ctx.currentTime + 0.02;
          const far = Math.random() < 0.6 ? 0.55 + Math.random() * 0.45 : Math.random() * 0.3;
          const kind = Math.floor(Math.random() * 4);
          const vel = (0.022 + Math.random() * 0.026) * this.day * (1 - 0.6 * far);
          const pan = (Math.random() * 2 - 1) * 0.85;
          this._birdPhrase(t, kind, pan, far, vel);
          // now and then another of the same kind answers from somewhere else
          if (Math.random() < 0.28) this._birdPhrase(t + 0.9 + Math.random() * 1.2, kind, -pan * (0.4 + Math.random() * 0.6), Math.min(1, far + 0.3), vel * 0.6);
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
      g.gain.value = i < 2 ? 0.045 : 0.05;                 // the two bass notes sit back; they were most of the mix
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
    this._place(g, (Math.random() * 2 - 1) * 0.5, 0.2);
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
