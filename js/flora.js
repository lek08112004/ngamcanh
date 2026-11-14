// Flowers and trees: the seasonal beds in front of the camp, and the formal garden east of
// it with rose bushes, lavender, sunflowers, daisy edgings, a rose arch and cherry trees.
// Each flower is an instanced model built from smooth curved strips (petals, leaves)
// that carry UVs; the flower shader cuts their outlines per pixel and lights them.
import * as THREE from 'three';
import {
  tulipVertex, tulipFragment, cardVertex, cardFragment, flowerDepthFragment, butterflyVertex, butterflyFragment,
  petalVertex, petalFragment,
} from './shaders/tulip.js';
import { terrainH, insideCabin, insideCamp, streamX, streamW } from './world.js';
import { GARDEN, CAMP } from './layout.js';
import { bedFlowerAt, bedMiddle, bedWarp, patchTone, driftNoise, BED_STRIPE } from './seasons.js';

/* ---------- mesh builder: position, (kind, open), uv; normals are computed smooth ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.x = []; this.petals = 0; }
  get count() { return this.p.length / 3; }
  v(x, y, z, kind, open, u, vv) { this.p.push(x, y, z); this.n.push(kind, open); this.uv.push(u, vv); return this.count - 1; }
  /** a grid over u in [-1,1], v in [0,1] */
  strip(fn, nu, nv, kind, open) {
    const start = this.count;
    for (let j = 0; j < nv; j++) {
      const vv = j / (nv - 1);
      for (let i = 0; i < nu; i++) {
        const u = -1 + (2 * i) / (nu - 1);
        const q = fn(u, vv);
        this.v(q[0], q[1], q[2], kind, open * vv, u, vv);
      }
    }
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < nu - 1; i++) {
        const a = start + j * nu + i, b = a + 1, c = a + nu, d = c + 1;
        this.x.push(a, b, d, a, d, c);
      }
    }
  }
  /** one petal or leaf growing from the stem axis toward azimuth `a` */
  petal({ a, y0, r0 = 0.01, R, rise, W, curl = 0, prof = 'open', droop = 0, open = 0, kind = 1, nu = 3, nv = 4, broad = false, roll = 0 }) {
    // Nothing on a living plant is evenly spaced or equally long. Every petal and leaf is
    // set a little off its ideal place and size (the same way each time, so far and close-up
    // models agree): this is what stops a bloom looking stamped out from its centre.
    const n = ++this.petals;
    const j1 = (Math.sin(n * 12.9898) * 43758.5453) % 1, j2 = (Math.sin(n * 78.233) * 24634.6345) % 1, j3 = (Math.sin(n * 39.425) * 13758.2931) % 1;
    const wild = kind === 0 ? 2.0 : 1.0;
    a += j1 * 0.085 * wild;
    R *= 1 + j2 * 0.075 * wild;
    rise *= 1 + j3 * 0.07;
    W *= 1 + j1 * j2 * 0.12;
    droop += Math.abs(R) * j3 * 0.06 * wild;
    const dx = Math.cos(a), dz = Math.sin(a);
    // 'egg' is the closed goblet of a tulip: widest two fifths of the way up, the tips nearly meeting
    const rOf = prof === 'cup'
      ? (v) => r0 + R * Math.sin(Math.min(v * 2.3, Math.PI))
      : prof === 'egg'
        ? (v) => r0 + R * Math.pow(Math.sin(Math.min(v * 2.62, Math.PI)), 0.75)
        : (v) => r0 + R * Math.pow(v, 0.8);
    // a rose petal is widest near its tip; the others swell in the middle
    const wOf = broad
      ? (v) => W * (0.40 + 0.60 * Math.sin(Math.PI * (0.15 + 0.60 * v)))
      : (v) => W * (0.55 + 0.45 * Math.sin(Math.PI * v));
    this.strip((u, v) => {
      const w = wOf(v);
      // `roll` turns the lip of the petal back outward, as an opened rose does
      const lip = roll * Math.max(0, v - 0.6) * Math.max(0, v - 0.6) * 6.0;
      const r = rOf(v) + curl * u * u * w + lip * W;
      return [dx * r - dz * u * w, y0 + rise * v - droop * v * v - lip * W * 0.5, dz * r + dx * u * w];
    }, nu, nv, kind, open);
  }
  /** a stem: several rings up its length, so the shader can bend it into a curve; it tapers toward the top */
  tube(h, r, sides = 5, rings = 5) {
    const start = this.count;
    for (let j = 0; j < rings; j++) {
      const t = j / (rings - 1), rr = r * (1.12 - 0.30 * t);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * rr, t * h, Math.sin(a) * rr, 0, 0, 0, t * 0.7);
      }
    }
    for (let j = 0; j < rings - 1; j++) {
      for (let s = 0; s < sides; s++) {
        const a = start + j * sides + s, b = start + j * sides + (s + 1) % sides;
        this.x.push(a, b, b + sides, a, b + sides, a + sides);
      }
    }
  }
  /** the seed disc of a daisy or sunflower: a low dome around +Y. Its UVs are the position on
      the disc (-1..1), which is what the shader needs to lay the florets out in spirals. */
  dome(cy, r, h, sides = 9, kind = 2, rings = 2) {
    const top = this.v(0, cy + h, 0, kind, 0, 0, 0);
    const start = this.count;
    for (let ri = 1; ri <= rings; ri++) {
      const rr = ri / rings, hh = Math.cos(rr * Math.PI / 2);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * r * rr, cy + h * hh, Math.sin(a) * r * rr, kind, 0, Math.cos(a) * rr, Math.sin(a) * rr);
      }
    }
    for (let s = 0; s < sides; s++) {
      const a = start + s, b = start + (s + 1) % sides;
      this.x.push(top, b, a);
      for (let ri = 0; ri < rings - 1; ri++) {
        const a0 = a + ri * sides, b0 = b + ri * sides;
        this.x.push(a0, b0, b0 + sides, a0, b0 + sides, a0 + sides);
      }
    }
  }
  /** rigidly move every vertex added since `from` (used to tilt a sunflower's head) */
  transform(from, m) {
    const v = new THREE.Vector3();
    for (let i = from; i < this.count; i++) {
      v.set(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]).applyMatrix4(m);
      this.p[i * 3] = v.x; this.p[i * 3 + 1] = v.y; this.p[i * 3 + 2] = v.z;
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.n, 2));
    g.setAttribute('aUv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.x);
    g.computeVertexNormals();
    return g;
  }
}
const TAU = Math.PI * 2;

/* ---------- species ---------- */
// `fine` builds the close-up version: the same flower with enough facets that the curl of
// a petal is a curve, not a fold. It is only ever drawn for the few flowers beside you.
function tulipGeo(fine) {
  const g = new Geo();
  const nu = fine ? 7 : 3, nv = fine ? 9 : 4;
  g.tube(0.66, 0.016, fine ? 8 : 5);
  // broad strap leaves that clasp the stem and arch outward, the way a tulip's do
  const ln = fine ? 5 : 3, lv = fine ? 8 : 4;
  g.petal({ kind: 0, a: 0.5, y0: 0.02, R: 0.20, rise: 0.50, W: 0.070, curl: -0.55, droop: 0.10, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 3.4, y0: 0.02, R: 0.17, rise: 0.44, W: 0.062, curl: -0.55, droop: 0.06, nu: ln, nv: lv });
  if (fine) g.petal({ kind: 0, a: 1.9, y0: 0.16, R: 0.11, rise: 0.34, W: 0.040, curl: -0.6, droop: 0.02, nu: ln, nv: lv });
  // six tepals in two whorls of three, overlapping into a goblet
  for (let k = 0; k < 3; k++) {
    g.petal({ a: (k / 3) * TAU, y0: 0.655, r0: 0.010, R: 0.082, rise: 0.300, W: 0.086, curl: -0.62, prof: 'egg', open: 1, nu, nv });
    g.petal({ a: (k / 3) * TAU + TAU / 6, y0: 0.660, r0: 0.008, R: 0.070, rise: 0.292, W: 0.078, curl: -0.62, prof: 'egg', open: 1, nu, nv });
  }
  return g.build();
}
function roseGeo(fine) {
  const g = new Geo();
  g.tube(0.70, 0.014, fine ? 8 : 5);
  g.petal({ kind: 0, a: 0.3, y0: 0.22, R: 0.14, rise: 0.05, W: 0.042 });
  g.petal({ kind: 0, a: 2.5, y0: 0.38, R: 0.13, rise: 0.05, W: 0.040 });
  g.petal({ kind: 0, a: 4.6, y0: 0.52, R: 0.12, rise: 0.04, W: 0.036 });
  if (!fine) {
    for (let k = 0; k < 5; k++) g.petal({ kind: 3, broad: true, roll: 0.7, a: (k / 5) * TAU, y0: 0.70, r0: 0.016, R: 0.082, rise: 0.105, W: 0.066, curl: 0.15, droop: 0.03, open: 0.3 });
    for (let k = 0; k < 5; k++) g.petal({ kind: 3, broad: true, roll: 0.4, a: (k / 5) * TAU + 0.63, y0: 0.71, r0: 0.012, R: 0.060, rise: 0.145, W: 0.056, curl: -0.3, open: 0.2 });
    for (let k = 0; k < 4; k++) g.petal({ kind: 3, broad: true, a: (k / 4) * TAU + 0.3, y0: 0.72, r0: 0.006, R: 0.038, rise: 0.165, W: 0.044, curl: -0.7, prof: 'egg', open: 0.1 });
    for (let k = 0; k < 3; k++) g.petal({ kind: 3, broad: true, a: (k / 3) * TAU + 1.1, y0: 0.73, r0: 0.003, R: 0.022, rise: 0.165, W: 0.032, curl: -0.9, prof: 'egg', open: 0.05, nv: 3 });
    return g.build();
  }
  // close up: more leaves, sepals, and the real thing: some thirty petals on a spiral, each
  // turned 137.5 degrees from the last. The heart is a furled bud; each petal further out
  // stands a little lower and leans a little more, and only the outermost lay their lips back.
  g.petal({ kind: 0, a: 1.4, y0: 0.30, R: 0.12, rise: 0.06, W: 0.040, nu: 4, nv: 5 });
  g.petal({ kind: 0, a: 3.6, y0: 0.45, R: 0.13, rise: 0.05, W: 0.040, nu: 4, nv: 5 });
  g.petal({ kind: 0, a: 5.6, y0: 0.60, R: 0.10, rise: 0.04, W: 0.034, nu: 4, nv: 5 });
  for (let k = 0; k < 5; k++) g.petal({ kind: 0, a: (k / 5) * TAU + 0.3, y0: 0.695, r0: 0.012, R: 0.050, rise: -0.012, W: 0.012, droop: 0.02, nu: 2, nv: 3 });
  const N = 30;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);                         // 0 at the heart .. 1 outermost
    g.petal({
      kind: 3, broad: true, a: k * 2.39996, y0: 0.728 - 0.022 * t, r0: 0.002 + 0.012 * t,
      // the furled heart sits a little below the cup of petals round it, as in a real bloom
      R: 0.014 + 0.030 * t + 0.050 * t * t, rise: 0.105 + 0.110 * t - 0.125 * t * t, W: 0.030 + 0.044 * t,
      curl: -0.95 + 0.85 * t, roll: 0.9 * t * t * t, droop: 0.02 * t * t, prof: t < 0.5 ? 'cup' : 'open',
      open: 0.05 + 0.25 * t, nu: t < 0.3 ? 4 : 6, nv: t < 0.3 ? 5 : 6,
    });
  }
  return g.build();
}
/** lavender: one flowering stalk, or a bush of several leaning out from one root */
function lavenderGeo(stalks = 1) {
  const g = new Geo();
  for (let st = 0; st < stalks; st++) {
    const from = g.count;
    g.tube(0.56, 0.008, 4);
    g.petal({ kind: 0, a: 0.6 + st, y0: 0.04, R: 0.16, rise: 0.16, W: 0.012, nu: 2, nv: 3 });
    g.petal({ kind: 0, a: 3.6 + st, y0: 0.06, R: 0.14, rise: 0.14, W: 0.011, nu: 2, nv: 3 });
    for (let k = 0; k < 8; k++) {
      const y = 0.57 + k * 0.056, R = 0.032 * (1 - k * 0.08);
      for (let j = 0; j < 3; j++) g.petal({ a: k * 0.9 + (j / 3) * TAU, y0: y, r0: 0.004, R, rise: 0.036, W: 0.017, curl: -0.3, nu: 2, nv: 3 });
    }
    if (st > 0) {
      const yaw = (st / (stalks - 1)) * TAU, tilt = 0.30 + 0.10 * (st % 2);
      g.transform(from, new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeScale(1, 0.86 + 0.1 * (st % 3), 1)));
    }
  }
  return g.build();
}
function sunflowerGeo(fine) {
  const g = new Geo();
  g.tube(0.88, 0.021, fine ? 8 : 6);
  // big heart-shaped leaves, drooping under their own weight
  const ln = fine ? 5 : 3, lv = fine ? 6 : 4;
  g.petal({ kind: 0, a: 0.4, y0: 0.22, R: 0.30, rise: 0.07, W: 0.130, droop: 0.10, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 2.7, y0: 0.40, R: 0.28, rise: 0.06, W: 0.120, droop: 0.09, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 5.0, y0: 0.56, R: 0.24, rise: 0.05, W: 0.100, droop: 0.07, curl: 0.25, nu: ln, nv: lv });
  g.petal({ kind: 0, a: 1.6, y0: 0.70, R: 0.19, rise: 0.04, W: 0.080, droop: 0.05, curl: 0.25, nu: ln, nv: lv });
  const head = g.count;
  // green bracts behind the head, then two rows of rays, then the broad seed disc
  const nb = fine ? 21 : 9;
  for (let k = 0; k < nb; k++) g.petal({ kind: 0, a: (k / nb) * TAU + 0.1, y0: -0.018, r0: 0.07, R: 0.085, rise: -0.004, W: 0.030, nu: 2, nv: 3 });
  const nr = fine ? 17 : 13;
  for (let k = 0; k < nr; k++) g.petal({ kind: 4, a: (k / nr) * TAU, y0: 0, r0: 0.092, R: 0.150, rise: 0.004, W: 0.036, droop: 0.026, curl: 0.5, nu: fine ? 5 : 3, nv: fine ? 5 : 3 });
  for (let k = 0; k < nr; k++) g.petal({ kind: 4, a: ((k + 0.5) / nr) * TAU, y0: 0.006, r0: 0.088, R: 0.118, rise: 0.022, W: 0.032, curl: 0.5, nu: fine ? 5 : 3, nv: fine ? 5 : 3 });
  g.dome(0.004, 0.104, 0.026, fine ? 28 : 12, 2, fine ? 5 : 2);
  // the head nods forward to face the sun
  g.transform(head, new THREE.Matrix4().makeTranslation(0, 0.905, 0.03).multiply(new THREE.Matrix4().makeRotationX(1.13)));
  return g.build();
}
function daisyGeo() {
  const g = new Geo();
  g.tube(0.90, 0.009, 4);
  g.petal({ kind: 0, a: 1.0, y0: 0.10, R: 0.22, rise: 0.10, W: 0.028, nv: 3 });
  g.petal({ kind: 0, a: 4.0, y0: 0.16, R: 0.19, rise: 0.10, W: 0.026, nv: 3 });
  for (let k = 0; k < 16; k++) g.petal({ kind: 4, a: (k / 16) * TAU, y0: 0.915, r0: 0.034, R: 0.150, rise: 0.012, W: 0.022, droop: 0.03, open: 1, nv: 3 });
  g.dome(0.915, 0.044, 0.030, 9, 5, 2);
  return g.build();
}

/** daffodil: six spreading tepals behind a trumpet, the whole head turned to look outward */
function daffodilGeo() {
  const g = new Geo();
  g.tube(0.74, 0.011, 5);
  for (const [a, R, rise] of [[0.4, 0.10, 0.62], [2.3, 0.08, 0.56], [4.4, 0.12, 0.50]]) g.petal({ kind: 0, a, y0: 0.01, R, rise, W: 0.020, curl: -0.4, droop: 0.05, nv: 5 });
  const head = g.count;
  for (let k = 0; k < 6; k++) g.petal({ kind: 4, a: (k / 6) * TAU, y0: 0, r0: 0.018, R: 0.120, rise: 0.018 + 0.012 * (k % 2), W: 0.052, curl: 0.25, nu: 4, nv: 4 });
  // the corona: a flared, frilled cup
  for (let k = 0; k < 7; k++) g.petal({ kind: 1, a: (k / 7) * TAU + 0.2, y0: 0.004, r0: 0.020, R: 0.022, rise: 0.105, W: 0.026, curl: -0.5, roll: 0.5, nu: 3, nv: 5 });
  g.dome(0.01, 0.014, 0.05, 6, 5, 2);
  g.transform(head, new THREE.Matrix4().makeTranslation(0, 0.745, 0.012).multiply(new THREE.Matrix4().makeRotationX(1.25)));
  return g.build();
}
/** field poppy: four tissue-thin petals in a shallow bowl round a dark heart, on a wiry stem */
function poppyGeo() {
  const g = new Geo();
  g.tube(0.80, 0.007, 4, 6);
  for (const [a, y] of [[0.8, 0.06], [2.9, 0.12], [5.0, 0.20]]) g.petal({ kind: 0, a, y0: y, R: 0.17, rise: 0.10, W: 0.030, droop: 0.05, nv: 4 });
  const head = g.count;
  for (let k = 0; k < 2; k++) g.petal({ kind: 3, broad: true, a: k * Math.PI, y0: 0, r0: 0.010, R: 0.120, rise: 0.070, W: 0.115, curl: -0.22, roll: 0.25, nu: 5, nv: 5 });
  for (let k = 0; k < 2; k++) g.petal({ kind: 3, broad: true, a: k * Math.PI + Math.PI / 2, y0: 0.006, r0: 0.008, R: 0.100, rise: 0.085, W: 0.100, curl: -0.30, nu: 5, nv: 5 });
  g.dome(0.004, 0.024, 0.030, 8, 2, 2);
  g.transform(head, new THREE.Matrix4().makeTranslation(0, 0.80, 0).multiply(new THREE.Matrix4().makeRotationX(0.35)));
  // a bud still hanging its head on a side shoot
  const bud = g.count;
  for (let k = 0; k < 3; k++) g.petal({ kind: 0, a: (k / 3) * TAU, y0: 0, r0: 0.004, R: 0.020, rise: 0.060, W: 0.022, curl: -0.7, prof: 'egg', nv: 4 });
  g.transform(bud, new THREE.Matrix4().makeTranslation(0.075, 0.60, 0.02).multiply(new THREE.Matrix4().makeRotationZ(-2.5)));
  return g.build();
}
/** cosmos: eight broad rays round a small gold eye, on thin branching stems with thread leaves */
function cosmosGeo() {
  const g = new Geo();
  const bloom = (x, y, z, tilt, yaw, sc) => {
    const from = g.count;
    for (let k = 0; k < 8; k++) g.petal({ kind: 4, a: (k / 8) * TAU, y0: 0, r0: 0.020, R: 0.130 * sc, rise: 0.030, W: 0.048 * sc, droop: 0.02, curl: 0.2, open: 0, nu: 3, nv: 4 });
    g.dome(0.004, 0.024 * sc, 0.016, 7, 5, 2);
    g.transform(from, new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(tilt)));
  };
  g.tube(0.92, 0.007, 4, 6);
  for (let k = 0; k < 9; k++) g.petal({ kind: 0, a: k * 2.4, y0: 0.10 + k * 0.07, R: 0.13 - k * 0.006, rise: 0.06, W: 0.006, droop: 0.03, nu: 2, nv: 3 });
  bloom(0, 0.925, 0, 0.5, 0, 1);
  // a side shoot carrying a second, smaller flower
  const shoot = g.count;
  g.tube(0.34, 0.005, 3, 3);
  g.transform(shoot, new THREE.Matrix4().makeTranslation(0, 0.50, 0).multiply(new THREE.Matrix4().makeRotationZ(-0.55)));
  bloom(0.18, 0.80, 0, 0.7, 1.6, 0.8);
  return g.build();
}
/** garden chrysanthemum: a low bush, each stem ending in a pompon of rays laid in tiers */
function mumGeo() {
  const g = new Geo();
  for (let st = 0; st < 4; st++) {
    const from = g.count, h = 0.62 + 0.10 * (st % 3);
    g.tube(h, 0.010, 4, 4);
    for (let k = 0; k < 4; k++) g.petal({ kind: 0, a: k * 2.2 + st, y0: 0.10 + k * 0.12, R: 0.10, rise: 0.04, W: 0.036, droop: 0.03, nv: 3 });
    for (const [n, R, rise, y] of [[11, 0.085, 0.010, 0], [10, 0.070, 0.036, 0.008], [8, 0.050, 0.058, 0.014], [6, 0.030, 0.066, 0.018]]) {
      for (let k = 0; k < n; k++) g.petal({ kind: 4, a: (k / n) * TAU + R * 20, y0: h + y, r0: 0.008, R, rise, W: 0.017, curl: -0.4, nu: 2, nv: 3 });
    }
    if (st > 0) g.transform(from, new THREE.Matrix4().makeRotationY((st / 3) * TAU + 0.4).multiply(new THREE.Matrix4().makeRotationZ(0.36 + 0.07 * st)));
  }
  return g.build();
}
/** snowdrops: a clump of short arching stems, each hanging one white bell */
function snowdropGeo() {
  const g = new Geo();
  for (let st = 0; st < 3; st++) {
    const from = g.count;
    g.tube(0.72, 0.010, 4, 4);
    g.petal({ kind: 0, a: 0.6, y0: 0.0, R: 0.07, rise: 0.56, W: 0.026, curl: -0.3, droop: 0.04, nv: 4 });
    g.petal({ kind: 0, a: 3.5, y0: 0.0, R: 0.09, rise: 0.48, W: 0.024, curl: -0.3, droop: 0.06, nv: 4 });
    const bell = g.count;
    for (let k = 0; k < 3; k++) g.petal({ kind: 1, a: (k / 3) * TAU, y0: 0.02, r0: 0.012, R: 0.052, rise: 0.210, W: 0.062, curl: -0.5, prof: 'egg', nu: 4, nv: 5 });
    for (let k = 0; k < 3; k++) g.petal({ kind: 1, a: (k / 3) * TAU + TAU / 6, y0: 0.02, r0: 0.008, R: 0.024, rise: 0.110, W: 0.034, curl: -0.6, prof: 'egg', nv: 4 });
    // the bell hangs from the crook at the top of the stem
    g.transform(bell, new THREE.Matrix4().makeTranslation(0.05, 0.735, 0).multiply(new THREE.Matrix4().makeRotationZ(-2.55)));
    if (st > 0) g.transform(from, new THREE.Matrix4().makeRotationY(st * 2.3).multiply(new THREE.Matrix4().makeRotationZ(0.22 + 0.10 * st)).multiply(new THREE.Matrix4().makeScale(1, 0.82 + 0.1 * st, 1)));
  }
  return g.build();
}

/** grape hyacinth: a clump of short spikes, each packed with tiny closed bells, among strap leaves */
function muscariGeo() {
  const g = new Geo();
  for (let st = 0; st < 4; st++) {
    const from = g.count, h = 0.15 + 0.03 * (st % 3);
    g.tube(h, 0.006, 4, 3);
    g.petal({ kind: 0, a: 0.9 + st * 1.7, y0: 0.0, R: 0.09, rise: 0.10, W: 0.010, droop: 0.05, nu: 2, nv: 4 });
    // bells crowd the top of the stalk, the largest at the bottom
    for (let k = 0; k < 7; k++) {
      const y = h * 0.52 + k * h * 0.075, R = 0.014 * (1 - k * 0.09);
      for (let j = 0; j < 3; j++) g.petal({ kind: 1, a: k * 1.3 + (j / 3) * TAU, y0: y, r0: 0.004, R, rise: 0.020, W: 0.016, curl: -0.6, prof: 'egg', nu: 2, nv: 3 });
    }
    if (st > 0) g.transform(from, new THREE.Matrix4().makeRotationY(st * 2.1).multiply(new THREE.Matrix4().makeTranslation(0.035 * st, 0, 0)).multiply(new THREE.Matrix4().makeRotationZ(0.10 * st)));
  }
  return g.build();
}
/** winter heath: a low dense mound of wiry shoots, dark needle leaves all along them and the
    top third crowded with small urn flowers */
function heatherGeo() {
  const g = new Geo();
  for (let st = 0; st < 9; st++) {
    const from = g.count;
    g.tube(0.55, 0.008, 3, 4);
    for (let k = 0; k < 7; k++) g.petal({ kind: 0, a: k * 2.3 + st, y0: 0.04 + k * 0.05, R: 0.045, rise: 0.035, W: 0.012, nu: 2, nv: 2 });
    for (let k = 0; k < 9; k++) {
      const y = 0.26 + k * 0.034, R = 0.040 * (1 - k * 0.05);
      for (let j = 0; j < 3; j++) g.petal({ a: k * 1.1 + (j / 3) * TAU, y0: y, r0: 0.008, R, rise: 0.022, W: 0.034, curl: -0.5, prof: 'egg', nu: 2, nv: 3 });
    }
    const yaw = (st / 9) * TAU + 0.3, tilt = st === 0 ? 0.08 : 0.45 + 0.35 * ((st * 7) % 4) / 3;
    g.transform(from, new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeScale(1, 0.70 + 0.12 * (st % 3), 1)));
  }
  return g.build();
}

/* ---------- instancing ---------- */
// Flowers within LOD_NEAR metres of the camera swap to their close-up model. Both models
// share the same instance buffers; each one's vertex shader drops the flowers that belong
// to the other, so nothing is ever drawn twice.
export const LOD_NEAR = 7;

/** the uniforms one planting shares between its meshes: how far up it is, and its tint */
const planting = () => ({ uGrow: { value: 1 }, uTint: { value: new THREE.Vector4(0, 0, 0, 0) } });

function flowerMaterial(shared, plant, lod) {
  const defines = {};
  if (lod) defines[lod] = LOD_NEAR.toFixed(1);
  return new THREE.ShaderMaterial({
    vertexShader: tulipVertex,
    fragmentShader: tulipFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    defines,
    uniforms: {
      ...shared.light,
      ...plant,
      uTime: shared.uTime,
      uDay: shared.uDay,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uCabinLight: shared.uCabinLight,
      uFireLight: shared.uFireLight,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  });
}
// What a planting leaves in the sun's shadow map: its depth, cut to the same outlines and
// grown to the same height. The map is only redrawn when the sun or the season moves.
function depthMaterial(shared, plant) {
  return new THREE.ShaderMaterial({
    vertexShader: tulipVertex,
    fragmentShader: flowerDepthFragment,
    side: THREE.DoubleSide,
    defines: { DEPTH_ONLY: '' },
    uniforms: { ...shared.light, ...plant, uTime: shared.uTime, uDay: { value: 1 }, uSunDir: shared.uSunDir },
  });
}

function instanceAttributes(list) {
  const n = list.length;
  const off = new Float32Array(n * 3), par = new Float32Array(n * 3), col = new Float32Array(n * 3);
  list.forEach((f, i) => {
    off[i * 3] = f.x; off[i * 3 + 1] = f.y; off[i * 3 + 2] = f.z;
    par[i * 3] = f.h; par[i * 3 + 1] = f.yaw; par[i * 3 + 2] = f.seed;
    col[i * 3] = f.c[0]; col[i * 3 + 1] = f.c[1]; col[i * 3 + 2] = f.c[2];
  });
  return {
    n,
    aOffset: new THREE.InstancedBufferAttribute(off, 3),
    aParams: new THREE.InstancedBufferAttribute(par, 3),
    aColor: new THREE.InstancedBufferAttribute(col, 3),
  };
}
function instanced(geometry, material, inst, caster) {
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = geometry.index;
  for (const name of ['position', 'normal', 'aInfo', 'aUv']) geo.setAttribute(name, geometry.attributes[name]);
  geo.setAttribute('aOffset', inst.aOffset);
  geo.setAttribute('aParams', inst.aParams);
  geo.setAttribute('aColor', inst.aColor);
  geo.instanceCount = inst.n;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  if (caster) { mesh.castShadow = true; mesh.customDepthMaterial = caster; }
  return mesh;
}
/**
 * One planting: a species set out at the places in `list`. Returns its meshes (a far model,
 * plus a close-up model when `lod` is on) and the uniforms that grow and tint it.
 */
function plant(shared, makeGeo, list, lod) {
  const u = planting();
  const inst = instanceAttributes(list);
  const caster = shared.flowerShadows ? depthMaterial(shared, u) : null;
  const meshes = lod
    ? [instanced(makeGeo(false), flowerMaterial(shared, u, 'LOD_FAR'), inst, caster),     // the far model casts for both
       instanced(makeGeo(true), flowerMaterial(shared, u, 'LOD_NEAR'), inst)]
    : [instanced(makeGeo(false), flowerMaterial(shared, u), inst, caster)];
  return { meshes, u };
}

/* ---------- cherry trees ---------- */
/**
 * Thousands of small blossom (or leaf) cards; `u` holds the season's scale, shape and colours.
 * Each entry is [x, y, z, size, shade, nx, ny, nz]: shade 0 deep in the crown .. 1 in the light,
 * n the way the spray faces (optional). With `cross` every spray gets a second card standing
 * across the first, so it has body seen from the side too.
 */
function cards(shared, list, u, cross = false) {
  if (cross) {
    const more = [];
    for (const c of list) {
      const nx = c[5] || 0, nz = c[7] || 0, l = Math.hypot(nx, nz);
      // across the first card: turned a quarter round the vertical, and tipped up a little
      more.push([c[0] + (Math.random() - 0.5) * 0.06, c[1] + (Math.random() - 0.5) * 0.06, c[2] + (Math.random() - 0.5) * 0.06, c[3] * 0.88, c[4],
        l > 1e-3 ? -nz / l * 0.8 : 0, 0.35, l > 1e-3 ? nx / l * 0.8 : 0]);
    }
    list = list.concat(more);
  }
  const n = list.length;
  const off = new Float32Array(n * 3), seed = new Float32Array(n * 4), shade = new Float32Array(n), nrm = new Float32Array(n * 3);
  list.forEach((c, i) => {
    off[i * 3] = c[0]; off[i * 3 + 1] = c[1]; off[i * 3 + 2] = c[2];
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = c[3]; seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
    shade[i] = c[4] === undefined ? 1 : c[4];
    nrm[i * 3] = c[5] || 0; nrm[i * 3 + 1] = c[6] || 0; nrm[i * 3 + 2] = c[7] || 0;
  });
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.setAttribute('aShade', new THREE.InstancedBufferAttribute(shade, 1));
  geo.setAttribute('aNrm', new THREE.InstancedBufferAttribute(nrm, 3));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: cardVertex,
    fragmentShader: cardFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      ...u,
      uTime: shared.uTime,
      uAmb: shared.uAmb,
      uSunCol: shared.uSunCol,
      uSunDir: shared.uSunDir,
      uAuroraTint: shared.uAuroraTint,
      uFogColor: shared.uFogColor,
      uFogDensity: shared.uFogDensity,
    },
  }));
  mesh.frustumCulled = false;
  return mesh;
}
const crownUniforms = (leaf) => ({
  uScale: { value: 1 }, uLeaf: { value: leaf },
  uColA: { value: new THREE.Vector3(0.66, 0.30, 0.42) }, uColB: { value: new THREE.Vector3(0.84, 0.66, 0.72) },
});

/** cherry bark: dark, satiny, ringed with pale lenticels */
function cherryBark(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4a3029';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${rng() < 0.5 ? '18,10,8' : '120,84,70'},${0.10 + rng() * 0.22})`;
    g.fillRect(rng() * 128, rng() * 128, 6 + rng() * 34, 1 + rng() * 2);
  }
  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(190,160,140,${0.25 + rng() * 0.3})`;
    g.fillRect(rng() * 128, rng() * 128, 5 + rng() * 14, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Grow one cherry tree: a short leaning trunk that breaks into four scaffold limbs, each
 * forking twice more, every limb curved and tapering. Returns the wood as one geometry (in
 * the tree's own frame) and the points along the outer twigs where sprays of blossom hang.
 */
function growCherry(rng) {
  const pos = [], uv = [], idx = [];
  const sprays = [];                               // [x, y, z, weight]
  const SIDES = 7, RINGS = 6;
  const tmp = new THREE.Vector3(), nrm = new THREE.Vector3(), bin = new THREE.Vector3();
  const limb = (p0, dir, len, r0, depth) => {
    // a gentle S: out along `dir`, lifting first, then weighed down toward the tip
    const side = new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).normalize();
    const p1 = p0.clone().addScaledVector(dir, len * 0.5).addScaledVector(side, len * 0.12).add(new THREE.Vector3(0, len * 0.08, 0));
    const p2 = p0.clone().addScaledVector(dir, len).add(new THREE.Vector3(0, -len * 0.10 * depth, 0));
    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    const r1 = r0 * (depth === 0 ? 0.72 : 0.55);
    const start = pos.length / 3;
    for (let j = 0; j <= RINGS; j++) {
      const t = j / RINGS;
      const c = curve.getPoint(t), tan = curve.getTangent(t);
      nrm.set(tan.z, 0, -tan.x);
      if (nrm.lengthSq() < 1e-4) nrm.set(1, 0, 0);
      nrm.normalize();
      bin.crossVectors(tan, nrm).normalize();
      // the trunk flares where it meets the ground
      const r = (r0 + (r1 - r0) * t) * (depth === 0 ? 1 + 0.6 * Math.pow(1 - t, 4) : 1);
      for (let s = 0; s <= SIDES; s++) {
        const a = (s / SIDES) * TAU;
        tmp.copy(c).addScaledVector(nrm, Math.cos(a) * r).addScaledVector(bin, Math.sin(a) * r);
        pos.push(tmp.x, tmp.y, tmp.z);
        uv.push((s / SIDES) * Math.max(1, Math.round(r0 * 12)), t * len * 1.6);
      }
    }
    for (let j = 0; j < RINGS; j++) {
      for (let s = 0; s < SIDES; s++) {
        const a = start + j * (SIDES + 1) + s, b = a + 1, c = a + SIDES + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    if (depth >= 2) for (let k = 0, n = depth === 2 ? 3 : 5; k < n; k++) sprays.push([...curve.getPoint(0.30 + 0.70 * (k / (n - 1))).toArray(), depth === 3 ? 1 : 0.6]);
    if (depth >= 3) return;
    const kids = depth === 0 ? 4 : 3, turn = rng() * TAU;
    for (let k = 0; k < kids; k++) {
      const a = turn + (k / kids) * TAU + (rng() - 0.5) * 0.6;
      // scaffold limbs reach out wide and a little up; the forks after them spread and droop
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const child = depth === 0
        ? out.multiplyScalar(0.80).add(new THREE.Vector3(0, 0.62, 0))
        : dir.clone().multiplyScalar(0.62).addScaledVector(out, 0.62).add(new THREE.Vector3(0, 0.10 - 0.10 * depth, 0));
      // forks leave the parent near its end, not all from one point
      const from = curve.getPoint(depth === 0 ? 0.86 + 0.14 * (k / kids) : 0.62 + 0.38 * (k / (kids - 1)));
      limb(from, child.normalize(), len * (depth === 0 ? 0.98 : 0.66 + rng() * 0.12), r1 * (depth === 0 ? 0.62 : 0.80), depth + 1);
    }
  };
  limb(new THREE.Vector3(0, -0.15, 0), new THREE.Vector3((rng() - 0.5) * 0.22, 1, (rng() - 0.5) * 0.22).normalize(), 2.25, 0.20, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, sprays };
}

const TULIPS = [
  [0.86, 0.04, 0.05], [0.98, 0.70, 0.05], [0.95, 0.28, 0.46], [0.42, 0.10, 0.62],
  [0.92, 0.88, 0.80], [0.98, 0.36, 0.04], [0.80, 0.06, 0.22], [1.00, 0.86, 0.30],
];
// crimson, old-rose pink, cream, yellow, salmon, deep red
const ROSES = [[0.78, 0.03, 0.07], [0.92, 0.22, 0.38], [0.96, 0.88, 0.74], [0.98, 0.74, 0.16], [0.98, 0.46, 0.32], [0.50, 0.015, 0.08]];
const LAVENDERS = [[0.44, 0.28, 0.86], [0.36, 0.26, 0.80], [0.56, 0.36, 0.88], [0.40, 0.22, 0.70]];
// cúc hoạ mi is white with a yellow eye; a bed here and there is planted pink or gold
const DAFFODILS = [[1.00, 0.80, 0.06], [1.00, 0.86, 0.22], [0.99, 0.93, 0.62], [1.00, 0.70, 0.04]];
const POPPIES = [[0.90, 0.07, 0.03], [0.95, 0.16, 0.04], [0.84, 0.04, 0.05], [0.98, 0.36, 0.10]];
const COSMOS = [[0.94, 0.42, 0.66], [0.80, 0.14, 0.46], [0.97, 0.94, 0.95], [0.96, 0.62, 0.80]];
const MUMS = [[0.99, 0.74, 0.05], [0.86, 0.36, 0.06], [0.97, 0.92, 0.70], [0.74, 0.30, 0.52], [0.99, 0.82, 0.16]];
const SNOWDROP = [0.93, 0.95, 0.92];
// grape hyacinth: cobalt to violet-blue, now and then white; winter heath: rose, magenta, white
const MUSCARI = [[0.16, 0.20, 0.78], [0.22, 0.24, 0.86], [0.30, 0.22, 0.80], [0.14, 0.16, 0.66], [0.90, 0.92, 0.95]];
const HEATHERS = [[0.86, 0.30, 0.56], [0.74, 0.16, 0.46], [0.92, 0.52, 0.70], [0.95, 0.92, 0.94]];
const DAISIES = [[0.96, 0.96, 0.92], [0.96, 0.96, 0.92], [0.96, 0.96, 0.92], [0.96, 0.62, 0.76], [0.98, 0.88, 0.40]];

export const GARDEN_TREES = [[GARDEN.x, GARDEN.z], [GARDEN.x - 5.5, GARDEN.z + 9.5], [GARDEN.x + 10, GARDEN.z - 1.5]];
export const GARDEN_ARCH = { x: GARDEN.x - 8.5, z: GARDEN.z };
export const GARDEN_BENCH = { x: GARDEN.x - 1.6, z: GARDEN.z + 1.7, yaw: -1.75 };   // its back to the cherry trunk, looking west down the walk to the arch

/* ---------- the flower walk: the approach to the arch, the arch itself, the foot of the trees ---------- */
// The way into the garden is the part everyone sees first, so it is planted to overflow in
// every season: deep borders both sides of the walk from the camp to the rose arch, a
// crescent of flowers in front of the arch, and a carpet round the foot of each cherry tree.
// Every place carries a plant in all four seasons. Low kinds edge the walk, taller ones
// stand behind them in drifts.
const WALK_A = [3.0, 9.5];
const WALK_B = [GARDEN.x - 7.0, GARDEN.z];
function segDist(x, z, a, b) {
  const bx = b[0] - a[0], bz = b[1] - a[1], px = x - a[0], pz = z - a[1];
  const t = Math.max(0, Math.min(1, (px * bx + pz * bz) / (bx * bx + bz * bz)));
  return [Math.hypot(px - bx * t, pz - bz * t), t];
}
/** on a gravel walk of the garden (the same shapes the ground shader draws) */
function onWalk(x, z, margin = 0) {
  const gx = x - GARDEN.x, gz = z - GARDEN.z, r = Math.hypot(gx, gz);
  if (Math.abs(r - 2.75) < 0.85 + margin || Math.abs(r - 7.0) < 0.9 + margin) return true;
  if (r < 7.4 + margin && Math.min(Math.abs(gx), Math.abs(gz)) < 0.85 + margin) return true;
  return segDist(x, z, WALK_A, WALK_B)[0] < 1.0 + margin;
}
/** where the flower walk is planted: 0 outside, else how close to its edge (1 = right by the walk) */
function walkBed(x, z) {
  if (onWalk(x, z)) return 0;
  const ax = GARDEN_ARCH.x, cz = GARDEN.z;
  if (Math.hypot(x - GARDEN_BENCH.x, z - GARDEN_BENCH.z) < 1.3) return 0;
  // borders along the walk to the arch
  const [d, t] = segDist(x, z, WALK_A, WALK_B);
  if (t > 0.12 && d < 4.6 && x < ax - 0.7) return 1 - (d - 1.0) / 3.6;
  // the crescent in front of the arch and the run of the rose borders
  if (x > ax - 4.6 && x < ax - 0.7 && Math.abs(z - cz) < 10.5) return 1 - Math.min(1, (ax - 0.7 - x) / 3.9);
  // a carpet round the foot of each cherry tree
  for (const [tx, tz] of GARDEN_TREES) {
    const r = Math.hypot(x - tx, z - tz);
    if (r > 0.75 && r < (tx === GARDEN.x ? 2.05 : 2.6)) return 0.9;
  }
  return 0;
}
// season by season: the edging kind, then the kinds of the drifts behind it
const WALK_PLAN = [
  { edge: ['muscari'], body: ['tulip', 'tulip', 'daffodil'] },
  { edge: ['lavender'], body: ['poppy', 'cosmos', 'cosmos'] },
  { edge: ['mum'], body: ['cosmos', 'daisy', 'mum'] },
  { edge: ['heather'], body: ['snowdrop', 'heather', 'snowdrop'] },
];
function walkKind(season, x, z, near) {
  const plan = WALK_PLAN[season];
  if (near > 0.72 - 0.2 * driftNoise(x * 0.4, z * 0.4 + 9)) return plan.edge[0];
  const n = driftNoise(x * 0.22 + season * 13, z * 0.22 + 5);
  return plan.body[Math.min(plan.body.length - 1, Math.floor(n * plan.body.length * 1.05))];
}
/** the kind in flower on the flower walk at a point in season 0..3, or '' (the flower book asks) */
export function walkFlowerAt(season, x, z) {
  const near = walkBed(x, z);
  return near > 0 ? walkKind(season, x, z, near) : '';
}
/** the garden bench: within reach of it */
export const nearBench = (x, z, r = 1.6) => Math.hypot(x - GARDEN_BENCH.x, z - GARDEN_BENCH.z) < r;

/* ---------- the beds in front of the camp: winding ribbons planted in drifts ---------- */
// The same ground is replanted through the year. Where each kind grows is decided by
// bedFlowerAt() in seasons.js (the flower book asks the same function): a low kind edges
// each bed in broken runs, the middle carries long drifts of taller kinds, damp-loving ones
// down toward the stream and sun-lovers up by the camp. Clipped evergreens and a few mossy
// stones sit among the beds, so from the hill the slope reads as a planted garden and not
// as ruled stripes. Returns the group; its userData.grow maps planting names (see GROW in
// seasons.js) to their uniforms.
export function createBeds(shared, rng, count, lod) {
  const ROW = 0.44;
  const P = { tulip: [], daffodil: [], muscari: [], lavender: [], poppy: [], cosmos: [], daisy: [], mum: [], snowdrop: [], heather: [] };
  let guard = 0, placed = 0;
  while (placed < count && guard++ < count * 8) {
    const dist = 4.5 + 60 * Math.pow(rng(), 1.2);
    const z = 8 - dist + (rng() - 0.5) * 0.30;
    // rows follow the winding bed, a little irregular as hand planting is
    const w = bedWarp(z);
    let xw = (rng() - 0.5) * 2 * (9 + dist * 1.55);
    xw = Math.round(xw / ROW) * ROW + (rng() - 0.5) * 0.14;
    const x = xw - w;
    if (bedMiddle(x, z) < 0) continue;                           // grassy aisle between beds
    if (insideCabin(x, z, 1.4) || insideCamp(x, z)) continue;
    if (Math.hypot(x - CAMP.fire.x, z - CAMP.fire.z) < 3.6) continue;
    if (Math.hypot(x, z - 8) < 3.2) continue;                    // where you stand
    if (x > 10.5 && z > -7) continue;                            // the flower garden begins here
    if (z < -26 && Math.abs(x - streamX(z)) < streamW(z) + 1.4) continue;   // nothing in the stream or on its pebbles
    const far = 1 + Math.min(1, dist / 62) * 0.8;
    const tone = 0.84 + rng() * 0.32;
    const pt = patchTone(x, z);                                  // one colour to a drift, mostly
    const pickC = (list) => list[Math.floor((rng() < 0.82 ? pt : rng()) * list.length * 0.999)];
    const at = (h, c) => ({ x, y: terrainH(x, z) - 0.02, z, h: h * far, yaw: rng() * TAU, seed: rng(), c: [c[0] * tone, c[1] * tone, c[2] * tone] });
    const i = placed++;
    // spring: every place has its bulb
    const sp = bedFlowerAt(0, x, z);
    if (sp === 'tulip') P.tulip.push(at(0.46 + rng() * 0.20, pickC(TULIPS)));
    else if (sp === 'daffodil') P.daffodil.push(at(0.40 + rng() * 0.16, pickC(DAFFODILS)));
    else P.muscari.push(at(0.85 + rng() * 0.35, pickC(MUSCARI)));
    // the other seasons use the same places; bushy kinds take more room, so fewer of them
    const su = bedFlowerAt(1, x, z);
    if (su === 'lavender' && i % 2 === 0) P.lavender.push(at(0.50 + rng() * 0.16, pickC(LAVENDERS)));
    if (su === 'poppy' && i % 3 !== 2) P.poppy.push(at(0.50 + rng() * 0.26, POPPIES[Math.floor(rng() * POPPIES.length)]));
    if (su === 'cosmos' && i % 3 !== 1) P.cosmos.push(at(0.72 + rng() * 0.32, pickC(COSMOS)));
    const au = bedFlowerAt(2, x, z);
    if (au === 'daisy' && i % 2 === 0) P.daisy.push(at(0.56 + rng() * 0.22, DAISIES[rng() < 0.85 ? 0 : 3 + Math.floor(rng() * 2)]));
    if (au === 'cosmos' && i % 3 === 0) P.cosmos.push(at(0.70 + rng() * 0.30, pickC(COSMOS)));
    if (au === 'mum' && i % 2 === 1) P.mum.push(at(0.42 + rng() * 0.14, pickC(MUMS)));
    const wi = bedFlowerAt(3, x, z);
    // snowdrops come up in drifts, not rows
    if (wi === 'snowdrop') P.snowdrop.push({ ...at(0.24 + rng() * 0.08, SNOWDROP), x: x + (rng() - 0.5) * 0.5 });
    if (wi === 'heather' && i % 3 !== 2) P.heather.push(at(0.55 + rng() * 0.20, pickC(HEATHERS)));
  }
  const group = new THREE.Group();
  group.userData.grow = {};
  group.userData.meshes = {};
  const add = (name, p) => { group.add(...p.meshes); group.userData.grow[name] = p.u; group.userData.meshes[name] = p.meshes; };
  add('bedTulip', plant(shared, tulipGeo, P.tulip, lod));
  add('bedDaffodil', plant(shared, daffodilGeo, P.daffodil, false));
  add('bedMuscari', plant(shared, muscariGeo, P.muscari, false));
  add('bedLavender', plant(shared, () => lavenderGeo(5), P.lavender, false));
  add('bedPoppy', plant(shared, poppyGeo, P.poppy, false));
  add('bedDaisy', plant(shared, daisyGeo, P.daisy, false));
  add('bedCosmos', plant(shared, cosmosGeo, P.cosmos, false));
  add('bedMum', plant(shared, mumGeo, P.mum, false));
  add('bedSnowdrop', plant(shared, snowdropGeo, P.snowdrop, false));
  add('bedHeather', plant(shared, heatherGeo, P.heather, false));

  // clipped evergreens (box and juniper) standing in the middle of a bed now and then, and
  // mossy stones at the ends of runs: they break the long view down the slope
  const scale = Math.min(1, count / 20000);
  const shrubCards = [], stones = [];
  const base = Math.ceil(1000 / BED_STRIPE) * BED_STRIPE - 1000;
  for (let z = 2; z > -50; z -= 0.9) {
    for (let b = -14; b <= 14; b++) {
      const x = (b + 0.565) * BED_STRIPE + base - bedWarp(z);
      const edge = 9 + (8 - z) * 1.55;
      if (Math.abs(x) > edge - 1 || (x > 10.5 && z > -7) || insideCabin(x, z, 1.6) || insideCamp(x, z)) continue;
      if (Math.hypot(x - CAMP.fire.x, z - CAMP.fire.z) < 4.5 || Math.hypot(x, z - 8) < 4) continue;
      const n = driftNoise(x * 0.31 + 5, z * 0.37 + b * 2.3);
      if (n > 0.78 && rng() < 0.6 * Math.max(scale, 0.35)) {
        const r = 0.34 + rng() * 0.26, cy = terrainH(x, z) + r * 0.72;
        for (let k = 0, m = Math.round(70 * r / 0.45); k < m; k++) {
          const v = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
          const depth = Math.pow(rng(), 0.5);
          shrubCards.push([x + v.x * r * depth, cy + v.y * r * 0.8 * depth, z + v.z * r * depth, 0.16 + rng() * 0.10, 0.25 + 0.75 * depth * (0.6 + 0.4 * Math.max(v.y, 0)), v.x * depth, v.y * depth, v.z * depth]);
        }
      } else if (n < 0.06 && rng() < 0.25) {
        stones.push([x + (rng() - 0.5) * 1.2, z, 0.22 + rng() * 0.26]);
      }
    }
  }
  const evergreen = crownUniforms(1);
  evergreen.uColA.value.set(0.016, 0.050, 0.020);
  evergreen.uColB.value.set(0.050, 0.105, 0.040);
  if (shrubCards.length) {
    group.add(cards(shared, shrubCards, evergreen));
    group.userData.grow.bedShrub = { uGrow: evergreen.uScale, uTint: { value: new THREE.Vector4() } };
  }
  if (stones.length) {
    const sg = new THREE.IcosahedronGeometry(1, 3), spos = sg.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < spos.count; i++) {
      v.fromBufferAttribute(spos, i);
      const r = 1 + 0.16 * Math.sin(v.x * 4.1 + v.z * 2.3) + 0.10 * Math.sin(v.y * 6.7 - v.x * 3.1) + 0.05 * Math.sin(v.z * 11 + v.y * 7);
      v.multiplyScalar(r); v.y *= 0.62;
      if (v.y < -0.2) v.y = -0.2;
      spos.setXYZ(i, v.x, v.y, v.z);
    }
    sg.computeVertexNormals();
    const sm = new THREE.MeshStandardMaterial({ color: 0x6a6d68, roughness: 0.95 });
    for (const [x, z, r] of stones) {
      const m = new THREE.Mesh(sg, sm);
      m.position.set(x, terrainH(x, z) + r * 0.05, z);
      m.scale.set(r * (0.9 + rng() * 0.5), r, r * (0.8 + rng() * 0.5));
      m.rotation.y = rng() * TAU;
      group.add(m);
    }
  }
  return group;
}

/* ---------- the garden ---------- */
// A formal garden, laid out on its walks: a ring of rose bushes round the middle cherry tree
// (camellias in winter), rose borders either side of the arch, a block of lavender to the
// south, a sunflower field to the north, and daisies edging the walks and framing the two
// blocks. Nothing is scattered. `userData` carries what the seasons change.
export function createGarden(shared, rng, scale, lod) {
  const group = new THREE.Group();
  const cx = GARDEN.x, cz = GARDEN.z;
  const grow = (group.userData.grow = {});
  const tone = (c) => { const t = 0.82 + rng() * 0.36; return [c[0] * t, c[1] * t, c[2] * t]; };
  const place = (x, z, h, c, yaw) => ({ x, y: terrainH(x, z) - 0.02, z, h, yaw: yaw === undefined ? rng() * TAU : yaw, seed: rng(), c: tone(c) });
  const meshes = (group.userData.meshes = {});
  const add = (name, p) => { group.add(...p.meshes); grow[name] = p.u; meshes[name] = p.meshes; };

  /* --- roses: bushes in a ring bed round the central tree, cut by four paths --- */
  // A handful of canes from one root, one variety to a bush, blooms at different heights and
  // a bud or two still to open.
  const roses = [];
  const bush = (bx, bz, c, canes) => {
    for (let k = 0; k < canes; k++) {
      const a = rng() * TAU, r = 0.06 + rng() * 0.30;
      const f = place(bx + Math.cos(a) * r, bz + Math.sin(a) * r, (0.50 + rng() * 0.36) * (rng() < 0.2 ? 0.72 : 1), c);
      if (rng() < 0.2) f.seed *= 0.3;                // a bud
      roses.push(f);
    }
  };
  // two neat rings of bushes, evenly spaced, each quarter of the bed its own colour
  for (const [r, n] of [[3.85, Math.round(40 * scale)], [4.75, Math.round(50 * scale)], [5.70, Math.round(60 * scale)]]) {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU;
      if (Math.abs(Math.sin(2 * a)) < 0.20) continue;                       // the four walks
      bush(cx + Math.cos(a) * r, cz + Math.sin(a) * r, ROSES[(Math.floor((a / TAU) * 4) * 2 + (r > 5 ? 1 : 0)) % 6], 4 + Math.floor(rng() * 3 * scale));
    }
  }
  const ax = GARDEN_ARCH.x;
  for (const side of [-1, 1]) {                                            // a border either side of the arch
    for (let i = 0, n = Math.round(9 * Math.sqrt(scale)); i < n; i++) {
      for (const row of [0, 1]) bush(ax - 0.5 + row * 1.0, cz + side * (2.6 + (i / n) * 7.2), ROSES[row ? 2 : 1], 4 + Math.floor(rng() * 2));
    }
  }
  const baseY = terrainH(ax, cz);
  const archPoint = () => {
    if (rng() < 0.3) return [cz + (rng() < 0.5 ? -1 : 1) * 1.4, rng() * 1.45];
    const t = rng() * Math.PI;
    return [cz + Math.cos(t) * 1.4, 1.45 + Math.sin(t) * 1.3];
  };
  for (let i = 0, n = Math.floor(520 * scale); i < n; i++) {               // climbing roses
    const [z, y] = archPoint();
    const h = 0.18 + rng() * 0.12;
    roses.push({
      x: ax - 0.15 + rng() * 0.9, y: baseY + y - h * 0.8 + (rng() - 0.5) * 0.2, z: z + (rng() - 0.5) * 0.3,
      h, yaw: rng() * TAU, seed: rng(), c: tone(ROSES[rng() < 0.6 ? 1 : rng() < 0.5 ? 0 : 2]),
    });
  }
  add('ring', plant(shared, roseGeo, roses, lod));

  /* --- lavender: a block of straight rows --- */
  const lav = [];
  for (let row = 0; row < 11; row++) {
    const z = cz + 5.2 + row * 0.95;
    for (let x = cx + 3; x < cx + 17; x += 0.30 / Math.max(scale, 0.4)) {
      lav.push(place(x + (rng() - 0.5) * 0.12, z + (rng() - 0.5) * 0.10, 0.52 + rng() * 0.22, LAVENDERS[row % 2]));
    }
  }
  add('lavender', plant(shared, () => lavenderGeo(5), lav, false));

  /* --- sunflowers, sown in rows and all turned to the morning sun --- */
  const sunYaw = Math.atan2(-0.52, 0.72);
  const sf = [];
  const sfStep = 0.5 / Math.sqrt(Math.max(scale, 0.3));
  for (let z = cz - 15; z < cz - 5; z += 0.78) {
    for (let x = cx + 5; x < cx + 18; x += sfStep) {
      if (rng() < 0.05) continue;
      sf.push(place(x + (rng() - 0.5) * 0.18, z + (rng() - 0.5) * 0.16, 1.35 + rng() * 0.60, [1.0, 0.56 + rng() * 0.10, 0.02], sunYaw + (rng() - 0.5) * 0.45));
    }
  }
  add('sunflower', plant(shared, sunflowerGeo, sf, lod));

  /* --- daisies: an edging, two plants deep, along the outer walk and round the two blocks --- */
  const dz = [];
  const edge = (x, z, c) => dz.push(place(x + (rng() - 0.5) * 0.08, z + (rng() - 0.5) * 0.08, 0.30 + rng() * 0.14, c));
  const step = 0.30 / Math.sqrt(Math.max(scale, 0.3));
  for (const r of [7.95, 8.30]) {
    for (let a = 0; a < TAU; a += step / r) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.min(Math.abs(x), Math.abs(z)) < 1.0) continue;               // where the walks leave the ring
      edge(cx + x, cz + z, DAISIES[0]);
    }
  }
  const frame = (x0, z0, x1, z1, c) => {
    for (let x = x0; x <= x1; x += step) { edge(x, z0, c); edge(x, z1, c); }
    for (let z = z0; z <= z1; z += step) { edge(x0, z, c); edge(x1, z, c); }
  };
  frame(cx + 2.4, cz + 4.5, cx + 17.6, cz + 15.4, DAISIES[3]);               // round the lavender
  frame(cx + 4.3, cz - 15.7, cx + 18.7, cz - 4.4, DAISIES[4]);               // round the sunflowers
  add('border', plant(shared, daisyGeo, dz, false));

  /* --- the flower walk, full in every season --- */
  {
    const P = { tulip: [], daffodil: [], muscari: [], lavender: [], poppy: [], cosmos: [], daisy: [], mum: [], snowdrop: [], heather: [] };
    const H = { tulip: [0.46, 0.20], daffodil: [0.40, 0.16], muscari: [0.95, 0.35], lavender: [0.50, 0.16], poppy: [0.52, 0.24], cosmos: [0.78, 0.34], daisy: [0.56, 0.22], mum: [0.42, 0.14], snowdrop: [0.26, 0.08], heather: [0.55, 0.20] };
    const COL = { tulip: TULIPS, daffodil: DAFFODILS, muscari: MUSCARI, lavender: LAVENDERS, poppy: POPPIES, cosmos: COSMOS, daisy: DAISIES.slice(0, 3).concat([DAISIES[3]]), mum: MUMS, snowdrop: [SNOWDROP], heather: HEATHERS };
    // bushy kinds take more ground than a single stem: keep only some of their places
    const SPARE = { lavender: 2, mum: 2, heather: 2 };
    const want = Math.round(9000 * scale);
    const bx0 = Math.min(WALK_A[0], GARDEN_ARCH.x - 5) - 5, bx1 = GARDEN.x + 13, bz0 = GARDEN.z - 12, bz1 = GARDEN.z + 15;
    let got = 0, tries = 0;
    while (got < want && tries++ < want * 30) {
      const x = bx0 + rng() * (bx1 - bx0), z = Math.min(WALK_A[1], GARDEN.z) - 5 + rng() * (bz1 - Math.min(WALK_A[1], GARDEN.z) + 5);
      if (z < bz0 && x > GARDEN_ARCH.x) continue;
      const near = walkBed(x, z);
      if (near <= 0) continue;
      const i = got++;
      const pt = patchTone(x * 1.3, z * 1.3);
      for (let se = 0; se < 4; se++) {
        const kind = walkKind(se, x, z, near);
        if (SPARE[kind] && i % SPARE[kind]) continue;
        const [h0, hv] = H[kind];
        // the taller kinds stand back from the walk, the short ones lean out over its edge
        const back = 0.85 + 0.30 * (1 - near);
        const list = COL[kind];
        const c = list[Math.floor((rng() < 0.8 ? pt : rng()) * list.length * 0.999)];
        P[kind].push(place(x + (rng() - 0.5) * 0.12, z + (rng() - 0.5) * 0.12, (h0 + rng() * hv) * back, c));
      }
    }
    add('gTulip', plant(shared, tulipGeo, P.tulip, lod));
    add('gDaffodil', plant(shared, daffodilGeo, P.daffodil, false));
    add('gMuscari', plant(shared, muscariGeo, P.muscari, false));
    add('gLavender', plant(shared, () => lavenderGeo(5), P.lavender, false));
    add('gPoppy', plant(shared, poppyGeo, P.poppy, false));
    add('gCosmos', plant(shared, cosmosGeo, P.cosmos, false));
    add('gDaisy', plant(shared, daisyGeo, P.daisy, false));
    add('gMum', plant(shared, mumGeo, P.mum, false));
    add('gSnowdrop', plant(shared, snowdropGeo, P.snowdrop, false));
    add('gHeather', plant(shared, heatherGeo, P.heather, false));
  }

  /* --- rose arch, leafed over --- */
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5138, roughness: 1 });
  for (const ox of [0.0, 0.6]) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.045, 8, 28, Math.PI), wood);
    arc.rotation.y = Math.PI / 2;
    arc.position.set(ax + ox, baseY + 1.45, cz);
    group.add(arc);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.9, 8), wood);
      post.position.set(ax + ox, baseY + 0.5, cz + s * 1.4);
      group.add(post);
    }
  }
  const foliage = crownUniforms(1);
  const leaves = [];
  for (let i = 0, n = Math.floor(900 * scale); i < n; i++) {
    const [z, y] = archPoint();
    leaves.push([ax - 0.1 + rng() * 0.8, baseY + y + (rng() - 0.5) * 0.3, z + (rng() - 0.5) * 0.36, 0.26 + rng() * 0.22, 0.6 + rng() * 0.4]);
  }
  group.add(cards(shared, leaves, foliage));

  /* --- cherry trees: real boughs, blossom hung along the twigs, petals drifting down --- */
  const bark = new THREE.MeshStandardMaterial({ map: cherryBark(rng), roughness: 0.75 });
  const crown = crownUniforms(0);
  const blossom = [];
  const petalPos = [], petalSeed = [];
  const shades = [];
  for (const [tx, tz] of GARDEN_TREES) {
    const ty = terrainH(tx, tz);
    const { geo, sprays } = growCherry(rng);
    const tree = new THREE.Mesh(geo, bark);
    tree.position.set(tx, ty, tz);
    tree.rotation.y = rng() * TAU;
    tree.updateMatrixWorld(true);
    group.add(tree);
    // where the crown is, and how big: sprays near its skin get the light
    const mid = new THREE.Vector3(), v = new THREE.Vector3();
    const pts = sprays.map(([x, y, z, w]) => { const q = new THREE.Vector3(x, y, z).applyMatrix4(tree.matrixWorld); mid.add(q); return [q, w]; });
    mid.multiplyScalar(1 / pts.length);
    let reach = 0;
    for (const [q] of pts) reach = Math.max(reach, q.distanceTo(mid));
    const per = Math.max(3, Math.round((3400 * scale) / pts.length));
    for (const [q, w] of pts) {
      for (let i = 0, n = Math.round(per * w * 1.25); i < n; i++) {
        // a spray: flowers crowd the twig and thin out away from it
        const rad = 0.42 * Math.pow(rng(), 0.7);
        v.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize().multiplyScalar(rad).add(q);
        const out = v.distanceTo(mid) / reach;
        const light = Math.min(1, 0.55 * smooth01((out - 0.35) / 0.6) + 0.45 * smooth01((v.y - mid.y + reach * 0.5) / reach));
        // sprays face out from the crown, the outer ones more so
        const o = v.clone().sub(mid).normalize().multiplyScalar(0.3 + 0.7 * Math.min(1, out));
        blossom.push([v.x, v.y, v.z, 0.20 + rng() * 0.24, light, o.x, o.y + 0.25, o.z]);
      }
    }
    // the crown's shadow: an unseen shape standing in for all those sprays
    const shade = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false }));
    shade.position.copy(mid);
    shade.scale.set(reach * 0.62, reach * 0.34, reach * 0.62);
    shade.userData.shadowOnly = true;
    shades.push(shade);
    group.add(shade);
    for (let i = 0, n = Math.floor(150 * scale); i < n; i++) {
      const a = rng() * TAU, rr = rng() * reach * 0.9;
      petalPos.push(mid.x + Math.cos(a) * rr, mid.y + (rng() - 0.3) * reach * 0.4, mid.z + Math.sin(a) * rr);
      petalSeed.push(rng(), rng(), rng(), rng());
    }
  }
  group.add(cards(shared, blossom, crown, true));
  const drift = { uAmount: { value: 1 }, uColA: { value: new THREE.Vector3(0.70, 0.42, 0.50) }, uColB: { value: new THREE.Vector3(0.84, 0.70, 0.74) } };
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(petalPos, 3));
  pg.setAttribute('aSeed', new THREE.Float32BufferAttribute(petalSeed, 4));
  const petals = new THREE.Points(pg, new THREE.ShaderMaterial({
    vertexShader: petalVertex,
    fragmentShader: petalFragment,
    uniforms: {
      ...drift,
      uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale,
      uAmb: shared.uAmb, uSunCol: shared.uSunCol, uAuroraTint: shared.uAuroraTint,
    },
  }));
  petals.frustumCulled = false;
  group.add(petals);
  Object.assign(group.userData, { crown, foliage, drift, shades });

  /* --- butterflies working the beds by day --- */
  {
    const n = Math.max(12, Math.floor(90 * scale));
    const bp = new Float32Array(n * 3), bs = new Float32Array(n * 4), bc = new Float32Array(n * 3);
    const wings = [[0.95, 0.90, 0.78], [0.98, 0.62, 0.10], [0.95, 0.82, 0.20], [0.55, 0.70, 0.98], [0.98, 0.98, 0.95]];
    for (let i = 0; i < n; i++) {
      // most over the garden, some over the beds by the camp
      const home = rng() < 0.7
        ? [cx + (rng() * 2 - 1) * (GARDEN.hx - 1), cz + (rng() * 2 - 1) * (GARDEN.hz - 1)]
        : [(rng() * 2 - 1) * 26, -4 - rng() * 30];
      const tall = home[0] > cx + 4 && home[1] < cz - 4 ? 1.5 : 0;          // above the sunflowers
      bp[i * 3] = home[0]; bp[i * 3 + 1] = terrainH(home[0], home[1]) + 0.75 + tall; bp[i * 3 + 2] = home[1];
      bs[i * 4] = rng(); bs[i * 4 + 1] = rng(); bs[i * 4 + 2] = 1.0 + rng() * 2.2; bs[i * 4 + 3] = rng() * 0.5;
      const w = wings[Math.floor(rng() * wings.length)];
      bc[i * 3] = w[0]; bc[i * 3 + 1] = w[1]; bc[i * 3 + 2] = w[2];
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute('aSeed', new THREE.Float32BufferAttribute(bs, 4));
    bg.setAttribute('aColor', new THREE.Float32BufferAttribute(bc, 3));
    const flies = new THREE.Points(bg, new THREE.ShaderMaterial({
      vertexShader: butterflyVertex,
      fragmentShader: butterflyFragment,
      uniforms: {
        uTime: shared.uTime, uDay: shared.uDay, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale,
        uAmb: shared.uAmb, uSunCol: shared.uSunCol,
      },
    }));
    flies.frustumCulled = false;
    group.userData.butterflies = flies;
    group.add(flies);
  }

  /* --- a bench under the blossom: slatted seat and back on turned legs --- */
  const bench = new THREE.Group();
  const plank = (w, h, d, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); m.rotation.x = rx; bench.add(m); };
  for (let i = 0; i < 4; i++) plank(1.8, 0.035, 0.105, 0, 0.46, -0.18 + i * 0.125);
  for (let i = 0; i < 3; i++) plank(1.8, 0.11, 0.03, 0, 0.62 + i * 0.14, -0.27 - i * 0.03, -0.2);
  for (const sx of [-0.8, 0.8]) {
    plank(0.07, 0.46, 0.07, sx, 0.23, 0.20);
    plank(0.07, 1.0, 0.07, sx, 0.5, -0.24, -0.1);
    plank(0.06, 0.05, 0.50, sx, 0.42, -0.02);
    plank(0.06, 0.04, 0.50, sx, 0.66, -0.02);                                // arm rest
  }
  bench.position.set(GARDEN_BENCH.x, terrainH(GARDEN_BENCH.x, GARDEN_BENCH.z), GARDEN_BENCH.z);
  bench.rotation.y = GARDEN_BENCH.yaw;
  // a book left on the seat
  {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.23), new THREE.MeshStandardMaterial({ color: 0x5a2a22, roughness: 0.8 }));
    cover.position.set(0.48, 0.495, 0.0);
    cover.rotation.y = 0.3;
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.215), new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.9 }));
    pages.position.set(0.485, 0.497, 0.0);
    pages.rotation.y = 0.3;
    bench.add(cover, pages);
  }
  group.add(bench);

  return group;
}
const smooth01 = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/* ---------- trail signposts ---------- */
export function createSignposts(places) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xc8a35a, roughness: 0.9, emissive: 0x4a3410, emissiveIntensity: 0.5 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a6e70, roughness: 1 });
  for (const p of places) {
    if (p.sign === false) continue;
    const [sx, sz] = p.signAt || [p.x + 1.6, p.z + 1.2];
    const y = terrainH(sx, sz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 8), wood);
    post.position.set(sx, y + 0.95, sz);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.05), wood);
    board.position.set(sx, y + 1.62, sz);
    board.rotation.y = Math.atan2(p.x - sx, p.z - sz) + Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), cap);
    tip.position.set(sx, y + 1.98, sz);
    group.add(post, board, tip);
    for (let k = 0; k < 4; k++) {                 // a small cairn beside it
      const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 - k * 0.035, 2), stone);
      st.position.set(sx + 0.55, y + 0.12 + k * 0.2, sz + 0.2);
      st.rotation.set(k, k * 2, 0);
      st.scale.y = 0.7;
      group.add(st);
    }
  }
  return group;
}
