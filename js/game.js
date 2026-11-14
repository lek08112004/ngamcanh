// "Chasing Stardust & Weaving Constellations" — the stargazing activity of the camp.
// Guide a firefly: gather stardust, touch the stars of a real constellation to weave it.
// Nothing can be lost; everything you weave stays in your sky.
import * as THREE from 'three';
import { glowVertex, glowFragment } from './shaders/post.js';
import { store } from './store.js';

const R = 400;                 // radius of the interaction shell around the camera
const MAX_POINTS = 1600;
const MAX_LINE_VERTS = 512;
const DEG = Math.PI / 180;
const MAX_CHARGE = 9;
const COMBO_WINDOW = 4.5;

// Star positions: [right ascension (hours), declination (degrees)]
export const CONSTELLATIONS = [
  {
    id: 'uma', name: 'Bắc Đẩu', latin: 'Ursa Major',
    legend: 'Bảy ngôi sao hình chiếc gáo. Hai sao ở miệng gáo chỉ thẳng về sao Bắc Cực.',
    stars: [[11.062, 61.75], [11.031, 56.38], [11.897, 53.69], [12.257, 57.03], [12.900, 55.96], [13.399, 54.93], [13.792, 49.31]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: 'cas', name: 'Thiên Hậu', latin: 'Cassiopeia',
    legend: 'Chữ W nằm đối diện Bắc Đẩu qua sao Bắc Cực, mang tên một nữ hoàng trong thần thoại Hy Lạp.',
    stars: [[0.153, 59.15], [0.675, 56.54], [0.945, 60.72], [1.430, 60.24], [1.907, 63.67]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: 'ori', name: 'Lạp Hộ', latin: 'Orion',
    legend: 'Chàng thợ săn với ba ngôi sao thắt lưng thẳng hàng, Betelgeuse đỏ cam trên vai và Rigel xanh trắng dưới chân.',
    stars: [[5.919, 7.41], [5.419, 6.35], [5.679, -1.94], [5.604, -1.20], [5.533, -0.30], [5.796, -9.67], [5.242, -8.20]],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]],
  },
  {
    id: 'cyg', name: 'Thiên Nga', latin: 'Cygnus',
    legend: 'Cánh chim bay dọc dải Ngân Hà, còn gọi là Thập tự phương Bắc. Deneb là ngôi sao ở đuôi.',
    stars: [[20.690, 45.28], [20.370, 40.26], [19.512, 27.96], [20.770, 33.97], [19.750, 45.13]],
    edges: [[0, 1], [1, 2], [1, 3], [1, 4]],
  },
  {
    id: 'lyr', name: 'Thiên Cầm', latin: 'Lyra',
    legend: 'Cây đàn lia nhỏ xíu với Vega, một trong những ngôi sao sáng nhất bầu trời phương Bắc.',
    stars: [[18.616, 38.78], [18.746, 37.61], [18.835, 33.36], [18.982, 32.69], [18.908, 36.90]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]],
  },
  {
    id: 'leo', name: 'Sư Tử', latin: 'Leo',
    legend: 'Chiếc lưỡi liềm ngược là bờm sư tử, còn Regulus nằm ngay ở trái tim.',
    stars: [[10.139, 11.97], [10.122, 16.76], [10.333, 19.84], [10.278, 23.42], [9.879, 26.01], [9.764, 23.77], [11.235, 20.52], [11.818, 14.57], [11.237, 15.43]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 0], [6, 8]],
  },
  {
    id: 'sco', name: 'Thiên Yết', latin: 'Scorpius',
    legend: 'Antares đỏ rực là trái tim bọ cạp, chiếc đuôi cong móc về phía tâm Ngân Hà.',
    stars: [[16.091, -19.81], [16.006, -22.62], [15.981, -26.11], [16.490, -26.43], [16.836, -34.29], [16.864, -38.05], [17.622, -43.00], [17.560, -37.10]],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
];

// The order the sky is woven in, simplest first: a five-star chain, then the shapes with a
// loop, then the big ones with many branches. CONSTELLATIONS keeps its own order (the labels
// and the journal use it); only the game walks this list.
export const WEAVE_ORDER = ['cas', 'cyg', 'lyr', 'uma', 'sco', 'ori', 'leo'];
// What each step up takes away. `stage` counts every constellation woven in the game, across
// visits (saved), so the difficulty climbs with you and not with the session:
//   0-1  faint guide lines show the whole figure, the next good star glows gold
//   2-3  no guide lines: you must know the shape (the gold hint stays)
//   3+   a weave tolerates a few wrong strokes (a star not joined to one already lit); one
//        too many and the threads come loose and the figure must be begun again
//   4+   no gold hint
//   5+   dawn is coming: finish before the sky pales for the full bonus
//   7+   (second round of the sky) unlit stars only show near the firefly; fewer slips allowed
export function weaveRules(stage) {
  return {
    guides: stage < 2,
    beckon: stage < 4,
    slips: stage < 3 ? Infinity : stage < 7 ? 3 : 2,
    dawn: stage < 5 ? 0 : Math.max(55, 100 - 6 * (stage - 5)),
    hidden: stage >= 7,
    dust: Math.max(0, Math.min(4, Math.floor(stage / 2))),
  };
}

// Project each constellation onto a local tangent plane, normalised to a unit box.
for (const c of CONSTELLATIONS) {
  const ra0 = c.stars.reduce((s, p) => s + p[0], 0) / c.stars.length;
  const de0 = c.stars.reduce((s, p) => s + p[1], 0) / c.stars.length;
  const pts = c.stars.map(([ra, de]) => [-(ra - ra0) * 15 * Math.cos(de0 * DEG), de - de0]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  c.local = pts.map(([x, y]) => [(x - mx) / ext, (y - my) / ext]);
  c.adj = c.stars.map(() => new Set());
  for (const [a, b] of c.edges) { c.adj[a].add(b); c.adj[b].add(a); }
}

const DUST = {
  gold: { color: [1.0, 0.84, 0.48], size: 20 },
  ice: { color: [0.55, 0.90, 1.0], size: 25 },
  rose: { color: [1.0, 0.42, 0.74], size: 27 },
};

function dirFrom(azDeg, elDeg, out) {
  const az = azDeg * DEG, el = elDeg * DEG;
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

export class StardustGame {
  constructor({ scene, camera, audio, pixelRatio, pitchDeg, lowPower }) {
    this.camera = camera;
    this.audio = audio;
    this.pitchDeg = pitchDeg;
    this.baseFov = camera.fov;
    this.mode = 'off';              // off | play | show
    this.touch = false;

    this.score = 0;
    this.best = 0;
    this.woven = new Set();         // ids woven at least once, ever
    this.wishes = 0;
    this.stage = 0;                 // constellations woven in the game so far (sets the difficulty)
    this._load();

    this.combo = 0;
    this.comboTimer = 0;
    this.charge = 0;
    this.slips = 0;                 // wrong strokes in the current weave
    this.dawn = 0;                  // seconds left before the sky pales (0 = no clock)
    this.dawnLate = false;
    this.cycle = Math.floor(this.stage / WEAVE_ORDER.length);
    this.index = this.stage % WEAVE_ORDER.length;
    this.completed = 0;
    this.surge = 0;
    this.storm = 0;                 // seconds of aurora storm left
    this.freeze = 0;                // seconds of frozen combo left
    this.nextTimer = -1;
    this.hintCooldown = 0;
    this.meteorDir = null;          // set by main while a shooting star is flying

    this.onChange = () => {};
    this.onToast = () => {};
    this.onComplete = () => {};
    this.onWish = () => {};
    this.onStorm = () => {};

    this.pointerDir = new THREE.Vector3(0, 0.3, -1).normalize();
    this.firefly = this.pointerDir.clone();
    this.trail = Array.from({ length: 22 }, () => this.firefly.clone());

    this.dustBase = lowPower ? 10 : 15;
    this.dustTarget = this.dustBase;
    this.dust = [];
    this.spawnTimer = 0.4;
    this.sparks = [];
    this.maxSparks = lowPower ? 320 : 760;

    this.cons = CONSTELLATIONS.map((def) => ({
      def,
      dirs: def.local.map(() => new THREE.Vector3()),
      lit: def.local.map(() => false),
      litT: def.local.map(() => 0),
      edgeP: def.edges.map(() => 0),
      shown: false,
      done: false,
      perfect: true,
      appear: 0,
    }));

    // --- render objects ---
    this.group = new THREE.Group();
    scene.add(this.group);

    const pg = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_POINTS * 3);
    this.pCol = new Float32Array(MAX_POINTS * 3);
    this.pSize = new Float32Array(MAX_POINTS);
    this.pAlpha = new Float32Array(MAX_POINTS);
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aColor', new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aSize', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute('aAlpha', new THREE.BufferAttribute(this.pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(pg, new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: { uPixelRatio: pixelRatio },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 21;
    this.group.add(this.points);

    const lg = new THREE.BufferGeometry();
    this.lPos = new Float32Array(MAX_LINE_VERTS * 3);
    this.lCol = new Float32Array(MAX_LINE_VERTS * 3);
    lg.setAttribute('position', new THREE.BufferAttribute(this.lPos, 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute('color', new THREE.BufferAttribute(this.lCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 20;
    this.group.add(this.lines);

    this._v = new THREE.Vector3();
    this.pn = 0;
    this.ln = 0;
    this.group.visible = false;
    this.layout();
  }

  /* ---------- persistence ---------- */
  _load() {
    this.best = store.get('game.best', 0) | 0;
    this.stage = store.get('game.stage', 0) | 0;
    this.wishes = store.get('game.wishes', 0) | 0;
    for (const id of store.get('game.woven', [])) this.woven.add(id);
  }

  _save() {
    store.patch('game', { best: this.best, wishes: this.wishes, woven: this.woven, stage: this.stage });
  }

  /* ---------- public API ---------- */
  get active() { return this.mode === 'play'; }
  get multiplier() { return Math.min(5, 1 + 0.5 * Math.floor(this.combo / 4)); }
  get comboFraction() { return this.combo > 0 ? Math.max(0, this.comboTimer / COMBO_WINDOW) : 0; }
  get auroraTarget() { return 1.0 + 0.07 * Math.min(this.completed, 7) + this.surge + (this.storm > 0 ? 0.35 : 0); }
  get current() { return this.byId(WEAVE_ORDER[this.index]); }
  byId(id) { return this.cons.find((c) => c.def.id === id); }
  get rules() { return weaveRules(this.stage); }
  /** where the stars woven so far hang: one new star sits just above each woven figure */
  keepsakes() {
    const out = [];
    for (const c of this.cons) {
      if (!this.woven.has(c.def.id)) continue;
      const v = new THREE.Vector3();
      let top = -1;
      for (const d of c.dirs) { v.add(d); top = Math.max(top, d.y); }
      v.normalize();
      v.y = top + 0.035;
      out.push({ id: c.def.id, dir: v.normalize() });
    }
    return out;
  }

  state() {
    const c = this.current;
    return {
      score: this.score,
      best: this.best,
      combo: this.combo,
      multiplier: this.multiplier,
      charge: this.charge,
      maxCharge: MAX_CHARGE,
      name: c.def.name,
      latin: c.def.latin,
      lit: c.lit.filter(Boolean).length,
      total: c.lit.length,
      done: c.done,
      cycle: this.cycle,
      woven: this.woven.size,
      wishes: this.wishes,
      stage: this.stage,
      slips: this.slips,
      maxSlips: this.rules.slips,
      dawn: this.dawn,
      beckon: this.rules.beckon,
    };
  }

  /** 'play' = full game, 'show' = only display woven constellations, 'off' = hidden. */
  setMode(mode) {
    this.mode = mode;
    this.group.visible = mode !== 'off';
    if (mode === 'play') {
      this._begin();
      this.onChange(this.state());
    }
  }

  /** set up the weave of the current constellation for the present stage */
  _begin() {
    const c = this.current;
    c.shown = true;
    const r = this.rules;
    this.dustTarget = this.dustBase - r.dust;
    if (!c.done && !c.lit.some(Boolean)) { this.slips = 0; this.dawn = r.dawn; this.dawnLate = false; }
  }

  setPointer(ndcX, ndcY, isTouch) {
    this.touch = !!isTouch;
    this._v.set(ndcX, ndcY, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
    this.pointerDir.copy(this._v);
  }

  /** Place constellations inside the base field of view (independent of zoom). */
  layout() {
    const vHalf = this.baseFov / 2;
    const hHalf = Math.atan(Math.tan(vHalf * DEG) * this.camera.aspect) / DEG;
    const elMax = this.pitchDeg + vHalf - 9;
    const n = this.cons.length;
    const wide = hHalf > 34;
    const box = wide ? 11 : Math.min(9, hHalf * 0.85);
    this.cons.forEach((c, i) => {
      let az, el;
      if (wide) {
        az = THREE.MathUtils.lerp(-0.74, 0.74, i / (n - 1)) * hHalf;
        el = i % 2 ? 15.5 : 25.5;
      } else {
        az = (i % 2 ? 1 : -1) * hHalf * 0.30;
        el = 10 + i * ((elMax - box / 2 - 10) / (n - 1));
      }
      el = Math.min(el, elMax - box / 2);
      c.def.local.forEach(([x, y], k) => {
        dirFrom(az + x * box / Math.cos(el * DEG), el + y * box, c.dirs[k]);
      });
    });
    this.fovBounds = { hHalf, elMin: 7, elMax: elMax + 4 };
  }

  /** Embers from the campfire rise and turn into stardust. `dir` points at the fire. */
  releaseEmbers(dir, count) {
    if (this.mode !== 'play') return;
    for (let i = 0; i < count; i++) {
      const d = this._makeDust('gold', dir.clone());
      const side = (Math.random() - 0.5) * 5 * DEG;
      const east = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      d.vel.set(0, (9 + Math.random() * 6) * DEG, 0).addScaledVector(east, side);
      d.rise = 2.2 + Math.random() * 1.2;
      d.age = 1.2;                       // already visible
      d.color = [1.0, 0.62, 0.25];
      this.dust.push(d);
    }
  }

  /* ---------- internals ---------- */
  _makeDust(kind, dir) {
    const k = DUST[kind];
    return {
      kind, dir,
      vel: new THREE.Vector3(),
      age: 0,
      rise: 0,
      life: 13 + Math.random() * 10,
      phase: Math.random() * 10,
      size: k.size * (0.8 + Math.random() * 0.45),
      color: k.color,
    };
  }

  _spawnDust() {
    const b = this.fovBounds;
    const az = (Math.random() * 2 - 1) * b.hHalf * 0.9;
    const el = b.elMin + Math.random() * (b.elMax - b.elMin);
    const dir = dirFrom(az, el, new THREE.Vector3());
    const r = Math.random();
    const kind = r < 0.11 && this.storm <= 0 ? 'rose' : r < 0.27 ? 'ice' : 'gold';
    const d = this._makeDust(kind, dir);
    const ang = Math.random() * Math.PI * 2;
    const sp = (0.6 + Math.random() * 1.4) * DEG;         // radians / second
    const east = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const north = new THREE.Vector3().crossVectors(dir, east);
    d.vel.copy(east).multiplyScalar(Math.cos(ang) * sp).addScaledVector(north, Math.sin(ang) * sp);
    this.dust.push(d);
  }

  _burst(dir, count, speed, palette) {
    for (let i = 0; i < count && this.sparks.length < this.maxSparks; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      v.addScaledVector(dir, -v.dot(dir));            // keep it tangent to the sky shell
      if (v.lengthSq() < 1e-4) continue;
      v.normalize().multiplyScalar(speed * (0.25 + Math.random() * 0.85));
      const life = 0.7 + Math.random() * 1.1;
      this.sparks.push({
        p: dir.clone().multiplyScalar(R),
        v, life, max: life,
        color: palette[Math.floor(Math.random() * palette.length)],
        size: 7 + Math.random() * 12,
      });
    }
  }

  _addScore(base, useMultiplier = true) {
    const gain = base * (useMultiplier ? this.multiplier : 1) * (this.storm > 0 ? 2 : 1);
    this.score += Math.round(gain);
    if (this.score > this.best) { this.best = this.score; this._save(); }
  }

  _bumpCombo(dir) {
    this.combo++;
    this.comboTimer = COMBO_WINDOW;
    if (this.combo % 5 === 0) {
      const lvl = this.combo / 5;
      this._burst(dir, 46 + Math.min(lvl, 5) * 14, 95,
        [[1.0, 0.85, 0.5], [0.6, 1.0, 0.75], [1.0, 0.5, 0.8], [0.7, 0.85, 1.0]]);
      this.audio.comboBurst(lvl);
      this.surge = Math.min(0.5, this.surge + 0.08);
      this.onToast(`Chuỗi ${this.combo} · điểm ×${this.multiplier.toFixed(1)}`);
    }
  }

  _collect(d) {
    this.charge = Math.min(MAX_CHARGE, this.charge + 1);
    this._bumpCombo(d.dir);
    this._addScore(d.kind === 'gold' ? 10 : 25);
    this._burst(d.dir, d.kind === 'gold' ? 9 : 20, 46, [d.color, [1, 1, 1]]);
    this.audio.collect(this.combo);
    if (d.kind === 'rose') {
      this.storm = 10;
      this.surge = Math.min(0.9, this.surge + 0.35);
      this._burst(d.dir, 60, 130, [[1.0, 0.42, 0.74], [0.5, 1.0, 0.7], [0.8, 0.5, 1.0]]);
      this.audio.storm();
      this.onStorm();
      this.onToast('Bão cực quang! Mười giây điểm nhân đôi, bụi sao tự bay về');
    } else if (d.kind === 'ice') {
      this.freeze = 8;
      this.comboTimer = COMBO_WINDOW;
      this.onToast('Bụi băng — chuỗi được giữ nguyên trong 8 giây');
    }
    this.onChange(this.state());
  }

  _lightNode(c, k) {
    // a weave stays "perfect" while every new star touches one already lit; a star that
    // touches none is a wrong stroke, and past a few of those the weave comes loose
    const anyLit = c.lit.some(Boolean);
    if (anyLit) {
      let adjacent = false;
      for (const j of c.def.adj[k]) if (c.lit[j]) { adjacent = true; break; }
      if (!adjacent) {
        c.perfect = false;
        this.slips++;
        const max = this.rules.slips;
        if (this.slips > max) { this._unravel(c); return; }
        if (Number.isFinite(max)) this.onToast(`Nét lạc: ngôi sao này không nối với sao nào đã sáng (${this.slips}/${max})`);
      }
    }
    c.lit[k] = true;
    c.litT[k] = 0;
    this.charge--;
    this._bumpCombo(c.dirs[k]);
    this._addScore(50);
    this._burst(c.dirs[k], 22, 60, [[1.0, 0.95, 0.8], [0.65, 0.85, 1.0]]);
    this.audio.node(k);
    if (c.lit.every(Boolean)) this._finish(c);
    this.onChange(this.state());
  }

  /** too many wrong strokes: the threads of this figure come loose and it must be begun again */
  _unravel(c) {
    const lit = c.lit.filter(Boolean).length;
    c.lit.fill(false);
    c.edgeP.fill(0);
    c.perfect = true;
    this.slips = 0;
    this.charge = Math.min(MAX_CHARGE, this.charge + Math.floor(lit / 2));       // half the dust comes back
    this.combo = 0;
    c.dirs.forEach((d) => this._burst(d, 10, 50, [[0.6, 0.7, 0.9], [0.4, 0.5, 0.7]]));
    this.audio.storm();
    this.onToast('Mạch dệt bung ra. Bắt đầu lại, lần này theo đúng đường nối giữa các sao');
    this.onChange(this.state());
  }

  _finish(c) {
    c.done = true;
    this.completed++;
    this.stage++;
    const first = !this.woven.has(c.def.id);
    this.woven.add(c.def.id);
    this.surge = Math.min(0.9, this.surge + 0.6);
    const beforeDawn = this.dawn > 0 && !this.dawnLate;
    this._addScore(500 * (1 + this.cycle * 0.5) * (c.perfect ? 1.5 : 1) * (beforeDawn ? 1.3 : 1), false);
    this._save();
    const pal = [[0.35, 1.0, 0.6], [1.0, 0.45, 0.75], [1.0, 0.9, 0.55], [0.6, 0.8, 1.0]];
    c.dirs.forEach((d) => this._burst(d, c.perfect ? 40 : 28, 110, pal));
    this.audio.complete();
    let msg = `✦ ${c.def.name} đã bừng sáng`;
    if (c.perfect) msg += ' · mạch dệt hoàn hảo ×1.5';
    if (beforeDawn) msg += ' · kịp trước rạng đông ×1.3';
    this.dawn = 0;
    if (first) msg += ' · đã ghi vào sổ tay';
    this.onToast(msg);
    this.onComplete(c, first);
    this.nextTimer = 4.5;
  }

  _wish(dir) {
    this.wishes++;
    this.charge = MAX_CHARGE;
    this._addScore(300);
    this.surge = Math.min(0.9, this.surge + 0.3);
    this._burst(dir, 70, 150, [[1, 1, 1], [0.7, 0.9, 1.0], [1.0, 0.9, 0.6]]);
    this.audio.wish();
    this._save();
    this.onWish();
    this.onToast('☄ Bắt được sao băng — một điều ước, bụi sao đầy túi');
    this.onChange(this.state());
  }

  _advance() {
    this.index++;
    if (this.index >= this.cons.length) {
      this.index = 0;
      this.cycle++;
      for (const c of this.cons) {
        c.lit.fill(false);
        c.edgeP.fill(0);
        c.done = false;
        c.shown = false;
        c.perfect = true;
        c.appear = 0;
      }
      this.onToast(`Vòng trời thứ ${this.cycle + 1}: các chòm sao trở lại, khó hơn và thưởng nhiều hơn. Sao chưa dệt chỉ hiện khi đom đóm tới gần`);
    }
    this._begin();
    this.onChange(this.state());
  }

  _point(v, scale, color, size, alpha) {
    const i = this.pn;
    if (i >= MAX_POINTS || alpha <= 0.003) return;
    this.pPos[i * 3] = v.x * scale;
    this.pPos[i * 3 + 1] = v.y * scale;
    this.pPos[i * 3 + 2] = v.z * scale;
    this.pCol[i * 3] = color[0];
    this.pCol[i * 3 + 1] = color[1];
    this.pCol[i * 3 + 2] = color[2];
    this.pSize[i] = size;
    this.pAlpha[i] = alpha;
    this.pn++;
  }

  _line(a, b, t, color, alpha) {
    const i = this.ln;
    if (i + 2 > MAX_LINE_VERTS) return;
    this._v.copy(a).lerp(b, t);
    this.lPos[i * 3] = a.x * R; this.lPos[i * 3 + 1] = a.y * R; this.lPos[i * 3 + 2] = a.z * R;
    this.lPos[i * 3 + 3] = this._v.x * R; this.lPos[i * 3 + 4] = this._v.y * R; this.lPos[i * 3 + 5] = this._v.z * R;
    for (let k = 0; k < 2; k++) {
      this.lCol[(i + k) * 3] = color[0] * alpha;
      this.lCol[(i + k) * 3 + 1] = color[1] * alpha;
      this.lCol[(i + k) * 3 + 2] = color[2] * alpha;
    }
    this.ln += 2;
  }

  _flush() {
    const pg = this.points.geometry;
    pg.setDrawRange(0, this.pn);
    pg.attributes.position.needsUpdate = true;
    pg.attributes.aColor.needsUpdate = true;
    pg.attributes.aSize.needsUpdate = true;
    pg.attributes.aAlpha.needsUpdate = true;
    const lg = this.lines.geometry;
    lg.setDrawRange(0, this.ln);
    lg.attributes.position.needsUpdate = true;
    lg.attributes.color.needsUpdate = true;
  }

  /** Viewing mode: an optional overlay of all constellations (woven ones glow a little warmer). */
  _updateShow(time) {
    const lineC = [0.60, 0.85, 1.0];
    for (const c of this.cons) {
      const w = this.woven.has(c.def.id) ? 1 : 0.6;
      c.dirs.forEach((nd, k) => {
        const tw = 0.8 + 0.2 * Math.sin(time * 1.6 + k * 1.7);
        this._point(nd, R, [1.0, 0.95, 0.82], 18, 0.55 * tw * w);
        this._point(nd, R, [0.55, 0.80, 1.0], 42, 0.09 * w);
      });
      for (const [a, b] of c.def.edges) this._line(c.dirs[a], c.dirs[b], 1, lineC, 0.30 * w);
    }
  }

  /* ---------- frame update ---------- */
  update(dt, time) {
    if (this.mode === 'off') return;
    this.group.position.copy(this.camera.position);
    this.pn = 0;
    this.ln = 0;
    if (this.mode === 'show') { this._updateShow(time); this._flush(); return; }

    // firefly eases toward the pointer and drags a silky trail
    const ff = this.firefly;
    ff.lerp(this.pointerDir, 1 - Math.exp(-dt * 9)).normalize();
    this.trail[0].copy(ff);
    for (let i = 1; i < this.trail.length; i++) {
      this.trail[i].lerp(this.trail[i - 1], 1 - Math.exp(-dt * 26)).normalize();
    }

    // timers
    if (this.freeze > 0) this.freeze -= dt;
    if (this.combo > 0 && this.freeze <= 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.onChange(this.state()); }
    }
    if (this.storm > 0) this.storm -= dt;
    // the dawn clock of the harder weaves: it never ends the game, it only takes the bonus
    if (this.dawn > 0 && !this.current.done && this.current.lit.some(Boolean)) {
      this.dawn -= dt;
      if (this.dawn <= 0) { this.dawn = 0; this.dawnLate = true; this.onToast('Trời đã rạng: vẫn dệt tiếp được, nhưng không còn thưởng rạng đông'); }
    }
    this.surge *= Math.exp(-dt * 0.22);
    this.hintCooldown -= dt;
    const storming = this.storm > 0;

    // shooting star: touch it to make a wish
    if (this.meteorDir) {
      const c = Math.cos((this.touch ? 6.5 : 5.0) * DEG);
      if (this.meteorDir.dot(ff) > c || this.meteorDir.dot(this.pointerDir) > c) {
        this._wish(this.meteorDir);
        this.meteorDir = null;
      }
    }

    // stardust
    this.spawnTimer -= dt;
    if (this.dust.length < this.dustTarget + (storming ? 9 : 0) && this.spawnTimer <= 0) {
      this._spawnDust();
      this.spawnTimer = storming ? 0.12 : 0.25 + Math.random() * 0.6;
    }
    const collectCos = Math.cos((this.touch ? 3.0 : 2.1) * DEG);
    const magnetDeg = storming ? 17 : 7.5;
    const magnetCos = Math.cos(magnetDeg * DEG);
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i];
      d.age += dt;
      d.dir.addScaledVector(d.vel, dt).normalize();
      if (d.rise > 0) {
        d.rise -= dt;
        d.vel.multiplyScalar(Math.exp(-dt * 0.55));
      }
      const dot = d.dir.dot(ff);
      if (dot > magnetCos) {
        const pull = (dot - magnetCos) / (1 - magnetCos);
        d.dir.lerp(ff, Math.min(1, dt * (1.5 + (storming ? 4 : 9) * pull))).normalize();
      }
      if (dot > collectCos) {
        this._collect(d);
        this.dust.splice(i, 1);
        continue;
      }
      if (d.age > d.life || (d.rise <= 0 && d.dir.y < 0.07)) { this.dust.splice(i, 1); continue; }
      const fade = Math.min(1, d.age / 1.2) * Math.min(1, (d.life - d.age) / 1.5);
      const tw = 0.7 + 0.3 * Math.sin(time * 3.0 + d.phase * 7.0);
      this._point(d.dir, R, d.color, d.size * (0.85 + 0.25 * tw), fade * tw);
      this._point(d.dir, R, d.color, d.size * 2.6, fade * (d.kind === 'gold' ? 0.16 : 0.30));
      if (d.kind !== 'gold') {
        const ring = 0.5 + 0.5 * Math.sin(time * 2.0 + d.phase);
        this._point(d.dir, R, [1, 1, 1], d.size * (3.4 + ring), fade * 0.07);
      }
    }

    // constellations
    const nodeCos = Math.cos((this.touch ? 2.6 : 1.9) * DEG);
    const lineLit = [0.60, 0.85, 1.0];
    const cur = this.current;
    const rules = this.rules;
    for (const c of this.cons) {
      const past = !c.shown && this.woven.has(c.def.id);      // woven in an earlier visit
      if (!c.shown && !past) continue;
      if (past) {
        c.dirs.forEach((nd) => this._point(nd, R, [0.9, 0.92, 1.0], 15, 0.30));
        for (const [a, b] of c.def.edges) this._line(c.dirs[a], c.dirs[b], 1, lineLit, 0.13);
        continue;
      }
      c.appear = Math.min(1, c.appear + dt * 0.8);
      const isCur = c === cur;
      const dim = (isCur ? 1 : 0.42) * c.appear;
      let nearest = -1, nearestDot = -1;
      for (let k = 0; k < c.dirs.length; k++) {
        const nd = c.dirs[k];
        if (c.lit[k]) {
          c.litT[k] += dt;
          const pop = 1 + 1.2 * Math.exp(-c.litT[k] * 4);
          const tw = 0.86 + 0.14 * Math.sin(time * 2.2 + k * 1.7);
          this._point(nd, R, [1.0, 0.95, 0.82], 30 * pop, dim * tw);
          this._point(nd, R, [0.55, 0.80, 1.0], 62, dim * 0.20);
          const dd = nd.dot(ff);
          if (dd > nearestDot) { nearestDot = dd; nearest = k; }
        } else if (isCur) {
          // stars that would keep the weave perfect beckon in gold
          let next = !c.lit.some(Boolean);
          if (!next) for (const j of c.def.adj[k]) if (c.lit[j]) { next = true; break; }
          const pulse = 0.5 + 0.5 * Math.sin(time * 2.6 + k * 0.9);
          const col = next && c.perfect && rules.beckon ? [1.0, 0.88, 0.60] : [0.70, 0.86, 1.0];
          // in the later rounds a star still to weave is only a glimmer until the firefly comes near
          const seen = rules.hidden ? 0.12 + 0.88 * Math.max(0, Math.min(1, (nd.dot(ff) - Math.cos(16 * DEG)) / (Math.cos(7 * DEG) - Math.cos(16 * DEG)))) : 1;
          this._point(nd, R, col, (17 + 5 * pulse) * (0.6 + 0.4 * seen), c.appear * (0.45 + 0.35 * pulse) * seen);
          this._point(nd, R, col, 44 + 12 * pulse, c.appear * 0.10 * seen);
          if (!c.done && nd.dot(ff) > nodeCos) {
            if (this.charge > 0) {
              this._lightNode(c, k);
            } else if (this.hintCooldown <= 0) {
              this.hintCooldown = 3.5;
              this.onToast('Cần bụi sao — bắt những đốm sáng đang trôi, hoặc thêm củi vào lửa');
            }
          }
        }
      }
      c.def.edges.forEach(([a, b], e) => {
        const both = c.lit[a] && c.lit[b];
        if (both) c.edgeP[e] = Math.min(1, c.edgeP[e] + dt * 1.8);
        if (isCur && !c.done && rules.guides) this._line(c.dirs[a], c.dirs[b], 1, lineLit, 0.10 * c.appear);
        if (c.edgeP[e] > 0) this._line(c.dirs[a], c.dirs[b], c.edgeP[e], lineLit, dim * 0.85);
      });
      // weaving thread from the nearest lit star to the firefly
      if (isCur && !c.done && nearest >= 0 && nearestDot > Math.cos(16 * DEG)) {
        this._line(c.dirs[nearest], ff, 1, [1.0, 0.9, 0.6], 0.28);
      }
    }
    if (this.nextTimer > 0) {
      this.nextTimer -= dt;
      if (this.nextTimer <= 0) this._advance();
    }

    // sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
      s.v.multiplyScalar(Math.exp(-dt * 1.7));
      s.v.y -= 16 * dt;
      s.p.addScaledVector(s.v, dt);
      const k = s.life / s.max;
      this._point(s.p, 1, s.color, s.size * (0.5 + 0.5 * k), k * k);
    }

    // firefly + trail (charge makes it burn brighter; storms turn it rose)
    const glow = 0.75 + 0.25 * Math.sin(time * 5.0);
    const energy = this.charge / MAX_CHARGE;
    const fc = storming ? [1.0, 0.70, 0.85] : [0.85 + 0.15 * energy, 1.0, 0.50 + 0.25 * energy];
    for (let i = this.trail.length - 1; i >= 1; i--) {
      const k = 1 - i / this.trail.length;
      this._point(this.trail[i], R, fc, 6 + 16 * k, 0.5 * k * k);
    }
    this._point(ff, R, fc, 34 + 16 * energy, glow);
    this._point(ff, R, storming ? [1.0, 0.5, 0.8] : [0.6, 1.0, 0.6], 95 + 50 * energy, 0.15 + 0.12 * energy);
    if (storming) {
      // faint ring showing the storm's reach
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + time * 0.6;
        const east = this._v.set(-ff.z, 0, ff.x).normalize();
        const rr = Math.tan(magnetDeg * DEG);
        const px = ff.x + (east.x * Math.cos(a)) * rr;
        const py = ff.y + Math.sin(a) * rr;
        const pz = ff.z + (east.z * Math.cos(a)) * rr;
        const l = Math.hypot(px, py, pz);
        this._v.set(px / l, py / l, pz / l);
        this._point(this._v, R, [1.0, 0.5, 0.8], 7, 0.22 * Math.min(1, this.storm));
      }
    }
    this._flush();
  }
}
