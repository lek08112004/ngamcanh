// Flowers and trees: the tulip beds, and the garden east of the camp with roses,
// lavender, sunflowers, daisies, a rose arch and cherry trees.
// Each flower is an instanced model built from smooth curved strips (petals, leaves)
// that carry UVs; the flower shader cuts their outlines per pixel and lights them.
import * as THREE from 'three';
import { tulipVertex, tulipFragment, cardVertex, cardFragment } from './shaders/tulip.js';
import { terrainH, insideCabin, insideCamp } from './world.js';
import { GARDEN, CAMP } from './layout.js';

/* ---------- mesh builder: position, (kind, open), uv; normals are computed smooth ---------- */
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.x = []; }
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
  tube(h, r, sides = 5) {
    const start = this.count;
    for (let j = 0; j < 2; j++) {
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * r, j * h, Math.sin(a) * r, 0, 0, 0, j * 0.7);
      }
    }
    for (let s = 0; s < sides; s++) {
      const a = start + s, b = start + (s + 1) % sides;
      this.x.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  /** the seed disc of a daisy or sunflower: a low dome around +Y */
  dome(cy, r, h, sides = 9) {
    const top = this.v(0, cy + h, 0, 2, 0, 0, 1);
    const rings = [[0.55, 0.75], [1.0, 0.0]];
    const start = this.count;
    rings.forEach(([rr, hh], ri) => {
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        this.v(Math.cos(a) * r * rr, cy + h * hh, Math.sin(a) * r * rr, 2, 0, 0, 0.7 - ri * 0.6);
      }
    });
    for (let s = 0; s < sides; s++) {
      const a = start + s, b = start + (s + 1) % sides;
      this.x.push(top, b, a, a, b, b + sides, a, b + sides, a + sides);
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
      R: 0.012 + 0.030 * t + 0.050 * t * t, rise: 0.165 - 0.060 * t, W: 0.022 + 0.050 * t,
      curl: -0.95 + 0.85 * t, roll: 0.9 * t * t * t, droop: 0.02 * t * t, prof: t < 0.5 ? 'egg' : 'open',
      open: 0.05 + 0.25 * t, nu: t < 0.3 ? 4 : 6, nv: t < 0.3 ? 5 : 6,
    });
  }
  return g.build();
}
function lavenderGeo() {
  const g = new Geo();
  g.tube(0.56, 0.008, 4);
  g.petal({ kind: 0, a: 0.6, y0: 0.04, R: 0.16, rise: 0.16, W: 0.012, nu: 2, nv: 3 });
  g.petal({ kind: 0, a: 3.6, y0: 0.06, R: 0.14, rise: 0.14, W: 0.011, nu: 2, nv: 3 });
  for (let k = 0; k < 8; k++) {
    const y = 0.57 + k * 0.056, R = 0.032 * (1 - k * 0.08);
    for (let j = 0; j < 3; j++) g.petal({ a: k * 0.9 + (j / 3) * TAU, y0: y, r0: 0.004, R, rise: 0.036, W: 0.017, curl: -0.3, nu: 2, nv: 3 });
  }
  return g.build();
}
function sunflowerGeo() {
  const g = new Geo();
  g.tube(0.88, 0.016, 6);
  g.petal({ kind: 0, a: 0.4, y0: 0.28, R: 0.27, rise: 0.04, W: 0.100, droop: 0.05 });
  g.petal({ kind: 0, a: 2.7, y0: 0.48, R: 0.25, rise: 0.04, W: 0.092, droop: 0.05 });
  g.petal({ kind: 0, a: 5.0, y0: 0.66, R: 0.21, rise: 0.03, W: 0.078, droop: 0.04 });
  const head = g.count;
  for (let k = 0; k < 21; k++) g.petal({ a: (k / 21) * TAU, y0: 0, r0: 0.078, R: 0.125, rise: 0.0, W: 0.030, droop: 0.02, nv: 3 });
  for (let k = 0; k < 21; k++) g.petal({ a: ((k + 0.5) / 21) * TAU, y0: 0.004, r0: 0.075, R: 0.100, rise: 0.012, W: 0.028, nv: 3 });
  g.dome(0, 0.085, 0.024, 12);
  g.transform(head, new THREE.Matrix4().makeTranslation(0, 0.905, 0.03).multiply(new THREE.Matrix4().makeRotationX(1.13)));
  return g.build();
}
function daisyGeo() {
  const g = new Geo();
  g.tube(0.90, 0.009, 4);
  g.petal({ kind: 0, a: 1.0, y0: 0.10, R: 0.22, rise: 0.10, W: 0.028, nv: 3 });
  g.petal({ kind: 0, a: 4.0, y0: 0.16, R: 0.19, rise: 0.10, W: 0.026, nv: 3 });
  for (let k = 0; k < 14; k++) g.petal({ a: (k / 14) * TAU, y0: 0.915, r0: 0.034, R: 0.150, rise: 0.012, W: 0.024, droop: 0.03, open: 1, nv: 3 });
  g.dome(0.915, 0.042, 0.030);
  return g.build();
}

/* ---------- instancing ---------- */
// Flowers within LOD_NEAR metres of the camera swap to their close-up model. Both models
// share the same instance buffers; each one's vertex shader drops the flowers that belong
// to the other, so nothing is ever drawn twice.
export const LOD_NEAR = 7;
function flowerMaterial(shared, lod) {
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
function instanced(geometry, material, inst) {
  if (Array.isArray(inst)) inst = instanceAttributes(inst);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = geometry.index;
  for (const name of ['position', 'normal', 'aInfo', 'aUv']) geo.setAttribute(name, geometry.attributes[name]);
  geo.setAttribute('aOffset', inst.aOffset);
  geo.setAttribute('aParams', inst.aParams);
  geo.setAttribute('aColor', inst.aColor);
  geo.instanceCount = inst.n;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return mesh;
}
/** one species, as one mesh, or as a far model plus a close-up model when `lod` is on */
function species(shared, makeGeo, list, lod) {
  if (!lod) return [instanced(makeGeo(false), flowerMaterial(shared), list)];
  const inst = instanceAttributes(list);
  return [
    instanced(makeGeo(false), flowerMaterial(shared, 'LOD_FAR'), inst),
    instanced(makeGeo(true), flowerMaterial(shared, 'LOD_NEAR'), inst),
  ];
}

/** thousands of small blossom (or leaf) cards */
function cards(shared, list, leaf) {
  const n = list.length;
  const off = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  list.forEach((c, i) => {
    off[i * 3] = c[0]; off[i * 3 + 1] = c[1]; off[i * 3 + 2] = c[2];
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = c[3]; seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
  });
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: cardVertex,
    fragmentShader: cardFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      uTime: shared.uTime,
      uLeaf: { value: leaf ? 1 : 0 },
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

const petalVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
attribute vec4 aSeed;
varying float vA;
void main(){
  float life = fract(uTime * (0.045 + aSeed.y * 0.05) + aSeed.x);
  vec3 p = position;
  p.y -= life * (3.6 + aSeed.w);
  p.x += sin(life * 7.0 + aSeed.z * 30.0) * 0.6 + life * 1.6;
  p.z += cos(life * 5.0 + aSeed.w * 30.0) * 0.6 + life * 0.6;
  vA = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.85, 1.0, life));
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uScale * uPixelRatio * 0.075 / -mv.z, 1.0, 9.0);
}
`;
const petalFragment = /* glsl */ `
uniform vec3 uAmb;
uniform vec3 uSunCol;
uniform vec3 uAuroraTint;
varying float vA;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  if (dot(q, q) > 1.0 || vA < 0.02) discard;
  vec3 col = vec3(0.50, 0.26, 0.34) * (uAmb + uSunCol * 0.7 + uAuroraTint);
  gl_FragColor = vec4(col, 1.0);
}
`;

const TULIPS = [
  [0.86, 0.04, 0.05], [0.98, 0.70, 0.05], [0.95, 0.28, 0.46], [0.42, 0.10, 0.62],
  [0.92, 0.88, 0.80], [0.98, 0.36, 0.04], [0.80, 0.06, 0.22], [1.00, 0.86, 0.30],
];
const ROSES = [[0.80, 0.03, 0.06], [0.95, 0.30, 0.45], [0.95, 0.90, 0.85], [0.98, 0.78, 0.20], [0.98, 0.52, 0.38], [0.55, 0.02, 0.10]];
const DAISIES = [[0.95, 0.95, 0.90], [0.95, 0.52, 0.72], [0.82, 0.22, 0.52], [0.98, 0.92, 0.55], [0.95, 0.95, 0.90]];

export const GARDEN_TREES = [[GARDEN.x, GARDEN.z], [GARDEN.x - 5.5, GARDEN.z + 9.5], [GARDEN.x + 10, GARDEN.z - 1.5]];
export const GARDEN_ARCH = { x: GARDEN.x - 8.5, z: GARDEN.z };

/* ---------- tulip beds: colour stripes running down toward the valley ---------- */
export function createTulips(shared, rng, count, lod) {
  const ROW = 0.44, STRIPE = 3.6;
  const list = [];
  let guard = 0;
  while (list.length < count && guard++ < count * 8) {
    const dist = 4.5 + 60 * Math.pow(rng(), 1.2);
    const z = 8 - dist;
    let x = (rng() - 0.5) * 2 * (9 + dist * 1.55);
    x = Math.round(x / ROW) * ROW + (rng() - 0.5) * 0.10;
    const sx = (x + 1000) / STRIPE;
    if (sx - Math.floor(sx) < 0.13) continue;                    // grassy aisle between beds
    if (insideCabin(x, z, 1.4) || insideCamp(x, z)) continue;
    if (Math.hypot(x - CAMP.fire.x, z - CAMP.fire.z) < 3.6) continue;
    if (Math.hypot(x, z - 8) < 3.2) continue;                    // where you stand
    if (x > 10.5 && z > -7) continue;                            // the flower garden begins here
    const bed = Math.floor(sx);
    const c = TULIPS[(bed * 5 + Math.floor(bed / 3) * 3 + 1000) % TULIPS.length];
    const far = Math.min(1, dist / 62);
    const tone = 0.82 + rng() * 0.36;
    list.push({
      x, y: terrainH(x, z) - 0.02, z: z + (rng() - 0.5) * 0.12,
      h: (0.44 + rng() * 0.20) * (1 + far * 0.8), yaw: rng() * TAU, seed: rng(),
      c: [c[0] * tone, c[1] * tone, c[2] * tone],
    });
  }
  const group = new THREE.Group();
  group.add(...species(shared, tulipGeo, list, lod));
  return group;
}

/* ---------- the garden ---------- */
export function createGarden(shared, rng, scale, lod) {
  const group = new THREE.Group();
  const cx = GARDEN.x, cz = GARDEN.z;
  const mat = flowerMaterial(shared);
  const tone = (c) => { const t = 0.82 + rng() * 0.36; return [c[0] * t, c[1] * t, c[2] * t]; };
  const place = (x, z, h, c, yaw) => ({ x, y: terrainH(x, z) - 0.02, z, h, yaw: yaw === undefined ? rng() * TAU : yaw, seed: rng(), c: tone(c) });

  /* --- roses: a ring bed around the central cherry tree, cut by four paths --- */
  const roses = [];
  for (let i = 0, n = Math.floor(1250 * scale); i < n; i++) {
    const a = rng() * TAU;
    if (Math.abs(Math.sin(2 * a)) < 0.16) continue;
    const r = 3.75 + rng() * 2.35;
    roses.push(place(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.55 + rng() * 0.28, ROSES[Math.floor((a / TAU) * 6) % 6]));
  }
  const ax = GARDEN_ARCH.x;
  for (let i = 0, n = Math.floor(620 * scale); i < n; i++) {             // border beds beside the arch
    const side = rng() < 0.5 ? -1 : 1;
    roses.push(place(ax - 0.9 + rng() * 2.0, cz + side * (2.4 + rng() * 7.5), 0.5 + rng() * 0.3, ROSES[1 + Math.floor(rng() * 2)]));
  }
  const baseY = terrainH(ax, cz);
  const archPoint = () => {
    if (rng() < 0.3) return [cz + (rng() < 0.5 ? -1 : 1) * 1.4, rng() * 1.45];
    const t = rng() * Math.PI;
    return [cz + Math.cos(t) * 1.4, 1.45 + Math.sin(t) * 1.3];
  };
  for (let i = 0, n = Math.floor(300 * scale); i < n; i++) {             // climbing roses
    const [z, y] = archPoint();
    const h = 0.18 + rng() * 0.12;
    roses.push({
      x: ax - 0.15 + rng() * 0.9, y: baseY + y - h * 0.8 + (rng() - 0.5) * 0.2, z: z + (rng() - 0.5) * 0.3,
      h, yaw: rng() * TAU, seed: rng(), c: tone(ROSES[rng() < 0.6 ? 1 : rng() < 0.5 ? 0 : 2]),
    });
  }
  group.add(...species(shared, roseGeo, roses, lod));

  /* --- lavender rows --- */
  const lav = [];
  for (let row = 0; row < 11; row++) {
    const z = cz + 5.2 + row * 0.95;
    for (let x = cx + 3; x < cx + 17; x += 0.3 / Math.max(scale, 0.4)) {
      for (let k = 0; k < 3; k++) {
        lav.push(place(x + (rng() - 0.5) * 0.22, z + (rng() - 0.5) * 0.26, 0.48 + rng() * 0.24, [0.42 + rng() * 0.1, 0.28, 0.86]));
      }
    }
  }
  group.add(instanced(lavenderGeo(), mat, lav));

  /* --- sunflowers, all turned to the morning sun --- */
  const sun = shared.uSunDir.value;
  const sunYaw = Math.atan2(-sun.x, sun.z);
  const sf = [];
  for (let i = 0, n = Math.floor(340 * scale); i < n; i++) {
    sf.push(place(cx + 5 + rng() * 13, cz - 15 + rng() * 10, 1.4 + rng() * 0.55, [1.0, 0.70, 0.05], sunYaw + (rng() - 0.5) * 0.5));
  }
  group.add(instanced(sunflowerGeo(), mat, sf));

  /* --- daisies and cosmos out in the meadow around the beds --- */
  const dz = [];
  for (let i = 0, n = Math.floor(3200 * scale); i < n; i++) {
    const x = cx + (rng() * 2 - 1) * (GARDEN.hx + 5), z = cz + (rng() * 2 - 1) * (GARDEN.hz + 5);
    if (Math.hypot(x - cx, z - cz) < 8.0) continue;                        // the rose ring and its walks
    if (Math.sin(x * 0.55) * Math.sin(z * 0.6 + 1.0) < -0.25) continue;    // drifts, not a carpet
    dz.push(place(x, z, 0.30 + rng() * 0.24, DAISIES[Math.floor(rng() * DAISIES.length)]));
  }
  group.add(instanced(daisyGeo(), mat, dz));

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
  const leaves = [];
  for (let i = 0, n = Math.floor(900 * scale); i < n; i++) {
    const [z, y] = archPoint();
    leaves.push([ax - 0.1 + rng() * 0.8, baseY + y + (rng() - 0.5) * 0.3, z + (rng() - 0.5) * 0.36, 0.26 + rng() * 0.22]);
  }
  group.add(cards(shared, leaves, true));

  /* --- cherry trees: crowns of blossom, petals drifting down --- */
  const bark = new THREE.MeshStandardMaterial({ color: 0x5c4336, roughness: 1 });
  const blossom = [];
  const petalPos = [], petalSeed = [];
  for (const [tx, tz] of GARDEN_TREES) {
    const ty = terrainH(tx, tz);
    const tree = new THREE.Group();
    tree.position.set(tx, ty, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.26, 2.6, 10), bark);
    trunk.position.y = 1.3;
    trunk.rotation.z = (rng() - 0.5) * 0.12;
    tree.add(trunk);
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * TAU + rng(), lean = 0.55 + rng() * 0.45, len = 1.7 + rng() * 0.9;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.085, len, 6), bark);
      br.position.set(Math.cos(a) * Math.sin(lean) * len * 0.5, 2.5 + Math.cos(lean) * len * 0.5, Math.sin(a) * Math.sin(lean) * len * 0.5);
      br.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
      tree.add(br);
    }
    const shade = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false }));
    shade.position.set(0, 4.0, 0);
    shade.scale.set(2.7, 1.5, 2.7);
    shade.userData.shadowOnly = true;
    tree.add(shade);
    group.add(tree);
    for (let i = 0, n = Math.floor(2600 * scale); i < n; i++) {
      // an umbrella-shaped crown, denser toward the outside
      const a = rng() * TAU, up = Math.acos(1 - rng() * 1.35), rad = 0.45 + 0.55 * Math.pow(rng(), 0.45);
      blossom.push([
        tx + Math.cos(a) * Math.sin(up) * 2.9 * rad,
        ty + 3.05 + Math.cos(up) * 1.75 * rad,
        tz + Math.sin(a) * Math.sin(up) * 2.9 * rad,
        0.30 + rng() * 0.30,
      ]);
    }
    for (let i = 0, n = Math.floor(70 * scale); i < n; i++) {
      const a = rng() * TAU, rr = rng() * 2.4;
      petalPos.push(tx + Math.cos(a) * rr, ty + 4.0 + rng() * 0.8, tz + Math.sin(a) * rr);
      petalSeed.push(rng(), rng(), rng(), rng());
    }
  }
  group.add(cards(shared, blossom, false));
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(petalPos, 3));
  pg.setAttribute('aSeed', new THREE.Float32BufferAttribute(petalSeed, 4));
  const petals = new THREE.Points(pg, new THREE.ShaderMaterial({
    vertexShader: petalVertex,
    fragmentShader: petalFragment,
    uniforms: {
      uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uScale: shared.uPointScale,
      uAmb: shared.uAmb, uSunCol: shared.uSunCol, uAuroraTint: shared.uAuroraTint,
    },
  }));
  petals.frustumCulled = false;
  group.add(petals);

  /* --- a bench under the blossom --- */
  const bench = new THREE.Group();
  const plank = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); bench.add(m); };
  plank(1.8, 0.07, 0.5, 0, 0.46, 0);
  plank(1.8, 0.45, 0.06, 0, 0.78, -0.24);
  for (const sx of [-0.8, 0.8]) plank(0.08, 0.46, 0.46, sx, 0.23, 0);
  bench.position.set(cx - 1.6, terrainH(cx - 1.6, cz + 1.7), cz + 1.7);
  bench.rotation.y = 2.2;
  group.add(bench);

  return group;
}

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
